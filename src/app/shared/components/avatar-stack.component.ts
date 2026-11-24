import { Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from './avatar.component';

@Component({
  selector: 'app-avatar-stack',
  imports: [AvatarComponent],
  template: `
    <div class="flex items-center">
      <div class="flex -space-x-2.5">
        @for (person of visiblePeople(); track person.id) {
          @if (selectable()) {
            <button
              type="button"
              class="inline-flex size-11 shrink-0 items-center justify-center rounded-full transition hover:z-10 hover:-translate-y-1 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              [attr.aria-label]="selectLabel() ? selectLabel() + ': ' + person.name : person.name"
              [attr.data-testid]="'avatar-member-' + person.id"
              (click)="memberSelected.emit(person.id)"
            >
              <app-avatar [name]="person.name" [imageUrl]="person.imageUrl" size="sm" />
            </button>
          } @else {
            <app-avatar
              [name]="person.name"
              [imageUrl]="person.imageUrl"
              size="sm"
              class="transition duration-300 hover:-translate-y-1"
            />
          }
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
  /** Identificadores alinhados com `names`, usados quando a pilha é seleccionável. */
  readonly ids = input<string[]>([]);
  readonly max = input(3);
  readonly selectable = input(false);
  readonly selectLabel = input('');

  readonly memberSelected = output<string>();

  protected readonly visiblePeople = computed(() =>
    this.names()
      .slice(0, this.max())
      .map((name, index) => ({
        id: this.ids()[index] ?? String(index),
        name,
        imageUrl: this.images()[index] ?? null,
      })),
  );
  protected readonly remaining = computed(() =>
    Math.max(0, this.names().length - this.visiblePeople().length),
  );
}
