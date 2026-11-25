import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TemplateManifest } from '../../../core/models/template-manifest';
import { InvitationEventView } from '../invitation.models';

interface GratitudeFields {
  organization: string;
  subtitle: string;
  title: string;
  highlight: string;
  date: string;
  time: string;
  location: string;
  dressCode: string;
  logoUrl: string | null;
  qrLabel: string;
  qrTarget: string;
}

/**
 * Gratitude (Bloco 15) — fiel ao flyer de referência.
 * Canvas 1024x1280 (4:5 portrait). Todos os textos editáveis via dados do evento/manifesto.
 */
@Component({
  selector: 'app-gratitude-invitation',
  template: `
    <section class="mx-auto w-full max-w-[42rem]" data-testid="gratitude-invitation">
      <div class="relative mx-auto aspect-[4/5] w-full overflow-hidden rounded-[1.25rem] border border-[#D8C089]/45 shadow-[0_20px_60px_rgba(40,24,8,0.16)]">
        <svg
          class="absolute inset-0 h-full w-full"
          viewBox="0 0 1024 1280"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          [attr.aria-label]="f().title"
          data-testid="gratitude-svg"
        >
          <defs>
            <radialGradient id="gr-glow" cx="50%" cy="42%" r="58%">
              <stop offset="0%" stop-color="#FFFDF8" />
              <stop offset="100%" stop-color="#FFF6EA" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="gr-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#8C6A1F" />
              <stop offset="35%" stop-color="#F3D580" />
              <stop offset="65%" stop-color="#F7E39A" />
              <stop offset="100%" stop-color="#B8862B" />
            </linearGradient>
            <linearGradient id="gr-gold-shine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFF4BF" stop-opacity="0.95" />
              <stop offset="45%" stop-color="#D4A017" stop-opacity="0.9" />
              <stop offset="100%" stop-color="#8C6A1F" stop-opacity="0.95" />
            </linearGradient>

            <!-- Padrão geométrico subtil de fundo (tile) -->
            <pattern id="gr-bg-tile" width="48" height="48" patternUnits="userSpaceOnUse">
              <rect width="48" height="48" fill="none" />
              <path d="M24 2 L46 24 L24 46 L2 24 Z" fill="none" stroke="#DCC9A3" stroke-width="1.2" />
              <path d="M24 10 L38 24 L24 38 L10 24 Z" fill="none" stroke="#DCC9A3" stroke-width="1" />
              <path d="M24 18 L30 24 L24 30 L18 24 Z" fill="#E8D7B5" opacity="0.7" />
            </pattern>
            <linearGradient id="gr-fade-tr" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="white" stop-opacity="0" />
              <stop offset="55%" stop-color="white" stop-opacity="0.65" />
              <stop offset="100%" stop-color="white" stop-opacity="1" />
            </linearGradient>
            <linearGradient id="gr-fade-bl" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stop-color="white" stop-opacity="0" />
              <stop offset="55%" stop-color="white" stop-opacity="0.65" />
              <stop offset="100%" stop-color="white" stop-opacity="1" />
            </linearGradient>
            <mask id="gr-mask-tr"><rect x="560" y="0" width="464" height="420" fill="url(#gr-fade-tr)" /></mask>
            <mask id="gr-mask-bl"><rect x="0" y="860" width="464" height="420" fill="url(#gr-fade-bl)" /></mask>

            <!-- Padrão africano denso para título (grande, não uniforme) -->
            <pattern id="gr-title-african" width="1200" height="420" patternUnits="userSpaceOnUse">
              <rect width="1200" height="420" fill="#E8731A" />
              <!-- faixas diagonais -->
              @for (i of titlePatternStripes; track i.x) {
                <rect [attr.x]="i.x" y="-40" [attr.width]="i.w" height="520" [attr.fill]="i.fill" [attr.transform]="i.transform" [attr.opacity]="i.opacity ?? 1" />
              }
              <!-- chevrons -->
              <g stroke="#1A1A1A" stroke-width="6" fill="none">
                <path d="M0 70 L60 20 L120 70 L180 20 L240 70 L300 20 L360 70 L420 20 L480 70 L540 20 L600 70 L660 20 L720 70 L780 20 L840 70 L900 20 L960 70 L1020 20 L1080 70 L1140 20 L1200 70" />
                <path d="M0 350 L60 300 L120 350 L180 300 L240 350 L300 300 L360 350 L420 300 L480 350 L540 300 L600 350 L660 300 L720 350 L780 300 L840 350 L900 300 L960 350 L1020 300 L1080 350 L1140 300 L1200 350" />
              </g>
              <!-- triângulos aninhados -->
              @for (t of titleTriangles; track t.cx + '-' + t.cy) {
                <g [attr.transform]="'translate(' + t.cx + ',' + t.cy + ')'">
                  <path d="M0 -55 L55 45 L-55 45 Z" [attr.fill]="t.c1" stroke="#1A1A1A" stroke-width="3" />
                  <path d="M0 -30 L32 26 L-32 26 Z" [attr.fill]="t.c2" stroke="#1A1A1A" stroke-width="2" />
                  <path d="M0 -10 L14 12 L-14 12 Z" [attr.fill]="t.c3" />
                </g>
              }
              <!-- losangos concêntricos -->
              @for (d of titleDiamonds; track d.cx + '-' + d.cy) {
                <g [attr.transform]="'translate(' + d.cx + ',' + d.cy + ')'">
                  <path d="M0 -48 L48 0 L0 48 L-48 0 Z" [attr.fill]="d.c1" stroke="#1A1A1A" stroke-width="3" />
                  <path d="M0 -28 L28 0 L0 28 L-28 0 Z" [attr.fill]="d.c2" stroke="#1A1A1A" stroke-width="2" />
                  <path d="M0 -12 L12 0 L0 12 L-12 0 Z" [attr.fill]="d.c3" />
                </g>
              }
              <!-- linhas de pontos -->
              @for (y of [95, 115, 245, 265]; track y) {
                <g [attr.fill]="y < 200 ? '#1A1A1A' : '#F2B21A'">
                  @for (x of dotXs; track x) {
                    <circle [attr.cx]="x" [attr.cy]="y" r="4" />
                  }
                </g>
              }
              <!-- faixas horizontais de zigue-zague -->
              <path d="M0 150 L30 130 L60 150 L90 130 L120 150 L150 130 L180 150 L210 130 L240 150 L270 130 L300 150 L330 130 L360 150 L390 130 L420 150 L450 130 L480 150 L510 130 L540 150 L570 130 L600 150 L630 130 L660 150 L690 130 L720 150 L750 130 L780 150 L810 130 L840 150 L870 130 L900 150 L930 130 L960 150 L990 130 L1020 150 L1050 130 L1080 150 L1110 130 L1140 150 L1170 130 L1200 150 L1200 170 L1170 150 L1140 170 L1110 150 L1080 170 L1050 150 L1020 170 L990 150 L960 170 L930 150 L900 170 L870 150 L840 170 L810 150 L780 170 L750 150 L720 170 L690 150 L660 170 L630 150 L600 170 L570 150 L540 170 L510 150 L480 170 L450 150 L420 170 L390 150 L360 170 L330 150 L300 170 L270 150 L240 170 L210 150 L180 170 L150 150 L120 170 L90 150 L60 170 L30 150 L0 170 Z" fill="#1E8A3C" stroke="#1A1A1A" stroke-width="2" />
              <path d="M0 210 L30 190 L60 210 L90 190 L120 210 L150 190 L180 210 L210 190 L240 210 L270 190 L300 210 L330 190 L360 210 L390 190 L420 210 L450 190 L480 210 L510 190 L540 210 L570 190 L600 210 L630 190 L660 210 L690 190 L720 210 L750 190 L780 210 L810 190 L840 210 L870 190 L900 210 L930 190 L960 210 L990 190 L1020 210 L1050 190 L1080 210 L1110 190 L1140 210 L1170 190 L1200 210 L1200 230 L1170 210 L1140 230 L1110 210 L1080 230 L1050 210 L1020 230 L990 210 L960 230 L930 210 L900 230 L870 210 L840 230 L810 210 L780 230 L750 210 L720 230 L690 210 L660 230 L630 210 L600 230 L570 210 L540 230 L510 210 L480 230 L450 210 L420 230 L390 210 L360 230 L330 210 L300 230 L270 210 L240 230 L210 210 L180 230 L150 210 L120 230 L90 210 L60 230 L30 210 L0 230 Z" fill="#C8281E" stroke="#1A1A1A" stroke-width="2" />
            </pattern>

            <!-- Padrão fita (africano colorido) -->
            <pattern id="gr-ribbon-african" width="44" height="44" patternUnits="userSpaceOnUse">
              <rect width="44" height="44" fill="#C8281E" />
              <path d="M22 0 L44 22 L22 44 L0 22 Z" fill="#1E8A3C" stroke="#1A1A1A" stroke-width="1.5" />
              <path d="M22 8 L36 22 L22 36 L8 22 Z" fill="#F2B21A" stroke="#1A1A1A" stroke-width="1" />
              <path d="M22 15 L29 22 L22 29 L15 22 Z" fill="#E8731A" />
              <path d="M0 22 L22 0 M22 44 L44 22" stroke="#1A1A1A" stroke-width="1.5" opacity="0.45" />
            </pattern>

            <!-- clipPaths para fitas curvas -->
            <clipPath id="gr-ribbon-top-clip">
              <path d="M-30 185 C 110 40, 250 15, 430 30 C 455 32, 455 32, 440 70 C 270 55, 140 85, 10 215 C -10 235, -30 220, -30 185 Z" />
            </clipPath>
            <clipPath id="gr-ribbon-bottom-clip">
              <path d="M570 1265 C 650 1110, 760 1020, 1055 990 C 1075 987, 1085 995, 1080 1025 C 820 1055, 720 1135, 640 1285 C 625 1305, 590 1295, 570 1265 Z" />
            </clipPath>

            <!-- clipPath título -->
            <clipPath id="gr-title-clip">
              @for (line of titleLines(); track line.text + '-' + $index) {
                <text
                  [attr.x]="512"
                  [attr.y]="line.y"
                  text-anchor="middle"
                  [attr.font-size]="line.fontSize"
                  font-family="Anton, Oswald, Arial Narrow, sans-serif"
                  font-weight="400"
                  [attr.letter-spacing]="line.letterSpacing"
                >{{ line.text }}</text>
              }
            </clipPath>
          </defs>

          <!-- Fundo -->
          <rect width="1024" height="1280" fill="#FFF6EA" />
          <rect width="1024" height="1280" fill="url(#gr-glow)" />
          <!-- anéis subtis -->
          <g fill="none" stroke="#EADFC8" stroke-width="1.2" opacity="0.35">
            <circle cx="512" cy="560" r="250" />
            <circle cx="512" cy="560" r="330" />
            <circle cx="512" cy="560" r="410" />
          </g>
          <!-- padrão cantos -->
          <g opacity="0.13">
            <rect x="600" y="-20" width="460" height="440" fill="url(#gr-bg-tile)" mask="url(#gr-mask-tr)" />
            <rect x="-30" y="860" width="460" height="440" fill="url(#gr-bg-tile)" mask="url(#gr-mask-bl)" />
          </g>

          <!-- Fita topo-esquerdo -->
          <g clip-path="url(#gr-ribbon-top-clip)" data-testid="gratitude-ribbon-top">
            <rect x="-60" y="-20" width="560" height="320" fill="url(#gr-ribbon-african)" />
            <path d="M-30 185 C 110 40, 250 15, 430 30 L 440 70 C 270 55, 140 85, 10 215 Z" fill="url(#gr-gold-shine)" opacity="0.28" />
            <!-- ledge dourada superior -->
            <path d="M-30 185 C 110 40, 250 15, 430 30 C 438 31, 442 38, 440 46 C 270 31, 130 60, -10 200 C -18 210, -30 200, -30 185 Z" fill="url(#gr-gold)" />
            <!-- ledge dourada inferior -->
            <path d="M10 215 C 140 85, 270 55, 440 70 C 448 71, 450 78, 446 86 C 275 71, 150 101, 30 225 C 22 233, 10 225, 10 215 Z" fill="url(#gr-gold)" opacity="0.95" />
          </g>

          <!-- Fita inferior-direito (maior, ~20% altura) -->
          <g clip-path="url(#gr-ribbon-bottom-clip)" data-testid="gratitude-ribbon-bottom">
            <rect x="520" y="940" width="560" height="380" fill="url(#gr-ribbon-african)" />
            <path d="M570 1265 C 650 1110, 760 1020, 1055 990 L 1080 1025 C 820 1055, 720 1135, 640 1285 Z" fill="url(#gr-gold-shine)" opacity="0.28" />
            <path d="M570 1265 C 650 1110, 760 1020, 1055 990 C 1065 988, 1072 994, 1070 1002 C 800 1032, 700 1115, 620 1272 C 612 1284, 580 1280, 570 1265 Z" fill="url(#gr-gold)" />
            <path d="M640 1285 C 720 1135, 820 1055, 1080 1025 C 1088 1024, 1092 1031, 1088 1040 C 830 1068, 740 1148, 660 1292 C 654 1300, 644 1295, 640 1285 Z" fill="url(#gr-gold)" opacity="0.95" />
          </g>

          <!-- Logo (bloco de imagem opcional) -->
          @if (f().logoUrl) {
            <defs>
              <clipPath id="gr-logo-clip"><circle cx="512" cy="128" r="97" /></clipPath>
            </defs>
            <image
              [attr.href]="f().logoUrl"
              x="415"
              y="31"
              width="194"
              height="194"
              preserveAspectRatio="xMidYMid slice"
              clip-path="url(#gr-logo-clip)"
              data-testid="gratitude-logo"
            />
          }

          <g [attr.transform]="contentTransform()">
          <!-- Organização -->
          <text
            x="512"
            y="262"
            text-anchor="middle"
            font-size="31"
            font-family="Figtree, Arial, sans-serif"
            font-weight="500"
            letter-spacing="7.7"
            fill="#222222"
            data-testid="gratitude-org"
          >{{ f().organization }}</text>

          <!-- Subtítulo -->
          <text
            x="512"
            y="325"
            text-anchor="middle"
            font-size="49"
            font-family="Figtree, Arial, sans-serif"
            font-weight="700"
            letter-spacing="0.5"
            fill="#111111"
            data-testid="gratitude-subtitle"
          >{{ f().subtitle }}</text>

          <!-- Título com preenchimento africano -->
          <g data-testid="gratitude-title">
            <g clip-path="url(#gr-title-clip)">
              <rect x="0" y="300" width="1024" height="360" fill="url(#gr-title-african)" />
            </g>
            @for (line of titleLines(); track line.text + '-' + $index) {
              <text
                [attr.x]="512"
                [attr.y]="line.y"
                text-anchor="middle"
                [attr.font-size]="line.fontSize"
                font-family="Anton, Oswald, Arial Narrow, sans-serif"
                font-weight="400"
                [attr.letter-spacing]="line.letterSpacing"
                fill="none"
                stroke="#1A1A1A"
                stroke-width="2"
                stroke-linejoin="round"
              >{{ line.text }}</text>
            }
          </g>

          <!-- Linha de destaque (ano) -->
          <text
            x="512"
            [attr.y]="highlightY()"
            text-anchor="middle"
            font-size="90"
            font-family="'Cormorant Garamond', Georgia, serif"
            font-style="italic"
            font-weight="700"
            fill="#B3121A"
            data-testid="gratitude-highlight"
          >{{ f().highlight }}</text>

          <!-- Linha de informação -->
          <g data-testid="gratitude-info" font-family="Figtree, Arial, sans-serif" fill="#111111">
            <!-- separadores dourados -->
            <line x1="276" y1="846" x2="276" y2="936" stroke="#D4A017" stroke-width="2" />
            <line x1="424" y1="846" x2="424" y2="936" stroke="#D4A017" stroke-width="2" />
            <line x1="740" y1="846" x2="740" y2="936" stroke="#D4A017" stroke-width="2" />

            <!-- Data -->
            <g transform="translate(72,872)">
              <rect x="0" y="0" width="44" height="38" rx="5" fill="none" stroke="#111111" stroke-width="3" />
              <line x1="0" y1="12" x2="44" y2="12" stroke="#111111" stroke-width="3" />
              <line x1="12" y1="-5" x2="12" y2="6" stroke="#111111" stroke-width="3" stroke-linecap="round" />
              <line x1="32" y1="-5" x2="32" y2="6" stroke="#111111" stroke-width="3" stroke-linecap="round" />
              <text x="58" y="30" font-size="44" font-weight="500" fill="#111111">{{ f().date }}</text>
            </g>

            <!-- Hora -->
            <g transform="translate(296,870)">
              <circle cx="22" cy="22" r="22" fill="none" stroke="#111111" stroke-width="3" />
              <path d="M22 10 V24 L33 32" fill="none" stroke="#111111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <text x="52" y="32" font-size="40" font-weight="500" fill="#111111">{{ f().time }}</text>
            </g>

            <!-- Local -->
            <g transform="translate(468,862)">
              <path d="M22 0 C10 0 0 10 0 22 C0 40 22 62 22 62 C22 62 44 40 44 22 C44 10 34 0 22 0 Z" fill="none" stroke="#111111" stroke-width="3" />
              <circle cx="22" cy="22" r="8" fill="none" stroke="#111111" stroke-width="3" />
              <text x="56" y="18" font-size="18" font-weight="700" fill="#111111">LOCAL:</text>
              @for (line of locationLines(); track line + '-' + $index) {
                <text x="56" [attr.y]="40 + $index * 24" font-size="24" font-weight="700" fill="#111111">{{ line }}</text>
              }
            </g>

            <!-- QR -->
            <g data-testid="gratitude-qr">
              <text x="863" y="842" text-anchor="middle" font-size="24" font-weight="700" fill="#111111">{{ f().qrLabel }}</text>
              <rect x="798" y="852" width="130" height="130" rx="14" fill="#FFFFFF" stroke="#D4A017" stroke-width="3" />
            </g>
          </g>

          <!-- Dress code -->
          @if (f().dressCode) {
            <g data-testid="gratitude-dresscode">
              <rect x="266" y="1063" width="492" height="115" rx="57.5" fill="#FFF3DC" stroke="#D4A017" stroke-width="3" />
              <g transform="translate(322,1120)" fill="#D49A1A">
                <path d="M-30 -24 L-11 -38 L11 -38 L30 -24 L42 -6 L26 2 L26 40 L-26 40 L-26 2 L-42 -6 Z" />
              </g>
              <text x="540" y="1098" text-anchor="middle" font-size="20" font-family="Figtree, Arial, sans-serif" font-weight="700" fill="#111111" letter-spacing="1">DRESS-CODE:</text>
              <text x="540" y="1152" text-anchor="middle" font-size="50" font-family="Oswald, Arial Narrow, sans-serif" font-weight="700" fill="#111111">{{ f().dressCode }}</text>
            </g>
          }
          </g>
        </svg>

        <!-- QR real sobreposto (escaneável) -->
        @if (f().qrTarget) {
          <div class="absolute" [style]="qrOverlayStyle()" data-testid="gratitude-qr-overlay">
            <img
              [src]="qrImageUrl()"
              alt="QR code"
              class="h-full w-full rounded-[10%] bg-white object-contain p-[6%]"
              loading="eager"
            />
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="flex h-[28%] w-[28%] items-center justify-center rounded-full bg-white">
                <svg viewBox="0 0 32 32" class="h-[72%] w-[72%]" aria-hidden="true">
                  <circle cx="16" cy="16" r="14" fill="#25D366" />
                  <path d="M22.1 18.5c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1-1.1 2.5s1.1 2.9 1.3 3.1c.2.2 2.1 3.3 5.2 4.5.7.3 1.3.5 1.8.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" fill="#fff"/>
                </svg>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `,
})
export class GratitudeInvitationComponent {
  protected readonly i18n = inject(I18nService);
  readonly event = input.required<InvitationEventView>();
  readonly manifest = input<TemplateManifest | null>(null);

