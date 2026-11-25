import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TemplatesRepository } from '../../core/data/templates.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventTemplate, TemplateId } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from '../../shared/components/modal.component';
import { TemplateRendererComponent, TemplateRenderData } from '../../shared/components/template-renderer.component';
import { OPEN_STYLES, OpenStyle } from '../../core/models/template-manifest';

type TemplateCategory = 'all' | 'system' | 'user';

@Component({
  selector: 'app-templates-page',
  imports: [RouterLink, FaIconComponent, ModalComponent, TemplateRendererComponent],
  templateUrl: './templates.page.html',
})
export class TemplatesPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);
  private readonly templatesRepo = inject(TemplatesRepository);
  private readonly router = inject(Router);

  protected readonly templates = this.store.templates;
  protected readonly selected = this.store.selectedTemplate;
  protected readonly loading = this.templatesRepo.loading;
  protected readonly error = this.templatesRepo.error;

  protected readonly query = signal('');
  protected readonly category = signal<TemplateCategory>('all');
  protected readonly previewTemplateId = signal<TemplateId | null>(null);
  protected readonly previewOpenStyle = signal<OpenStyle>('fade');
  protected readonly previewAnimate = signal(false);

  protected readonly categories: { id: TemplateCategory; label: TranslationKey }[] = [
    { id: 'all', label: 'block15.templates.filterAll' },
    { id: 'system', label: 'block15.templates.filterSystem' },
    { id: 'user', label: 'block15.templates.filterUser' },
  ];

  protected readonly filteredTemplates = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.category();
    return this.templates().filter((template) => {
      const matchesCategory =
        cat === 'all' ? true : cat === 'system' ? template.kind === 'system' : template.kind !== 'system';
      const matchesQuery =
        !q ||
        [template.name, template.slug, template.description ?? ''].some((value) =>
          value.toLowerCase().includes(q),
        );
      return matchesCategory && matchesQuery;
    });
  });

  protected readonly previewTemplate = computed<EventTemplate | null>(() => {
    const id = this.previewTemplateId();
    if (!id) return null;
    return this.templates().find((t) => t.id === id) ?? null;
  });

  protected readonly previewManifest = computed(() => {
    const template = this.previewTemplate();
    if (!template) return null;
    return { ...template.manifest, open_style: this.previewOpenStyle() };
  });

  protected sampleData(template: EventTemplate): TemplateRenderData {
    const isGratitude = template.slug === 'gratitude' || template.manifest.ornaments.frame === 'gratitude';
    if (isGratitude) {
      return {
        title: 'GRATITUDE',
        hostName: 'IGREJA CRISTÃ REINO-CHURCH',
        startsAt: '2026-12-20T13:00:00.000Z', // 14:00 Africa/Luanda
        city: 'Luanda',
        venue: 'Igreja Cristã Reino Church',
        message: '',
        dressCode: 'TRAJE AFRICANO',
        templateSlug: template.slug,
        type: 'other',
      };
    }
    return {
      title: this.i18n.t('block14.preview.sampleTitle'),
      hostName: this.i18n.t('block14.preview.kicker'),
      startsAt: '2026-12-20T16:00:00.000Z',
      city: 'Luanda',
      venue: 'Igreja Cristã Reino Church',
      message: template.description ?? '',
      dressCode: 'Traje africano',
      templateSlug: template.slug,
      type: 'other',
    };
  }

  protected readonly previewModalOpen = computed(() => this.previewTemplateId() !== null);

  protected readonly openStyles = OPEN_STYLES;

  protected readonly steps: TranslationKey[] = [
    'templates.how1Title',
    'templates.how2Title',
    'templates.how3Title',
  ];

  protected readonly stepTexts: TranslationKey[] = [
    'templates.how1Text',
    'templates.how2Text',
    'templates.how3Text',
  ];

  constructor() {
    this.store.load({ templates: true });
    effect(() => {
      if (!this.selected() && this.templates().length > 0) {
        this.store.selectedTemplate.set(this.templates()[0].id);
      }
    });
  }

  protected select(id: TemplateId): void {
    this.store.selectedTemplate.set(id);
    const template = this.templates().find((t) => t.id === id);
    this.toasts.success(
      `${this.i18n.t('create.templateSelected')}${template ? ` · ${template.name}` : ''}`,
    );
  }

  protected useTemplate(template: EventTemplate): void {
    this.select(template.id);
    void this.router.navigate(['/templates', template.slug, 'editar']);
  }

  protected openPreview(template: EventTemplate): void {
    this.previewTemplateId.set(template.id);
    this.previewOpenStyle.set(template.manifest.open_style ?? 'fade');
    this.previewAnimate.set(false);
  }

  protected closePreview(): void {
    this.previewTemplateId.set(null);
    this.previewAnimate.set(false);
  }

  protected usePreviewTemplate(): void {
    const template = this.previewTemplate();
    if (!template) return;
    this.select(template.id);
    this.closePreview();
    void this.router.navigate(['/templates', template.slug, 'editar']);
  }

  protected playPreviewAnimation(): void {
    this.previewAnimate.set(false);
    setTimeout(() => this.previewAnimate.set(true), 30);
  }

  protected retry(): void {
    void this.templatesRepo.load({ force: true });
  }

  protected onPreviewOpenStyleChange(style: OpenStyle): void {
    this.previewOpenStyle.set(style);
    this.previewAnimate.set(false);
  }

  protected openStyleKey(style: OpenStyle): TranslationKey {
    return `block14.open.${style}` as TranslationKey;
  }

  protected categoryLabel(template: EventTemplate): string {
    return template.kind === 'system'
      ? this.i18n.t('block15.templates.filterSystem')
      : this.i18n.t('block15.templates.filterUser');
  }
}
