import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TemplateManifest } from '../../../core/models/template-manifest';
import { InvitationEventView } from '../invitation.models';

/**
 * Bloco 15, Passo 1.1: renderização do template Gratitude (convite digital).
 * Réplica fiel ao flyer descrito na spec: formato 4:5, padrão africano,
 * fita dourada, logótipo, QR estilizado e dress code.
 */
@Component({
  selector: 'app-gratitude-invitation',
  template: `
    <section class="mx-auto w-full max-w-[42rem] overflow-hidden rounded-[2rem] border border-[#D8C089]/60 shadow-[0_20px_60px_rgba(40,24,8,0.18)]" [style.background]="bg()">
      <div class="relative mx-auto aspect-[4/5] w-full overflow-hidden" [style.color]="ink()">
        <!-- Padrão geométrico subtil nos cantos -->
        <svg class="absolute inset-0 h-full w-full" viewBox="0 0 1024 1280" aria-hidden="true" preserveAspectRatio="none">
          <defs>
            <radialGradient id="gGlow" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stop-color="#FFFDF7" stop-opacity="1" />
              <stop offset="100%" stop-color="#FFF6EA" stop-opacity="0" />
            </radialGradient>
            <pattern id="gAfrican" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="none"/>
              <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#8A1C1C" stroke-width="2"/>
              <path d="M20 8 L32 20 L20 32 L8 20 Z" fill="#1F7A3A" opacity="0.9"/>
              <path d="M20 14 L26 20 L20 26 L14 20 Z" fill="#F2C14E" />
              <path d="M0 0 L10 10 M40 0 L30 10 M0 40 L10 30 M40 40 L30 30" stroke="#E07A2F" stroke-width="2"/>
            </pattern>
            <pattern id="gAfricanWarm" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="none"/>
              <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="#2E1A12" stroke-width="1.5"/>
              <path d="M20 6 L34 20 L20 34 L6 20 Z" fill="#8A1C1C"/>
              <path d="M20 12 L28 20 L20 28 L12 20 Z" fill="#F2C14E"/>
              <path d="M20 16 L24 20 L20 24 L16 20 Z" fill="#1F7A3A"/>
              <path d="M0 20 L20 0 M20 40 L40 20" stroke="#E07A2F" stroke-width="2" opacity="0.8"/>
            </pattern>
            <linearGradient id="gGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#F6E27A"/>
              <stop offset="35%" stop-color="#D4AF37"/>
              <stop offset="65%" stop-color="#FFF0A8"/>
              <stop offset="100%" stop-color="#B8860B"/>
            </linearGradient>
            <clipPath id="gTitleClip"><text x="512" y="560" text-anchor="middle" font-size="150" font-weight="900" font-family="Oswald, Arial Narrow, sans-serif" letter-spacing="4">GRATITUDE</text></clipPath>
          </defs>

          <rect width="1024" height="1280" [attr.fill]="bg()" />
          <rect width="1024" height="1280" fill="url(#gGlow)" />
          <!-- Padrão subtil cantos -->
          <g opacity="0.1">
            <rect x="680" y="-40" width="420" height="420" fill="url(#gAfrican)" transform="rotate(0)" />
            <rect x="-60" y="900" width="420" height="420" fill="url(#gAfrican)" />
          </g>

          <!-- Fita canto superior esquerdo -->
          <g transform="translate(-20,-10) rotate(-2 180 140)">
            <path d="M-40 170 C120 40, 240 20, 420 30 L400 95 C250 85, 150 105, -20 220 Z" fill="url(#gAfricanWarm)" />
            <path d="M-40 170 C120 40, 240 20, 420 30 L412 52 C245 42, 130 58, -30 192 Z" fill="url(#gGold)" />
            <path d="M-20 220 C150 105, 250 85, 400 95 L392 115 C250 105, 155 125, -10 235 Z" fill="url(#gGold)" opacity="0.95"/>
          </g>
          <!-- Fita canto inferior direito -->
          <g transform="translate(1044,1290) rotate(180)">
            <path d="M-40 170 C120 40, 240 20, 420 30 L400 95 C250 85, 150 105, -20 220 Z" fill="url(#gAfricanWarm)" />
            <path d="M-40 170 C120 40, 240 20, 420 30 L412 52 C245 42, 130 58, -30 192 Z" fill="url(#gGold)" />
            <path d="M-20 220 C150 105, 250 85, 400 95 L392 115 C250 105, 155 125, -10 235 Z" fill="url(#gGold)" opacity="0.95"/>
          </g>

          <!-- Moldura fina dourada interna -->
          <rect x="34" y="34" width="956" height="1212" fill="none" stroke="url(#gGold)" stroke-width="2" opacity="0.45" rx="18" />

          <!-- Logótipo circular -->
          <g transform="translate(512,150)">
            <circle r="58" fill="#FFFDF7" stroke="url(#gGold)" stroke-width="4" />
            <circle r="48" fill="none" stroke="#C8922A" stroke-width="1.5" />
            @if (event().coverUrl) {
              <!-- cover/logo not as logo; use generic crown -->
            }
            <!-- coroa simples -->
            <path d="M-22 12 L-28 -12 L-10 2 L0 -20 L10 2 L28 -12 L22 12 Z" fill="url(#gGold)" stroke="#8A6914" stroke-width="1.5" />
            <ellipse cx="0" cy="16" rx="24" ry="5" fill="none" stroke="#C8922A" stroke-width="2"/>
          </g>

          <!-- Organização -->
          <text x="512" y="242" text-anchor="middle" font-size="24" font-family="Figtree, Arial, sans-serif" letter-spacing="5" [attr.fill]="ink()" font-weight="500">{{ orgLine() }}</text>
          <!-- Subtítulo -->
          <text x="512" y="292" text-anchor="middle" font-size="46" font-family="Oswald, Arial Narrow, sans-serif" letter-spacing="1" [attr.fill]="ink()" font-weight="700">{{ subtitleLine() }}</text>

          <!-- Título GRATITUDE com padrão -->
          <text x="512" y="560" text-anchor="middle" font-size="150" font-weight="900" font-family="Oswald, Arial Narrow, sans-serif" letter-spacing="4" fill="url(#gAfricanWarm)">{{ titleLine() }}</text>
          <text x="512" y="560" text-anchor="middle" font-size="150" font-weight="900" font-family="Oswald, Arial Narrow, sans-serif" letter-spacing="4" fill="none" stroke="#2E1A12" stroke-width="1.5">{{ titleLine() }}</text>

          <!-- Ano destaque -->
          <text x="700" y="620" text-anchor="middle" font-size="72" font-family="'Pinyon Script', cursive" fill="#8A1C1C">{{ yearLine() }}</text>

          <!-- Linha de informação -->
          <g transform="translate(0,720)" font-family="Figtree, Arial, sans-serif" [attr.fill]="ink()">
            <line x1="290" y1="-30" x2="290" y2="80" stroke="url(#gGold)" stroke-width="2"/>
            <line x1="470" y1="-30" x2="470" y2="80" stroke="url(#gGold)" stroke-width="2"/>
            <line x1="730" y1="-30" x2="730" y2="80" stroke="url(#gGold)" stroke-width="2"/>

            <!-- Data -->
            <g transform="translate(155,0)" text-anchor="middle">
              <rect x="-18" y="-18" width="36" height="30" rx="4" fill="none" [attr.stroke]="accent()" stroke-width="2"/>
              <line x1="-18" y1="-8" x2="18" y2="-8" [attr.stroke]="accent()" stroke-width="2"/>
              <text y="55" font-size="28" font-weight="700">{{ dateShort() }}</text>
            </g>
            <!-- Hora -->
            <g transform="translate(380,0)" text-anchor="middle">
              <circle r="18" fill="none" [attr.stroke]="accent()" stroke-width="2"/>
              <path d="M0 -8 V2 L8 8" fill="none" [attr.stroke]="accent()" stroke-width="2" stroke-linecap="round"/>
              <text y="55" font-size="28" font-weight="700">{{ timeShort() }}</text>
            </g>
            <!-- Local -->
            <g transform="translate(600,0)" text-anchor="middle">
              <path d="M0 -20 C-12 -20 -20 -12 -20 -2 C-20 12 0 30 0 30 C0 30 20 12 20 -2 C20 -12 12 -20 0 -20 Z" fill="none" [attr.stroke]="accent()" stroke-width="2"/>
              <circle cy="-2" r="6" fill="none" [attr.stroke]="accent()" stroke-width="2"/>
              <text y="52" font-size="16" font-weight="600">{{ i18n.t('block15.gratitude.location') }}: {{ locationShort() }}</text>
            </g>

            <!-- QR card -->
            <g transform="translate(860,10)">
              <text x="0" y="-30" text-anchor="middle" font-size="14" [attr.fill]="accent()" font-weight="600" letter-spacing="1">{{ qrLabel() }}</text>
              <rect x="-52" y="-20" width="104" height="104" rx="14" fill="#FFFFFF" [attr.stroke]="accent()" stroke-width="2"/>
              <rect x="-40" y="-8" width="80" height="80" rx="4" fill="#F3F4F6"/>
              <text x="0" y="38" text-anchor="middle" font-size="10" fill="#6B7280">QR</text>
            </g>
          </g>

          <!-- Dress code pílula -->
          <g transform="translate(512,1060)">
            <rect x="-250" y="-55" width="500" height="110" rx="55" fill="#FFF8EE" stroke="url(#gGold)" stroke-width="3"/>
            <!-- ícone t-shirt -->
            <g transform="translate(-180,0)" [attr.fill]="accent()">
              <path d="M-22 -18 L-8 -28 L8 -28 L22 -18 L30 -4 L18 2 L18 30 L-18 30 L-18 2 L-30 -4 Z" />
            </g>
            <text x="20" y="-10" text-anchor="middle" font-size="18" font-family="Figtree, Arial, sans-serif" [attr.fill]="muted()" letter-spacing="2">{{ i18n.t('block15.gratitude.dressCode') }}:</text>
            <text x="20" y="28" text-anchor="middle" font-size="42" font-family="Oswald, Arial Narrow, sans-serif" [attr.fill]="ink()" font-weight="700">{{ dressCode() }}</text>
          </g>
        </svg>

        <!-- QR real sobreposto (HTML, escaneável) -->
        @if (qrUrl()) {
          <div class="absolute" style="left:76.5%; top:56.7%; width:10.2%; aspect-ratio:1;">
            <div class="rounded-[14%] border-2 bg-white p-[8%]" [style.border-color]="accent()">
              <img [src]="qrUrl()" alt="QR code" class="h-full w-full object-contain" />
            </div>
          </div>
        }

        <!-- Foto de logótipo opcional -->
        @if (event().coverUrl) {
          <img [src]="event().coverUrl!" alt="" class="absolute left-1/2 top-[7.2%] h-[9%] w-[9%] -translate-x-1/2 rounded-full border-4 object-cover" [style.border-color]="accent()" />
        }
      </div>
    </section>
  `,
})
export class GratitudeInvitationComponent {
  protected readonly i18n = inject(I18nService);
  readonly event = input.required<InvitationEventView>();
  readonly manifest = input<TemplateManifest | null>(null);

