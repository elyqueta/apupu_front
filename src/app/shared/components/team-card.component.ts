import { Component, computed, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { StatusBadgeComponent } from './status-badge.component';

/**
 * Linha de equipa partilhada entre a área de gestão (`/equipas`) e o separador
 * de equipas da comunidade. Só apresenta dados; a navegação/ação é emitida por
 * `selected` para cada página manter o seu fluxo.
 */
@Component({
  selector: 'app-team-card',
  imports: [FaIconComponent, StatusBadgeComponent],
  template: `
    <button
      type="button"
      class="group flex w-full min-h-[4.5rem] items-center gap-3 px-3 py-3 text-left transition hover:bg-surface-raised/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 sm:px-4"
      [attr.data-testid]="testId()"
      (click)="selected.emit()"
    >
      <span class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-brand/25 bg-brand/15 text-sm font-semibold text-brand-strong">
        @if (photoUrl()) {
          <img [src]="photoUrl()" [alt]="name()" class="size-full object-cover" />
        } @else {
          {{ initials() }}
        }
      </span>

      <span class="min-w-0 flex-1">
        <span class="flex min-w-0 items-center gap-2">
          <span class="truncate text-sm font-semibold text-ink">{{ name() }}</span>
          @if (status(); as value) {
            <app-status-badge [value]="value" />
          }
        </span>
        @for (line of meta(); track $index) {
          <span class="mt-0.5 block truncate text-xs text-muted">{{ line }}</span>
        }
        @if (activityLabel(); as activity) {
          <span class="mt-0.5 block truncate text-xs text-muted">{{ activity }}</span>
        }
      </span>

      <span class="flex shrink-0 flex-col items-end gap-1">
        @if (roleLabel(); as role) {
          <span class="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-muted">{{ role }}</span>
        }
        <fa-icon [icon]="icons['chevronRight']" class="text-xs text-brand-strong transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  `,
})
export class TeamCardComponent {
  private readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly name = input.required<string>();
  readonly photoUrl = input<string | null>(null);
  readonly status = input<string | null>(null);
  /** Linhas curtas de contexto (evento, membros, tarefas, contagens…). */
  readonly meta = input<string[]>([]);
  readonly activityLabel = input<string | null>(null);
  readonly roleLabel = input<string | null>(null);
  readonly testId = input('');

  readonly selected = output<void>();

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    const value = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    return (value || this.name().slice(0, 2)).toUpperCase() || this.i18n.t('teams.previewFallback');
  });
}
