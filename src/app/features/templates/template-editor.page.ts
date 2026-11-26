import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { TemplatesRepository } from '../../core/data/templates.repository';
import { ToastService } from '../../core/services/toast.service';
import { EventTemplate } from '../../core/models/models';
import { TemplateBlock, TemplateDocument, createBlockId } from '../../core/models/template-document';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../core/models/template-manifest';
import { TemplateRenderData, TemplateRendererComponent } from '../../shared/components/template-renderer.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

const DRAFT_PREFIX = 'apupu.templateDraft.';

function v1ToDocument(manifest: TemplateManifest): TemplateDocument {
  const blocks: TemplateBlock[] = manifest.layout.blocks.map((b) => {
    const id = createBlockId();
    switch (b) {
      case 'title': return { id, type: 'title', text: 'GRATITUDE' };
      case 'message': return { id, type: 'message', text: 'A tua presença tornará este momento ainda mais especial.' };
      case 'datetime': return { id, type: 'datetime' };
      case 'location': return { id, type: 'location' };
      case 'host': return { id, type: 'text', text: 'Igreja Cristã Reino-Church' };
      case 'deadline': return { id, type: 'text', text: 'Responder até 15/12/2026' };
      default: return { id, type: 'text', text: '' };
    }
  });
  return { version: 2, blocks };
}

function sampleData(template: EventTemplate): TemplateRenderData {
  return {
    title: template.slug === 'gratitude' ? 'GRATITUDE' : template.name,
    hostName: 'Igreja Cristã Reino-Church',
    startsAt: '2026-12-20T14:00:00+01:00',
    endsAt: '2026-12-20T18:00:00+01:00',
    timezone: 'Africa/Luanda',
    city: 'Luanda',
    venue: 'Morro Bento, Gamek à Direita',
    message: 'A tua presença tornará este momento ainda mais especial.',
    dressCode: 'TRAJE AFRICANO',
    type: 'other',
    templateSlug: template.slug,
  };
}

