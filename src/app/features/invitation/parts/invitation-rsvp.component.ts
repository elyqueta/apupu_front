import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EventStatus, RsvpStatus } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { InvitationResponseStatus } from '../invitation.models';

/** Cartão lateral no desktop e barra fixa em mobile; nunca mostram ações duplicadas. */
@Component({
  selector: 'app-invitation-rsvp',
  imports: [FaIconComponent],
  template: `
    @if (variant() === 'bar') {
      <div
        class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-solid/95 px-4 pt-3 backdrop-blur-xl lg:hidden"
        style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
      >
        <div class="mx-auto flex w-full max-w-5xl gap-3">
          <button
            type="button"
            data-testid="invitation-bar-accept"
            class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="blocked()"
            (click)="respond.emit('accepted')"
          >
            <fa-icon [icon]="icons['check']" aria-hidden="true" />
            {{ i18n.t('invitation.going') }}
          </button>
          <button
            type="button"
            data-testid="invitation-bar-decline"
            class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="blocked()"
            (click)="respond.emit('declined')"
          >
            <fa-icon [icon]="icons['cancelled']" aria-hidden="true" />
            {{ i18n.t('invitation.notGoing') }}
          </button>
        </div>
      </div>
    } @else {
      <article class="rounded-4xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
          {{ i18n.t('invitation.rsvpTitle') }}
        </p>
        <p class="mt-1 text-xs leading-5 text-muted">{{ i18n.t('invitation.rsvpHint') }}</p>

        @if (!emailHasAccount() && !accountDismissed()) {
          <div class="mt-4 rounded-2xl border border-brand/25 bg-brand/10 p-4">
            <p class="text-sm font-semibold text-brand-strong">{{ i18n.t('account.title') }}</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              {{ i18n.t('account.text', { email: email() }) }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-3 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
                (click)="createAccount.emit(true)"
              >
                {{ i18n.t('account.useEmail', { email: email() }) }}
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="createAccount.emit(false)"
              >
                {{ i18n.t('account.otherEmail') }}
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                (click)="login.emit()"
              >
                {{ i18n.t('account.login') }}
              </button>
              <button
                type="button"
                class="inline-flex h-11 items-center rounded-xl px-2 text-xs font-semibold text-muted transition hover:text-ink"
                (click)="dismissAccount.emit()"
              >
                {{ i18n.t('account.later') }}
              </button>
            </div>
          </div>
        }

        @if (actionError()) {
          <p
            role="alert"
            class="mt-3 rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs leading-5 text-coral"
          >
            {{ actionError() }}
          </p>
        }

        <div
          class="mt-4 rounded-2xl border p-4"
          [class]="statusTone() === 'success'
            ? 'border-mint/30 bg-mint/10'
            : statusTone() === 'danger'
              ? 'border-coral/30 bg-coral/10'
              : 'border-amber/30 bg-amber/10'"
          aria-live="polite"
        >
          <p class="flex items-center gap-2 text-sm font-semibold" [class]="statusTextClass()">
            <fa-icon [icon]="statusIcon()" aria-hidden="true" />
            {{ statusLabel() }}
          </p>
          <p class="mt-1 text-xs leading-5 text-muted">{{ statusDetail() }}</p>
        </div>

        @if (eventStatus() === 'cancelled') {
          <p class="mt-4 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs leading-5 text-coral">
            {{ i18n.t('invitation.cancelledText') }}
          </p>
        } @else if (blocked()) {
          <p class="mt-4 rounded-2xl border border-line bg-surface-raised p-4 text-xs leading-5 text-muted">
            {{ i18n.t('invitation.deadlinePassedText') }}
          </p>
        } @else {
          <div class="mt-4 flex flex-col gap-2">
            <button
              type="button"
              data-testid="invitation-accept"
              class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-wait disabled:opacity-70"
              [disabled]="saving()"
              (click)="respond.emit('accepted')"
            >
              @if (saving()) {
                <fa-icon [icon]="icons['spinner']" class="animate-spin" aria-hidden="true" />
                {{ i18n.t('invitation.saving') }}
              } @else {
                <fa-icon [icon]="icons['check']" aria-hidden="true" />
                {{ status() === 'confirmed' ? i18n.t('invitation.change') : i18n.t('invitation.going') }}
              }
            </button>
            <button
              type="button"
              data-testid="invitation-decline"
              class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-coral/40 disabled:cursor-wait disabled:opacity-70"
              [disabled]="saving()"
              (click)="respond.emit('declined')"
            >
              <fa-icon [icon]="icons['cancelled']" class="text-coral" aria-hidden="true" />
              {{ i18n.t('invitation.notGoing') }}
            </button>
          </div>
        }

        <p class="mt-4 text-xs leading-5 text-muted">{{ i18n.t('invitation.demoNotice') }}</p>
      </article>
    }
  `,
})
export class InvitationRsvpComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly variant = input<'card' | 'bar'>('card');
  readonly status = input<RsvpStatus>('pending');
  readonly saving = input(false);
  readonly deadlinePassed = input(false);
  readonly eventStatus = input<EventStatus>('published');
  readonly actionError = input('');
  readonly email = input('');
  readonly emailHasAccount = input(false);
  readonly accountDismissed = input(false);

  readonly respond = output<InvitationResponseStatus>();
  readonly createAccount = output<boolean>();
  readonly login = output<void>();
  readonly dismissAccount = output<void>();

  protected readonly blocked = computed(
    () =>
      this.saving() ||
      this.deadlinePassed() ||
      this.eventStatus() === 'cancelled' ||
      this.eventStatus() === 'completed',
  );

  protected readonly statusTone = computed(() => {
    if (this.status() === 'confirmed') {
      return 'success';
    }
    return this.status() === 'declined' ? 'danger' : 'warning';
  });

  protected readonly statusIcon = computed(() => {
    if (this.status() === 'confirmed') {
      return ICONS['success'];
    }
    return this.status() === 'declined' ? ICONS['cancelled'] : ICONS['clock'];
  });

  protected readonly statusLabel = computed(() => {
    if (this.status() === 'confirmed') {
      return this.i18n.t('invitation.alreadyConfirmed');
    }
    return this.status() === 'declined'
      ? this.i18n.t('invitation.alreadyDeclined')
      : this.i18n.t('invitation.pendingTitle');
  });

  protected readonly statusDetail = computed(() => {
    if (this.status() === 'confirmed') {
      return this.i18n.t('invitation.confirmedText');
    }
    return this.status() === 'declined'
      ? this.i18n.t('invitation.declinedText')
      : this.i18n.t('invitation.pendingText');
  });

  protected readonly statusTextClass = computed(() => {
    if (this.status() === 'confirmed') {
      return 'text-mint';
    }
    return this.status() === 'declined' ? 'text-coral' : 'text-amber';
  });
}