  protected readonly dotXs = Array.from({ length: 40 }, (_, i) => i * 30 + 15);
  protected readonly titlePatternStripes = [
    { x: 0, w: 90, fill: '#C8281E', transform: 'skewX(-18)', opacity: 0.95 },
    { x: 140, w: 70, fill: '#1E8A3C', transform: 'skewX(-18)', opacity: 0.95 },
    { x: 260, w: 110, fill: '#F2B21A', transform: 'skewX(-18)', opacity: 0.9 },
    { x: 430, w: 80, fill: '#C8281E', transform: 'skewX(-18)', opacity: 0.95 },
    { x: 560, w: 120, fill: '#1E8A3C', transform: 'skewX(-18)', opacity: 0.92 },
    { x: 740, w: 90, fill: '#F2B21A', transform: 'skewX(-18)', opacity: 0.9 },
    { x: 890, w: 110, fill: '#C8281E', transform: 'skewX(-18)', opacity: 0.95 },
    { x: 1060, w: 90, fill: '#1E8A3C', transform: 'skewX(-18)', opacity: 0.92 },
  ];
  protected readonly titleTriangles = [
    { cx: 90, cy: 210, c1: '#1E8A3C', c2: '#F2B21A', c3: '#C8281E' },
    { cx: 300, cy: 210, c1: '#C8281E', c2: '#F2B21A', c3: '#1E8A3C' },
    { cx: 520, cy: 210, c1: '#1E8A3C', c2: '#E8731A', c3: '#F2B21A' },
    { cx: 760, cy: 210, c1: '#C8281E', c2: '#F2B21A', c3: '#1E8A3C' },
    { cx: 990, cy: 210, c1: '#1E8A3C', c2: '#F2B21A', c3: '#C8281E' },
    { cx: 1110, cy: 210, c1: '#E8731A', c2: '#F2B21A', c3: '#1A1A1A' },
  ];
  protected readonly titleDiamonds = [
    { cx: 180, cy: 210, c1: '#F2B21A', c2: '#C8281E', c3: '#1E8A3C' },
    { cx: 410, cy: 210, c1: '#1E8A3C', c2: '#F2B21A', c3: '#C8281E' },
    { cx: 640, cy: 210, c1: '#C8281E', c2: '#1E8A3C', c3: '#F2B21A' },
    { cx: 880, cy: 210, c1: '#F2B21A', c2: '#E8731A', c3: '#1A1A1A' },
  ];

