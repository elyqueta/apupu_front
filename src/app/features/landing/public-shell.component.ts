import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Casca comum das páginas públicas (autenticação, recuperação e convite).
 * Mantém o fundo e a altura mínima da aplicação sem acrescentar faixas no
 * topo das páginas.
 */
@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet],
  template: `
    <div class="flex min-h-dvh flex-col bg-canvas text-ink">
      <div class="flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export class PublicShellComponent {}
