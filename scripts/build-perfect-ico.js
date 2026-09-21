const { app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function createDibIconEntry(width, height, bgraTopToBottom) {
  const headerSize = 40;
  const xorSize = width * height * 4;
  const andRowBytes = Math.ceil(width / 32) * 4;
  const andSize = andRowBytes * height;
  const totalSize = headerSize + xorSize + andSize;

  const buf = Buffer.alloc(totalSize);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 0); // biSize
  buf.writeInt32LE(width, 4); // biWidth
  buf.writeInt32LE(height * 2, 8); // biHeight (must be 2 * height)
  buf.writeUInt16LE(1, 12); // biPlanes
  buf.writeUInt16LE(32, 14); // biBitCount (32-bit BGRA)
  buf.writeUInt32LE(0, 16); // biCompression (BI_RGB)
  buf.writeUInt32LE(xorSize + andSize, 20); // biSizeImage
  buf.writeInt32LE(0, 24); // biXPelsPerMeter
  buf.writeInt32LE(0, 28); // biYPelsPerMeter
  buf.writeUInt32LE(0, 32); // biClrUsed
  buf.writeUInt32LE(0, 36); // biClrImportant

  // XOR mask: Invert rows from top-down to bottom-up
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // bottom-up
    const srcOffset = srcY * rowBytes;
    const dstOffset = headerSize + y * rowBytes;
    bgraTopToBottom.copy(buf, dstOffset, srcOffset, srcOffset + rowBytes);
  }

  // AND mask: 1 bit per pixel (0 = draw XOR pixel)
  // For 32-bit icons with alpha, setting to 0 allows full 8-bit alpha blending
  const andOffset = headerSize + xorSize;
  buf.fill(0, andOffset, andOffset + andSize);

  return {
    width: width === 256 ? 0 : width,
    height: height === 256 ? 0 : height,
    size: totalSize,
    data: buf
  };
}

function createPngIconEntry(width, height, pngBuffer) {
  return {
    width: width === 256 ? 0 : width,
    height: height === 256 ? 0 : height,
    size: pngBuffer.length,
    data: pngBuffer
  };
}

app.whenReady().then(() => {
  const iconPath = path.resolve('resources/icon.png');
  const masterImg = nativeImage.createFromPath(iconPath);

  console.log('Master image size:', masterImg.getSize());

  const sizes = [16, 24, 32, 48, 64, 128];
  const entries = [];

  for (const size of sizes) {
    const resized = masterImg.resize({ width: size, height: size, quality: 'best' });
    const bgra = resized.toBitmap();
    entries.push(createDibIconEntry(size, size, bgra));
  }

  // Add 256x256 as PNG (standard modern Vista/10/11 icon format)
  const img256 = masterImg.resize({ width: 256, height: 256, quality: 'best' });
  entries.push(createPngIconEntry(256, 256, img256.toPNG()));

  // Calculate total ICO file size
  const iconDirHeaderSize = 6;
  const iconDirEntrySize = 16;
  const totalHeaderSize = iconDirHeaderSize + entries.length * iconDirEntrySize;
  
  let currentOffset = totalHeaderSize;
  const icoBuffer = Buffer.alloc(totalHeaderSize + entries.reduce((sum, e) => sum + e.size, 0));

  // Write ICONDIR
  icoBuffer.writeUInt16LE(0, 0); // reserved
  icoBuffer.writeUInt16LE(1, 2); // type 1 = ICO
  icoBuffer.writeUInt16LE(entries.length, 4); // count

  // Write ICONDIRENTRY & copy image data
  let entryOffset = iconDirHeaderSize;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, entryOffset);
    icoBuffer.writeUInt8(entry.height, entryOffset + 1);
    icoBuffer.writeUInt8(0, entryOffset + 2); // colors
    icoBuffer.writeUInt8(0, entryOffset + 3); // reserved
    icoBuffer.writeUInt16LE(1, entryOffset + 4); // planes
    icoBuffer.writeUInt16LE(32, entryOffset + 6); // bpp
    icoBuffer.writeUInt32LE(entry.size, entryOffset + 8); // size
    icoBuffer.writeUInt32LE(currentOffset, entryOffset + 12); // offset

    entry.data.copy(icoBuffer, currentOffset);
    currentOffset += entry.size;
    entryOffset += iconDirEntrySize;
  }

  fs.writeFileSync('resources/icon.ico', icoBuffer);
  console.log('Successfully created resources/icon.ico! Size:', icoBuffer.length, 'bytes');

  app.quit();
});
