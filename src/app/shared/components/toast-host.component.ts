import { Component, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ToastService, ToastTone } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-toast-host',
  imports: [FaIconComponent],
  template: `
    <div
      class="pointer-events-none fixed inset-x-4 bottom-5 z-[120] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-[min(92vw,24rem)]"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of toasts.messages(); track toast.id) {
        <div
          class="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-3.5 shadow-card backdrop-blur-2xl animate-rise"
          [class]="toneClasses(toast.tone)"
          role="status"
        >
          <span
            class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10"
          >
            <fa-icon [icon]="icon(toast.tone)" class="text-sm" />
          </span>
          <p class="min-w-0 flex-1 text-sm leading-6 text-ink">{{ toast.message }}</p>
          <button
            type="button"
            class="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-ink"
            [attr.aria-label]="i18n.t('common.close')"
            (click)="toasts.dismiss(toast.id)"
          >
            <fa-icon [icon]="icons['close']" class="text-xs" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected icon(tone: ToastTone) {
    return tone === 'success'
      ? this.icons['success']
      : tone === 'error'
        ? this.icons['error']
        : this.icons['info'];
  }

  protected toneClasses(tone: ToastTone): string {
    const base = 'bg-surface-solid/95';
    switch (tone) {
      case 'success':
        return `${base} border-mint/30 text-ink`;
      case 'error':
        return `${base} border-coral/35 text-ink`;
      case 'info':
        return `${base} border-aqua/30 text-ink`;
    }
  }
}
