import { describe, expect, it } from 'vitest';
import { qrCodeSvg } from './qr-svg.util';

describe('Bloco 16 — QR com símbolo da plataforma', () => {
  it('inclui o símbolo com área ≤ 20% e mantém a correção H por omissão', () => {
    const svg = qrCodeSvg('https://example.com/convite');
    expect(svg).toContain('data-qr-logo="platform"');
    const ratio = /data-logo-ratio="([\d.]+)"/.exec(svg)?.[1];
    expect(Number(ratio)).toBeLessThanOrEqual(0.2);
    expect(svg).toContain('M 194 102 A 66 66');
    expect(svg.indexOf('data-qr-logo')).toBeLessThan(svg.indexOf('</svg>'));
  });

  it('respeita a opção none', () => {
    expect(qrCodeSvg('abc', 'H', { logo: 'none' })).not.toContain('data-qr-logo');
  });
});
