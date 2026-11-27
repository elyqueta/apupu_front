import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiCommunity, CommunitiesRepository } from '../../core/data/communities.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';
import { MobileFabComponent } from '../../shared/components/mobile-fab.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { CommunityFormDialogComponent } from './community-form-dialog.component';

type Scope = 'mine' | 'discover';

/**
 * Comunidades (Bloco 11): as minhas e as públicas para descobrir. Lista de
 * linhas no estilo dos cartões de equipas, com estados de carregar, vazio,
 * erro e sucesso; criar abre um modal.
 */
@Component({
  selector: 'app-communities-page',
  imports: [
    RouterLink,
    FaIconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    MobileFabComponent,
    CommunityFormDialogComponent,
  ],
  template: `
    <section class="flex flex-col gap-4 md:gap-5">
      <app-page-header
        [eyebrow]="i18n.t('block11.list.eyebrow')"
        [title]="i18n.t('block11.list.title')"
        [subtitle]="i18n.t('block11.list.subtitle')"
        [hasActions]="true"
      >
        <div header-actions class="hidden md:flex">
          <button type="button" class="ui-btn" data-testid="new-community" (click)="createOpen.set(true)">
            <fa-icon [icon]="icons['plus']" aria-hidden="true" />
            {{ i18n.t('block11.list.new') }}
          </button>
        </div>
      </app-page-header>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav role="tablist" class="flex flex-1 items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card" [attr.aria-label]="i18n.t('block11.list.title')">
          @for (option of scopes; track option.value) {
            <button
              type="button"
              role="tab"
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              [class]="scope() === option.value ? 'bg-brand/15 text-ink' : 'text-muted hover:text-ink'"
              [attr.aria-selected]="scope() === option.value"
              [attr.data-testid]="'communities-tab-' + option.value"
              (click)="scope.set(option.value)"
            >
              {{ i18n.t(option.label) }}
            </button>
          }
        </nav>
        <label class="relative block sm:w-72">
          <span class="sr-only">{{ i18n.t('block11.list.search') }}</span>
          <fa-icon [icon]="icons['search']" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            class="h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand/50"
            [placeholder]="i18n.t('block11.list.search')"
            [value]="query()"
            (input)="onSearch($any($event.target).value)"
          />
        </label>
      </div>

      @if (loading()) {
        <app-skeleton variant="cards" />
      } @else if (error()) {
        <div class="rounded-4xl border border-coral/30 bg-coral/10 p-6 text-center" role="alert">
          <p class="text-sm font-semibold text-coral">{{ i18n.t('block11.list.loadError') }}</p>
          <button type="button" class="ui-btn-secondary mt-3" (click)="load()">
            <fa-icon [icon]="icons['refresh']" aria-hidden="true" />
            {{ i18n.t('block11.list.retry') }}
          </button>
        </div>
      } @else if (items().length === 0) {
        <div class="flex flex-col items-center rounded-4xl border border-dashed border-line bg-surface/60 p-8 text-center" data-testid="communities-empty">
          <span class="grid size-14 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-xl text-brand-strong">
            <fa-icon [icon]="icons['guestGroup']" aria-hidden="true" />
          </span>
          <h3 class="mt-4 font-display text-lg font-semibold text-ink">
            {{ scope() === 'mine' ? i18n.t('block11.list.empty') : i18n.t('block11.list.emptyDiscover') }}
          </h3>
          @if (scope() === 'mine') {
            <p class="mt-1.5 max-w-md text-sm leading-6 text-muted">{{ i18n.t('block11.list.emptyHint') }}</p>
            <button type="button" class="ui-btn mt-4" (click)="createOpen.set(true)">
              <fa-icon [icon]="icons['plus']" aria-hidden="true" />
              {{ i18n.t('block11.list.new') }}
            </button>
          }
        </div>
      } @else {
        <ul class="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface-raised/20" data-testid="communities-list">
          @for (community of items(); track community.id) {
            <li class="min-w-0 border-b border-line last:border-b-0">
              <a
                [routerLink]="['/comunidades', community.slug]"
                class="group flex min-h-[5.5rem] w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-surface-raised/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 sm:px-4"
                [attr.data-testid]="'community-card-' + community.slug"
                [attr.aria-label]="i18n.t('block11.list.open') + ': ' + community.name"
              >
                <span class="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-brand/25 bg-brand/15 text-sm font-semibold text-brand-strong">
                  @if (community.avatar_url) {
                    <img [src]="community.avatar_url" alt="" class="size-full object-cover" loading="lazy" />
                  } @else {
                    {{ initials(community.name) }}
                  }
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate text-sm font-semibold text-ink" [title]="community.name">{{ community.name }}</p>
                    <span class="ui-chip shrink-0">
                      <fa-icon [icon]="icons[community.visibility === 'public' ? 'globe' : 'lock']" aria-hidden="true" />
                      {{ i18n.t(community.visibility === 'public' ? 'block11.visibility.public' : 'block11.visibility.private') }}
                    </span>
                  </div>
                  @if (community.description) {
                    <p class="mt-0.5 truncate text-xs text-muted" [title]="community.description">{{ community.description }}</p>
                  }
                  <p class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted/80">
                    <span class="inline-flex items-center gap-1.5">
                      <fa-icon [icon]="icons['user']" class="text-[10px] text-brand-strong" aria-hidden="true" />
                      {{ i18n.t('block11.list.members', { count: community.member_count }) }}
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <fa-icon [icon]="icons['events']" class="text-[10px] text-brand-strong" aria-hidden="true" />
                      {{ i18n.t('block11.list.events', { count: community.event_count }) }}
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <fa-icon [icon]="icons['team']" class="text-[10px] text-brand-strong" aria-hidden="true" />
                      {{ i18n.t('block11.list.teams', { count: community.team_count }) }}
                    </span>
                  </p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-1.5">
                  @if (statusLabel(community)) {
                    <span
                      class="rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-brand-strong"
                      [class.text-amber]="community.my_status === 'invited'"
                    >
                      {{ statusLabel(community) }}
                    </span>
                  }
                  <fa-icon [icon]="icons['chevronRight']" class="text-xs text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-strong" aria-hidden="true" />
                </div>
              </a>
            </li>
          }
        </ul>
      }

      <app-mobile-fab [label]="i18n.t('block11.list.new')" testId="new-community-fab" (pressed)="createOpen.set(true)" />
    </section>

    <app-community-form-dialog [open]="createOpen()" (saved)="onCreated($event)" (closed)="createOpen.set(false)" />
  `,
})
export class CommunitiesPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repo = inject(CommunitiesRepository);
  private readonly router = inject(Router);

  protected readonly scopes: { value: Scope; label: TranslationKey }[] = [
    { value: 'mine', label: 'block11.list.mine' },
    { value: 'discover', label: 'block11.list.discover' },
  ];

  protected readonly scope = signal<Scope>('mine');
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly communities = signal<ApiCommunity[]>([]);
  protected readonly createOpen = signal(false);
  protected readonly items = computed(() => this.communities());
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.scope();
      untracked(() => void this.load());
    });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.communities.set(await this.repo.list(this.scope(), this.query().trim() || undefined));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearch(value: string): void {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 300);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected statusLabel(community: ApiCommunity): string {
    if (community.my_status === 'invited') return this.i18n.t('block11.list.invited');
    if (community.my_role) return this.i18n.t(`block11.role.${community.my_role}` as TranslationKey);
    if (community.my_pending_request) return this.i18n.t('block11.list.requested');
    return '';
  }

  protected onCreated(community: ApiCommunity): void {
    this.createOpen.set(false);
    void this.router.navigate(['/comunidades', community.slug]);
  }
}