  protected readonly f = computed<GratitudeFields>(() => {
    const e = this.event();
    const m = this.manifest();
    const tz = e.timezone || 'Africa/Luanda';
    const parts = this.dateParts(e.startsAt, tz);
    const qrDestination = m?.pdf?.qr_destination;
    const qrCustom = m?.pdf?.qr_custom_url?.trim();
    const current = typeof window !== 'undefined' ? window.location.href : '';
    const qrTarget = qrDestination === 'custom' && qrCustom ? qrCustom : current;
    return {
      organization: (e.hostName || 'IGREJA CRISTÃ REINO-CHURCH').toUpperCase(),
      subtitle: this.subtitleFor(e),
      title: (e.title || 'GRATITUDE').toUpperCase(),
      highlight: parts.year,
      date: parts.date,
      time: parts.time,
      location: e.venue || e.city || e.onlineLink || 'Igreja Cristã Reino Church',
      dressCode: (e.dressCode || '').trim().toUpperCase(),
      logoUrl: null, // Bloco 15: logo do anfitrião (campo futuro); sem imagem falsa.
      qrLabel: m?.pdf?.qr_label?.trim() || 'Informação',
      qrTarget,
    };
  });

  /** Sem logo, fecha o espaço do cabeçalho. */
  protected readonly contentTransform = computed(() => (this.f().logoUrl ? '' : 'translate(0,-110)'));
  protected readonly qrOverlayStyle = computed(() => {
    const topPct = this.f().logoUrl ? 67.5 : 67.5 - (110 / 1280) * 100;
    return `left:78.91%; top:${topPct}%; width:11.13%; aspect-ratio:1;`;
  });

