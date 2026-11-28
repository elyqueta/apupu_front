import { AfterViewInit, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { I18nService } from '../../../core/i18n/i18n.service';
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
  locationMore: string;
  dressCode: string;
  logoUrl: string | null;
  logoShape: 'circle' | 'original';
  logoSize: 'sm' | 'md' | 'lg';
  qrLabel: string;
  qrTarget: string | null;
  qrImageUrl: string | null;
  qrIcon: 'none' | 'platform';
  qrSize: 'md' | 'lg';
}

/** Shared with the PDF renderer: PDF uses 195 base units, the screen poster 300. */
const TITLE_VIEWBOX_WIDTH = 1000;
const TITLE_VIEWBOX_HEIGHT = 300;
const TITLE_BAND_WIDTH = 910;
const TITLE_BAND_HEIGHT = TITLE_VIEWBOX_HEIGHT;
const TITLE_BASE_FONT_SIZE = 300;
const TITLE_MIN_FONT_SIZE = 90;
const TITLE_FONT_STEP = 10;
const TITLE_PAD = 4;
const TITLE_FONT_STACK = 'Anton, "Arial Narrow", Impact, sans-serif';

/**
 * Gratitude — fiel à referência visual. Poster 4:5, Anton + Montserrat locais.
 * Sem placeholders de LOGO/QR no convite público: o logótipo só aparece quando existe `pdf.logo_url`.
 */
