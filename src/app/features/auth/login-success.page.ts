import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';

/**
 * Página de destino do callback Google (`/auth/google/callback`).
 *
 * O backend cria a sessão com cookie HttpOnly e redireciona para cá sem
 * qualquer token na URL. Esta página só confirma a sessão com
 * `GET /api/v1/auth/session` e encaminha o utilizador para o painel.
 */
@Component({
  selector: 'app-login-success',
  template: `
    <main
      class="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        class="size-9 animate-spin rounded-full border-2 border-line border-t-brand"
        aria-hidden="true"
      ></span>
      <p class="text-lg font-semibold text-ink">A entrar com o Google…</p>
      @if (failed()) {
        <p class="text-sm text-danger" role="alert">
          Não foi possível concluir a entrada. A voltar ao início de sessão…
        </p>
      }
    </main>
  `,
})
export class LoginSuccessComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly platform = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  protected readonly failed = signal(false);

  async ngOnInit(): Promise<void> {
    // No servidor não há cookie de sessão: a página é renderizada como
    // "a entrar" e a confirmação acontece no browser.
    if (!isPlatformBrowser(this.platform)) {
      return;
    }

    const host = await this.auth.restoreSession();
    this.clearQueryString();
    await this.router.navigateByUrl(host ? '/painel' : '/entrar', { replaceUrl: true });
    this.failed.set(!host);
  }

  /** Remove qualquer query string residual do callback (defesa em profundidade). */
  private clearQueryString(): void {
    const view = this.document.defaultView;
    if (!view?.history) {
      return;
    }
    try {
      const url = new URL(view.location.href);
      if (url.search) {
        url.search = '';
        view.history.replaceState(null, '', `${url.pathname}${url.hash}`);
      }
    } catch {
      // Navegação seguinte substitui a entrada do histórico de qualquer forma.
    }
  }
}
