import { DOCUMENT } from '@angular/common';
import {
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ICONS } from '../../core/ui/icons';
import { EventSectionItem } from './event-section-shell.component';

/**
 * Drawer lateral direito com a navegação do evento.
 *
 * Usado pelo shell em `/eventos/:id` e pela página pública em
 * `/gestao/evento/:id`. O foco fica preso no painel enquanto está aberto e é
 * devolvido ao botão que o abriu ao fechar.
 */
@Component({
  selector: 'app-event-menu-drawer',
  imports: [FaIconComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[70]">
        <button
          type="button"
          class="absolute inset-0 h-full w-full cursor-default bg-canvas/70 backdrop-blur-sm"
          [attr.aria-label]="closeLabel()"
          (click)="closed.emit()"
        ></button>

        <aside
          #panel
          role="dialog"
          aria-modal="true"
          data-testid="event-menu-drawer"
          [attr.aria-label]="title()"
          class="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] max-w-full flex-col border-l border-line bg-surface-solid shadow-card animate-rise"
        >
          <div class="flex items-center justify-between gap-2 border-b border-line p-4">
            <h2 class="min-w-0 truncate font-display text-base font-semibold text-ink">
              {{ title() }}
            </h2>
            <button
              #closeButton
              type="button"
              data-testid="event-menu-close"
              class="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-muted transition hover:border-brand/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              [attr.aria-label]="closeLabel()"
              (click)="closed.emit()"
            >
              <fa-icon [icon]="icons['close']" aria-hidden="true" />
            </button>
          </div>

          <div class="border-b border-line p-4">
            <button
              type="button"
              data-testid="event-menu-add-guest"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="addGuestDisabled()"
              (click)="onAddGuest()"
            >
              <fa-icon [icon]="icons['userPlus']" aria-hidden="true" />
              <span class="truncate">{{ addGuestLabel() }}</span>
            </button>
          </div>

          <nav [attr.aria-label]="title()" class="no-scrollbar flex-1 overflow-y-auto p-3">
            @for (section of sections(); track section.id) {
              <button
                type="button"
                role="tab"
                class="flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                [class]="activeSection() === section.id ? 'border-brand/30 bg-brand/15 text-ink' : 'border-transparent text-muted hover:bg-surface-raised/70 hover:text-ink'"
                [attr.aria-selected]="activeSection() === section.id"
                (click)="onSectionSelected(section.id)"
              >
                <fa-icon [icon]="section.icon" class="w-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ section.label }}</span>
                @if (section.count !== null && section.count !== undefined) {
                  <span class="shrink-0 rounded-full bg-surface-raised px-2 text-xs text-muted">
                    {{ section.count }}
                  </span>
                }
              </button>
            }
          </nav>

          <div class="border-t border-line p-3">
            <button
              type="button"
              role="tab"
              data-testid="event-menu-more-actions"
              class="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-semibold text-ink transition hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              (click)="onMoreActions()"
            >
              <fa-icon [icon]="icons['ellipsis']" class="w-4 shrink-0" aria-hidden="true" />
              <span class="min-w-0 flex-1 truncate">{{ moreActionsLabel() }}</span>
            </button>
          </div>
        </aside>
      </div>
    }
  `,
})
export class EventMenuDrawerComponent {
  private readonly document = inject(DOCUMENT);
  protected readonly icons = ICONS;

  readonly open = input(false);
  readonly title = input('');
  readonly closeLabel = input('');
  readonly addGuestLabel = input('');
  readonly addGuestDisabled = input(false);
  readonly moreActionsLabel = input('');
  readonly sections = input<EventSectionItem[]>([]);
  readonly activeSection = input('');

  readonly closed = output<void>();
  readonly sectionSelected = output<string>();
  readonly addGuest = output<void>();
  readonly moreActions = output<void>();

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private previousFocus: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.previousFocus = this.document.activeElement as HTMLElement | null;
        queueMicrotask(() => this.closeButton()?.nativeElement.focus());
        return;
      }
      if (this.previousFocus) {
        const target = this.previousFocus;
        this.previousFocus = null;
        queueMicrotask(() => target.focus());
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }

    const panel = this.panel()?.nativeElement;
    if (!panel) {
      return;
    }
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  protected onSectionSelected(id: string): void {
    this.sectionSelected.emit(id);
    this.closed.emit();
  }

  protected onAddGuest(): void {
    this.addGuest.emit();
    this.closed.emit();
  }

  protected onMoreActions(): void {
    this.moreActions.emit();
    this.closed.emit();
  }
}
