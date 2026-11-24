import { Component, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  ApiInstitution,
  ApiInstitutionRequest,
  InstitutionsRepository,
} from '../../core/data/institutions.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { MobileFabComponent } from '../../shared/components/mobile-fab.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { InstitutionFormDialogComponent } from './institution-form-dialog.component';

type Scope = 'mine' | 'discover';

/**
 * Instituições (Bloco 13): as minhas (criador ou responsável de uma
 * comunidade associada) e as públicas. Convites recebidos pelas minhas
 * comunidades aparecem no topo para aceitar ou recusar.
 */
@Component({
  selector: 'app-institutions-page',
  imports: [RouterLink, FaIconComponent, PageHeaderComponent, SkeletonComponent, MobileFabComponent, InstitutionFormDialogComponent],
  template: `
    <section class="flex flex-col gap-4 md:gap-5">
      <app-page-header [title]="i18n.t('block13.list.title')" [subtitle]="i18n.t('block13.list.subtitle')" [hasActions]="true">
        <div header-actions class="hidden md:flex">
          <button type="button" class="ui-btn" data-testid="new-institution" (click)="createOpen.set(true)">
            <fa-icon [icon]="icons['plus']" aria-hidden="true" />
            {{ i18n.t('block13.list.new') }}
          </button>
        </div>
      </app-page-header>

      @if (invites().length) {
        <section class="rounded-4xl border border-amber/30 bg-amber/10 p-4" data-testid="institution-invites">
          <h2 class="font-display text-base font-semibold text-ink">{{ i18n.t('block13.inbox.title') }}</h2>
          <ul class="mt-3 flex flex-col gap-2">
            @for (invite of invites(); track invite.id) {
              <li class="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
                <p class="min-w-0 flex-1 text-sm text-ink">
                  <span class="font-semibold">{{ invite.institution_name }}</span>
                  <span class="text-muted"> → {{ invite.community_name }}</span>
                </p>
                <div class="flex gap-2">
                  <button type="button" class="ui-btn-secondary flex-1 sm:flex-none" [disabled]="busy()" (click)="respond(invite, false)">{{ i18n.t('block13.request.reject') }}</button>
                  <button type="button" class="ui-btn flex-1 sm:flex-none" [disabled]="busy()" (click)="respond(invite, true)">{{ i18n.t('block13.request.accept') }}</button>
                </div>
              </li>
            }
          </ul>
        </section>
      }

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <nav role="tablist" class="flex flex-1 items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card" [attr.aria-label]="i18n.t('block13.list.title')">
          @for (option of scopes; track option.value) {
            <button
              type="button"
              role="tab"
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
              [class]="scope() === option.value ? 'bg-brand/15 text-ink' : 'text-muted hover:text-ink'"
              [attr.aria-selected]="scope() === option.value"
              [attr.data-testid]="'institutions-tab-' + option.value"
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
          <p class="text-sm font-semibold text-coral">{{ i18n.t('block13.common.error') }}</p>
          <button type="button" class="ui-btn-secondary mt-3" (click)="load()">
            <fa-icon [icon]="icons['refresh']" aria-hidden="true" />
            {{ i18n.t('block11.list.retry') }}
          </button>
        </div>
      } @else if (items().length === 0) {
        <div class="flex flex-col items-center rounded-4xl border border-dashed border-line bg-surface/60 p-8 text-center" data-testid="institutions-empty">
          <span class="grid size-14 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-xl text-brand-strong">
            <fa-icon [icon]="icons['bank']" aria-hidden="true" />
          </span>
          <h3 class="mt-4 font-display text-lg font-semibold text-ink">
            {{ scope() === 'mine' ? i18n.t('block13.list.empty') : i18n.t('block13.list.emptyDiscover') }}
          </h3>
          @if (scope() === 'mine') {
            <button type="button" class="ui-btn mt-4" (click)="createOpen.set(true)">
              <fa-icon [icon]="icons['plus']" aria-hidden="true" />
              {{ i18n.t('block13.list.new') }}
            </button>
          }
        </div>
      } @else {
        <ul class="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          @for (institution of items(); track institution.id) {
            <li class="h-full min-w-0">
              <article class="flex h-full flex-col overflow-hidden rounded-4xl border border-line bg-surface shadow-card transition hover:border-brand/30" [attr.data-testid]="'institution-card-' + institution.slug">
                <div class="relative h-24 shrink-0 bg-gradient-to-br from-amber/30 via-surface-raised to-surface">
                  @if (institution.cover_url) {
                    <img [src]="institution.cover_url" alt="" class="size-full object-cover" loading="lazy" />
                  }
                  <span class="absolute -bottom-6 left-4 grid size-12 place-items-center overflow-hidden rounded-2xl border-2 border-surface bg-surface-raised text-lg text-brand-strong shadow-card">
                    @if (institution.avatar_url) {
                      <img [src]="institution.avatar_url" alt="" class="size-full object-cover" />
                    } @else {
                      <fa-icon [icon]="icons['bank']" aria-hidden="true" />
                    }
                  </span>
                </div>
                <div class="flex flex-1 flex-col gap-3 p-4 pt-8">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <h3 class="min-w-0 flex-1 line-clamp-2 font-display text-base font-semibold text-ink" [title]="institution.name">{{ institution.name }}</h3>
                    <span class="ui-chip shrink-0">
                      <fa-icon [icon]="icons[institution.visibility === 'public' ? 'globe' : 'lock']" aria-hidden="true" />
                      {{ i18n.t(institution.visibility === 'public' ? 'block13.form.public' : 'block13.form.private') }}
                    </span>
                  </div>
                  <p class="line-clamp-2 min-h-10 text-xs leading-5 text-muted">{{ institution.description || '' }}</p>
                  <p class="text-xs text-muted">{{ i18n.t('block13.list.communities', { count: institution.community_count }) }}</p>
                  <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <span class="text-xs font-semibold text-brand-strong">{{ institution.is_creator ? i18n.t('block13.list.creator') : '' }}</span>
                    <a [routerLink]="['/instituicoes', institution.slug]" class="ui-btn-secondary" [attr.aria-label]="i18n.t('block13.list.open') + ': ' + institution.name">
                      {{ i18n.t('block13.list.open') }}
                      <fa-icon [icon]="icons['chevronRight']" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            </li>
          }
        </ul>
      }

      <app-mobile-fab [label]="i18n.t('block13.list.new')" testId="new-institution-fab" (pressed)="createOpen.set(true)" />
    </section>

    <app-institution-form-dialog [open]="createOpen()" (saved)="onCreated($event)" (closed)="createOpen.set(false)" />
  `,
})
export class InstitutionsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repo = inject(InstitutionsRepository);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly scopes: { value: Scope; label: TranslationKey }[] = [
    { value: 'mine', label: 'block13.list.mine' },
    { value: 'discover', label: 'block13.list.discover' },
  ];

  protected readonly scope = signal<Scope>('mine');
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly items = signal<ApiInstitution[]>([]);
  protected readonly invites = signal<ApiInstitutionRequest[]>([]);
  protected readonly createOpen = signal(false);
  protected readonly busy = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.scope();
      untracked(() => void this.load());
    });
    void this.loadInvites();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.items.set(await this.repo.list(this.scope(), this.query().trim() || undefined));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private async loadInvites(): Promise<void> {
    try {
      const requests = await this.repo.myRequests();
      this.invites.set(
        requests.filter((r) => r.direction === 'institution_to_community' && r.kind === 'link' && r.status === 'pending' && !r.community_accepted),
      );
    } catch {
      this.invites.set([]);
    }
  }

  protected onSearch(value: string): void {
    this.query.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 300);
  }

  protected async respond(invite: ApiInstitutionRequest, accept: boolean): Promise<void> {
    this.busy.set(true);
    try {
      if (accept) await this.repo.accept(invite.id);
      else await this.repo.reject(invite.id);
      this.toasts.success(this.i18n.t(accept ? 'block13.request.accepted' : 'block13.request.rejected'));
      await this.loadInvites();
    } catch {
      this.toasts.error(this.i18n.t('block13.common.error'));
    } finally {
      this.busy.set(false);
    }
  }

  protected onCreated(institution: ApiInstitution): void {
    this.createOpen.set(false);
    void this.router.navigate(['/instituicoes', institution.slug]);
  }
}
