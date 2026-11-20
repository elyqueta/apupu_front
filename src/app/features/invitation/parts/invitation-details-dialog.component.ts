import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ICONS } from '../../../core/ui/icons';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal.component';
import { InvitationEventView } from '../invitation.models';

/** Conteúdo secundário do convite, num único modal com secções. */
@Component({
  selector: 'app-invitation-details-dialog',
  imports: [FaIconComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('invitation.moreDetails')"
      size="lg"
      (closed)="closed.emit()"
    >
      <div class="flex flex-col gap-4">
        @if (event().message) {
          <section class="rounded-2xl border border-line bg-surface-raised p-4">
            <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-strong">
              <fa-icon [icon]="icons['quote']" aria-hidden="true" />
              {{ i18n.t('invitation.messageTitle') }}
            </h3>
            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{{ event().message }}</p>
            <p class="mt-3 text-xs font-semibold text-muted">— {{ event().hostName }}</p>
          </section>
        }

        @if (event().rules) {
          <section class="rounded-2xl border border-line bg-surface-raised p-4">
            <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber">
              <fa-icon [icon]="icons['checklist']" aria-hidden="true" />
              {{ i18n.t('invitation.rulesTitle') }}
            </h3>
            <p class="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{{ event().rules }}</p>
          </section>
        }

        @if (event().dressCode) {
          <section class="rounded-2xl border border-line bg-surface-raised p-4">
            <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-iris">
              <fa-icon [icon]="icons['shirt']" aria-hidden="true" />
              {{ i18n.t('invitation.dressTitle') }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-ink">{{ event().dressCode }}</p>
          </section>
        }

        @if (event().contributionEnabled && event().bankDetails; as bank) {
          <section class="rounded-2xl border border-line bg-surface-raised p-4">
            <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-mint">
              <fa-icon [icon]="icons['bank']" aria-hidden="true" />
              {{ i18n.t('invitation.contributionTitle') }}
            </h3>
            <p class="mt-2 text-xs leading-5 text-muted">{{ i18n.t('invitation.contributionText') }}</p>
            <dl class="mt-3 grid gap-2 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-semibold text-muted">{{ i18n.t('invitation.bank') }}</dt>
                <dd class="text-sm text-ink">{{ bank.bankName }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold text-muted">{{ i18n.t('invitation.account') }}</dt>
                <dd class="text-sm text-ink">{{ bank.accountHolder }}</dd>
              </div>
              <div class="sm:col-span-2">
                <dt class="text-xs font-semibold text-muted">{{ i18n.t('invitation.iban') }}</dt>
                <dd class="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span class="break-all font-mono text-sm text-ink">{{ bank.accountReference }}</span>
                  <button
                    type="button"
                    data-testid="invitation-copy-iban"
                    class="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                    (click)="copyReference()"
                  >
                    <fa-icon [icon]="icons['copy']" aria-hidden="true" />
                    {{ i18n.t('invitation.copyIban') }}
                  </button>
                </dd>
              </div>
            </dl>
            <p class="mt-3 text-xs leading-5 text-muted">{{ i18n.t('invitation.noPayments') }}</p>
          </section>
        }

        <section class="rounded-2xl border border-line bg-surface-raised p-4">
          <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-aqua">
            <fa-icon [icon]="icons['bell']" aria-hidden="true" />
            {{ i18n.t('invitation.reminderTitle') }}
          </h3>
          <p class="mt-2 text-xs leading-5 text-muted">{{ i18n.t('invitation.reminderText') }}</p>
        </section>

        <section class="rounded-2xl border border-line bg-surface-raised p-4">
          <h3 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-strong">
            <fa-icon [icon]="icons['lock']" aria-hidden="true" />
            {{ i18n.t('settings.privacy') }}
          </h3>
          <p class="mt-2 text-xs leading-5 text-muted">{{ i18n.t('invitation.privacyText') }}</p>
        </section>
      </div>
    </app-modal>
  `,
})
export class InvitationDetailsDialogComponent {
  protected readonly i18n = inject(I18nService);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly event = input.required<InvitationEventView>();

  readonly closed = output<void>();

  protected async copyReference(): Promise<void> {
    const reference = this.event().bankDetails?.accountReference;
    if (!reference) {
      return;
    }
    const copied = await this.share.copy(reference);
    if (copied) {
      this.toasts.success(this.i18n.t('invitation.ibanCopied'));
    } else {
      this.toasts.error(this.i18n.t('common.copyError'));
    }
  }
}
