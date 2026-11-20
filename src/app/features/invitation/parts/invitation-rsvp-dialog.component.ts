import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { ModalComponent } from '../../../shared/components/modal.component';
import { InvitationResponseInput, InvitationResponseStatus } from '../invitation.models';

const MAX_MESSAGE_LENGTH = 500;

/** Confirmação da resposta com mensagem opcional para o anfitrião. */
@Component({
  selector: 'app-invitation-rsvp-dialog',
  imports: [FaIconComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="title()"
      size="md"
      [dismissible]="!saving()"
      (closed)="cancelled.emit()"
    >
      <p class="text-sm leading-6 text-muted">{{ description() }}</p>

      <label class="mt-4 block">
        <span class="text-xs font-semibold text-ink">{{ i18n.t('invitation.rsvpMessageLabel') }}</span>
        <textarea
          data-testid="invitation-rsvp-message"
          class="mt-2 min-h-28 w-full resize-y rounded-xl border border-line bg-surface-raised p-3 text-sm text-ink outline-none transition focus:border-brand/50"
          [attr.maxlength]="maxLength"
          [placeholder]="i18n.t('invitation.yourMessage')"
          [value]="message()"
          (input)="onMessage($event)"
        ></textarea>
        <span class="mt-1 block text-xs text-muted">
          {{ i18n.t('invitation.rsvpMessageHint') }} ·
          {{ i18n.t('invitation.messageCounter', { count: message().length }) }}
        </span>
      </label>

      @if (error()) {
        <p role="alert" class="mt-3 rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs leading-5 text-coral">
          {{ error() }}
        </p>
      }

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          data-testid="invitation-rsvp-cancel"
          class="ui-btn-secondary"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          {{ i18n.t('common.cancel') }}
        </button>
        <button
          type="button"
          data-testid="invitation-rsvp-confirm"
          class="ui-btn"
          [disabled]="saving()"
          (click)="confirm()"
        >
          @if (saving()) {
            <fa-icon [icon]="icons['spinner']" class="animate-spin" aria-hidden="true" />
            {{ i18n.t('invitation.saving') }}
          } @else {
            <fa-icon [icon]="icons['check']" aria-hidden="true" />
            {{ confirmLabel() }}
          }
        </button>
      </div>
    </app-modal>
  `,
})
export class InvitationRsvpDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly maxLength = MAX_MESSAGE_LENGTH;

  readonly open = input(false);
  readonly response = input.required<InvitationResponseStatus>();
  readonly saving = input(false);
  readonly error = input('');

  readonly confirmed = output<InvitationResponseInput>();
  readonly cancelled = output<void>();

  protected readonly message = signal('');

  protected readonly title = computed(() =>
    this.response() === 'accepted'
      ? this.i18n.t('invitation.acceptTitle')
      : this.i18n.t('invitation.declineTitle'),
  );

  protected readonly confirmLabel = computed(() =>
    this.response() === 'accepted'
      ? this.i18n.t('invitation.acceptConfirm')
      : this.i18n.t('invitation.declineConfirm'),
  );

  protected readonly description = computed(() =>
    this.response() === 'accepted'
      ? this.i18n.t('invitation.rsvpHint')
      : this.i18n.t('invitation.declineText'),
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        this.message.set('');
      }
    });
  }

  protected onMessage(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.message.set(target.value.slice(0, MAX_MESSAGE_LENGTH));
  }

  protected confirm(): void {
    if (this.saving()) {
      return;
    }
    const message = this.message().trim().slice(0, MAX_MESSAGE_LENGTH);
    this.confirmed.emit({ status: this.response(), message: message || null });
  }
}
