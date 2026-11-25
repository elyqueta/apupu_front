import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

function gratitudeHtml(title: string, opts?: { logo?: boolean; qr?: boolean; dress?: boolean }) {
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const t = esc((title || 'GRATITUDE').toUpperCase());
  const logo = opts?.logo !== false;
  const qr = opts?.qr !== false;
  const dress = opts?.dress !== false;
  const noLogo = !logo ? 'no-logo' : '';
  const noDress = !dress ? 'no-dress' : '';
  return `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:ital,wght@0,400;0,500;0,700;0,800;1,800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;background:#eee;display:grid;place-items:center;min-height:100vh}
.poster{width:1024px;height:1280px;background:#fff6ea;position:relative;overflow:hidden;container-type:inline-size;font-family:Montserrat,system-ui,sans-serif}
.deco{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.logo{position:absolute;left:50%;top:2.4%;width:19%;aspect-ratio:1;transform:translateX(-50%);border-radius:50%;border:.35cqw solid #d4a017;background:#fffaf0;display:grid;place-items:center;overflow:hidden}
.logo img{width:100%;height:100%;object-fit:cover}
.org{position:absolute;left:50%;top:19.4%;transform:translateX(-50%);font-weight:500;font-size:3.03cqw;letter-spacing:.77cqw;text-transform:uppercase;color:#1b1b1b;width:94%;text-align:center;line-height:1.15}
.org.no-logo{top:13.9%}
.sub{position:absolute;left:50%;top:22.4%;transform:translateX(-50%);font-weight:700;font-size:4.79cqw;color:#111;width:92%;text-align:center;line-height:1.08}
.sub.no-logo{top:16.9%}
.title{position:absolute;left:50%;top:28.6%;transform:translateX(-50%);width:92%;height:20.7%;display:block;overflow:visible}
.title.no-logo{top:23.1%}
.title text{font-family:Anton,"Arial Narrow",Impact,sans-serif}
.year{position:absolute;left:50%;top:49.8%;transform:translateX(-50%) skewX(-8deg);font-style:italic;font-weight:800;font-size:8.5cqw;line-height:1;color:#b3121a;letter-spacing:.1cqw;white-space:nowrap}
.year.no-logo{top:44.3%}
.info{position:absolute;left:4%;right:4%;top:62.9%;display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;align-items:center;gap:0;font-weight:500;color:#111}
.info.no-logo{top:58%}.info.no-dress{top:65.5%}.info.no-logo.no-dress{top:60.5%}
.info .c{display:flex;align-items:center;gap:1.4cqw;padding:0 2.4cqw;min-height:7.2cqw;border-right:1px solid #d4a017;min-width:0}
.info .c:last-child{border-right:0;padding-right:0}.info .c:first-child{padding-left:0}
.info svg{width:5.4cqw;height:5.4cqw;flex:0 0 auto}.info .v{font-size:4cqw;line-height:1;white-space:nowrap}
.info .loc{align-items:flex-start}.info .loc svg{margin-top:.3cqw}
.info .loc .t{font-size:2.55cqw;line-height:1.25;font-weight:700;text-transform:uppercase;overflow-wrap:anywhere}
.info .loc .t b{display:block;font-size:1.75cqw;margin-bottom:.2cqw}
.info .qrc{flex-direction:column;gap:.7cqw;padding-left:2.2cqw}
.info .qrc .lab{font-size:2.34cqw;font-weight:700;line-height:1;color:#111;text-align:center}
.qrcard{width:12.3cqw;aspect-ratio:1;background:#fff;border:.25cqw solid #d4a017;border-radius:1.2cqw;display:grid;place-items:center;position:relative;padding:8%;box-sizing:border-box;overflow:hidden}
.qrcard .qr{width:100%;height:100%;background:repeating-linear-gradient(45deg,#111 0 2px,#fff 2px 4px)}
.dress{position:absolute;left:50%;top:78.7%;transform:translateX(-50%);display:flex;align-items:center;gap:2cqw;padding:1.8cqw 5cqw;border:2px solid #d4a017;border-radius:999px;background:#fff3dc;color:#111;white-space:nowrap}
.dress.off{display:none}
.dress small{display:block;font-size:1.95cqw;font-weight:700;letter-spacing:.1cqw;line-height:1}
.dress strong{display:block;font-size:4.5cqw;font-weight:400;line-height:1.05;font-family:Anton,"Arial Narrow",Impact,sans-serif;letter-spacing:.03em}
</style></head><body>
<div class="poster" id="poster" data-testid="gratitude-invitation">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><pattern id="afro" width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-32) scale(1.15)"><g transform="translate(0,0)"><rect width="240" height="30" fill="#c8281e"/><polyline points="0,4 15,26 30,4 45,26 60,4 75,26 90,4 105,26 120,4 135,26 150,4 165,26 180,4 195,26 210,4 225,26 240,4" fill="none" stroke="#f2b21a" stroke-width="5"/></g><g transform="translate(0,30)"><rect width="240" height="30" fill="#1e8a3c"/></g><g transform="translate(0,60)"><rect width="240" height="30" fill="#f2b21a"/></g><g transform="translate(0,90)"><rect width="240" height="30" fill="#e8731a"/></g><g transform="translate(0,120)"><rect width="240" height="30" fill="#f2b21a"/></g><g transform="translate(0,150)"><rect width="240" height="30" fill="#f2b21a"/></g><g transform="translate(0,180)"><rect width="240" height="30" fill="#1e8a3c"/></g><g transform="translate(0,210)"><rect width="240" height="30" fill="#c8281e"/></g></pattern></defs></svg>
  <svg class="deco" viewBox="0 0 1024 1280" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c6a1f"/><stop offset=".35" stop-color="#f3d580"/><stop offset=".65" stop-color="#b8862b"/><stop offset="1" stop-color="#f7e3a0"/></linearGradient><pattern id="geo" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M45 6 84 45 45 84 6 45Z M45 24 66 45 45 66 24 45Z M0 0 45 45 90 0M0 90 45 45 90 90" fill="none" stroke="#e9d3a6" stroke-width="5"/></pattern><radialGradient id="rTR" gradientUnits="userSpaceOnUse" cx="1024" cy="0" r="460"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#000"/></radialGradient><radialGradient id="rBL" gradientUnits="userSpaceOnUse" cx="0" cy="1280" r="460"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="mTR"><rect width="1024" height="1280" fill="url(#rTR)"/></mask><mask id="mBL"><rect width="1024" height="1280" fill="url(#rBL)"/></mask><pattern id="rib" width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-30) scale(.9)"><rect width="240" height="240" fill="#c8281e"/></pattern></defs><rect width="1024" height="1280" fill="url(#geo)" mask="url(#mTR)" opacity=".4"/><rect width="1024" height="1280" fill="url(#geo)" mask="url(#mBL)" opacity=".4"/><path d="M0 0H440C330 78 190 160 0 236Z" fill="url(#rib)"/><path d="M440 0C330 78 190 160 0 236" fill="none" stroke="url(#gold)" stroke-width="26"/><path d="M1024 1280H540C700 1215 900 1110 1024 1000Z" fill="url(#rib)"/><path d="M540 1280C700 1215 900 1110 1024 1000" fill="none" stroke="url(#gold)" stroke-width="30"/></svg>
  ${logo ? '<div class="logo" data-testid="gratitude-logo-wrap"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Logo" data-testid="gratitude-logo"></div>' : ''}
  <div class="org ${noLogo}" data-testid="gratitude-org">IGREJA CRISTÃ REINO-CHURCH</div>
  <div class="sub ${noLogo}" data-testid="gratitude-subtitle">FESTIVAL DE ADOLESCENTES</div>
  <svg id="titleSvg" class="title ${noLogo}" viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" aria-label="Título" data-testid="gratitude-title"><text id="titleText" x="0" y="0" font-family="Anton,'Arial Narrow',Impact,sans-serif" font-size="300" fill="url(#afro)" stroke="#161616" stroke-width="2.2" vector-effect="non-scaling-stroke" paint-order="stroke fill" stroke-linejoin="round">${t}</text></svg>
  <div class="year ${noLogo}" data-testid="gratitude-highlight">2026</div>
  <div class="info ${noLogo} ${noDress}" data-testid="gratitude-info">
    <div class="c" data-testid="info-date"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><rect x="3" y="4.5" width="18" height="16" rx="3"/></svg><span class="v">20/12</span></div>
    <div class="c" data-testid="info-time"><svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2"><circle cx="12" cy="12" r="9.5"/></svg><span class="v">14:00</span></div>
    <div class="c loc" data-testid="info-location"><svg viewBox="0 0 24 24" fill="#111"><path d="M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/></svg><div class="t"><b>LOCAL:</b><span>Igreja Cristã<br>Reino Church</span></div></div>
    ${qr ? '<div class="c qrc" data-testid="gratitude-qr"><div class="lab">Informação</div><div class="qrcard" data-testid="gratitude-qr-card"><div class="qr"></div></div></div>' : ''}
  </div>
  <div class="dress ${dress ? '' : 'off'}" data-testid="gratitude-dresscode"><svg viewBox="0 0 64 56"><path d="M20 3 4 12l6 14 8-3v28h28V23l8 3 6-14L44 3c-2 5-6 8-12 8S22 8 20 3Z" fill="#d49a1a"/></svg><div><small>DRESS-CODE:</small><strong>TRAJE AFRICANO</strong></div></div>
</div>
<script>
(function(){
  var el=document.getElementById('titleText'),svg=document.getElementById('titleSvg');
  function fit(){
    var txt=el.textContent||' ';
    var c=document.createElement('canvas').getContext('2d');
    c.font='300px Anton, "Arial Narrow", Impact, sans-serif';
    var m=c.measureText(txt);var w=m.actualBoundingBoxLeft+m.actualBoundingBoxRight,h=m.actualBoundingBoxAscent+m.actualBoundingBoxDescent;
    if(!w||!h)return;var p=4;el.setAttribute('x',m.actualBoundingBoxLeft+p);el.setAttribute('y',m.actualBoundingBoxAscent+p);svg.setAttribute('viewBox','0 0 '+(w+2*p)+' '+(h+2*p));
  }
  fit(); if(document.fonts&&document.fonts.load)document.fonts.load('300px Anton').then(fit);
})();
</script></body></html>`;
}

