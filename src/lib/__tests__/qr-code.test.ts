import { describe, it, expect } from 'vitest';
import {
  getProfileUrl,
  generateQRCodeSvgUrl,
  generateQRCodePngUrl,
} from '../qr-code';

describe('qr-code module', () => {
  it('resolves clean profile URL for username', () => {
    expect(getProfileUrl('octocat')).toBe('https://ossfolio.qzz.io/octocat');
    expect(getProfileUrl('  torvalds  ')).toBe(
      'https://ossfolio.qzz.io/torvalds',
    );
  });

  it('generates QR code SVG and PNG URLs', () => {
    const url = 'https://ossfolio.qzz.io/octocat';
    const svgUrl = generateQRCodeSvgUrl(url);
    expect(svgUrl).toContain('format=svg');
    expect(svgUrl).toContain(encodeURIComponent(url));

    const pngUrl = generateQRCodePngUrl(url);
    expect(pngUrl).toContain('format=png');
    expect(pngUrl).toContain(encodeURIComponent(url));
  });
});
