import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { SearchGroup, SearchSuggestion } from '../../core/services/search.service';
import { ICONS } from '../../core/ui/icons';

/**
 * Painel de sugestões da pesquisa global. É só apresentação: recebe os grupos
 * já calculados pelo `SearchService` e emite a sugestão escolhida. Usado tanto
 * na barra de desktop como na pesquisa sobreposta do mobile.
 */
@Component({
  selector: 'app-search-suggestions',
  imports: [FaIconComponent],
  template: `
    <div
      [attr.id]="listId()"
      role="listbox"
      [attr.aria-label]="i18n.t('search.hint')"
      class="no-scrollbar max-h-[min(70dvh,26rem)] overflow-y-auto rounded-3xl border border-line bg-surface-solid/95 p-2 shadow-pop backdrop-blur-2xl animate-rise"
    >
      @if (groups().length === 0) {
        <p class="px-3 py-4 text-center text-xs text-muted">
          {{ i18n.t('search.empty', { term: term() }) }}
        </p>
      } @else {
        @for (group of groups(); track group.key) {
          <div role="group" class="py-1" [attr.aria-label]="i18n.t(group.labelKey)">
            <div class="flex items-center justify-between gap-2 px-2.5 py-1">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {{ i18n.t(group.labelKey) }}
              </p>
              @if (group.key === 'recents') {
                <button
                  type="button"
                  class="text-[10px] font-semibold text-brand-strong transition hover:text-ink"
                  (mousedown)="$event.preventDefault()"
                  (click)="clearRecents.emit()"
                >
                  {{ i18n.t('search.clearRecent') }}
                </button>
              }
            </div>
            @for (item of group.items; track item.id) {
              <button
                type="button"
                role="option"
                [attr.id]="optionId(item.id)"
                [attr.aria-selected]="item.id === activeId()"
                [class]="item.id === activeId() ? activeClass : idleClass"
                (mousedown)="$event.preventDefault()"
                (click)="picked.emit(item)"
                (mouseenter)="hovered.emit(item.id)"
              >
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-muted"
                >
                  <fa-icon [icon]="item.icon" class="text-xs" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-xs font-semibold text-ink">{{
                    item.label
                  }}</span>
                  @if (item.meta) {
                    <span class="block truncate text-[10px] text-muted">{{ item.meta }}</span>
                  }
                </span>
                <fa-icon
                  [icon]="icons['arrowUpRight']"
                  class="text-[10px] text-muted/70"
                  aria-hidden="true"
                />
              </button>
            }
          </div>
        }
      }
    </div>
  `,
})
export class SearchSuggestionsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly groups = input.required<SearchGroup[]>();
  readonly term = input('');
  readonly activeId = input<string | null>(null);
  /** ID do `role="listbox"` para `aria-controls`. */
  readonly listId = input('search-suggestions');
  /** Prefixo único por instância, para os IDs das opções não colidirem. */
  readonly idPrefix = input('');

  readonly picked = output<SearchSuggestion>();
  readonly hovered = output<string>();
  readonly clearRecents = output<void>();

  protected optionId(id: string): string {
    return `${this.idPrefix()}${id}`;
  }

  protected readonly activeClass =
    'flex w-full items-center gap-3 rounded-2xl bg-brand/10 px-2.5 py-2 text-left transition';
  protected readonly idleClass =
    'flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition hover:bg-surface-raised/70';
}