  protected readonly titleLines = computed(() => this.fitTitle(this.f().title));
  protected readonly highlightY = computed(() => {
    const lines = this.titleLines();
    const last = lines[lines.length - 1];
    const bottom = last.y + last.fontSize * 0.35;
    return Math.min(760, Math.max(678, Math.ceil(bottom + 80)));
  });

  protected readonly locationLines = computed(() => {
    const text = this.f().location.trim();
    if (!text) return ['Local a confirmar'];
    const max = 14;
    if (text.length <= max) return [text];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= max) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w.length > max ? w.slice(0, max) : w;
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  });

  protected readonly qrImageUrl = computed(() => {
    const target = this.f().qrTarget;
    if (!target) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&ecc=H&data=${encodeURIComponent(target)}`;
  });

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

  /** Fit-to-width: 1 line by default; max 2 lines for long titles. */
  private fitTitle(text: string): Array<{ text: string; y: number; fontSize: number; letterSpacing: number }> {
    const clean = (text || 'GRATITUDE').toUpperCase().trim();
    const maxWidth = 942; // ~92% of 1024 (spec: 90-95%)
    const singleSize = this.fitFontSize(clean, maxWidth, 220, 72);
    if (singleSize >= 110 || clean.length <= 12) {
      return [{ text: clean, y: 560, fontSize: singleSize, letterSpacing: 0 }];
    }
    const words = clean.split(/\s+/);
    if (words.length === 1) {
      return [{ text: clean, y: 560, fontSize: Math.max(72, singleSize), letterSpacing: 0 }];
    }
    let best: [string, string] = [clean, ''];
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ');
      const b = words.slice(i).join(' ');
      const diff = Math.abs(a.length - b.length);
      if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
    }
    const s1 = this.fitFontSize(best[0], maxWidth, 170, 64);
    const s2 = this.fitFontSize(best[1], maxWidth, 170, 64);
    const size = Math.min(s1, s2);
    return [
      { text: best[0], y: 500, fontSize: size, letterSpacing: 0 },
      { text: best[1], y: 500 + size * 0.92, fontSize: size, letterSpacing: 0 },
    ];
  }

  /** Approximate fit: Anton is condensed ~0.52em average width per char. */
  private fitFontSize(text: string, maxWidth: number, maxSize: number, minSize: number): number {
    const avg = 0.65; // Anton condensed, conservative for no-overflow
    const estimated = maxWidth / (text.length * avg);
    return Math.max(minSize, Math.min(maxSize, Math.floor(estimated)));
  }
}
