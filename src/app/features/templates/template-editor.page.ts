import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { TemplatesRepository } from '../../core/data/templates.repository';
import { EventTemplate } from '../../core/models/models';
import { TemplateBlock, TemplateDocument, createBlockId } from '../../core/models/template-document';
import { DEFAULT_MANIFEST, TemplateManifest } from '../../core/models/template-manifest';
import { TemplateRenderData, TemplateRendererComponent } from '../../shared/components/template-renderer.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

const DRAFT_PREFIX = 'apupu.templateDraft.';

function v1ToDocument(manifest: TemplateManifest): TemplateDocument {
  const blocks: TemplateBlock[] = manifest.layout.blocks.map((b, i) => {
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
  imports: [RouterLink, FormsModule, TemplateRendererComponent, PageHeaderComponent],
  template: `
    <div class="min-h-screen bg-canvas text-ink">
      <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <app-page-header [title]="i18n.t('block15.editor.title')" [subtitle]="template()?.name || ''">
          <a routerLink="/modelos" class="ui-btn-secondary cursor-pointer">{{ i18n.t('common.back') }}</a>
        </app-page-header>

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
  private readonly router = inject(Router);
  private readonly templates = inject(TemplatesRepository);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly template = signal<EventTemplate | null>(null);
  protected readonly document = signal<TemplateDocument>({ version: 2, blocks: [] });
  protected readonly selectedBlockId = signal<string | null>(null);
  protected readonly draftSaved = signal(false);
  protected readonly aligns = ['left', 'center', 'right'] as const;

  protected readonly sampleData = computed(() => this.template() ? sampleData(this.template()!) : {
    title: 'Modelo', hostName: '', startsAt: null, endsAt: null, timezone: 'Africa/Luanda', city: '', venue: '', message: '', dressCode: '', type: 'other', templateSlug: '',
  } as TemplateRenderData);

  protected readonly manifest = computed<TemplateManifest>(() => {
    const tpl = this.template();
    const base = tpl?.manifest ?? DEFAULT_MANIFEST;
    return { ...base, document: this.document() };
  });

  protected readonly selectedBlock = computed(() => this.document().blocks.find((b) => b.id === this.selectedBlockId()) ?? null);

  constructor() {
    void this.load();
    effect(() => {
      const tpl = this.template();
      const doc = this.document();
      if (!tpl) return;
      try {
        localStorage.setItem(DRAFT_PREFIX + tpl.slug, JSON.stringify(doc));
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
      const doc = draft ?? (tpl.manifest.document?.version === 2 ? tpl.manifest.document : v1ToDocument(tpl.manifest));
      this.document.set(doc);
      this.selectedBlockId.set(doc.blocks[0]?.id ?? null);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Erro ao carregar modelo.');
    } finally {
      this.loading.set(false);
    }
  }

  private readDraft(slug: string): TemplateDocument | null {
    try {
      const raw = localStorage.getItem(DRAFT_PREFIX + slug);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as TemplateDocument;
      if (parsed?.version === 2 && Array.isArray(parsed.blocks)) return parsed;
    } catch { /* ignore */ }
    return null;
  }

  protected hasText(block: TemplateBlock): boolean {
    return ['text', 'title', 'message', 'dress_code', 'gifts'].includes(block.type);
  }

  protected blockText(block: TemplateBlock): string {
    return 'text' in block ? String((block as any).text ?? '') : '';
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
    const current = (block.style as any)?.[key] ?? off;
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
    const key = `block15.editor.block${type.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')}` as any;
    try { return this.i18n.t(key); } catch { return type; }
  }
}