@Component({
  selector: 'app-template-editor-page',
  imports: [FormsModule, TemplateRendererComponent, PageHeaderComponent],
  template: `
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <app-page-header [title]="i18n.t('block15.editor.title')" [subtitle]="template()?.name || ''" [backLink]="'/templates'" />

        @if (loading()) {
          <div class="mt-6 rounded-3xl border border-line bg-surface p-8 text-sm text-muted">A carregar…</div>
        } @else if (error()) {
          <div class="mt-6 rounded-3xl border border-coral/30 bg-coral/5 p-8 text-sm text-coral">{{ error() }}</div>
        } @else if (template(); as tpl) {
          <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="rounded-3xl border border-line bg-surface p-3 sm:p-4">
              <div class="mx-auto max-w-[760px] overflow-hidden rounded-2xl border border-line bg-canvas shadow-card">
                <app-template-renderer
                  [manifest]="manifest()"
                  [data]="sampleData()"
                  mode="invite"
                  [editable]="true"
                  [selectedBlockId]="selectedBlockId()"
                  (blockSelect)="selectedBlockId.set($event)"
                />
              </div>
              @if (draftSaved()) {
                <p class="mt-3 text-xs text-muted" data-testid="draft-saved">{{ i18n.t('block15.editor.draftSaved') }}</p>
              }
            </div>

            <aside class="rounded-3xl border border-line bg-surface p-4 lg:sticky lg:top-4 lg:h-fit">
              <h2 class="text-sm font-semibold text-ink">{{ i18n.t('block15.editor.properties') }}</h2>
              @if (selectedBlock(); as block) {
                <div class="mt-4 space-y-4">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ blockTypeLabel(block.type) }}</p>
                  </div>

                  @if (hasText(block)) {
                    <label class="block">
                      <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.text') }}</span>
                      <textarea class="ui-input min-h-24 w-full" [ngModel]="blockText(block)" (ngModelChange)="updateText($event)"></textarea>
                    </label>
                  }

                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.font') }}</span>
                    <select class="ui-input w-full" [ngModel]="block.style?.fontFamily || ''" (ngModelChange)="updateStyle('fontFamily', $event || undefined)">
                      <option value="">Padrão</option>
                      <option value="sans">Sans</option>
                      <option value="serif">Serif</option>
                      <option value="display">Display</option>
                      <option value="condensed">Condensed</option>
                      <option value="script">Script</option>
                    </select>
                  </label>

                  <div class="grid grid-cols-2 gap-3">
                    <label class="block">
                      <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.size') }}</span>
                      <input type="number" min="10" max="96" class="ui-input w-full" [ngModel]="block.style?.fontSize || ''" (ngModelChange)="updateStyle('fontSize', $event ? +$event : undefined)" />
                    </label>
                    <label class="block">
                      <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.color') }}</span>
                      <input type="color" class="ui-input h-11 w-full" [ngModel]="block.style?.color || '#1d1d1b'" (ngModelChange)="updateStyle('color', $event)" />
                    </label>
                  </div>

                  <div>
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.align') }}</span>
                    <div class="flex gap-2">
                      @for (a of aligns; track a) {
                        <button type="button" class="ui-btn-secondary !h-10 !px-3 cursor-pointer" [class.!border-brand]="(block.style?.align || 'left') === a" (click)="updateStyle('align', a)">{{ a }}</button>
                      }
                    </div>
                  </div>

                  <div class="flex gap-2">
                    <button type="button" class="ui-btn-secondary cursor-pointer" [class.!border-brand]="block.style?.fontWeight === 'bold'" (click)="toggleStyle('fontWeight','bold','normal')">{{ i18n.t('block15.editor.bold') }}</button>
                    <button type="button" class="ui-btn-secondary cursor-pointer" [class.!border-brand]="block.style?.fontStyle === 'italic'" (click)="toggleStyle('fontStyle','italic','normal')">{{ i18n.t('block15.editor.italic') }}</button>
                  </div>

                  <label class="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" [checked]="block.visible !== false" (change)="updateVisible($any($event.target).checked)" />
                    {{ i18n.t('block15.editor.visible') }}
                  </label>
                </div>
              } @else {
                <p class="mt-4 text-sm text-muted">{{ i18n.t('block15.editor.noBlockSelected') }}</p>
              }

              <div class="mt-6 border-t border-line pt-4">
                <h3 class="text-sm font-semibold text-ink">{{ i18n.t('block15.editor.logoSection') }}</h3>
                <div class="mt-3 space-y-3">
                  @if (manifest().pdf.logo_url) {
                    <img [src]="manifest().pdf.logo_url!" alt="Logo" class="h-20 w-20 rounded-xl border border-line object-cover" [class.rounded-full]="manifest().pdf.logo_shape !== 'original'" />
                  }
                  <div class="flex flex-wrap gap-2">
                    <label class="ui-btn-secondary !h-10 !px-3 cursor-pointer">
                      <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="onLogoFile($event)" />
                      {{ manifest().pdf.logo_url ? i18n.t('block15.editor.logoReplace') : i18n.t('block15.editor.logoUpload') }}
                    </label>
                    @if (manifest().pdf.logo_url) {
                      <button type="button" class="ui-btn-secondary !h-10 !px-3 cursor-pointer" (click)="removeLogo()">{{ i18n.t('block15.editor.logoRemove') }}</button>
                    }
                  </div>
                  <p class="text-xs text-muted">{{ i18n.t('block15.editor.logoHint') }}</p>
                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.logoShape') }}</span>
                    <select class="ui-input w-full" [ngModel]="manifest().pdf.logo_shape || 'circle'" (ngModelChange)="updatePdf('logo_shape', $event)">
                      <option value="circle">{{ i18n.t('block15.editor.logoShapeCircle') }}</option>
                      <option value="original">{{ i18n.t('block15.editor.logoShapeOriginal') }}</option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.logoSize') }}</span>
                    <select class="ui-input w-full" [ngModel]="manifest().pdf.logo_size || 'md'" (ngModelChange)="updatePdf('logo_size', $event)">
                      <option value="sm">{{ i18n.t('block15.editor.logoSizeSm') }}</option>
                      <option value="md">{{ i18n.t('block15.editor.logoSizeMd') }}</option>
                      <option value="lg">{{ i18n.t('block15.editor.logoSizeLg') }}</option>
                    </select>
                  </label>
                </div>
              </div>

              <div class="mt-6 border-t border-line pt-4">
                <h3 class="text-sm font-semibold text-ink">{{ i18n.t('block15.editor.qrSection') }}</h3>
                <div class="mt-3 space-y-3">
                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrDestination') }}</span>
                    <select class="ui-input w-full" [ngModel]="manifest().pdf.qr_mode || manifest().pdf.qr_destination || 'invite'" (ngModelChange)="updatePdf('qr_mode', $event)">
                      <option value="invite">{{ i18n.t('block15.editor.qrDestInvite') }}</option>
                      <option value="event">{{ i18n.t('block15.editor.qrDestEvent') }}</option>
                      <option value="whatsapp">{{ i18n.t('block15.editor.qrDestWhatsapp') }}</option>
                      <option value="custom">{{ i18n.t('block15.editor.qrDestCustom') }}</option>
                      <option value="image">{{ i18n.t('block15.editor.qrDestImage') }}</option>
                    </select>
                  </label>

                  @if ((manifest().pdf.qr_mode || manifest().pdf.qr_destination) === 'custom') {
                    <label class="block">
                      <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrCustomUrl') }}</span>
                      <input type="url" class="ui-input w-full" [ngModel]="manifest().pdf.qr_custom_url || ''" (ngModelChange)="updatePdf('qr_custom_url', $event)" placeholder="https://..." />
                    </label>
                  }
                  @if ((manifest().pdf.qr_mode || manifest().pdf.qr_destination) === 'whatsapp') {
                    <label class="block">
                      <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrWhatsappPhone') }}</span>
                      <input type="tel" class="ui-input w-full" [ngModel]="manifest().pdf.qr_whatsapp_phone || ''" (ngModelChange)="updatePdf('qr_whatsapp_phone', $event)" placeholder="+244900000000" />
                    </label>
                    <label class="block">
                      <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrWhatsappMessage') }}</span>
                      <input type="text" class="ui-input w-full" [ngModel]="manifest().pdf.qr_whatsapp_message || ''" (ngModelChange)="updatePdf('qr_whatsapp_message', $event)" />
                    </label>
                  }
                  @if ((manifest().pdf.qr_mode || manifest().pdf.qr_destination) === 'image') {
                    <div class="flex flex-wrap gap-2">
                      <label class="ui-btn-secondary !h-10 !px-3 cursor-pointer">
                        <input type="file" class="hidden" accept="image/png,image/jpeg,image/svg+xml" (change)="onQrImageFile($event)" />
                        {{ i18n.t('block15.editor.qrUploadImage') }}
                      </label>
                      @if (manifest().pdf.qr_image_url) {
                        <button type="button" class="ui-btn-secondary !h-10 !px-3 cursor-pointer" (click)="updatePdf('qr_image_url', undefined); updatePdf('qr_image_public_id', undefined)">Remover</button>
                      }
                    </div>
                    @if (manifest().pdf.qr_image_url) {
                      <img [src]="manifest().pdf.qr_image_url!" alt="QR" class="h-20 w-20 rounded-xl border border-line object-contain bg-white" />
                    }
                  }

                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrLabel') }}</span>
                    <input type="text" class="ui-input w-full" [ngModel]="manifest().pdf.qr_label || 'Informação'" (ngModelChange)="updatePdf('qr_label', $event)" />
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrIcon') }}</span>
                    <select class="ui-input w-full" [ngModel]="manifest().pdf.qr_icon || 'brand'" (ngModelChange)="updatePdf('qr_icon', $event)">
                      <option value="none">{{ i18n.t('block15.editor.qrIconNone') }}</option>
                      <option value="whatsapp">{{ i18n.t('block15.editor.qrIconWhatsapp') }}</option>
                      <option value="brand">{{ i18n.t('block15.editor.qrIconBrand') }}</option>
                    </select>
                  </label>
                  <label class="block">
                    <span class="mb-1 block text-xs font-medium text-muted">{{ i18n.t('block15.editor.qrSize') }}</span>
                    <select class="ui-input w-full" [ngModel]="manifest().pdf.qr_size || 'md'" (ngModelChange)="updatePdf('qr_size', $event)">
                      <option value="md">{{ i18n.t('block15.editor.qrSizeMd') }}</option>
                      <option value="lg">{{ i18n.t('block15.editor.qrSizeLg') }}</option>
                    </select>
                  </label>
                  @if (qrInvalid()) {
                    <p class="text-xs text-coral">{{ i18n.t('block15.editor.qrInvalid') }}</p>
                  }
                </div>
              </div>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
})
export class TemplateEditorPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly route = inject(ActivatedRoute);
  private readonly templates = inject(TemplatesRepository);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly template = signal<EventTemplate | null>(null);
  protected readonly document = signal<TemplateDocument>({ version: 2, blocks: [] });
  protected readonly selectedBlockId = signal<string | null>(null);
  protected readonly draftSaved = signal(false);
  protected readonly aligns = ['left', 'center', 'right'] as const;
  protected readonly pdfOverrides = signal<Partial<TemplateManifest['pdf']>>({});

  protected readonly sampleData = computed(() => this.template() ? sampleData(this.template()!) : {
    title: 'Modelo', hostName: '', startsAt: null, endsAt: null, timezone: 'Africa/Luanda', city: '', venue: '', message: '', dressCode: '', type: 'other', templateSlug: '',
  } as TemplateRenderData);

  protected readonly manifest = computed<TemplateManifest>(() => {
    const tpl = this.template();
    const base = tpl?.manifest ?? DEFAULT_MANIFEST;
    return { ...base, pdf: { ...base.pdf, ...this.pdfOverrides() }, document: this.document() };
  });

  protected readonly isGratitude = computed(() => {
    const m = this.manifest();
    return m.ornaments.frame === 'gratitude' || m.ornaments.corners === 'gratitude';
  });

  protected readonly selectedBlock = computed(() => this.document().blocks.find((b) => b.id === this.selectedBlockId()) ?? null);

  constructor() {
    void this.load();
    effect(() => {
      const tpl = this.template();
      const doc = this.document();
      const pdf = this.pdfOverrides();
      if (!tpl) return;
      try {
        localStorage.setItem(DRAFT_PREFIX + tpl.slug, JSON.stringify({ version: 2, document: doc, pdf }));
        this.draftSaved.set(true);
        setTimeout(() => this.draftSaved.set(false), 1200);
      } catch { /* ignore */ }
    });
  }

  private async load(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.loading.set(true);
    this.error.set('');
    try {
      const items = await this.templates.load();
      const tpl = items.find((t: EventTemplate) => t.slug === slug) ?? null;
      if (!tpl) {
        this.error.set('Modelo não encontrado.');
        return;
      }
      this.template.set(tpl);
      const draft = this.readDraft(slug);
      const doc = draft?.document ?? (tpl.manifest.document?.version === 2 ? tpl.manifest.document : v1ToDocument(tpl.manifest));
      this.document.set(doc);
      this.pdfOverrides.set(draft?.pdf ?? this.extractPdfOverrides(tpl.manifest));
      this.selectedBlockId.set(doc.blocks[0]?.id ?? null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar modelo.');
    } finally {
      this.loading.set(false);
    }
  }

  private readDraft(slug: string): { document: TemplateDocument; pdf: Partial<TemplateManifest['pdf']> } | null {
    try {
      const raw = localStorage.getItem(DRAFT_PREFIX + slug);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed?.['version'] === 2 && Array.isArray(parsed['blocks'])) {
        return { document: parsed as unknown as TemplateDocument, pdf: {} };
      }
      const doc = parsed?.['document'] as Record<string, unknown> | undefined;
      if (parsed?.['version'] === 2 && doc?.['version'] === 2 && Array.isArray(doc['blocks'])) {
        return { document: doc as unknown as TemplateDocument, pdf: (parsed['pdf'] ?? {}) as Partial<TemplateManifest['pdf']> };
      }
    } catch { /* ignore */ }
    return null;
  }

  private extractPdfOverrides(manifest: TemplateManifest): Partial<TemplateManifest['pdf']> {
    const pdf = manifest.pdf as unknown as Record<string, unknown>;
    const keys = ['logo_url', 'logo_public_id', 'logo_shape', 'logo_size', 'qr_mode', 'qr_destination', 'qr_custom_url', 'qr_whatsapp_phone', 'qr_whatsapp_message', 'qr_image_url', 'qr_image_public_id', 'qr_icon', 'qr_size', 'qr_label'] as const;
    const out: Record<string, unknown> = {};
    for (const k of keys) if (pdf[k] !== undefined) out[k] = pdf[k];
    return out as Partial<TemplateManifest['pdf']>;
  }

  protected hasText(block: TemplateBlock): boolean {
    return ['text', 'title', 'message', 'dress_code', 'gifts'].includes(block.type);
  }

  protected blockText(block: TemplateBlock): string {
    return 'text' in block ? String((block as unknown as { text?: unknown }).text ?? '') : '';
  }

  protected updateText(text: string): void {
    this.patchSelected((b) => ({ ...b, text } as TemplateBlock));
  }

  protected updateStyle(key: string, value: unknown): void {
    this.patchSelected((b) => ({ ...b, style: { ...(b.style ?? {}), [key]: value } } as TemplateBlock));
  }

  protected toggleStyle(key: 'fontWeight' | 'fontStyle', on: string, off: string): void {
    const block = this.selectedBlock();
    if (!block) return;
    const style = (block.style ?? {}) as Record<string, unknown>;
    const current = style[key] ?? off;
    this.updateStyle(key, current === on ? off : on);
  }

  protected updateVisible(visible: boolean): void {
    this.patchSelected((b) => ({ ...b, visible } as TemplateBlock));
  }

  private patchSelected(patch: (b: TemplateBlock) => TemplateBlock): void {
    const id = this.selectedBlockId();
    if (!id) return;
    this.document.update((doc) => ({ ...doc, blocks: doc.blocks.map((b) => b.id === id ? patch(b) : b) }));
  }

  protected blockTypeLabel(type: string): string {
    const key = `block15.editor.block${type.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
    try { return this.i18n.t(key as never); } catch { return type; }
  }

  protected readonly qrInvalid = computed(() => {
    const pdf = this.manifest().pdf as unknown as Record<string, unknown>;
    const mode = String(pdf['qr_mode'] || pdf['qr_destination'] || 'invite');
    if (mode === 'image') return !String(pdf['qr_image_url'] || '').trim();
    if (mode === 'whatsapp') return !String(pdf['qr_whatsapp_phone'] || '').replace(/\D/g, '');
    if (mode === 'custom') {
      const u = String(pdf['qr_custom_url'] || '').trim();
      return !/^https?:\/\//i.test(u);
    }
    return false; // invite/event default to current/public link at render time
  });

  protected updatePdf(key: string, value: unknown): void {
    this.pdfOverrides.update((prev) => {
      const next: Record<string, unknown> = { ...(prev as unknown as Record<string, unknown>) };
      if (value === undefined || value === '') delete next[key];
      else next[key] = value;
      // keep legacy field in sync
      if (key === 'qr_mode') {
        if (value === 'invite' || value === 'event' || value === 'custom') next['qr_destination'] = value;
        else delete next['qr_destination'];
      }
      return next;
    });
  }

  protected removeLogo(): void {
    this.updatePdf('logo_url', undefined);
    this.updatePdf('logo_public_id', undefined);
  }

  protected async onLogoFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      this.toast.error(this.i18n.t('block15.editor.logoInvalidType' as never));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error(this.i18n.t('block15.editor.logoTooLarge' as never));
      return;
    }
    const dataUrl = await this.readFileAsDataUrl(file);
    this.updatePdf('logo_url', dataUrl);
    this.updatePdf('logo_public_id', undefined);
  }

  protected async onQrImageFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      this.toast.error(this.i18n.t('block15.editor.logoInvalidType' as never));
      return;
    }
    if (file.size > 1024 * 1024) {
      this.toast.error(this.i18n.t('block15.editor.qrImageTooLarge' as never));
      return;
    }
    const dataUrl = await this.readFileAsDataUrl(file);
    this.updatePdf('qr_image_url', dataUrl);
    this.updatePdf('qr_image_public_id', undefined);
    this.updatePdf('qr_mode', 'image');
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
