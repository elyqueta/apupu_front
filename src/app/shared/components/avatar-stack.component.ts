import { Component, computed, input } from '@angular/core';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'app-avatar-stack',
  imports: [AvatarComponent],
  template: `
    <div class="flex items-center">
      <div class="flex -space-x-2.5">
        @for (person of visiblePeople(); track person.id) {
          <app-avatar
            [name]="person.name"
            [imageUrl]="person.imageUrl"
            size="sm"
            class="transition duration-300 hover:-translate-y-1"
          />
        }
        @if (remaining() > 0) {
          <span
            class="inline-grid size-9 place-items-center rounded-full border border-line bg-surface-raised text-[11px] font-semibold text-muted ring-2 ring-canvas/50"
          >
            +{{ remaining() }}
          </span>
        }
      </div>
    </div>
  `,
})
export class AvatarStackComponent {
  readonly names = input.required<string[]>();
  /** URLs alinhadas com `names`; quando ausentes, o avatar usa iniciais. */
  readonly images = input<Array<string | null>>([]);
  readonly max = input(3);

  protected readonly visiblePeople = computed(() =>
    this.names()
      .slice(0, this.max())
      .map((name, index) => ({
        id: index,
        name,
        imageUrl: this.images()[index] ?? null,
      })),
  );
  protected readonly remaining = computed(() =>
    Math.max(0, this.names().length - this.visiblePeople().length),
  );
}
