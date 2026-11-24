import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from './modal.component';

/**
 * Apagar evento (estilo Vercel/Render): com convidados confirmados, o botão
 * destrutivo só fica ativo quando o nome escrito coincide com o título
 * (comparação exata, ignorando espaços nas pontas — igual ao servidor).
 */
@Component({
  selector: 'app-delete-event-dialog',
  imports: [ModalComponent, FaIconComponent],
  template: `
    <app-modal [open]="open()" [title]="i18n.t('block10.delete.title')" size="sm" (closed)="cancel()">
      <form id="app-delete-event-form" class="flex flex-col gap-4" (submit)="submit($event)">
        <div class="flex items-start gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-3 text-coral">
          <fa-icon [icon]="icons['warning']" class="mt-0.5" aria-hidden="true" />
          <p class="text-sm leading-6">
            @if (acceptedCount() > 0) {
              {{ i18n.t('block10.delete.bodyAccepted', { count: acceptedCount() }) }}
            } @else {
              {{ i18n.t('block10.delete.body') }}
            }
          </p>
        </div>

        @if (requiresName()) {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block10.delete.label') }}</span>
            <input
              type="text"
              autocomplete="off"
              spellcheck="false"
              data-testid="delete-event-name"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-coral/50"
              [value]="typed()"
              [attr.aria-invalid]="typed() && !matches() ? 'true' : null"
              (input)="typed.set($any($event.target).value)"
            />
            <span class="mt-1 block text-xs text-muted">{{ i18n.t('block10.delete.hint', { title: eventTitle() }) }}</span>
          </label>
        }

        @if (error()) {
          <p class="text-xs text-coral" role="alert">{{ error() }}</p>
        }

        <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" class="ui-btn-secondary" (click)="cancel()">{{ i18n.t('block10.delete.cancel') }}</button>
          <button
            type="submit"
            class="ui-btn-danger"
            data-testid="delete-event-confirm"
            [disabled]="!canDelete() || busy()"
          >
            <fa-icon [icon]="icons['trash']" aria-hidden="true" />
            {{ i18n.t('block10.delete.confirm') }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class DeleteEventDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly eventTitle = input.required<string>();
  readonly acceptedCount = input(0);
  readonly busy = input(false);
  readonly error = input('');

  readonly confirmed = output<string | undefined>();
  readonly closed = output<void>();

  protected readonly typed = signal('');
  protected readonly requiresName = computed(() => this.acceptedCount() > 0);
  protected readonly matches = computed(() => this.typed().trim() === this.eventTitle().trim());
  protected readonly canDelete = computed(() => !this.requiresName() || this.matches());

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.typed.set('');
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.canDelete() || this.busy()) return;
    this.confirmed.emit(this.requiresName() ? this.typed() : undefined);
  }

  protected cancel(): void {
    this.closed.emit();
  }
}
