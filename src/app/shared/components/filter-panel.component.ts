import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ICONS } from '../../core/ui/icons';

/**
 * Barra de filtros compacta e partilhada entre Mensagens, Equipas e Tarefas.
 *
 * Em mobile o conteúdo começa recolhido sob um botão de 44 px; a partir de
 * `md` fica sempre visível. O markup do botão é idêntico nas três páginas.
 */
@Component({
  selector: 'app-filter-panel',
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      class="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-raised/70 px-3 text-xs font-semibold text-ink transition hover:border-brand/40 md:hidden"
      [attr.aria-expanded]="expanded()"
      [attr.aria-controls]="controlsId()"
      (click)="toggle()"
    >
      <span class="inline-flex min-w-0 items-center gap-2">
        <fa-icon [icon]="icons['filter']" class="text-[11px] text-muted" aria-hidden="true" />
        {{ label() }}
        @if (activeCount() > 0) {
          <span
            class="grid size-4 place-items-center rounded-full bg-brand text-[9px] font-semibold text-on-secondary"
          >
            {{ activeCount() }}
          </span>
        }
      </span>
      <fa-icon
        [icon]="icons['chevronDown']"
        class="text-[10px] text-muted transition"
        [class.rotate-180]="expanded()"
        aria-hidden="true"
      />
    </button>

    <div
      [id]="controlsId()"
      class="min-w-0 flex-col gap-3 md:flex"
      [class.flex]="expanded()"
      [class.hidden]="!expanded()"
    >
      <ng-content />
    </div>
  `,
})
export class FilterPanelComponent {
  readonly label = input.required<string>();
  readonly controlsId = input.required<string>();
  readonly expanded = input(false);
  readonly activeCount = input(0);

  readonly expandedChange = output<boolean>();

  protected readonly icons = ICONS;

  protected toggle(): void {
    this.expandedChange.emit(!this.expanded());
  }
}
