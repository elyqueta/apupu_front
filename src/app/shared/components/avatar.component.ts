import { Component, computed, input } from '@angular/core';

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
      class="inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide text-on-secondary shadow-card ring-2 ring-canvas/50"
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
    return `${SIZES[this.size()]} bg-brand`;
  });
}
