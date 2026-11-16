import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ICONS } from '../../core/ui/icons';

interface ArtworkStyle {
  icon: IconDefinition;
}

const ARTWORK: Record<string, ArtworkStyle> = {
  aurora: {
    icon: ICONS['sparkles'],
  },
  constellation: {
    icon: ICONS['star'],
  },
  waves: {
    icon: ICONS['gem'],
  },
  silk: {
    icon: ICONS['heart'],
  },
};

@Component({
  selector: 'app-template-artwork',
  imports: [FaIconComponent],
  template: `
    <div
      class="relative isolate overflow-hidden rounded-[inherit] bg-surface-raised"
      [class]="variantClass()"
    >
      <div class="relative flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          @if (kicker()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted"
            >
              {{ kicker() }}
            </span>
          } @else {
            <span></span>
          }
          @if (showIcon()) {
            <span
              class="grid size-10 place-items-center rounded-2xl border border-line bg-surface text-brand-strong"
            >
              <fa-icon [icon]="art().icon" class="text-base" aria-hidden="true" />
            </span>
          }
        </div>

        @if (title()) {
          <div class="max-w-md">
            <p
              class="font-display text-xl font-semibold leading-tight tracking-tight text-ink sm:text-2xl"
            >
              {{ title() }}
            </p>
            @if (subtitle()) {
              <p class="mt-1 text-xs font-medium text-muted">{{ subtitle() }}</p>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TemplateArtworkComponent {
  readonly templateId = input<string | null>('');
  readonly variant = input<'thumb' | 'cover' | 'hero'>('cover');
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly kicker = input<string>('');
  readonly showIcon = input(true);

  protected readonly art = computed(() => ARTWORK[this.templateId() ?? ''] ?? ARTWORK['aurora']);

  protected readonly variantClass = computed(() => {
    switch (this.variant()) {
      case 'thumb':
        return 'aspect-[4/3]';
      case 'hero':
        return 'h-full min-h-56 sm:min-h-72';
      default:
        return 'aspect-[16/9]';
    }
  });
}