test.describe('Gratitude fidelity (reference HTML)', () => {
  test.use({ viewport: { width: 1024, height: 1280 } });

  test('layout bbox checks and capture', async ({ page }) => {
    await page.setContent(gratitudeHtml('GRATITUDE'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const box = async (id: string) => {
      const b = await page.locator(`[data-testid="${id}"]`).boundingBox();
      expect(b, id).toBeTruthy();
      return b!;
    };
    const within = (b: { x: number; y: number; width: number; height: number }, name: string) => {
      expect(b.x, `${name} left`).toBeGreaterThanOrEqual(-2);
      expect(b.y, `${name} top`).toBeGreaterThanOrEqual(-2);
      expect(b.x + b.width, `${name} right`).toBeLessThanOrEqual(1026);
      expect(b.y + b.height, `${name} bottom`).toBeLessThanOrEqual(1282);
    };
    const org = await box('gratitude-org');
    const subtitle = await box('gratitude-subtitle');
    const title = await box('gratitude-title');
    const highlight = await box('gratitude-highlight');
    const info = await box('gratitude-info');
    const dress = await box('gratitude-dresscode');
    [org, subtitle, title, highlight, info, dress].forEach((b, i) => within(b, ['org', 'subtitle', 'title', 'highlight', 'info', 'dress'][i]));
    expect(title.width).toBeGreaterThanOrEqual(1024 * 0.8);
    expect(org.y).toBeLessThan(subtitle.y);
    expect(subtitle.y).toBeLessThan(title.y);
    expect(title.y).toBeLessThan(highlight.y);
    expect(highlight.y).toBeLessThan(info.y);
    expect(info.y).toBeLessThan(dress.y);

    // Year should be close to title bottom (no big gap)
    expect(highlight.y - (title.y + title.height)).toBeLessThan(80);

    // QR inside card
    const qr = await box('gratitude-qr');
    const qrCard = await box('gratitude-qr-card');
    expect(qrCard.x).toBeGreaterThanOrEqual(qr.x - 2);
    expect(qrCard.y).toBeGreaterThanOrEqual(qr.y - 2);
    expect(qrCard.x + qrCard.width).toBeLessThanOrEqual(qr.x + qr.width + 2);
    expect(qrCard.y + qrCard.height).toBeLessThanOrEqual(qr.y + qr.height + 30);

    // No info-row column overlap
    const date = await box('info-date');
    const time = await box('info-time');
    const loc = await box('info-location');
    expect(date.x + date.width).toBeLessThanOrEqual(time.x + 2);
    expect(time.x + time.width).toBeLessThanOrEqual(loc.x + 2);
    expect(loc.x + loc.width).toBeLessThanOrEqual(qr.x + 2);

    // No "LOGO" text in DOM
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('LOGO');

    const out = resolve(__dirname, '../../docs/assets/gratitude-render.png');
    mkdirSync(resolve(__dirname, '../../docs/assets'), { recursive: true });
    await page.locator('#poster').screenshot({ path: out });
  });

  test('long title no cut', async ({ page }) => {
    await page.setContent(gratitudeHtml('O NOSSO DIA ESPECIAL'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const title = await page.locator('[data-testid="gratitude-title"]').boundingBox();
    expect(title).toBeTruthy();
    expect(title!.x).toBeGreaterThanOrEqual(-2);
    expect(title!.x + title!.width).toBeLessThanOrEqual(1026);
  });

  test('no logo, no qr, no dress code leaves no LOGO text and closes space', async ({ page }) => {
    await page.setContent(gratitudeHtml('GRATITUDE', { logo: false, qr: false, dress: false }), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('LOGO');
    await expect(page.locator('[data-testid="gratitude-logo"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="gratitude-qr"]')).toHaveCount(0);
  });
});
