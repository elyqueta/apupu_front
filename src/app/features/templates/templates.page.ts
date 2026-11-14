import { Component, computed, inject } from '@angular/core';
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
    return {
      name: this.name(id),
      tag: this.tag(id),
      description: this.description(id),
    };
  });

  protected name(id: TemplateId): string {
    return this.i18n.t(`template.${id}.name` as TranslationKey);
  }

  protected description(id: TemplateId): string {
    return this.i18n.t(`template.${id}.description` as TranslationKey);
  }

  protected tag(id: TemplateId): string {
    return this.i18n.t(`template.${id}.tag` as TranslationKey);
  }

  protected select(id: TemplateId): void {
    this.store.selectedTemplate.set(id);
    this.toasts.success(
      `${this.i18n.t('create.templateSelected')} · ${this.name(id)}`,
    );
  }
}
