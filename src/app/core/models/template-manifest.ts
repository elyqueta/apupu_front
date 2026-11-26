/**
 * Bloco 14 — manifesto de template (v1), espelho do schema do back
 * (`src/types/templateManifest.ts`). O convite, o catálogo e o PDF lêem o
 * mesmo manifesto; um manifesto inválido cai no neutro.
 */
export type TemplateFont = 'sans' | 'serif' | 'cap' | 'script' | 'condensed' | 'anton';
export type OpenStyle = 'none' | 'envelope' | 'curtain' | 'fade' | 'fold';
export type CoverMode = 'hero' | 'framed' | 'none';
export type LayoutBlock = 'title' | 'host' | 'datetime' | 'location' | 'deadline' | 'message';

import type { TemplateDocument } from './template-document';

export interface TemplateManifest {
  version: 1;
  palette: { bg: string; surface: string; ink: string; accent: string; muted: string };
  fonts: { display: TemplateFont; body: TemplateFont };
  ornaments: { frame: string; corners: string; divider: string };
  layout: { align: 'left' | 'center'; blocks: LayoutBlock[] };
  cover: CoverMode;
  open_style: OpenStyle;
  pdf: {
    frame: 'none' | 'single' | 'double';
    qr_position: string;
    show_ornaments: boolean;
    qr_label?: string;
    qr_destination?: 'event' | 'invite' | 'custom';
    qr_custom_url?: string;
    /** Bloco 15: logótipo e QR configuráveis */
    logo_url?: string;
    logo_public_id?: string;
    logo_shape?: 'circle' | 'original';
    logo_size?: 'sm' | 'md' | 'lg';
    qr_mode?: 'invite' | 'event' | 'whatsapp' | 'custom' | 'image';
    qr_whatsapp_phone?: string;
    qr_whatsapp_message?: string;
    qr_image_url?: string;
    qr_image_public_id?: string;
    qr_icon?: 'none' | 'whatsapp' | 'brand';
    qr_size?: 'md' | 'lg';
  };
  /** Bloco 15, Passo 2: documento de blocos (fonte única para editor/convite/PDF). */
  document?: TemplateDocument;
}

export const DEFAULT_MANIFEST: TemplateManifest = {
  version: 1,
  palette: { bg: '#FFFFFF', surface: '#FFFFFF', ink: '#1F2937', accent: '#7C5CFF', muted: '#6B7280' },
  fonts: { display: 'sans', body: 'sans' },
  ornaments: { frame: 'none', corners: 'none', divider: 'line' },
  layout: { align: 'left', blocks: ['title', 'host', 'datetime', 'location', 'deadline', 'message'] },
  cover: 'hero',
  open_style: 'fade',
  pdf: { frame: 'single', qr_position: 'bottom-right', show_ornaments: false },
};

const HEX = /^#[0-9A-Fa-f]{6}$/;
const FONTS: TemplateFont[] = ['sans', 'serif', 'cap', 'script', 'condensed', 'anton'];
export const OPEN_STYLES: OpenStyle[] = ['none', 'envelope', 'curtain', 'fade', 'fold'];
const OPEN: OpenStyle[] = OPEN_STYLES;

/** Validação defensiva (o back já valida; isto evita CSS injetado). */
export function normalizeManifest(raw: unknown): TemplateManifest {
  const value = raw as Partial<TemplateManifest> | null | undefined;
  if (!value || value.version !== 1 || !value.palette || !value.fonts) return DEFAULT_MANIFEST;
  const palette = value.palette;
  if (![palette.bg, palette.surface, palette.ink, palette.accent, palette.muted].every((c) => HEX.test(c ?? ''))) {
    return DEFAULT_MANIFEST;
  }
  if (!FONTS.includes(value.fonts.display) || !FONTS.includes(value.fonts.body)) return DEFAULT_MANIFEST;
  return {
    ...DEFAULT_MANIFEST,
    ...value,
    open_style: OPEN.includes(value.open_style as OpenStyle) ? (value.open_style as OpenStyle) : 'fade',
  } as TemplateManifest;
}

/** Família CSS com fallback (fontes já previstas em `styles.css`). */
export function fontFamily(font: TemplateFont): string {
  switch (font) {
    case 'serif':
      return "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
    case 'cap':
      return "Cinzel, Georgia, 'Times New Roman', serif";
    case 'script':
      return "'Pinyon Script', Georgia, 'Times New Roman', serif";
    case 'condensed':
      return "Oswald, 'Arial Narrow', Arial, sans-serif";
    case 'anton':
      return "Anton, Oswald, 'Arial Narrow', Arial, sans-serif";
    default:
      return "Figtree, Arial, Helvetica, sans-serif";
  }
}

/** Variáveis CSS do convite (a paleta do template mantém-se em claro e escuro). */
export function manifestStyle(manifest: TemplateManifest): Record<string, string> {
  return {
    '--tpl-bg': manifest.palette.bg,
    '--tpl-surface': manifest.palette.surface,
    '--tpl-ink': manifest.palette.ink,
    '--tpl-accent': manifest.palette.accent,
    '--tpl-muted': manifest.palette.muted,
    '--tpl-display': fontFamily(manifest.fonts.display),
    '--tpl-body': fontFamily(manifest.fonts.body),
  };
}
