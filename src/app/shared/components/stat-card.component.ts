import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { IconTone } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';

const TONES: Record<IconTone, { tile: string; line: string }> = {
  brand: {
    tile: 'border-brand/25 bg-brand/15 text-brand-strong',
    line: 'text-brand',
  },
  iris: {
    tile: 'border-iris/25 bg-iris/15 text-iris',
    line: 'text-brand',
  },
  aqua: {
    tile: 'border-aqua/25 bg-aqua/15 text-aqua',
    line: 'text-brand',
  },
  mint: {
    tile: 'border-mint/25 bg-mint/15 text-mint',
    line: 'text-brand',
  },
  amber: {
    tile: 'border-amber/25 bg-amber/15 text-amber',
    line: 'text-brand',
  },
  coral: {
    tile: 'border-coral/25 bg-coral/10 text-coral',
    line: 'text-brand',
  },
};

@Component({
  selector: 'app-stat-card',
  imports: [FaIconComponent],
  template: `
    <article
      class="group relative overflow-hidden rounded-4xl border border-line bg-surface p-5 shadow-card backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-brand/35"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {{ label() }}
          </p>
          <p class="mt-2 truncate font-display text-3xl font-semibold tracking-tight text-ink">
            {{ value() }}
          </p>
        </div>
        <span
          class="grid size-11 shrink-0 place-items-center rounded-2xl border backdrop-blur-md transition duration-300 group-hover:scale-105"
          [class]="toneStyles().tile"
        >
          <fa-icon [icon]="icon()" class="text-base" aria-hidden="true" />
        </span>
      </div>

      <div class="mt-4 flex items-end justify-between gap-3">
        <p class="text-xs leading-5 text-muted">{{ hint() }}</p>
        @if (trend()) {
          <span
            class="inline-flex shrink-0 items-center gap-1 rounded-full border border-mint/25 bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint"
          >
            <fa-icon [icon]="icons['trendUp']" class="text-[9px]" aria-hidden="true" />
            {{ trend() }}
          </span>
        }
      </div>

      @if (sparkline().length > 1) {
        <svg
          viewBox="0 0 120 36"
          preserveAspectRatio="none"
          class="mt-3 h-9 w-full"
          aria-hidden="true"
        >
          <polyline
            [attr.points]="sparklinePoints()"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="opacity-70"
            [class]="toneStyles().line"
          />
        </svg>
      }
    </article>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>('');
  readonly icon = input.required<IconDefinition>();
  readonly tone = input<IconTone>('brand');
  readonly trend = input<string>('');
  readonly sparkline = input<number[]>([]);

  protected readonly icons = ICONS;
  protected readonly toneStyles = computed(() => TONES[this.tone()]);

  protected readonly sparklinePoints = computed(() => {
    const values = this.sparkline();
    if (values.length < 2) {
      return '';
    }
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 120;
        const y = 32 - ((value - min) / range) * 28;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });
}
