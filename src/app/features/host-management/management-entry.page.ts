import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiClient } from '../../core/api/api-client';
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

const ACCESS_CODE_LENGTH = 6;

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
  /** Segredo do link, lido da rota; nunca é mostrado no ecrã. */
  protected readonly token = signal('');
  protected readonly code = signal('');
  protected readonly error = signal('');
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

  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.token.set(params.get('token') ?? '');
      if (!params.get('token')) {
        void this.resumeRememberedSession();
      }
    });
  }

  /**
   * Sessão persistente de quem entrou com link + código: o navegador
   * lembra o evento e volta a entrar enquanto a sessão (cookie HttpOnly)
   * for válida. Se um gestor revogou o acesso, a lembrança é apagada.
   */
  private async resumeRememberedSession(): Promise<void> {
    const eventId = readRememberedEvent(this.browser);
    if (!eventId) return;
    try {
      await this.api.get<ApiEvent>(`/host/events/${encodeURIComponent(eventId)}`);
      await this.router.navigate(['/gestao/evento', eventId], { replaceUrl: true });
    } catch {
      rememberEvent(this.browser, null);
    }
  }

  protected updateCode(value: string): void {
    this.code.set(normalizeAccessCode(value));
    this.error.set('');
  }

  protected async submit(): Promise<void> {
    const token = this.token();
    const code = this.code();
    if (this.busy() || !token || code.length !== ACCESS_CODE_LENGTH) {
      // Todas as falhas, incluindo formato inválido, partilham o mesmo texto.
      this.error.set(this.i18n.t('management.accessFailed'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await this.api.post<HostSessionResponse>('/public/manage/access', {
        token,
        code,
      });
      this.code.set('');
      rememberEvent(this.browser, response.event.id);
      if (!response.email_has_account && response.email) {
        this.accountPrompt.set({
          eventId: response.event.id,
          email: response.email,
          step: 'options',
        });
        return;
      }
      await this.router.navigate(['/gestao/evento', response.event.id], { replaceUrl: true });
    } catch {
      // Nunca distingue link inválido, código errado, bloqueio ou erro de rede.
      this.code.set('');
      this.error.set(this.i18n.t('management.accessFailed'));
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
        gestor: 1,
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
    void this.router.navigate(['/gestao/evento', prompt.eventId], {
      queryParams: { sem_conta: 1, email: prompt.email },
      replaceUrl: true,
    });
  }

  private returnUrl(eventId: string): string {
    return `/gestao/evento/${eventId}`;
  }
}

/** Maiúsculas automáticas, sem espaços nem hífenes, no máximo 6 caracteres. */
export function normalizeAccessCode(value: string): string {
  return value
    .toLocaleUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ACCESS_CODE_LENGTH);
}

const REMEMBERED_EVENT_KEY = 'apupu.manage.lastEvent';

function readRememberedEvent(browser: boolean): string | null {
  if (!browser) return null;
  try {
    return localStorage.getItem(REMEMBERED_EVENT_KEY);
  } catch {
    return null;
  }
}

function rememberEvent(browser: boolean, eventId: string | null): void {
  if (!browser) return;
  try {
    if (eventId) {
      localStorage.setItem(REMEMBERED_EVENT_KEY, eventId);
    } else {
      localStorage.removeItem(REMEMBERED_EVENT_KEY);
    }
  } catch {
    // Sem armazenamento local (modo privado): a sessão continua no cookie.
  }
}
