export function getProfileUrl(username: string): string {
  const cleanUsername = username ? username.trim() : '';
  return `https://ossfolio.qzz.io/${cleanUsername}`;
}

/**
 * Generates an SVG Data URL representation of a QR Code for a given URL string.
 */
export function generateQRCodeSvgUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  // Uses QuickChart / Google Chart SVG QR code API for high resolution vector QR generation
  return `https://quickchart.io/qr?text=${encodedText}&size=300&margin=2&format=svg`;
}

/**
 * Generates a PNG Data URL representation of a QR Code for a given URL string.
 */
export function generateQRCodePngUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://quickchart.io/qr?text=${encodedText}&size=300&margin=2&format=png`;
}
