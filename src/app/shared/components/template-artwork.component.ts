import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { TemplateId } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';

interface ArtworkStyle {
  bg: string;
  glowOne: string;
  glowTwo: string;
  icon: IconDefinition;
}

const ARTWORK: Record<TemplateId, ArtworkStyle> = {
  aurora: {
    bg: 'bg-linear-to-br from-[#16296f] via-[#5856e8] to-[#6de6ff]',
    glowOne: 'bg-[#63e2ff]/50',
    glowTwo: 'bg-[#a58cff]/60',
    icon: ICONS['sparkles'],
  },
  constellation: {
    bg: 'bg-linear-to-br from-[#080f2f] via-[#283a8f] to-[#9c7cff]',
    glowOne: 'bg-[#a58cff]/55',
    glowTwo: 'bg-[#63e2ff]/30',
    icon: ICONS['star'],
  },
  waves: {
    bg: 'bg-linear-to-br from-[#04243f] via-[#0b619b] to-[#5fe0ff]',
    glowOne: 'bg-[#5fe0ff]/55',
    glowTwo: 'bg-[#5b83ff]/55',
    icon: ICONS['gem'],
  },
  silk: {
    bg: 'bg-linear-to-br from-[#21194b] via-[#5b4aa8] to-[#c7b8ff]',
    glowOne: 'bg-[#c7b8ff]/50',
    glowTwo: 'bg-[#a58cff]/50',
    icon: ICONS['heart'],
  },
};

@Component({
  selector: 'app-template-artwork',
  imports: [FaIconComponent],
  template: `
    <div
      class="relative isolate overflow-hidden rounded-[inherit]"
      [class]="variantClass()"
    >
      <div class="absolute inset-0 bg-linear-to-br" [class]="art().bg"></div>

      <div
        class="absolute -left-10 -top-12 size-48 rounded-full opacity-80 blur-3xl motion-safe:animate-float-slow"
        [class]="art().glowOne"
      ></div>
      <div
        class="absolute -bottom-16 right-0 size-56 rounded-full opacity-70 blur-3xl motion-safe:animate-float"
        [class]="art().glowTwo"
      ></div>

      <div class="absolute -right-14 -top-20 size-56 rounded-full border border-white/20"></div>
      <div class="absolute right-10 top-12 size-28 rounded-full border border-white/15"></div>
      <div class="absolute bottom-8 left-10 size-2.5 rounded-full bg-white/70 shadow-[0_0_18px_rgba(255,255,255,0.9)]"></div>
      <div class="absolute left-16 top-14 size-1.5 rounded-full bg-white/60"></div>
      <div class="absolute right-24 top-24 size-2 rounded-full bg-white/50"></div>

      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.28),transparent_42%)]"
      ></div>
      <div
        class="absolute inset-0 opacity-25 bg-[linear-gradient(112deg,transparent_0%,rgba(255,255,255,0.3)_46%,transparent_54%)]"
      ></div>
      <div
        class="absolute inset-0 bg-linear-to-t from-[#040817]/55 via-transparent to-transparent"
      ></div>

      <div class="relative flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          @if (kicker()) {
            <span
              class="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md"
            >
              {{ kicker() }}
            </span>
          } @else {
            <span></span>
          }
          @if (showIcon()) {
            <span
              class="grid size-10 place-items-center rounded-2xl border border-white/25 bg-white/15 text-white backdrop-blur-md"
            >
              <fa-icon [icon]="art().icon" class="text-base" aria-hidden="true" />
            </span>
          }
        </div>

        @if (title()) {
          <div class="max-w-md">
            <p
              class="font-display text-xl font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-2xl"
            >
              {{ title() }}
            </p>
            @if (subtitle()) {
              <p class="mt-1 text-xs font-medium text-white/70">{{ subtitle() }}</p>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class TemplateArtworkComponent {
  readonly templateId = input.required<TemplateId>();
  readonly variant = input<'thumb' | 'cover' | 'hero'>('cover');
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly kicker = input<string>('');
  readonly showIcon = input(true);

  protected readonly art = computed(() => ARTWORK[this.templateId()]);

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
