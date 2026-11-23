import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ICONS } from '../../core/ui/icons';

/** Botão flutuante de criação usado nas listas em mobile, acima da navegação inferior. */
@Component({
  selector: 'app-mobile-fab',
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      [attr.data-testid]="testId()"
      [attr.aria-label]="label()"
      class="fixed right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-on-secondary shadow-card transition hover:bg-secondary-hover md:hidden"
      style="bottom: calc(env(safe-area-inset-bottom) + 4.5rem)"
      (click)="pressed.emit()"
    >
      <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
      {{ label() }}
    </button>
  `,
})
export class MobileFabComponent {
  readonly label = input.required<string>();
  readonly testId = input<string>('');

  readonly pressed = output<void>();

  protected readonly icons = ICONS;
}
