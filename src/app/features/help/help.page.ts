import { Component, computed, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { HELP_DOCS } from './help-docs';

/**
 * Ajuda pública (`/ajuda`, Bloco 12): índice lateral no desktop, acordeões
 * no mobile e pesquisa simples por título e texto.
 */
@Component({
  selector: 'app-help-page',
  imports: [RouterLink, FaIconComponent, BrandComponent],
  template: `
    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col gap-4 px-4 pb-16 pt-4 sm:px-6">
      <header class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-1">
          <a routerLink="/" class="ui-icon-button" [attr.aria-label]="i18n.t('block12.feed.title')">
            <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
          </a>
          <app-brand />
        </div>
      </header>
      <section>
        <h1 class="font-display text-3xl font-semibold tracking-tight text-ink">{{ i18n.t('block12.help.title') }}</h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('block12.help.subtitle') }}</p>
        <label class="relative mt-4 block max-w-md">
          <span class="sr-only">{{ i18n.t('block12.help.search') }}</span>
          <fa-icon [icon]="icons['search']" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            class="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none focus:border-brand/50"
            [placeholder]="i18n.t('block12.help.search')"
            [value]="query()"
            data-testid="help-search"
            (input)="query.set($any($event.target).value)"
          />
        </label>
      </section>

      <div class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav class="hidden lg:block" [attr.aria-label]="i18n.t('block12.help.contents')">
          <div class="sticky top-6 flex flex-col gap-1">
            <p class="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{{ i18n.t('block12.help.contents') }}</p>
            @for (doc of docs(); track doc.id) {
              <a [href]="'#' + doc.id" class="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-muted hover:bg-surface-raised hover:text-ink">{{ doc.title }}</a>
            }
          </div>
        </nav>
        <div class="flex flex-col gap-3">
          @for (doc of docs(); track doc.id) {
            <details [id]="doc.id" class="group rounded-3xl border border-line bg-surface shadow-card" [open]="openAll()" [attr.data-testid]="'help-doc-' + doc.id">
              <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-display text-base font-semibold text-ink">
                {{ doc.title }}
                <fa-icon [icon]="icons['chevronRight']" class="text-muted transition group-open:rotate-90" aria-hidden="true" />
              </summary>
              <div class="help-prose border-t border-line px-4 py-3 text-sm leading-6 text-muted" [innerHTML]="doc.html"></div>
            </details>
          } @empty {
            <p class="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-muted">{{ i18n.t('block12.help.noResults') }}</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host ::ng-deep .help-prose h2,
    :host ::ng-deep .help-prose h3 {
      margin-top: 0.75rem;
      font-weight: 600;
      color: var(--color-ink);
    }
    :host ::ng-deep .help-prose ul {
      list-style: disc;
      padding-left: 1.25rem;
    }
    :host ::ng-deep .help-prose ol {
      list-style: decimal;
      padding-left: 1.25rem;
    }
    :host ::ng-deep .help-prose p,
    :host ::ng-deep .help-prose ul,
    :host ::ng-deep .help-prose ol {
      margin-top: 0.5rem;
    }
    :host ::ng-deep .help-prose strong {
      color: var(--color-ink);
    }
    :host ::ng-deep .help-prose a {
      color: var(--color-brand-strong);
      text-decoration: underline;
    }
  `,
})
export class HelpPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly query = signal('');
  protected readonly docs = computed(() => {
    const term = this.query().trim().toLowerCase();
    return term ? HELP_DOCS.filter((doc) => doc.text.includes(term)) : HELP_DOCS;
  });
  /** Ao pesquisar, os resultados abrem para mostrar o texto. */
  protected readonly openAll = computed(() => this.query().trim().length > 1);

  constructor() {
    inject(Title).setTitle(this.i18n.t('route.help'));
    inject(Meta).updateTag({ name: 'description', content: this.i18n.t('block12.help.subtitle') });
  }
}