@Component({
  selector: 'app-gratitude-invitation',
  styles: [`
    @font-face {
      font-family:'Anton';
      src:url('/fonts/Anton-400.ttf') format('truetype');
      font-weight:400;font-style:normal;font-display:swap;
    }
    :host { display: block; }
    .poster{
      width:100%; max-width:none; min-width:0; margin:0;
      background:radial-gradient(circle at 50% 45%,#fffdf8 0%,#fff6ea 55%,#fbe9cf 100%);
      position:relative; overflow:hidden;
      aspect-ratio:4/5; container-type:inline-size;
      border-radius:14px; box-shadow:var(--shadow-card);
      font-family:Montserrat,system-ui,sans-serif; box-sizing:border-box;
    }
    /* Convite público: a arte rompe a caixa central e ocupa a viewport inteira.
       A casca faz o clip horizontal para não criar scroll. Editores e capas
       mantêm o cartaz dentro do contentor. */
    .poster.full-bleed{
      width:100vw; margin-left:calc(50% - 50vw);
      border-radius:0;
    }
    .deco{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .logo{
      position:absolute;top:2.4%;left:50%;transform:translateX(-50%);
      width:19%;aspect-ratio:1;border-radius:50%;overflow:hidden;
      display:grid;place-items:center;box-sizing:border-box;
    }
    .logo.original{border-radius:1.2cqw}
    .logo.sm{width:14%}.logo.lg{width:23%}
    .logo img{width:100%;height:100%;object-fit:cover;display:block}
    .logo.placeholder{border:.35cqw dashed #d4a017;background:rgba(255,250,240,.7);cursor:pointer}
    .logo.placeholder span{font-size:1.5cqw;font-weight:700;color:#b8862b;text-align:center;padding:8%;line-height:1.2}
    .org{
      position:absolute;top:19.4%;left:0;right:0;text-align:center;
      font-weight:500;font-size:2.7cqw;letter-spacing:.27em;padding-left:.27em;
      text-transform:uppercase;color:#1b1b1b;line-height:1.15;
    }
    .sub{
      position:absolute;top:22.4%;left:0;right:0;text-align:center;
      font-weight:800;font-size:4.7cqw;color:#111;line-height:1.1;
      text-transform:uppercase;letter-spacing:.01em;
    }
    .guest-name{
      position:absolute;top:26.5%;left:5%;right:5%;margin:0;
      text-align:center;font-weight:700;color:#111;line-height:1.05;
      font-size:clamp(8px,2cqw,26px);letter-spacing:.02em;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;
    }
    .title{
      position:absolute;left:4.5%;top:28.6%;width:91%;height:20.7%;
      display:block;overflow:visible;box-sizing:border-box;
    }
    .title text{font-family:Anton,'Arial Narrow',Impact,sans-serif}
    .year{
      position:absolute;top:49.8%;left:0;right:0;text-align:center;
      font-family:Montserrat,system-ui,sans-serif;font-style:italic;font-weight:800;
      font-size:9.6cqw;line-height:1.15;letter-spacing:-.01em;
      color:#b3121a;white-space:nowrap;
    }
    .year span{display:inline-block;transform:skewX(-4deg)}
    .info{
      position:absolute;left:4cqw;right:4cqw;top:62.9%;
      display:flex;align-items:center;justify-content:space-between;gap:0;
      font-weight:500;color:#111;box-sizing:border-box;
    }
    .info .c{
      display:flex;flex:1 1 0;align-items:center;justify-content:center;gap:1.4cqw;padding:0 2cqw;
      min-height:11cqw;box-sizing:border-box;min-width:0;
    }
    .info .c + .c{border-left:.45cqw solid #d4a017}
    .info .c:first-child{padding-left:0}
    .info .c:last-child{padding-right:0}
    .info svg{width:5.4cqw;height:5.4cqw;flex:0 0 auto}
    .info .v{font-size:3.7cqw;font-weight:400;letter-spacing:.1em;line-height:1;white-space:nowrap}
    .info .loc{align-items:flex-start}
    .info .loc svg{margin-top:.3cqw}
    .info .loc .t{font-size:2.35cqw;line-height:1.2;font-weight:800;text-transform:uppercase;overflow-wrap:anywhere;text-align:left}
    .info .loc .t b{display:block;font-size:2.2cqw;letter-spacing:.03em;margin-bottom:.15cqw}
    .info .loc .t span{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;line-clamp:3;overflow:hidden}
    .qrblock{
      position:absolute;top:73.2%;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:center;gap:.8cqw;
    }
    .qrblock .lab{font-size:2.9cqw;font-weight:800;line-height:1;color:#111;text-align:center}
    .qrcard{
      width:14cqw;aspect-ratio:1;background:#fff;border:.55cqw solid #d4a017;
      border-radius:2.2cqw;padding:1.1cqw;box-sizing:border-box;overflow:hidden;
      display:grid;place-items:center;position:relative;
    }
    .qrcard.lg{width:16cqw}
    .qrcard .qr-svg,.qrcard .qr-svg svg{width:100%;height:100%;display:block}
    .qrcard .qr-img{width:100%;height:100%;object-fit:contain;display:block}
    .qrcard .badge{
      position:absolute;width:28%;aspect-ratio:1;border-radius:50%;background:#fff;
      display:grid;place-items:center;outline:.35cqw solid #fff;
    }
    .qrcard .badge svg{width:82%;height:82%}
    .dress{
      position:absolute;top:88.2%;left:50%;transform:translateX(-50%);
      width:48.3%;display:flex;align-items:center;justify-content:center;gap:2.4cqw;
      padding:1.3cqw 2.6cqw;background:#fff3dc;border:.6cqw solid #d4a017;
      border-radius:999px;box-sizing:border-box;
    }
    .dress.off{display:none}
    .dress svg{width:8.5cqw;height:8.5cqw;flex:0 0 auto}
    .dress small{display:block;font-weight:800;font-size:2.8cqw;letter-spacing:.02em;line-height:1}
    .dress strong{display:block;font-family:Anton,'Arial Narrow',sans-serif;font-weight:400;font-size:4.9cqw;letter-spacing:.02em;line-height:1.05;text-transform:uppercase}
    /* Em ecrãs pequenos a arte continua proporcional, mas o texto não desaparece. */
    @container (max-width: 420px){
      .org{font-size:max(9px,2.7cqw);letter-spacing:.2em;padding-left:.2em;overflow-wrap:anywhere}
      .sub{font-size:max(13px,4.7cqw);padding:0 3cqw;box-sizing:border-box;overflow-wrap:anywhere}
      .info{left:3.5cqw;right:3.5cqw;top:60.5%}
      .info .c{gap:1cqw;padding:0 1.4cqw}
      .info svg{width:4.8cqw;height:4.8cqw}
      .info .v{font-size:max(11px,3.7cqw);letter-spacing:.06em}
      .info .loc .t{font-size:max(8.5px,2.35cqw);line-height:1.08}
      .info .loc .t b{font-size:max(8.5px,2.2cqw)}
      .qrblock .lab{font-size:max(10px,2.9cqw)}
      .dress{width:58%;gap:1.6cqw;padding:1.1cqw 2cqw}
      .dress small{font-size:max(10px,2.8cqw)}
    }
  `],
  template: `
    <section class="w-full min-w-0" data-testid="gratitude-invitation">
      <div class="poster" [class.full-bleed]="!editorMode() && !coverOnly()" aria-label="Convite Gratitude">
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

        @if (editorMode() && f().logoUrl) {
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

          @if (guestGreeting(); as greeting) {
            <p class="guest-name" data-testid="gratitude-guest-name">{{ greeting }}</p>
          }

          <svg class="title" [attr.viewBox]="titleViewBox()" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="f().title" data-testid="gratitude-title">
            <text x="0" y="0" font-family="Anton,'Arial Narrow',Impact,sans-serif" [attr.font-size]="titleFontSize()" [attr.x]="titleX()" [attr.y]="titleY()" fill="url(#afro)" stroke="#161616" stroke-width="2.2" vector-effect="non-scaling-stroke" paint-order="stroke fill" stroke-linejoin="round">{{ f().title }}</text>
          </svg>
          <div class="year" data-testid="gratitude-highlight"><span>{{ f().year }}</span></div>

          @if (!coverOnly()) {
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
              <div class="t"><b>LOCAL:</b><span>@for (line of f().locationLines; track line + '-' + $index) { {{ line }}@if (!$last) {<br />} }</span>@if (f().locationMore) {<br /><em class="inv-accent-text">{{ f().locationMore }}</em>}</div>
            </div>
          </div>

          @if (hasQr()) {
            <div class="qrblock" data-testid="gratitude-qr">
              <div class="lab">{{ f().qrLabel }}</div>
              <div class="qrcard" [class.lg]="f().qrSize === 'lg'">
                @if (f().qrImageUrl) {
                  <img class="qr-img" [src]="f().qrImageUrl!" alt="QR code" loading="eager" />
                } @else if (qrSvg()) {
                  <div class="qr-svg" [innerHTML]="qrSvg()"></div>
                }
                <!-- O símbolo da plataforma já vem embutido em qrCodeSvg(). -->
              </div>
            </div>
          }

          <div class="dress" [class.off]="!f().dressCode" data-testid="gratitude-dresscode">
            <svg viewBox="0 0 64 56" aria-hidden="true"><path d="M20 3 4 12l6 14 8-3v28h28V23l8 3 6-14L44 3c-2 5-6 8-12 8S22 8 20 3Z" fill="#d49a1a"/><path d="M20 3c2 5 6 8 12 8s10-3 12-8" fill="none" stroke="#b27a0e" stroke-width="2"/></svg>
            <div><small>DRESS-CODE:</small><strong>{{ f().dressCode }}</strong></div>
          </div>
          }
      </div>
    </section>
  `,
})
export class GratitudeInvitationComponent implements AfterViewInit {
  readonly event = input.required<InvitationEventView>();
  readonly manifest = input<TemplateManifest | null>(null);
  readonly editorMode = input(false);
  /** Bloco 16: na capa só aparecem ornamento, organização, subtítulo, título e destaque. */
  readonly coverOnly = input(false);
  readonly logoEdit = output<void>();

