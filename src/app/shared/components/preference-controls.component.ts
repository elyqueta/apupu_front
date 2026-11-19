import { Component, computed, inject, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ICONS } from '../../core/ui/icons';

@Component({
  selector: 'app-preference-controls',
  imports: [FaIconComponent],
  template: `
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-raised/60 px-3 text-xs font-semibold text-muted backdrop-blur-xl transition hover:border-brand/40 hover:text-ink"
        [attr.aria-label]="i18n.t('common.language')"
        [attr.title]="i18n.t('common.language')"
        (click)="toggleLocale()"
      >
        <fa-icon [icon]="icons['globe']" class="text-sm" aria-hidden="true" />
        <span>{{ languageLabel() }}</span>
      </button>

      <button
        type="button"
        class="grid size-10 place-items-center rounded-xl border border-line bg-surface-raised/60 text-muted backdrop-blur-xl transition hover:border-brand/40 hover:text-ink"
        [attr.aria-label]="i18n.t('common.theme')"
        [attr.title]="i18n.t('common.theme')"
        (click)="theme.toggle()"
      >
        <fa-icon
          [icon]="theme.isDark() ? icons['sun'] : icons['moon']"
          class="text-sm"
          aria-hidden="true"
        />
      </button>
    </div>
  `,
})
export class PreferenceControlsComponent {
  /** Por omissão mostra o idioma actual; o convite /isy mostra o de destino. */
  readonly showTargetLocale = input(false);

  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly icons = ICONS;

  protected readonly languageLabel = computed(() => {
    const isPortuguese = this.i18n.locale() === 'pt-AO';
    return (this.showTargetLocale() ? !isPortuguese : isPortuguese) ? 'PT' : 'EN';
  });

  protected toggleLocale(): void {
    this.i18n.setLocale(this.i18n.locale() === 'pt-AO' ? 'en' : 'pt-AO');
  }
}
