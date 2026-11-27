import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from './logo.component';

/**
 * Marca de navegação. Em ecrãs com pelo menos 480 px usa o logótipo horizontal;
 * abaixo disso usa apenas o símbolo, para não comprimir a barra.
 */
@Component({
  selector: 'app-brand',
  imports: [RouterLink, LogoComponent],
  template: `
    <a routerLink="/" class="group inline-flex items-center" aria-label="Conto Contigo">
      <span class="hidden min-[480px]:block">
        <app-logo variant="horizontal" [height]="height() || 32" class="dark:hidden" />
        <app-logo variant="horizontal" theme="white" [height]="height() || 32" class="hidden dark:block" />
      </span>
      <span class="block min-[480px]:hidden">
        <app-logo variant="symbol" [height]="height() || 40" class="dark:hidden" />
        <app-logo variant="symbol" theme="white" [height]="height() || 40" class="hidden dark:block" />
      </span>
    </a>
  `,
})
export class BrandComponent {
  /** Altura pretendida do logótipo; por omissão usa a altura da navegação. */
  readonly height = input(0);
}
