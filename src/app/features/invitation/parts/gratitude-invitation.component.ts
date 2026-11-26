import { AfterViewInit, Component, ElementRef, computed, effect, inject, input, output, viewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TemplateManifest } from '../../../core/models/template-manifest';
import { qrCodeSvg } from '../../../shared/utils/qr-svg.util';
import { InvitationEventView } from '../invitation.models';

interface GratitudeFields {
  organization: string;
  subtitle: string;
  title: string;
  year: string;
  date: string;
  time: string;
  location: string;
  locationLines: string[];
  dressCode: string;
  logoUrl: string | null;
  logoShape: 'circle' | 'original';
  logoSize: 'sm' | 'md' | 'lg';
  qrLabel: string;
  qrTarget: string | null;
  qrImageUrl: string | null;
  qrIcon: 'none' | 'whatsapp' | 'brand';
  qrSize: 'md' | 'lg';
}

/**
 * Gratitude — fiel à referência visual. Poster 4:5, Anton + Montserrat.
 * Sem placeholders de LOGO/QR no convite público: blocos ausentes fecham espaço.
 */
@Component({
  selector: 'app-gratitude-invitation',
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Anton&family=Montserrat:ital,wght@0,400;0,500;0,700;0,800;1,800&display=swap');
    :host { display: block; }
    .poster{
      width:100%; max-width:42rem; margin:0 auto;
      background:#fff6ea; position:relative; overflow:hidden;
      aspect-ratio:4/5; container-type:inline-size;
      border-radius:1.25rem;
      box-shadow:0 20px 60px rgba(40,24,8,.16);
      border:1px solid rgba(216,192,137,.45);
      font-family:Montserrat,system-ui,sans-serif;
    }
    .deco{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .content{
      position:absolute;left:0;right:0;top:10%;bottom:16.8%;
      display:flex;flex-direction:column;align-items:center;justify-content:space-evenly;
      gap:1cqw;padding:0 4cqw;text-align:center;
    }
    .logo{
      width:19%;aspect-ratio:1;flex:0 0 auto;
      border-radius:50%;border:.35cqw solid #d4a017;background:#fffaf0;
      display:grid;place-items:center;overflow:hidden;
    }
    .logo.original{border-radius:1.2cqw}
    .logo.sm{width:14%}.logo.lg{width:23%}
    .logo img{width:100%;height:100%;object-fit:cover;display:block}
    .logo.placeholder{border:.35cqw dashed #d4a017;background:rgba(255,250,240,.6);cursor:pointer}
    .logo.placeholder span{font-size:1.5cqw;font-weight:700;color:#b8862b;text-align:center;padding:8%;line-height:1.2}
    .org{
      font-weight:500;font-size:3.03cqw;letter-spacing:.77cqw;text-transform:uppercase;color:#1b1b1b;
      width:100%;line-height:1.15;margin-top:.2cqw;
    }
    .sub{
      font-weight:700;font-size:4.79cqw;color:#111;width:100%;line-height:1.08;
      margin-top:0;
      margin-bottom:1.2cqw;
    }
    .title{
      width:92%;height:20%;display:block;overflow:visible;flex:0 0 auto;margin:0 0 0;
    }
    .title text{font-family:Anton,"Arial Narrow",Impact,sans-serif}
    .year{
      transform:skewX(-8deg);
      font-style:italic;font-weight:800;font-size:8.5cqw;line-height:1;color:#b3121a;
      letter-spacing:.1cqw;white-space:nowrap;margin-top:0cqw;
    }
    .info{
      width:100%;display:grid;grid-template-columns:max-content max-content minmax(0,1fr) max-content;
      align-items:center;gap:0;font-weight:500;color:#111;margin-top:0.8cqw;
    }
    .info .c{
      display:flex;align-items:center;gap:1.4cqw;padding:0 2cqw;min-height:7.2cqw;
      border-right:1px solid #d4a017;min-width:0;
    }
    .info .c:last-child{border-right:0;padding-right:0}
    .info .c:first-child{padding-left:0}
    .info svg{width:5.4cqw;height:5.4cqw;flex:0 0 auto}
    .info .v{font-size:4cqw;line-height:1;white-space:nowrap}
    .info .loc{align-items:flex-start}
    .info .loc svg{margin-top:.3cqw}
    .info .loc .t{font-size:2.55cqw;line-height:1.25;font-weight:700;text-transform:uppercase;overflow-wrap:anywhere;text-align:left}
    .info .loc .t b{display:block;font-size:1.75cqw;margin-bottom:.2cqw}
    .info .qrc{flex-direction:column;gap:.7cqw;padding-left:2cqw}
    .info .qrc .lab{font-size:2.34cqw;font-weight:700;line-height:1;color:#111;text-align:center}
    .qrcard{
      width:12.3cqw;aspect-ratio:1;background:#fff;border:.25cqw solid #d4a017;border-radius:1.2cqw;
      display:grid;place-items:center;position:relative;padding:8%;box-sizing:border-box;overflow:hidden;
    }
    .qrcard.lg{width:14cqw}
    .qrcard .qr-svg,.qrcard .qr-svg svg{width:100%;height:100%;display:block}
    .qrcard .qr-img{width:100%;height:100%;object-fit:contain;display:block}
    .qrcard .badge{
      position:absolute;width:28%;aspect-ratio:1;border-radius:50%;background:#fff;
      display:grid;place-items:center;box-shadow:0 0 0 .35cqw #fff;
    }
    .qrcard .badge svg{width:82%;height:82%}
    .dress{
      display:flex;align-items:center;gap:2cqw;padding:1.8cqw 5cqw;
      border:2px solid #d4a017;border-radius:999px;background:#fff3dc;color:#111;white-space:nowrap;
      margin-top:1.2cqw;
    }
    .dress.off{display:none}
    .dress svg{width:5.2cqw;height:4.5cqw;flex:0 0 auto}
    .dress small{display:block;font-size:1.95cqw;font-weight:700;letter-spacing:.1cqw;line-height:1}
    .dress strong{display:block;font-size:4.5cqw;font-weight:400;line-height:1.05;font-family:Anton,"Arial Narrow",Impact,sans-serif;letter-spacing:.03em}
  `],
  template: `
    <section class="mx-auto w-full max-w-[42rem]" data-testid="gratitude-invitation">
      <div class="poster" aria-label="Convite Gratitude">
        <svg class="deco" viewBox="0 0 1024 1280" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8c6a1f"/><stop offset=".35" stop-color="#f3d580"/><stop offset=".65" stop-color="#b8862b"/><stop offset="1" stop-color="#f7e3a0"/></linearGradient>
            <pattern id="geo" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M45 6 84 45 45 84 6 45Z M45 24 66 45 45 66 24 45Z M0 0 45 45 90 0M0 90 45 45 90 90" fill="none" stroke="#e9d3a6" stroke-width="5"/></pattern>
            <radialGradient id="rTR" gradientUnits="userSpaceOnUse" cx="1024" cy="0" r="460"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#000"/></radialGradient>
            <radialGradient id="rBL" gradientUnits="userSpaceOnUse" cx="0" cy="1280" r="460"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#000"/></radialGradient>
            <mask id="mTR"><rect width="1024" height="1280" fill="url(#rTR)"/></mask>
            <mask id="mBL"><rect width="1024" height="1280" fill="url(#rBL)"/></mask>
            <pattern id="rib" width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-30) scale(.9)"><g transform="translate(0,0)"><rect width="240" height="30" fill="#c8281e"/><polyline points="0,4 15,26 30,4 45,26 60,4 75,26 90,4 105,26 120,4 135,26 150,4 165,26 180,4 195,26 210,4 225,26 240,4" fill="none" stroke="#f2b21a" stroke-width="5"/></g><g transform="translate(0,30)"><rect width="240" height="30" fill="#1e8a3c"/><path d="M3 27 15 4 27 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M33 27 45 4 57 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M63 27 75 4 87 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M93 27 105 4 117 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M123 27 135 4 147 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M153 27 165 4 177 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M183 27 195 4 207 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M213 27 225 4 237 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/></g><g transform="translate(0,60)"><rect width="240" height="30" fill="#9a1d15"/><path d="M2 22 15 8 28 22M2 14 15 1 28 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M32 22 45 8 58 22M32 14 45 1 58 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M62 22 75 8 88 22M62 14 75 1 88 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M92 22 105 8 118 22M92 14 105 1 118 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M122 22 135 8 148 22M122 14 135 1 148 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M152 22 165 8 178 22M152 14 165 1 178 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M182 22 195 8 208 22M182 14 195 1 208 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M212 22 225 8 238 22M212 14 225 1 238 14" fill="none" stroke="#161616" stroke-width="4"/></g><g transform="translate(0,90)"><rect width="240" height="30" fill="#161616"/><path d="M15 3 27 15 15 27 3 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="15" cy="15" r="3" fill="#f2b21a"/><path d="M45 3 57 15 45 27 33 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="45" cy="15" r="3" fill="#f2b21a"/><path d="M75 3 87 15 75 27 63 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="75" cy="15" r="3" fill="#f2b21a"/><path d="M105 3 117 15 105 27 93 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="105" cy="15" r="3" fill="#f2b21a"/><path d="M135 3 147 15 135 27 123 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="135" cy="15" r="3" fill="#f2b21a"/><path d="M165 3 177 15 165 27 153 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="165" cy="15" r="3" fill="#f2b21a"/><path d="M195 3 207 15 195 27 183 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="195" cy="15" r="3" fill="#f2b21a"/><path d="M225 3 237 15 225 27 213 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="225" cy="15" r="3" fill="#f2b21a"/></g><g transform="translate(0,120)"><rect width="240" height="30" fill="#9a1d15"/><circle cx="15" cy="15" r="5" fill="#f2b21a"/><circle cx="45" cy="15" r="5" fill="#c8281e"/><circle cx="75" cy="15" r="5" fill="#f2b21a"/><circle cx="105" cy="15" r="5" fill="#c8281e"/><circle cx="135" cy="15" r="5" fill="#f2b21a"/><circle cx="165" cy="15" r="5" fill="#c8281e"/><circle cx="195" cy="15" r="5" fill="#f2b21a"/><circle cx="225" cy="15" r="5" fill="#c8281e"/></g><g transform="translate(0,150)"><rect width="240" height="30" fill="#9a1d15"/><polyline points="0,4 15,26 30,4 45,26 60,4 75,26 90,4 105,26 120,4 135,26 150,4 165,26 180,4 195,26 210,4 225,26 240,4" fill="none" stroke="#f2b21a" stroke-width="6"/></g><g transform="translate(0,180)"><rect width="240" height="30" fill="#1e8a3c"/><path d="M2 22 15 8 28 22M2 14 15 1 28 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M32 22 45 8 58 22M32 14 45 1 58 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M62 22 75 8 88 22M62 14 75 1 88 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M92 22 105 8 118 22M92 14 105 1 118 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M122 22 135 8 148 22M122 14 135 1 148 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M152 22 165 8 178 22M152 14 165 1 178 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M182 22 195 8 208 22M182 14 195 1 208 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M212 22 225 8 238 22M212 14 225 1 238 14" fill="none" stroke="#f2b21a" stroke-width="4"/></g><g transform="translate(0,210)"><rect width="240" height="30" fill="#c8281e"/><path d="M3 3 15 26 27 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M33 3 45 26 57 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M63 3 75 26 87 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M93 3 105 26 117 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M123 3 135 26 147 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M153 3 165 26 177 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M183 3 195 26 207 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M213 3 225 26 237 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/></g><path d="M0 0H240" stroke="#161616" stroke-width="2"/><path d="M0 30H240" stroke="#161616" stroke-width="2"/><path d="M0 60H240" stroke="#161616" stroke-width="2"/><path d="M0 90H240" stroke="#161616" stroke-width="2"/><path d="M0 120H240" stroke="#161616" stroke-width="2"/><path d="M0 150H240" stroke="#161616" stroke-width="2"/><path d="M0 180H240" stroke="#161616" stroke-width="2"/><path d="M0 210H240" stroke="#161616" stroke-width="2"/><path d="M0 240H240" stroke="#161616" stroke-width="2"/></pattern>
            <pattern id="afro" width="240" height="240" patternUnits="userSpaceOnUse" patternTransform="rotate(-32) scale(1.15)"><g transform="translate(0,0)"><rect width="240" height="30" fill="#c8281e"/><polyline points="0,4 15,26 30,4 45,26 60,4 75,26 90,4 105,26 120,4 135,26 150,4 165,26 180,4 195,26 210,4 225,26 240,4" fill="none" stroke="#f2b21a" stroke-width="5" stroke-linejoin="miter"/></g><g transform="translate(0,30)"><rect width="240" height="30" fill="#1e8a3c"/><path d="M3 27 15 4 27 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M33 27 45 4 57 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M63 27 75 4 87 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M93 27 105 4 117 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M123 27 135 4 147 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M153 27 165 4 177 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M183 27 195 4 207 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/><path d="M213 27 225 4 237 27Z" fill="#e8731a" stroke="#161616" stroke-width="2.4"/></g><g transform="translate(0,60)"><rect width="240" height="30" fill="#f2b21a"/><path d="M2 22 15 8 28 22M2 14 15 1 28 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M32 22 45 8 58 22M32 14 45 1 58 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M62 22 75 8 88 22M62 14 75 1 88 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M92 22 105 8 118 22M92 14 105 1 118 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M122 22 135 8 148 22M122 14 135 1 148 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M152 22 165 8 178 22M152 14 165 1 178 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M182 22 195 8 208 22M182 14 195 1 208 14" fill="none" stroke="#161616" stroke-width="4"/><path d="M212 22 225 8 238 22M212 14 225 1 238 14" fill="none" stroke="#161616" stroke-width="4"/></g><g transform="translate(0,90)"><rect width="240" height="30" fill="#e8731a"/><path d="M15 3 27 15 15 27 3 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="15" cy="15" r="3" fill="#f2b21a"/><path d="M45 3 57 15 45 27 33 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="45" cy="15" r="3" fill="#f2b21a"/><path d="M75 3 87 15 75 27 63 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="75" cy="15" r="3" fill="#f2b21a"/><path d="M105 3 117 15 105 27 93 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="105" cy="15" r="3" fill="#f2b21a"/><path d="M135 3 147 15 135 27 123 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="135" cy="15" r="3" fill="#f2b21a"/><path d="M165 3 177 15 165 27 153 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="165" cy="15" r="3" fill="#f2b21a"/><path d="M195 3 207 15 195 27 183 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="195" cy="15" r="3" fill="#f2b21a"/><path d="M225 3 237 15 225 27 213 15Z" fill="#1e8a3c" stroke="#161616" stroke-width="2.4"/><circle cx="225" cy="15" r="3" fill="#f2b21a"/></g><g transform="translate(0,120)"><rect width="240" height="30" fill="#f2b21a"/><circle cx="15" cy="15" r="5" fill="#f2b21a"/><circle cx="45" cy="15" r="5" fill="#c8281e"/><circle cx="75" cy="15" r="5" fill="#f2b21a"/><circle cx="105" cy="15" r="5" fill="#c8281e"/><circle cx="135" cy="15" r="5" fill="#f2b21a"/><circle cx="165" cy="15" r="5" fill="#c8281e"/><circle cx="195" cy="15" r="5" fill="#f2b21a"/><circle cx="225" cy="15" r="5" fill="#c8281e"/></g><g transform="translate(0,150)"><rect width="240" height="30" fill="#f2b21a"/><polyline points="0,4 15,26 30,4 45,26 60,4 75,26 90,4 105,26 120,4 135,26 150,4 165,26 180,4 195,26 210,4 225,26 240,4" fill="none" stroke="#c8281e" stroke-width="6" stroke-linejoin="miter"/></g><g transform="translate(0,180)"><rect width="240" height="30" fill="#1e8a3c"/><path d="M2 22 15 8 28 22M2 14 15 1 28 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M32 22 45 8 58 22M32 14 45 1 58 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M62 22 75 8 88 22M62 14 75 1 88 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M92 22 105 8 118 22M92 14 105 1 118 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M122 22 135 8 148 22M122 14 135 1 148 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M152 22 165 8 178 22M152 14 165 1 178 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M182 22 195 8 208 22M182 14 195 1 208 14" fill="none" stroke="#f2b21a" stroke-width="4"/><path d="M212 22 225 8 238 22M212 14 225 1 238 14" fill="none" stroke="#f2b21a" stroke-width="4"/></g><g transform="translate(0,210)"><rect width="240" height="30" fill="#c8281e"/><path d="M3 3 15 26 27 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M33 3 45 26 57 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M63 3 75 26 87 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M93 3 105 26 117 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M123 3 135 26 147 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M153 3 165 26 177 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M183 3 195 26 207 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/><path d="M213 3 225 26 237 3Z" fill="#f2b21a" stroke="#161616" stroke-width="2.4"/></g><path d="M0 0H240" stroke="#161616" stroke-width="2"/><path d="M0 30H240" stroke="#161616" stroke-width="2"/><path d="M0 60H240" stroke="#161616" stroke-width="2"/><path d="M0 90H240" stroke="#161616" stroke-width="2"/><path d="M0 120H240" stroke="#161616" stroke-width="2"/><path d="M0 150H240" stroke="#161616" stroke-width="2"/><path d="M0 180H240" stroke="#161616" stroke-width="2"/><path d="M0 210H240" stroke="#161616" stroke-width="2"/><path d="M0 240H240" stroke="#161616" stroke-width="2"/></pattern>
          </defs>
          <rect width="1024" height="1280" fill="url(#geo)" mask="url(#mTR)" opacity=".4"/>
          <rect width="1024" height="1280" fill="url(#geo)" mask="url(#mBL)" opacity=".4"/>
          <path d="M0 0H440C330 78 190 160 0 236Z" fill="url(#rib)"/>
          <path d="M440 0C330 78 190 160 0 236" fill="none" stroke="url(#gold)" stroke-width="26"/>
          <path d="M410 0C305 74 178 150 0 220" fill="none" stroke="#fff3c4" stroke-opacity=".85" stroke-width="4"/>
          <path d="M1024 1280H540C700 1215 900 1110 1024 1000Z" fill="url(#rib)"/>
          <path d="M540 1280C700 1215 900 1110 1024 1000" fill="none" stroke="url(#gold)" stroke-width="30"/>
          <path d="M580 1280C735 1222 915 1125 1024 1030" fill="none" stroke="#fff3c4" stroke-opacity=".85" stroke-width="4"/>
        </svg>

        <div class="content">
          @if (f().logoUrl) {
            <div class="logo" [class.original]="f().logoShape === 'original'" [class.sm]="f().logoSize === 'sm'" [class.lg]="f().logoSize === 'lg'" data-testid="gratitude-logo-wrap">
              <img [src]="f().logoUrl!" alt="Logótipo" data-testid="gratitude-logo" />
            </div>
          } @else if (editorMode()) {
            <button type="button" class="logo placeholder" data-testid="gratitude-logo-wrap" (click)="logoEdit.emit()">
              <span>Adicionar logótipo</span>
            </button>
          }

          <div class="org" data-testid="gratitude-org">{{ f().organization }}</div>
          <div class="sub" data-testid="gratitude-subtitle">{{ f().subtitle }}</div>

          <div class="title-year-group" style="display:flex;flex-direction:column;align-items:center;width:100%;gap:0.5cqw;flex:0 0 auto;">
            <svg #titleSvg class="title" viewBox="0 0 1000 300" preserveAspectRatio="none" role="img" [attr.aria-label]="f().title" data-testid="gratitude-title">
              <text #titleText x="0" y="0" font-family="Anton,'Arial Narrow',Impact,sans-serif" font-size="300" fill="url(#afro)" stroke="#161616" stroke-width="2.2" vector-effect="non-scaling-stroke" paint-order="stroke fill" stroke-linejoin="round">{{ f().title }}</text>
            </svg>
            <div class="year" data-testid="gratitude-highlight">{{ f().year }}</div>
          </div>

          <div class="info" data-testid="gratitude-info">
            <div class="c">
              <svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/><g fill="#111" stroke="none"><circle cx="8" cy="13.5" r="1.1"/><circle cx="12" cy="13.5" r="1.1"/><circle cx="16" cy="13.5" r="1.1"/><circle cx="8" cy="17" r="1.1"/><circle cx="12" cy="17" r="1.1"/><circle cx="16" cy="17" r="1.1"/></g></svg>
              <span class="v">{{ f().date }}</span>
            </div>
            <div class="c">
              <svg viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.8 2.3"/></svg>
              <span class="v">{{ f().time }}</span>
            </div>
            <div class="c loc">
              <svg viewBox="0 0 24 24" fill="#111" aria-hidden="true"><path d="M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="10" r="2.6" fill="#fff6ea"/></svg>
              <div class="t"><b>LOCAL:</b><span>@for (line of f().locationLines; track line + '-' + $index) { {{ line }}@if (!$last) {<br />} }</span></div>
            </div>
            @if (hasQr()) {
              <div class="c qrc" data-testid="gratitude-qr">
                <div class="lab">{{ f().qrLabel }}</div>
                <div class="qrcard" [class.lg]="f().qrSize === 'lg'">
                  @if (f().qrImageUrl) {
                    <img class="qr-img" [src]="f().qrImageUrl!" alt="QR code" loading="eager" />
                  } @else if (qrSvg()) {
                    <div class="qr-svg" [innerHTML]="qrSvg()"></div>
                  }
                  @if (f().qrIcon === 'whatsapp') {
                    <div class="badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="#1e8a3c"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.2 13.6c-.2.6-1.3 1.1-1.8 1.2-.5 0-1 .3-3.3-.7-2.8-1.2-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.300 2.500 1.500.3.1.5.1.7-.1l.9-1.100c.2-.3.4-.2.7-.1l1.900.9c.3.1.5.2.6.3.1.2.1.8-.1 1.400Z"/></svg></div>
                  } @else if (f().qrIcon === 'brand') {
                    <div class="badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="#c8922a"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M12 4l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/></svg></div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="dress" [class.off]="!f().dressCode" data-testid="gratitude-dresscode">
            <svg viewBox="0 0 64 56" aria-hidden="true"><path d="M20 3 4 12l6 14 8-3v28h28V23l8 3 6-14L44 3c-2 5-6 8-12 8S22 8 20 3Z" fill="#d49a1a"/><path d="M20 3c2 5 6 8 12 8s10-3 12-8" fill="none" stroke="#b27a0e" stroke-width="2"/></svg>
            <div><small>DRESS-CODE:</small><strong>{{ f().dressCode }}</strong></div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class GratitudeInvitationComponent implements AfterViewInit {
  readonly event = input.required<InvitationEventView>();
  readonly manifest = input<TemplateManifest | null>(null);
  readonly editorMode = input(false);
  readonly logoEdit = output<void>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly titleSvg = viewChild<ElementRef<SVGSVGElement>>('titleSvg');
  private readonly titleText = viewChild<ElementRef<SVGTextElement>>('titleText');

  protected readonly f = computed<GratitudeFields>(() => {
    const e = this.event();
    const m = this.manifest();
    const pdf = (m?.pdf ?? {}) as TemplateManifest['pdf'] & Record<string, unknown>;
    const tz = e.timezone || 'Africa/Luanda';
    const parts = this.dateParts(e.startsAt, tz);
    const current = typeof window !== 'undefined' ? window.location.href : '';
    const eRec = e as unknown as Record<string, unknown>;
    const eventPublic = String(eRec['publicUrl'] || eRec['public_url'] || '');
    const qrMode = pdf.qr_mode || pdf.qr_destination || 'invite';
    let qrTarget: string | null = null;
    let qrImageUrl: string | null = null;
    if (qrMode === 'image') {
      qrImageUrl = typeof pdf.qr_image_url === 'string' && pdf.qr_image_url.trim() ? pdf.qr_image_url.trim() : null;
    } else if (qrMode === 'whatsapp') {
      const phone = String(pdf.qr_whatsapp_phone || '').replace(/\D/g, '').replace(/^00/, '');
      if (phone) {
        const msg = String(pdf.qr_whatsapp_message || '').trim();
        qrTarget = `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
      }
    } else if (qrMode === 'custom') {
      const custom = String(pdf.qr_custom_url || '').trim();
      qrTarget = /^https?:\/\//i.test(custom) ? custom : null;
    } else if (qrMode === 'event') {
      qrTarget = eventPublic || current || null;
    } else {
      qrTarget = current || eventPublic || null;
    }
    const logoUrl = typeof pdf.logo_url === 'string' && pdf.logo_url.trim() ? pdf.logo_url.trim() : null;
    const location = e.venue || e.city || e.onlineLink || 'Igreja Cristã Reino Church';
    return {
      organization: (e.hostName || 'IGREJA CRISTÃ REINO-CHURCH').toUpperCase(),
      subtitle: this.subtitleFor(e),
      title: (e.title || 'GRATITUDE').toUpperCase(),
      year: parts.year,
      date: parts.date,
      time: parts.time,
      location,
      locationLines: this.locationLines(location),
      dressCode: (e.dressCode || '').trim().toUpperCase(),
      logoUrl,
      logoShape: pdf.logo_shape === 'original' ? 'original' : 'circle',
      logoSize: pdf.logo_size === 'sm' ? 'sm' : pdf.logo_size === 'lg' ? 'lg' : 'md',
      qrLabel: String(pdf.qr_label || 'Informação').trim() || 'Informação',
      qrTarget,
      qrImageUrl,
      qrIcon: pdf.qr_icon === 'none' || pdf.qr_icon === 'whatsapp' || pdf.qr_icon === 'brand' ? pdf.qr_icon : 'brand',
      qrSize: pdf.qr_size === 'lg' ? 'lg' : 'md',
    };
  });

  protected readonly qrSvg = computed<SafeHtml | null>(() => {
    const f = this.f();
    if (f.qrImageUrl || !f.qrTarget) return null;
    try {
      const svg = qrCodeSvg(f.qrTarget, 'H');
      return this.sanitizer.bypassSecurityTrustHtml(svg);
    } catch {
      return null;
    }
  });

  protected readonly hasQr = computed(() => {
    const f = this.f();
    return !!(f.qrTarget || f.qrImageUrl);
  });

  constructor() {
    effect(() => {
      void this.f().title;
      queueMicrotask(() => this.fitTitle());
    });
  }

  ngAfterViewInit(): void {
    this.fitTitle();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void (document as Document & { fonts: { load: (f: string) => Promise<unknown[]> } }).fonts.load('300px Anton').then(() => this.fitTitle());
    }
  }

  private fitTitle(): void {
    const svg = this.titleSvg()?.nativeElement;
    const text = this.titleText()?.nativeElement;
    if (!svg || !text || typeof document === 'undefined') return;
    const txt = (this.f().title || ' ').toUpperCase();
    text.textContent = txt;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = '300px Anton, "Arial Narrow", Impact, sans-serif';
      const m = ctx.measureText(txt);
      const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      if (!w || !h) return;
      const p = 4;
      text.setAttribute('x', String(m.actualBoundingBoxLeft + p));
      text.setAttribute('y', String(m.actualBoundingBoxAscent + p));
      svg.setAttribute('viewBox', `0 0 ${w + 2 * p} ${h + 2 * p}`);
    } catch {
      // keep default viewBox
    }
  }

  private dateParts(iso: string | null | undefined, timeZone: string): { date: string; time: string; year: string } {
    if (!iso) return { date: '20/12', time: '14:00', year: '2026' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: '20/12', time: '14:00', year: '2026' };
    try {
      const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
      });
      const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
      return {
        date: `${parts['day'] ?? '20'}/${parts['month'] ?? '12'}`,
        time: `${parts['hour'] ?? '14'}:${parts['minute'] ?? '00'}`,
        year: parts['year'] ?? '2026',
      };
    } catch {
      const pad = (n: number) => String(n).padStart(2, '0');
      return { date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, year: String(d.getFullYear()) };
    }
  }

  private subtitleFor(e: InvitationEventView): string {
    if (e.title?.toUpperCase().includes('GRATITUDE')) return 'FESTIVAL DE ADOLESCENTES';
    const map: Record<string, string> = {
      birthday: 'CELEBRAÇÃO DE ANIVERSÁRIO',
      wedding: 'CELEBRAÇÃO DE CASAMENTO',
      corporate: 'EVENTO CORPORATIVO',
      baby: 'CELEBRAÇÃO FAMILIAR',
      other: 'CELEBRAÇÃO ESPECIAL',
    };
    return map[e.type ?? 'other'] ?? 'CELEBRAÇÃO ESPECIAL';
  }

  private locationLines(text: string): string[] {
    const clean = (text || 'Local a confirmar').trim();
    if (!clean) return ['Local a confirmar'];
    const max = 24;
    if (clean.length <= max) return [clean];
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= max) cur = next;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
}
