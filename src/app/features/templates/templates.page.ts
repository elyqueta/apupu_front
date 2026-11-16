import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { TemplateId } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

@Component({
  selector: 'app-templates-page',
  imports: [RouterLink, FaIconComponent, TemplateArtworkComponent],
  templateUrl: './templates.page.html',
})
export class TemplatesPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);

  protected readonly templates = this.store.templates;
  protected readonly selected = this.store.selectedTemplate;

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

  protected readonly selectedMeta = computed(() => {
    const id = this.selected();
    const template = this.templates().find((item) => item.id === id);
    return template
      ? { name: template.name, tag: template.slug, description: template.description ?? '' }
      : { name: '', tag: '', description: '' };
  });

  constructor() {
    effect(() => {
      if (!this.selected() && this.templates().length > 0) {
        this.store.selectedTemplate.set(this.templates()[0].id);
      }
    });
  }

  protected name(id: TemplateId): string {
    return this.templates().find((template) => template.id === id)?.name ?? '';
  }

  protected tag(id: TemplateId): string {
    return this.templates().find((template) => template.id === id)?.slug ?? '';
  }

  protected description(id: TemplateId): string {
    return this.templates().find((template) => template.id === id)?.description ?? '';
  }

  protected select(id: TemplateId): void {
    this.store.selectedTemplate.set(id);
    this.toasts.success(
      `${this.i18n.t('create.templateSelected')} · ${this.name(id)}`,
    );
  }
}
