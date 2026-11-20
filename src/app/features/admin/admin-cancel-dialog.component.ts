import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { AdminEvent, adminErrorMessage } from './admin.models';
import { AdminRepository } from './admin.repository';

const REASON_MIN = 10;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Cancelamento de evento com motivo obrigatório e OTP enviado por e-mail.
 * O código só é pedido depois do motivo ser válido e a confirmação final
 * passa ainda por `app-confirm-dialog`.
 */
@Component({
  selector: 'app-admin-cancel-dialog',
  imports: [FaIconComponent, ModalComponent, ConfirmDialogComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('admin.cancel.title')"
      (closed)="closed.emit()"
    >
      @if (event(); as event) {
        <div class="space-y-5">
          <p class="text-sm leading-6 text-muted">{{ i18n.t('admin.cancel.intro') }}</p>
          <p class="rounded-2xl border border-line bg-surface-raised/60 px-4 py-3 text-sm font-semibold text-ink">
            {{ event.title }}
          </p>

          <div>
            <label for="admin-cancel-reason" class="text-sm font-semibold text-ink">
              {{ i18n.t('admin.cancel.reasonLabel') }}
            </label>
            <textarea
              id="admin-cancel-reason"
              data-testid="admin-cancel-reason"
              rows="3"
              minlength="10"
              [value]="reason()"
              [placeholder]="i18n.t('admin.cancel.reasonPlaceholder')"
              (input)="onReason($event)"
              class="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            ></textarea>
            <p class="mt-1 text-xs" [class]="reasonValid() ? 'text-muted' : 'text-amber'">
              {{ i18n.t('admin.cancel.reasonHint') }}
            </p>
            @if (reasonTouched() && !reasonValid()) {
              <p role="alert" class="mt-1 text-xs text-coral">
                {{ i18n.t('admin.cancel.reasonError') }}
              </p>
            }
          </div>

          @if (otpSent()) {
            <div class="rounded-2xl border border-brand/25 bg-brand/5 p-4">
              <p class="flex items-center gap-2 text-sm font-semibold text-ink">
                <fa-icon [icon]="icons['envelope']" class="text-brand" aria-hidden="true" />
                {{ i18n.t('admin.cancel.otpTitle') }}
              </p>
              <p class="mt-1 text-xs text-muted">{{ i18n.t('admin.cancel.otpText') }}</p>
              <label for="admin-cancel-otp" class="mt-3 block text-xs font-semibold text-ink">
                {{ i18n.t('admin.cancel.otpLabel') }}
              </label>
              <input
                #otpInput
                id="admin-cancel-otp"
                data-testid="admin-cancel-otp"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                [value]="otp()"
                [placeholder]="i18n.t('admin.cancel.otpPlaceholder')"
                (input)="onOtp($event)"
                class="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-center text-lg font-semibold tracking-[0.4em] text-ink outline-none focus:border-brand"
              />
              @if (otpTouched() && !otpValid()) {
                <p role="alert" class="mt-1 text-xs text-coral">{{ i18n.t('admin.cancel.otpError') }}</p>
              }
              <button
                type="button"
                data-testid="admin-cancel-resend"
                class="mt-3 inline-flex min-h-11 items-center rounded-xl text-xs font-semibold text-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
                [disabled]="cooldown() > 0 || sending()"
                (click)="sendOtp()"
              >
                @if (cooldown() > 0) {
                  {{ i18n.t('admin.cancel.resendIn', { seconds: cooldown() }) }}
                } @else {
                  {{ i18n.t('admin.cancel.resend') }}
                }
              </button>
            </div>
          }

          @if (error()) {
            <p role="alert" data-testid="admin-cancel-error" class="text-sm text-coral">{{ error() }}</p>
          }
        </div>
      }

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end" modal-footer>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink"
          (click)="closed.emit()"
        >
          {{ i18n.t('common.cancel') }}
        </button>
        @if (event()) {
          @if (!otpSent()) {
            <button
              type="button"
              data-testid="admin-cancel-send"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary disabled:cursor-not-allowed disabled:opacity-40"
              [disabled]="!canSendOtp()"
              (click)="sendOtp()"
            >
              {{ sending() ? i18n.t('admin.cancel.sending') : i18n.t('admin.cancel.send') }}
            </button>
          } @else {
            <button
              type="button"
              data-testid="admin-cancel-confirm"
              class="inline-flex min-h-11 items-center justify-center rounded-xl bg-coral px-4 text-sm font-semibold text-on-danger disabled:cursor-not-allowed disabled:opacity-40"
              [disabled]="!canConfirm()"
              (click)="requestConfirmation()"
            >
              {{ i18n.t('admin.cancel.confirm') }}
            </button>
          }
        }
      </div>
    </app-modal>

    <app-confirm-dialog
      [open]="confirmOpen()"
      [title]="i18n.t('admin.cancel.confirmTitle')"
      [message]="confirmationMessage()"
      [confirmLabel]="i18n.t('admin.cancel.confirm')"
      [cancelLabel]="i18n.t('common.cancel')"
      tone="danger"
      (confirmed)="confirmCancel()"
      (cancelled)="confirmOpen.set(false)"
    />
  `,
})
export class AdminCancelDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(AdminRepository);
  private readonly destroyRef = inject(DestroyRef);

  readonly open = input(false);
  readonly event = input<AdminEvent | null>(null);
  readonly closed = output<void>();
  readonly cancelled = output<AdminEvent>();

  readonly reason = signal('');
  readonly otp = signal('');
  readonly reasonTouched = signal(false);
  readonly otpTouched = signal(false);
  readonly otpSent = signal(false);
  readonly cooldown = signal(0);
  readonly sending = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly confirmOpen = signal(false);

  protected readonly reasonValid = computed(() => this.reason().trim().length >= REASON_MIN);
  protected readonly otpValid = computed(() => /^\d{6}$/.test(this.otp()));
  protected readonly canSendOtp = computed(
    () => this.reasonValid() && !this.sending() && this.cooldown() === 0,
  );
  protected readonly canConfirm = computed(
    () => this.otpSent() && this.reasonValid() && this.otpValid() && !this.submitting(),
  );
  protected readonly confirmationMessage = computed(() =>
    this.i18n.t('admin.cancel.confirmMessage', { title: this.event()?.title ?? '' }),
  );

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.reset();
      }
    });
    this.destroyRef.onDestroy(() => this.clearCooldown());
  }

  protected onReason(event: Event): void {
    this.reasonTouched.set(true);
    this.reason.set((event.target as HTMLTextAreaElement).value);
  }

  protected onOtp(event: Event): void {
    this.otpTouched.set(true);
    this.otp.set(
      (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6),
    );
  }

  protected async sendOtp(): Promise<void> {
    const target = this.event();
    if (!target || !this.reasonValid() || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.error.set('');
    try {
      await this.repository.requestCancelOtp(target.id);
      this.otpSent.set(true);
      this.startCooldown();
    } catch (error: unknown) {
      this.error.set(adminErrorMessage(error, this.i18n));
    } finally {
      this.sending.set(false);
    }
  }

  protected requestConfirmation(): void {
    if (!this.canConfirm()) {
      this.otpTouched.set(true);
      return;
    }
    this.error.set('');
    this.confirmOpen.set(true);
  }

  protected async confirmCancel(): Promise<void> {
    const target = this.event();
    if (!target || this.submitting() || !this.canConfirm()) {
      return;
    }
    this.confirmOpen.set(false);
    this.submitting.set(true);
    this.error.set('');
    try {
      await this.repository.cancelEvent(target.id, this.reason(), this.otp());
      this.cancelled.emit(target);
    } catch (error: unknown) {
      this.error.set(adminErrorMessage(error, this.i18n));
    } finally {
      this.submitting.set(false);
    }
  }

  private reset(): void {
    this.clearCooldown();
    this.reason.set('');
    this.otp.set('');
    this.reasonTouched.set(false);
    this.otpTouched.set(false);
    this.otpSent.set(false);
    this.cooldown.set(0);
    this.sending.set(false);
    this.submitting.set(false);
    this.error.set('');
    this.confirmOpen.set(false);
  }

  private startCooldown(): void {
    this.clearCooldown();
    this.cooldown.set(RESEND_COOLDOWN_SECONDS);
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldown() - 1;
      this.cooldown.set(Math.max(0, next));
      if (next <= 0) {
        this.clearCooldown();
      }
    }, 1000);
  }

  private clearCooldown(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
