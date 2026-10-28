// Builds the macOS icon from resources/icon.png into resources/icon.iconset and resources/icon.icns.
// icon.png fills the whole canvas with its own rounded corners; macOS 26+ boxes such icons in a gray frame,
// so here the artwork is placed on Apple's icon grid instead. icon.png and icon.ico stay as they are (Windows, in-app logo).
// Run from the project folder: swift scripts/make-mac-icon.swift
import AppKit

let source = NSImage(contentsOfFile: "resources/icon.png")!
let sourceSize = source.representations.first.map { CGFloat($0.pixelsWide) } ?? 1024

// Trim the source's own rim (light edge and see-through corners), measured on the 1024 px original.
let trim: CGFloat = 24 * sourceSize / 1024
let crop = CGRect(x: trim, y: trim, width: sourceSize - 2 * trim, height: sourceSize - 2 * trim)

/// Draws the icon on a 1024×1024 canvas scaled to `size` pixels.
func drawIcon(size: Int) -> NSBitmapImageRep {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                               colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    NSGraphicsContext.current?.imageInterpolation = .high
    let scale = NSAffineTransform()
    scale.scale(by: CGFloat(size) / 1024)
    scale.concat()

    // Body: Apple's icon grid, an 824 px rounded square with radius 185 and a 100 px margin.
    // macOS 26+ checks this exact shape; anything else gets boxed in a gray frame.
    let body = NSBezierPath(roundedRect: CGRect(x: 100, y: 100, width: 824, height: 824), xRadius: 185, yRadius: 185)
    body.addClip()

    // The icon's own dark navy under the artwork, so no corner stays see-through.
    NSColor(srgbRed: 0.03, green: 0.09, blue: 0.15, alpha: 1).setFill()
    body.fill()
    source.draw(in: CGRect(x: 100, y: 100, width: 824, height: 824), from: crop, operation: .sourceOver, fraction: 1)

    NSGraphicsContext.restoreGraphicsState()
    return rep
}

let iconset = URL(fileURLWithPath: "resources/icon.iconset")
try? FileManager.default.removeItem(at: iconset)
try FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)

for base in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let name = scale == 1 ? "icon_\(base)x\(base).png" : "icon_\(base)x\(base)@2x.png"
        try drawIcon(size: base * scale).representation(using: .png, properties: [:])!
            .write(to: iconset.appendingPathComponent(name))
    }
}

let iconutil = Process()
iconutil.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
iconutil.arguments = ["-c", "icns", iconset.path, "-o", "resources/icon.icns"]
try iconutil.run()
iconutil.waitUntilExit()
print(iconutil.terminationStatus == 0 ? "Wrote resources/icon.iconset and resources/icon.icns" : "iconutil failed")
