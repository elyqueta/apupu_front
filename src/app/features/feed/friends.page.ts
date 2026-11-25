import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { FriendEntry, FriendLists, SocialRepository } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PersonCardComponent, PersonPrimaryAction } from '../../shared/components/person-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';

type Tab = 'friends' | 'incoming' | 'outgoing';

/** Amigos e pedidos recebidos/enviados (`/amigos`, Bloco 12). */
@Component({
  selector: 'app-friends-page',
  imports: [RouterLink, FaIconComponent, PageHeaderComponent, PersonCardComponent, SkeletonComponent, ConfirmDialogComponent],
  template: `
    <section class="flex flex-col gap-4 md:gap-5">
      <app-page-header [eyebrow]="i18n.t('nav.friends')" [title]="i18n.t('block12.friends.title')" [subtitle]="i18n.t('block12.friends.subtitle')" [hasActions]="true">
        <div header-actions>
          <a routerLink="/" class="ui-btn-secondary">
            <fa-icon [icon]="icons['search']" aria-hidden="true" />
            {{ i18n.t('block12.friends.discover') }}
          </a>
        </div>
      </app-page-header>

      <nav role="tablist" class="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card" [attr.aria-label]="i18n.t('block12.friends.title')">
        @for (option of tabs; track option.id) {
          <button
            type="button"
            role="tab"
            class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition"
            [class]="tab() === option.id ? 'bg-brand/15 text-ink' : 'text-muted hover:text-ink'"
            [attr.aria-selected]="tab() === option.id"
            [attr.data-testid]="'friends-tab-' + option.id"
            (click)="tab.set(option.id)"
          >
            {{ i18n.t(option.label) }}
            <span class="rounded-full bg-surface-raised px-2 text-xs text-muted">{{ lists()?.[option.id]?.length ?? 0 }}</span>
          </button>
        }
      </nav>

      @if (loading()) {
        <app-skeleton variant="cards" />
      } @else if (error()) {
        <div class="rounded-4xl border border-coral/30 bg-coral/10 p-6 text-center" role="alert">
          <p class="text-sm font-semibold text-coral">{{ i18n.t('block12.common.error') }}</p>
          <button type="button" class="ui-btn-secondary mt-3" (click)="load()">{{ i18n.t('block12.feed.retry') }}</button>
        </div>
      } @else if (current().length === 0) {
        <div class="flex flex-col items-center justify-center rounded-4xl border border-dashed border-line bg-surface/60 px-5 py-10 text-center backdrop-blur-2xl sm:px-6 sm:py-16" data-testid="friends-empty">
          <span class="grid size-14 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong">
            <fa-icon [icon]="icons['guestGroup']" class="text-xl" aria-hidden="true" />
          </span>
          <h3 class="mt-4 font-display text-lg font-semibold text-ink">{{ i18n.t(emptyTitleKey()) }}</h3>
          <p class="mt-1.5 max-w-md text-sm leading-6 text-muted">{{ i18n.t(emptyHintKey()) }}</p>
        </div>
      } @else {
        <ul class="grid auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          @for (entry of current(); track entry.id) {
            <li class="h-full min-w-0">
              <app-person-card
                [name]="entry.person.display_name || '—'"
                [avatarUrl]="entry.person.avatar_url"
                [meta]="[{ icon: 'clock', label: i18n.shortDate(entry.created_at, 'Africa/Luanda') }]"
                [primaryAction]="primary(entry)"
                [actions]="tab() === 'friends' ? [{ id: 'profile', label: i18n.t('block12.feed.viewProfile'), icon: icons['user'] }, { id: 'remove', label: i18n.t('block12.friends.remove'), icon: icons['trash'], tone: 'danger' }] : tab() === 'incoming' ? [{ id: 'reject', label: i18n.t('block12.friends.reject'), icon: icons['close'] }] : []"
                [actionsLabel]="i18n.t('common.moreActions')"
                (primaryTriggered)="onPrimary(entry, $event)"
                (actionSelected)="onAction(entry, $event)"
              />
            </li>
          }
        </ul>
      }

      <app-confirm-dialog
        [open]="!!removeTarget()"
        [title]="i18n.t('block12.friends.remove')"
        [message]="i18n.t('block12.friends.removeConfirm', { name: removeTarget()?.person?.display_name || '' })"
        [confirmLabel]="i18n.t('block12.friends.remove')"
        [cancelLabel]="i18n.t('block11.form.cancel')"
        (confirmed)="confirmRemove()"
        (cancelled)="removeTarget.set(null)"
      />
    </section>
  `,
})
export class FriendsPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly social = inject(SocialRepository);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly tabs: { id: Tab; label: TranslationKey }[] = [
    { id: 'friends', label: 'block12.friends.tab.friends' },
    { id: 'incoming', label: 'block12.friends.tab.incoming' },
    { id: 'outgoing', label: 'block12.friends.tab.outgoing' },
  ];
  protected readonly tab = signal<Tab>('friends');
  protected readonly lists = signal<FriendLists | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly removeTarget = signal<FriendEntry | null>(null);
  protected readonly current = computed(() => this.lists()?.[this.tab()] ?? []);
  protected readonly emptyKey = computed<TranslationKey>(() =>
    this.tab() === 'friends' ? 'block12.friends.empty' : this.tab() === 'incoming' ? 'block12.friends.emptyIncoming' : 'block12.friends.emptyOutgoing',
  );
  protected readonly emptyTitleKey = computed<TranslationKey>(() =>
    this.tab() === 'friends'
      ? 'block12.friends.emptyTitle'
      : this.tab() === 'incoming'
        ? 'block12.friends.emptyIncomingTitle'
        : 'block12.friends.emptyOutgoingTitle',
  );
  protected readonly emptyHintKey = computed<TranslationKey>(() =>
    this.tab() === 'friends'
      ? 'block12.friends.emptyHint'
      : this.tab() === 'incoming'
        ? 'block12.friends.emptyIncomingHint'
        : 'block12.friends.emptyOutgoingHint',
  );

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      this.lists.set(await this.social.friends());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected primary(_entry: FriendEntry): PersonPrimaryAction {
    if (this.tab() === 'incoming') return { id: 'accept', label: this.i18n.t('block12.friends.accept'), icon: ICONS['check'] };
    if (this.tab() === 'outgoing') return { id: 'cancel', label: this.i18n.t('block12.friends.cancel'), icon: ICONS['close'] };
    return { id: 'profile', label: this.i18n.t('block12.feed.viewProfile'), icon: ICONS['user'] };
  }

  protected async onPrimary(entry: FriendEntry, action: string): Promise<void> {
    if (action === 'profile') {
      void this.router.navigate(['/pessoas', entry.person.id]);
      return;
    }
    await this.run(
      () => (action === 'accept' ? this.social.respond(entry.id, true) : this.social.remove(entry.id)),
      action === 'accept' ? 'block12.friends.accepted' : 'block12.friends.removed',
    );
  }

  protected async onAction(entry: FriendEntry, action: string): Promise<void> {
    if (action === 'remove') this.removeTarget.set(entry);
    else if (action === 'reject') await this.run(() => this.social.respond(entry.id, false), 'block12.friends.rejected');
    else if (action === 'profile') await this.onPrimary(entry, 'profile');
  }

  protected async confirmRemove(): Promise<void> {
    const entry = this.removeTarget();
    if (!entry) return;
    this.removeTarget.set(null);
    await this.run(() => this.social.remove(entry.id), 'block12.friends.removed');
  }

  private async run(action: () => Promise<unknown>, key: TranslationKey): Promise<void> {
    try {
      await action();
      this.toasts.success(this.i18n.t(key));
      await this.load();
    } catch {
      this.toasts.error(this.i18n.t('block12.common.error'));
    }
  }
}
