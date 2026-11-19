import { Component, computed, input } from '@angular/core';

/** Grelha única dos cartões de estatísticas: 2 colunas em mobile, 3 ou 4 a partir de `lg`. */
@Component({
  selector: 'app-stat-grid',
  template: `
    <div [class]="gridClass()">
      <ng-content />
    </div>
  `,
})
export class StatGridComponent {
  readonly columns = input<3 | 4>(4);

  protected readonly gridClass = computed(() =>
    this.columns() === 3
      ? 'grid grid-cols-2 gap-3 lg:grid-cols-3'
      : 'grid grid-cols-2 gap-3 lg:grid-cols-4',
  );
}