  protected readonly bg = computed(() => this.manifest()?.palette.bg ?? '#FFF6EA');
  protected readonly ink = computed(() => this.manifest()?.palette.ink ?? '#1A120B');
  protected readonly accent = computed(() => this.manifest()?.palette.accent ?? '#C8922A');
  protected readonly muted = computed(() => this.manifest()?.palette.muted ?? '#7A6248');

  protected readonly orgLine = computed(() => (this.event().hostName || 'ORGANIZAÇÃO').toUpperCase());
  protected readonly subtitleLine = computed(() => {
    const type = this.event().type;
    return (type ? this.categoryLabel(type) : 'FESTIVAL DE ADOLESCENTES').toUpperCase();
  });
  protected readonly titleLine = computed(() => (this.event().title || 'GRATITUDE').toUpperCase());
  protected readonly yearLine = computed(() => {
    const d = this.event().startsAt ? new Date(this.event().startsAt!) : null;
    return d ? String(d.getFullYear()) : '2026';
  });
  protected readonly dateShort = computed(() => {
    const d = this.event().startsAt ? new Date(this.event().startsAt!) : null;
    if (!d) return '20/12';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  protected readonly timeShort = computed(() => {
    const d = this.event().startsAt ? new Date(this.event().startsAt!) : null;
    if (!d) return '14:00';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  protected readonly locationShort = computed(() => {
    const e = this.event();
    return (e.venue || e.city || e.onlineLink || 'Local a confirmar').slice(0, 34);
  });
  protected readonly dressCode = computed(() => (this.event().dressCode || 'TRAJE AFRICANO').toUpperCase());
  protected readonly qrLabel = computed(() => this.manifest()?.pdf?.qr_label?.trim() || this.i18n.t('block15.gratitude.info'));
  protected readonly qrUrl = computed(() => {
    const manifest = this.manifest();
    const destination = manifest?.pdf?.qr_destination;
    const custom = manifest?.pdf?.qr_custom_url?.trim();
    const current = typeof window !== 'undefined' ? window.location.href : '';
    const target = destination === 'custom' && custom ? custom : current;
    if (!target) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&ecc=H&data=${encodeURIComponent(target)}`;
  });

  private categoryLabel(cat: string): string {
    const map: Record<string, string> = {
      birthday: 'Celebração de Aniversário',
      wedding: 'Celebração de Casamento',
      corporate: 'Evento Corporativo',
      baby: 'Celebração Familiar',
      other: 'Celebração Especial',
    };
    return map[cat] ?? 'Festival de Adolescentes';
  }
}
