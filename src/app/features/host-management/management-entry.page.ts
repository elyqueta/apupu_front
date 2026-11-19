import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiClient } from '../../core/api/api-client';
import { toApiError } from '../../core/api/api-error';
import { ApiEvent } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

interface HostSessionResponse {
  event: ApiEvent;
  role: 'host' | 'manager';
  access_role: 'host' | 'manager';
  email: string | null;
  email_has_account: boolean;
  csrf_token: string;
  expires_at: string;
}

interface AccountPrompt {
  eventId: string;
  email: string;
  step: 'options' | 'choose-email';
}

@Component({
  selector: 'app-management-entry-page',
  imports: [FaIconComponent, BrandComponent, PreferenceControlsComponent, ModalComponent],
  templateUrl: './management-entry.page.html',
})
export class ManagementEntryPage {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly link = signal('');
  protected readonly error = signal('');
  protected readonly invalidLink = signal(false);
  protected readonly busy = signal(false);
  protected readonly accountPrompt = signal<AccountPrompt | null>(null);

  protected readonly security = [
    {
      titleKey: 'management.sec1' as const,
      textKey: 'management.sec1Text' as const,
      icon: 'key',
      tone: 'text-aqua border-aqua/25 bg-aqua/10',
    },
    {
      titleKey: 'management.sec2' as const,
      textKey: 'management.sec2Text' as const,
      icon: 'lock',
      tone: 'text-brand-strong border-brand/25 bg-brand/10',
    },
    {
      titleKey: 'management.sec3' as const,
      textKey: 'management.sec3Text' as const,
      icon: 'shield',
      tone: 'text-mint border-mint/25 bg-mint/10',
    },
  ];

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const token = params.get('token');
      if (token) {
        void this.open(token);
      }
    });
  }

  protected updateLink(value: string): void {
    this.link.set(value);
    this.error.set('');
    this.invalidLink.set(false);
  }

  protected async submit(): Promise<void> {
    const token = extractManagementToken(this.link());
    if (!token || this.busy()) {
      this.invalidLink.set(true);
      this.error.set(this.i18n.t('management.invalidHint'));
      return;
    }
    await this.open(token);
  }

  private async open(token: string): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.invalidLink.set(false);
    try {
      const response = await this.api.post<HostSessionResponse>('/host/session', { token });
      this.link.set('');
      if (!response.email_has_account && response.email) {
        this.accountPrompt.set({
          eventId: response.event.id,
          email: response.email,
          step: 'options',
        });
        return;
      }
      await this.router.navigate(['/gestao/evento', response.event.id], { replaceUrl: true });
    } catch (error: unknown) {
      this.link.set('');
      const apiError = toApiError(error);
      const unavailable = apiError.status === 401 || apiError.status === 404;
      this.invalidLink.set(unavailable);
      this.error.set(unavailable ? this.i18n.t('management.invalidHint') : apiError.message);
    } finally {
      this.busy.set(false);
    }
  }

  protected chooseSameEmail(): void {
    this.accountPrompt.update((prompt) =>
      prompt ? { ...prompt, step: 'choose-email' } : prompt,
    );
  }

  protected backToAccountOptions(): void {
    this.accountPrompt.update((prompt) => (prompt ? { ...prompt, step: 'options' } : prompt));
  }

  protected createAccountWithSameEmail(): void {
    const prompt = this.accountPrompt();
    if (!prompt) {
      return;
    }
    void this.router.navigate(['/criar-conta'], {
      queryParams: {
        email: prompt.email,
        enviar: 1,
        returnUrl: this.returnUrl(prompt.eventId),
      },
    });
  }

  protected createAccountWithOtherEmail(): void {
    const prompt = this.accountPrompt();
    if (!prompt) {
      return;
    }
    void this.router.navigate(['/criar-conta'], {
      queryParams: { returnUrl: this.returnUrl(prompt.eventId) },
    });
  }

  protected loginInstead(): void {
    const prompt = this.accountPrompt();
    if (!prompt) {
      return;
    }
    void this.router.navigate(['/entrar'], {
      queryParams: { email: prompt.email, returnUrl: this.returnUrl(prompt.eventId) },
    });
  }

  protected continueWithoutAccount(): void {
    const prompt = this.accountPrompt();
    if (!prompt) {
      return;
    }
    void this.router.navigate(['/gestao/evento', prompt.eventId], { replaceUrl: true });
  }

  private returnUrl(eventId: string): string {
    return `/gestao/evento/${eventId}`;
  }
}

function extractManagementToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.at(-1) ?? '';
  } catch {
    return trimmed.split(/[/?#]/).filter(Boolean).at(-1) ?? '';
  }
}
