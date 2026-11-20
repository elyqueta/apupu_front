import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ProtectedNoticeComponent } from '../../shared/components/protected-notice.component';

/**
 * Casca das páginas públicas. Garante o aviso de protótipo em todas elas sem
 * obrigar a editar páginas existentes (auth, recuperação e convite).
 *
 * A landing já mostra o aviso no seu próprio topo, pelo que a casca se
 * silencia nessa rota para não duplicar a faixa.
 */
@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, ProtectedNoticeComponent],
  template: `
    <div class="flex min-h-dvh flex-col bg-canvas text-ink">
      @if (showNotice()) {
        <app-protected-notice />
      }
      <div class="flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class PublicShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showNotice = signal(true);

  constructor() {
    this.sync(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.sync(event.urlAfterRedirects));
  }

  private sync(url: string): void {
    const path = url.split(/[?#]/)[0];
    this.showNotice.set(path !== '/');
  }
}
