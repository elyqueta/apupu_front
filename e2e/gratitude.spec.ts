import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

function gratitudeSvg(title: string) {
  const fit = fitTitle(title);
  const titleTexts = fit.map((l) => `<text x="512" y="${l.y}" text-anchor="middle" font-size="${l.fontSize}" font-family="Anton, Oswald, Arial Narrow, sans-serif" font-weight="400" letter-spacing="0">${esc(l.text)}</text>`).join('');
  const titleStrokes = fit.map((l) => `<text x="512" y="${l.y}" text-anchor="middle" font-size="${l.fontSize}" font-family="Anton, Oswald, Arial Narrow, sans-serif" font-weight="400" letter-spacing="0" fill="none" stroke="#1A1A1A" stroke-width="2" stroke-linejoin="round">${esc(l.text)}</text>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:'Anton';src:url('/fonts/Anton-400.ttf') format('truetype');font-weight:400;font-style:normal;}
@font-face{font-family:'Figtree';src:url('https://fonts.gstatic.com/s/figtree/v6/_Xmz-HUzqDCFdgfMsYiV_F7wfS-Bs_d_QF5e.ttf') format('truetype');}
body{margin:0;background:#eee;display:grid;place-items:center;min-height:100vh}
#wrap{width:1024px;height:1280px;position:relative;overflow:hidden}
</style></head><body><div id="wrap">
<svg id="svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1280" width="1024" height="1280">
  <defs>
    <radialGradient id="gr-glow" cx="50%" cy="42%" r="58%"><stop offset="0%" stop-color="#FFFDF8"/><stop offset="100%" stop-color="#FFF6EA" stop-opacity="0"/></radialGradient>
    <linearGradient id="gr-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8C6A1F"/><stop offset="35%" stop-color="#F3D580"/><stop offset="65%" stop-color="#F7E39A"/><stop offset="100%" stop-color="#B8862B"/></linearGradient>
    <linearGradient id="gr-gold-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF4BF" stop-opacity="0.95"/><stop offset="45%" stop-color="#D4A017" stop-opacity="0.9"/><stop offset="100%" stop-color="#8C6A1F" stop-opacity="0.95"/></linearGradient>
    <pattern id="gr-bg-tile" width="48" height="48" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="none"/><path d="M24 2 L46 24 L24 46 L2 24 Z" fill="none" stroke="#DCC9A3" stroke-width="1.2"/><path d="M24 10 L38 24 L24 38 L10 24 Z" fill="none" stroke="#DCC9A3" stroke-width="1"/><path d="M24 18 L30 24 L24 30 L18 24 Z" fill="#E8D7B5" opacity="0.7"/></pattern>
    <pattern id="gr-title-african" width="1200" height="420" patternUnits="userSpaceOnUse"><rect width="1200" height="420" fill="#E8731A"/><rect x="0" y="-40" width="90" height="520" fill="#C8281E" transform="skewX(-18)"/><rect x="140" y="-40" width="70" height="520" fill="#1E8A3C" transform="skewX(-18)"/><rect x="260" y="-40" width="110" height="520" fill="#F2B21A" transform="skewX(-18)" opacity="0.9"/><rect x="430" y="-40" width="80" height="520" fill="#C8281E" transform="skewX(-18)"/><rect x="560" y="-40" width="120" height="520" fill="#1E8A3C" transform="skewX(-18)" opacity="0.92"/><rect x="740" y="-40" width="90" height="520" fill="#F2B21A" transform="skewX(-18)" opacity="0.9"/><rect x="890" y="-40" width="110" height="520" fill="#C8281E" transform="skewX(-18)"/><rect x="1060" y="-40" width="90" height="520" fill="#1E8A3C" transform="skewX(-18)" opacity="0.92"/><path d="M0 150 L30 130 L60 150 L90 130 L120 150 L150 130 L180 150 L210 130 L240 150 L270 130 L300 150 L330 130 L360 150 L390 130 L420 150 L450 130 L480 150 L510 130 L540 150 L570 130 L600 150 L630 130 L660 150 L690 130 L720 150 L750 130 L780 150 L810 130 L840 150 L870 130 L900 150 L930 130 L960 150 L990 130 L1020 150 L1050 130 L1080 150 L1110 130 L1140 150 L1170 130 L1200 150 L1200 170 L1170 150 L1140 170 L1110 150 L1080 170 L1050 150 L1020 170 L990 150 L960 170 L930 150 L900 170 L870 150 L840 170 L810 150 L780 170 L750 150 L720 170 L690 150 L660 170 L630 150 L600 170 L570 150 L540 170 L510 150 L480 170 L450 150 L420 170 L390 150 L360 170 L330 150 L300 170 L270 150 L240 170 L210 150 L180 170 L150 150 L120 170 L90 150 L60 170 L30 150 L0 170 Z" fill="#1E8A3C" stroke="#1A1A1A" stroke-width="2"/></pattern>
    <pattern id="gr-ribbon-african" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#C8281E"/><path d="M22 0 L44 22 L22 44 L0 22 Z" fill="#1E8A3C" stroke="#1A1A1A" stroke-width="1.5"/><path d="M22 8 L36 22 L22 36 L8 22 Z" fill="#F2B21A" stroke="#1A1A1A" stroke-width="1"/></pattern>
    <linearGradient id="gr-fade-tr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="55%" stop-color="white" stop-opacity="0.65"/><stop offset="100%" stop-color="white" stop-opacity="1"/></linearGradient>
    <linearGradient id="gr-fade-bl" x1="1" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="55%" stop-color="white" stop-opacity="0.65"/><stop offset="100%" stop-color="white" stop-opacity="1"/></linearGradient>
    <mask id="gr-mask-tr"><rect x="560" y="0" width="464" height="420" fill="url(#gr-fade-tr)"/></mask>
    <mask id="gr-mask-bl"><rect x="0" y="860" width="464" height="420" fill="url(#gr-fade-bl)"/></mask>
    <clipPath id="gr-ribbon-top-clip"><path d="M-30 185 C 110 40, 250 15, 430 30 C 455 32, 455 32, 440 70 C 270 55, 140 85, 10 215 C -10 235, -30 220, -30 185 Z"/></clipPath>
    <clipPath id="gr-ribbon-bottom-clip"><path d="M570 1265 C 650 1110, 760 1020, 1055 990 C 1075 987, 1085 995, 1080 1025 C 820 1055, 720 1135, 640 1285 C 625 1305, 590 1295, 570 1265 Z"/></clipPath>
    <clipPath id="gr-title-clip">${titleTexts}</clipPath>
  </defs>
  <rect width="1024" height="1280" fill="#FFF6EA"/><rect width="1024" height="1280" fill="url(#gr-glow)"/>
  <g fill="none" stroke="#EADFC8" stroke-width="1.2" opacity="0.35"><circle cx="512" cy="560" r="250"/><circle cx="512" cy="560" r="330"/><circle cx="512" cy="560" r="410"/></g>
  <g opacity="0.13"><rect x="600" y="-20" width="460" height="440" fill="url(#gr-bg-tile)" mask="url(#gr-mask-tr)"/><rect x="-30" y="860" width="460" height="440" fill="url(#gr-bg-tile)" mask="url(#gr-mask-bl)"/></g>
  <g clip-path="url(#gr-ribbon-top-clip)" data-testid="gratitude-ribbon-top"><rect x="-60" y="-20" width="560" height="320" fill="url(#gr-ribbon-african)"/><path d="M-30 185 C 110 40, 250 15, 430 30 C 438 31, 442 38, 440 46 C 270 31, 130 60, -10 200 C -18 210, -30 200, -30 185 Z" fill="url(#gr-gold)"/><path d="M10 215 C 140 85, 270 55, 440 70 C 448 71, 450 78, 446 86 C 275 71, 150 101, 30 225 C 22 233, 10 225, 10 215 Z" fill="url(#gr-gold)" opacity="0.95"/></g>
  <g clip-path="url(#gr-ribbon-bottom-clip)" data-testid="gratitude-ribbon-bottom"><rect x="520" y="940" width="560" height="380" fill="url(#gr-ribbon-african)"/><path d="M570 1265 C 650 1110, 760 1020, 1055 990 C 1065 988, 1072 994, 1070 1002 C 800 1032, 700 1115, 620 1272 C 612 1284, 580 1280, 570 1265 Z" fill="url(#gr-gold)"/><path d="M640 1285 C 720 1135, 820 1055, 1080 1025 C 1088 1024, 1092 1031, 1088 1040 C 830 1068, 740 1148, 660 1292 C 654 1300, 644 1295, 640 1285 Z" fill="url(#gr-gold)" opacity="0.95"/></g>
  <text data-testid="gratitude-org" x="512" y="262" text-anchor="middle" font-size="31" font-family="Figtree, Arial, sans-serif" font-weight="500" letter-spacing="7.7" fill="#222222">IGREJA CRISTÃ REINO-CHURCH</text>
  <text data-testid="gratitude-subtitle" x="512" y="325" text-anchor="middle" font-size="49" font-family="Figtree, Arial, sans-serif" font-weight="700" fill="#111111">FESTIVAL DE ADOLESCENTES</text>
  <g data-testid="gratitude-title"><g clip-path="url(#gr-title-clip)"><rect x="0" y="300" width="1024" height="360" fill="url(#gr-title-african)"/></g>${titleStrokes}</g>
  <text data-testid="gratitude-highlight" x="512" y="678" text-anchor="middle" font-size="90" font-family="Georgia, serif" font-style="italic" font-weight="700" fill="#B3121A">2026</text>
  <g data-testid="gratitude-info" font-family="Figtree, Arial, sans-serif" fill="#111111">
    <line data-testid="gratitude-sep1" x1="276" y1="846" x2="276" y2="936" stroke="#D4A017" stroke-width="2"/>
    <line data-testid="gratitude-sep2" x1="430" y1="846" x2="430" y2="936" stroke="#D4A017" stroke-width="2"/>
    <line data-testid="gratitude-sep3" x1="730" y1="846" x2="730" y2="936" stroke="#D4A017" stroke-width="2"/>
    <g data-testid="gratitude-date" transform="translate(72,872)"><rect x="0" y="0" width="44" height="38" rx="5" fill="none" stroke="#111111" stroke-width="3"/><text x="58" y="30" font-size="44" font-weight="500" fill="#111111">20/12</text></g>
    <g data-testid="gratitude-time" transform="translate(318,870)"><circle cx="22" cy="22" r="22" fill="none" stroke="#111111" stroke-width="3"/><text x="56" y="32" font-size="44" font-weight="500" fill="#111111">14:00</text></g>
    <g data-testid="gratitude-local" transform="translate(468,862)"><text x="56" y="18" font-size="20" font-weight="700" fill="#111111">LOCAL:</text><text x="56" y="42" font-size="27" font-weight="700" fill="#111111">Igreja Cristã Reino</text><text x="56" y="70" font-size="27" font-weight="700" fill="#111111">Church</text></g>
    <g data-testid="gratitude-qr"><text x="877" y="842" text-anchor="middle" font-size="24" font-weight="700" fill="#111111">Informação</text><rect x="812" y="852" width="130" height="130" rx="14" fill="#FFFFFF" stroke="#D4A017" stroke-width="3"/></g>
  </g>
  <g data-testid="gratitude-dresscode"><rect x="266" y="1063" width="492" height="115" rx="57.5" fill="#FFF3DC" stroke="#D4A017" stroke-width="3"/><text x="540" y="1100" text-anchor="middle" font-size="20" font-family="Figtree, Arial, sans-serif" font-weight="700" fill="#111111">DRESS-CODE:</text><text x="540" y="1142" text-anchor="middle" font-size="50" font-family="Oswald, Arial Narrow, sans-serif" font-weight="700" fill="#111111">TRAJE AFRICANO</text></g>
</svg></div></body></html>`;
}

function esc(v: string) { return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fitTitle(text: string) {
  const clean = (text || 'GRATITUDE').toUpperCase().trim();
  const maxWidth = 942;
  const fit = (t: string, max: number, min: number) => Math.max(min, Math.min(max, Math.floor(maxWidth / (t.length * 0.65))));
  const single = fit(clean, 220, 72);
  if (single >= 110 || clean.length <= 12) return [{ text: clean, y: 560, fontSize: single }];
  const words = clean.split(/\s+/);
  if (words.length === 1) return [{ text: clean, y: 560, fontSize: Math.max(72, single) }];
  let best: [string,string] = [clean,'']; let bestDiff = Infinity;
  for (let i=1;i<words.length;i++){ const a=words.slice(0,i).join(' '); const b=words.slice(i).join(' '); const diff=Math.abs(a.length-b.length); if(diff<bestDiff){bestDiff=diff;best=[a,b];}}
  const size = Math.min(fit(best[0],170,64), fit(best[1],170,64));
  return [{ text: best[0], y: 500, fontSize: size }, { text: best[1], y: 500 + size * 0.92, fontSize: size }];
}

test.describe('Gratitude fidelity', () => {
  test.use({ viewport: { width: 1024, height: 1280 } });

  test('layout bbox checks and capture', async ({ page }) => {
    await page.setContent(gratitudeSvg('GRATITUDE'), { waitUntil: 'load' });
    const box = async (id: string) => {
      const b = await page.locator(`[data-testid="${id}"]`).boundingBox();
      expect(b, id).toBeTruthy();
      return b!;
    };
    const canvas = { w: 1024, h: 1280 };
    const within = (b: {x:number;y:number;width:number;height:number}, name: string) => {
      expect(b.x, `${name} left`).toBeGreaterThanOrEqual(-1);
      expect(b.y, `${name} top`).toBeGreaterThanOrEqual(-1);
      expect(b.x + b.width, `${name} right`).toBeLessThanOrEqual(canvas.w + 1);
      expect(b.y + b.height, `${name} bottom`).toBeLessThanOrEqual(canvas.h + 1);
    };
    const org = await box('gratitude-org');
    const subtitle = await box('gratitude-subtitle');
    const title = await box('gratitude-title');
    const highlight = await box('gratitude-highlight');
    const info = await box('gratitude-info');
    const dress = await box('gratitude-dresscode');
    [org,subtitle,title,highlight,info,dress].forEach((b,i)=>within(b,['org','subtitle','title','highlight','info','dress'][i]));
    expect(title.width).toBeGreaterThanOrEqual(canvas.w * 0.88);
    expect(org.y).toBeLessThan(subtitle.y);
    expect(subtitle.y).toBeLessThan(title.y);
    expect(title.y).toBeLessThan(highlight.y);
    expect(highlight.y).toBeLessThan(info.y);
    expect(info.y).toBeLessThan(dress.y);
    const qr = await box('gratitude-qr');
    expect(qr.width).toBeGreaterThanOrEqual(canvas.w * 0.11);
    await box('gratitude-sep1'); await box('gratitude-sep2'); await box('gratitude-sep3');

    const out = resolve(__dirname, '../../docs/assets/gratitude-render.png');
    mkdirSync(resolve(__dirname, '../../docs/assets'), { recursive: true });
    await page.locator('#wrap').screenshot({ path: out });
  });

  test('long title max 2 lines no cut', async ({ page }) => {
    await page.setContent(gratitudeSvg('O NOSSO DIA ESPECIAL'), { waitUntil: 'load' });
    const title = await page.locator('[data-testid="gratitude-title"]').boundingBox();
    expect(title).toBeTruthy();
    expect(title!.width).toBeGreaterThanOrEqual(1024 * 0.88);
    expect(title!.x).toBeGreaterThanOrEqual(-1);
    expect(title!.x + title!.width).toBeLessThanOrEqual(1025);
    // max 2 lines => height should be within reasonable two-line bound
    expect(title!.height).toBeLessThan(400);
  });
});
