import QRCode from 'qrcode';

export interface QrSvgOptions {
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generate a standard-compliant, high-contrast SVG QR Code using ISO/IEC 18004 specifications.
 */
export async function generateQrSvg(text: string, options: QrSvgOptions = {}): Promise<string> {
  const margin = options.margin ?? 1;
  const dark = options.darkColor ?? '#0b101e';
  const light = options.lightColor ?? '#ffffff';

  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin,
      errorCorrectionLevel: 'M',
      color: {
        dark,
        light,
      },
    });
    return svg;
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err);
    return '';
  }
}
