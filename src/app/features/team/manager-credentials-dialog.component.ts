import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { ManagerInviteStatus } from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ModalComponent } from '../../shared/components/modal.component';

/** Normaliza o código para o formato mostrado ao anfitrião: XXX-XXX. */
export function formatAccessCode(code: string): string {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

/** Aceita maiúsculas, espaços e hífens; o backend compara o código limpo. */
export function normalizeAccessCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

/**
 * Segundo modal do fluxo de criação/regeneração: mostra o link e o código
 * uma única vez e oferece cópia e partilha por WhatsApp.
 */
@Component({
  selector: 'app-manager-credentials-dialog',
  imports: [FaIconComponent, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="i18n.t('managerDialog.credentialsTitle')"
      presentation="sheet"
      [dismissible]="false"
      size="md"
      (closed)="done.emit()"
    >
      <div class="flex flex-col gap-4">
        <div class="rounded-2xl border border-line bg-surface-raised p-4">
          <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {{ i18n.t('managerDialog.linkLabel') }}
          </p>
          <div class="mt-2 flex items-start gap-2">
            <p class="min-w-0 flex-1 break-all text-xs leading-5 text-ink">{{ link() }}</p>
            <button
              type="button"
              class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              [attr.aria-label]="i18n.t('managerDialog.copy')"
              (click)="copy(link(), 'link')"
            >
              <fa-icon [icon]="icons['copy']" aria-hidden="true" />
              {{ i18n.t('managerDialog.copy') }}
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-brand/40 bg-brand/5 p-4 text-center">
          <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {{ i18n.t('managerDialog.codeLabel') }}
          </p>
          <p class="mt-1 text-3xl font-bold tracking-[0.18em] text-ink" data-testid="manager-code">
            {{ formattedCode() }}
          </p>
          <button
            type="button"
            class="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            (click)="copy(formattedCode(), 'code')"
          >
            <fa-icon [icon]="icons['copy']" aria-hidden="true" />
            {{ i18n.t('managerDialog.copy') }}
          </button>
        </div>

        @if (copied() ) {
          <p class="text-xs text-brand" role="status">{{ i18n.t('managerDialog.copied') }}</p>
        }

        <div class="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-testid="manager-share-whatsapp"
            class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            (click)="shareWhatsapp()"
          >
            <fa-icon [icon]="icons['whatsapp']" aria-hidden="true" />
            {{ i18n.t('managerDialog.shareWhatsapp') }}
          </button>
          <button
            type="button"
            data-testid="manager-copy-message"
            class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            (click)="copy(message(), 'message')"
          >
            <fa-icon [icon]="icons['copy']" aria-hidden="true" />
            {{ i18n.t('managerDialog.copyMessage') }}
          </button>
        </div>

        <p class="text-xs leading-5 text-muted">{{ i18n.t('managerDialog.codeWarning') }}</p>
        @switch (inviteStatus()) {
          @case ('queued') {
            <p class="text-xs leading-5 text-muted">{{ i18n.t('managerDialog.emailSent') }}</p>
          }
          @case ('failed') {
            <p class="text-xs leading-5 text-coral">{{ i18n.t('managerDialog.emailFailed') }}</p>
          }
          @case ('not_sent') {
            <p class="text-xs leading-5 text-muted">{{ i18n.t('managerDialog.notSent') }}</p>
          }
        }

        <div class="flex justify-end border-t border-line/70 pt-4">
          <button
            type="button"
            data-testid="manager-credentials-done"
            class="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            (click)="done.emit()"
          >
            {{ i18n.t('managerDialog.done') }}
          </button>
        </div>
      </div>
    </app-modal>
  `,
})
export class ManagerCredentialsDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly share = inject(ShareService);
  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly link = input('');
  readonly code = input('');
  readonly eventTitle = input('');
  readonly phone = input<string | null>(null);
  readonly email = input<string | null>(null);
  readonly inviteStatus = input<ManagerInviteStatus>('not_sent');

  readonly done = output<void>();

  protected readonly copied = signal(false);
  protected readonly formattedCode = computed(() => formatAccessCode(this.code()));
  protected readonly message = computed(() =>
    this.i18n.t('managerDialog.message', {
      event: this.eventTitle(),
      link: this.link(),
      code: this.formattedCode(),
    }),
  );

  protected async copy(value: string, _kind: 'link' | 'code' | 'message'): Promise<void> {
    const ok = await this.share.copy(value);
    if (ok) this.copied.set(true);
  }

  protected shareWhatsapp(): void {
    const url = this.share.whatsappUrl(this.phone(), this.message());
    if (url) {
      this.share.openExternal(url);
    } else {
      void this.copy(this.message(), 'message');
    }
  }
}
