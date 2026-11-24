import { Component, computed, inject, input } from '@angular/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';

@Component({
  selector: 'app-status-badge',
  imports: [FaIconComponent],
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md"
      [class]="classes()"
    >
      <fa-icon [icon]="icon()" class="text-[10px]" aria-hidden="true" />
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  private readonly i18n = inject(I18nService);

  readonly value = input.required<string>();

  protected readonly label = computed(() => {
    const value = this.value();
    if (value === 'published' || value === 'scheduled' || value === 'agendado') {
      return this.i18n.t('status.active' as TranslationKey);
    }
    return this.i18n.t(`status.${value}` as TranslationKey);
  });

  protected readonly classes = computed(() => {
    switch (this.value()) {
      case 'confirmed':
      case 'published':
      case 'scheduled':
      case 'agendado':
      case 'concluida':
        return 'border-mint/30 bg-mint/15 text-mint';
      case 'declined':
      case 'cancelled':
      case 'cancelado':
        return 'border-coral/30 bg-coral/10 text-coral';
      case 'completed':
      case 'concluido':
        return 'border-aqua/30 bg-aqua/15 text-aqua';
      case 'pending':
      case 'por_fazer':
      case 'rascunho':
        return 'border-amber/30 bg-amber/15 text-amber';
      case 'em_curso':
        return 'border-iris/30 bg-iris/10 text-iris';
      default:
        return 'border-line bg-surface-raised text-muted';
    }
  });

  protected readonly icon = computed<IconDefinition>(() => {
    switch (this.value()) {
      case 'confirmed':
        return ICONS['success'];
      case 'declined':
      case 'cancelled':
      case 'cancelado':
        return ICONS['error'];
      case 'pending':
      case 'por_fazer':
      case 'rascunho':
        return ICONS['clock'];
      case 'completed':
      case 'concluido':
      case 'concluida':
        return ICONS['completed'];
      case 'em_curso':
        return ICONS['spinner'];
      case 'published':
      case 'scheduled':
      case 'agendado':
        return ICONS['paperPlane'];
      default:
        return ICONS['pen'];
    }
  });
}
