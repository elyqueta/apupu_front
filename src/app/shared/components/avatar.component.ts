import { Component, computed, input } from '@angular/core';

const PALETTES = [
  'bg-linear-to-br from-brand via-iris to-aqua',
  'bg-linear-to-br from-iris via-brand to-aqua',
  'bg-linear-to-br from-aqua via-brand to-iris',
  'bg-linear-to-br from-brand-strong via-brand to-iris',
  'bg-linear-to-br from-mint via-aqua to-brand',
];

const SIZES: Record<string, string> = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
};

@Component({
  selector: 'app-avatar',
  template: `
    <span
      class="inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide text-white shadow-card ring-2 ring-canvas/50"
      [class]="classes()"
      [attr.title]="name()"
      [attr.aria-label]="name()"
    >
      {{ initials() }}
    </span>
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('sm');

  protected readonly initials = computed(() => {
    const parts = this.name()
      .trim()
      .split(/\s+/)
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  protected readonly classes = computed(() => {
    const hash = [...this.name()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `${SIZES[this.size()]} ${PALETTES[hash % PALETTES.length]}`;
  });
}
