import { Component, DestroyRef, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { I18nService } from '../../core/i18n/i18n.service';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

/** Configuração única da página: editar aqui quando a Isilda confirmar os detalhes. */
const ISY_INVITE = {
  showDetails: false, // true quando a Isilda confirmar
  dateKey: 'isy.date',
  timeKey: 'isy.time',
  venue: ['Ilha de Luanda', 'Tamariz'],
  age: 19,
} as const;

@Component({
  selector: 'app-isy-invite',
  imports: [PreferenceControlsComponent],
  templateUrl: './isy-invite.component.html',
})
export class IsyInviteComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly config = ISY_INVITE;

  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const previousTitle = this.meta.getTag('property="og:title"')?.content;
    const previousDescription = this.meta.getTag('property="og:description"')?.content;

    this.meta.updateTag({ property: 'og:title', content: 'Convite · Isilda Manuel' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Convite de aniversário da Isilda Manuel. Venha celebrar comigo.',
    });

    this.destroyRef.onDestroy(() => {
      if (previousTitle) {
        this.meta.updateTag({ property: 'og:title', content: previousTitle });
      } else {
        this.meta.removeTag('property="og:title"');
      }
      if (previousDescription) {
        this.meta.updateTag({ property: 'og:description', content: previousDescription });
      } else {
        this.meta.removeTag('property="og:description"');
      }
    });
  }
}