  private readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fontsTick = signal(0);

  readonly titleFontSize = signal(TITLE_BASE_FONT_SIZE);
  readonly titleX = signal(TITLE_PAD);
  readonly titleY = signal(TITLE_PAD + TITLE_BASE_FONT_SIZE * 0.89);
  readonly titleViewBox = signal(`0 0 ${TITLE_VIEWBOX_WIDTH} ${TITLE_VIEWBOX_HEIGHT}`);

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
    const primary = e.locations.find((l) => l.isPrimary) ?? e.locations[0];
    const location =
      primary?.address?.trim() ||
      e.address?.trim() ||
      primary?.venueName?.trim() ||
      e.venue ||
      e.city ||
      e.onlineLink ||
      'Igreja Cristã Reino Church';
    const extra = Math.max(0, e.locations.length - 1);
    return {
      organization: (e.hostName || 'IGREJA CRISTÃ REINO-CHURCH').toUpperCase(),
      subtitle: (e.subtitle || '').trim() || this.subtitleFor(e),
      title: (e.title || 'GRATITUDE').toUpperCase(),
      year: parts.year,
      date: parts.date,
      time: parts.time,
      location,
      locationLines: this.locationLines(location),
      locationMore: extra ? this.i18n.t('block16.locations.more', { count: extra }) : '',
      dressCode: (e.dressCode || '').trim().toUpperCase(),
      logoUrl,
      logoShape: pdf.logo_shape === 'original' ? 'original' : 'circle',
      logoSize: pdf.logo_size === 'sm' ? 'sm' : pdf.logo_size === 'lg' ? 'lg' : 'md',
      qrLabel: String(pdf.qr_label || 'Informação').trim() || 'Informação',
      qrTarget,
      qrImageUrl,
      qrIcon: pdf.qr_icon === 'none' ? 'none' : 'platform',
      qrSize: pdf.qr_size === 'lg' ? 'lg' : 'md',
    };
  });

  /** Só mostra a saudação quando existe um nome real (conta ou resposta RSVP). */
  protected readonly guestGreeting = computed(() => {
    const name = this.event().guestName?.trim();
    return name ? this.i18n.t('invitation.guestGreeting', { name }) : null;
  });

  protected readonly qrSvg = computed<SafeHtml | null>(() => {
    const f = this.f();
    if (f.qrImageUrl || !f.qrTarget) return null;
    try {
      const svg = qrCodeSvg(f.qrTarget, 'H', { logo: f.qrIcon === 'none' ? 'none' : 'platform' });
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
      const title = this.f().title;
      this.fontsTick();
      queueMicrotask(() => this.fitTitle(title));
    });
  }

  ngAfterViewInit(): void {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void (document as Document & { fonts: { load: (f: string) => Promise<unknown[]> } })
        .fonts.load(`${TITLE_BASE_FONT_SIZE}px Anton`)
        .then(() => this.fontsTick.update((n) => n + 1));
    }
  }

  /**
   * Gradual font-size step-down: measure with canvas/Anton, keep the glyph
   * proportions (xMidYMid meet) and only enlarge the viewBox when even the
   * legibility floor cannot fit an exceptionally long title.
   */
  private fitTitle(title: string): void {
    if (typeof document === 'undefined') return;
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = document.createElement('canvas').getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;
    const txt = (title || ' ').toUpperCase();
    const fontFor = (size: number) => `${size}px ${TITLE_FONT_STACK}`;
    let size = TITLE_BASE_FONT_SIZE;
    while (size > TITLE_MIN_FONT_SIZE) {
      ctx.font = fontFor(size);
      const m = ctx.measureText(txt);
      const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      if (w > 0 && h > 0 && w <= TITLE_BAND_WIDTH && h <= TITLE_BAND_HEIGHT) break;
      size -= TITLE_FONT_STEP;
    }
    ctx.font = fontFor(size);
    const m = ctx.measureText(txt);
    const left = m.actualBoundingBoxLeft;
    const right = m.actualBoundingBoxRight;
    const ascent = m.actualBoundingBoxAscent;
    const descent = m.actualBoundingBoxDescent;
    const w = left + right;
    const h = ascent + descent;
    if (!w || !h) return;
    // Mesma regra do PDF: scale = VIEWBOX_WIDTH / viewWidth; exigir viewWidth >=
    // w * VIEWBOX_WIDTH / BAND_WIDTH mantém o texto dentro da faixa de 91%.
    const viewWidth = Math.max(
      TITLE_VIEWBOX_WIDTH,
      Math.ceil((w * TITLE_VIEWBOX_WIDTH) / TITLE_BAND_WIDTH) + TITLE_PAD
    );
    this.titleViewBox.set(`0 0 ${viewWidth} ${TITLE_VIEWBOX_HEIGHT}`);
    this.titleFontSize.set(size);
    this.titleX.set(left + (viewWidth - w) / 2);
    this.titleY.set((TITLE_VIEWBOX_HEIGHT - h) / 2 + ascent);
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
