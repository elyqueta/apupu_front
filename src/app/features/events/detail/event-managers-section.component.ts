import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import {
  EventManager,
  EventPermissions,
  ManagerCreationResult,
  Team,
} from '../../../core/models/models';
import { ShareService } from '../../../core/services/share.service';
import { ToastService } from '../../../core/services/toast.service';
import { ICONS } from '../../../core/ui/icons';
import { ActionMenuItem } from '../../../shared/components/action-menu.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { ModalComponent } from '../../../shared/components/modal.component';
import { PersonCardComponent, PersonMetaItem, PersonPrimaryAction } from '../../../shared/components/person-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { ManagerCredentialsDialogComponent } from '../../team/manager-credentials-dialog.component';

type ManagerLinkStatus = 'active' | 'expired' | 'revoked' | 'blocked' | 'pending';

/** Separador "Gestores" partilhado pelo painel do anfitrião e pelo painel do gestor. */
@Component({
  selector: 'app-event-managers-section',
  imports: [
    FaIconComponent,
    PersonCardComponent,
    ConfirmDialogComponent,
    ModalComponent,
    SkeletonComponent,
    ManagerCredentialsDialogComponent,
  ],
  template: `
    <!-- Sem backdrop-blur no cartão: um filtro cria containing block para position: fixed
         e prenderia os modais ao cartão, por baixo do header sticky da página. -->
    <section class="flex flex-col gap-4 rounded-4xl border border-line bg-surface p-5 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">{{ i18n.t('eventDetail.managersTitle') }}</p>
          <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.managersHint') }}</p>
        </div>
        <span class="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-muted">
          <fa-icon [icon]="icons['guestGroup']" aria-hidden="true" />
        </span>
      </div>
      @if (phoneOnly()) {
        <p class="flex items-start gap-2 rounded-2xl border border-amber/30 bg-amber/10 p-3 text-xs leading-5 text-ink" role="status">
          <fa-icon [icon]="icons['warning']" class="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
          <span>{{ i18n.t('eventDetail.phoneOnlyWarning') }}</span>
        </p>
      }
      @if (loading()) {
        <app-skeleton variant="cards" />
      } @else if (managers().length === 0) {
        <div class="mt-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface-raised/30 px-5 py-10 text-center">
          <span class="grid size-14 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong">
            <fa-icon [icon]="icons['userPlus']" class="text-xl" aria-hidden="true" />
          </span>
          <h3 class="mt-4 font-display text-lg font-semibold text-ink">{{ i18n.t('eventDetail.managersEmptyPanel') }}</h3>
          <p class="mt-1.5 max-w-md text-sm leading-6 text-muted">{{ i18n.t('eventDetail.managersEmptyHint') }}</p>
          @if (permissions().canManageManagers) {
            <button type="button" data-testid="add-manager" class="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover" (click)="newManager.emit()">
              <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
              {{ i18n.t('eventDetail.newManager') }}
            </button>
          }
        </div>
      } @else {
        <ul class="flex flex-col gap-2">
          @for (manager of managers(); track manager.id) {
            <li class="min-w-0">
              <app-person-card layout="linear" [clickable]="true"
                [clickLabel]="i18n.t('common.viewDetails') + ': ' + nameOf(manager)"
                [name]="nameOf(manager)" [subtitle]="teamLabel(manager) || (manager.email ?? manager.phone ?? '')"
                [meta]="metaFor(manager)" [actions]="actionsFor(manager)" [primaryAction]="primaryFor(manager)"
                [actionsLabel]="i18n.t('common.moreActions')"
                (actionSelected)="onAction(manager, $event)" (primaryTriggered)="onAction(manager, $event)"
                (open)="openDetails(manager)" />
            </li>
          }
        </ul>
      }
      @if (permissions().canManageManagers && !loading() && managers().length > 0) {
        <button type="button" data-testid="add-manager" class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60" (click)="newManager.emit()">
          <fa-icon [icon]="icons['plus']" aria-hidden="true" />
          {{ i18n.t('eventDetail.newManager') }}
        </button>
      }
      <app-confirm-dialog [open]="newCodeTarget() !== null" [title]="i18n.t('eventDetail.newCodeTitle')"
        [message]="i18n.t('eventDetail.newCodeMessage')" [confirmLabel]="i18n.t('eventDetail.newCodeConfirm')"
        [cancelLabel]="i18n.t('common.cancel')" (confirmed)="confirmNewCode()" (cancelled)="newCodeTarget.set(null)" />
      <app-modal [open]="validityTarget() !== null" [title]="i18n.t('eventDetail.validityTitle')"
        [dismissible]="!busy()" size="sm" (closed)="closeValidity()">
        <p class="text-xs leading-5 text-muted">{{ i18n.t('eventDetail.validityMessage') }}</p>
        <label class="mt-4 block">
          <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('eventDetail.validityDate') }}</span>
          <input type="date" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
            [min]="today()" [max]="maxValidityDate()" [value]="validityDate()"
            [attr.aria-label]="i18n.t('eventDetail.validityDate')" (input)="validityDate.set(dateFrom($event))" />
        </label>
        <p class="mt-2 text-xs leading-5 text-muted">{{ i18n.t('eventDetail.validityMax', { date: formattedMaxDate() }) }}</p>
        <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface-raised px-4 text-sm font-semibold text-ink transition hover:border-brand/40" [disabled]="busy()" (click)="closeValidity()">{{ i18n.t('common.cancel') }}</button>
          <button type="button" class="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-not-allowed disabled:opacity-60" [disabled]="busy() || !validityDate()" (click)="confirmValidity()">{{ i18n.t('common.save') }}</button>
        </div>
      </app-modal>
      <app-confirm-dialog [open]="revokeTarget() !== null" [title]="i18n.t('eventDetail.revokeTitle')"
        [message]="i18n.t('teamDetail.revokeMessage', { name: nameOf(revokeTarget()) })"
        [confirmLabel]="i18n.t('teamDetail.action.revoke')" [cancelLabel]="i18n.t('common.cancel')"
        (confirmed)="confirmRevoke()" (cancelled)="revokeTarget.set(null)" />
      <app-confirm-dialog [open]="removeTarget() !== null" [title]="i18n.t('eventDetail.removeManagerTitle')"
        [message]="i18n.t('eventDetail.removeManagerMessage')" [confirmLabel]="i18n.t('teamDetail.action.remove')"
        [cancelLabel]="i18n.t('common.cancel')" (confirmed)="confirmRemove()" (cancelled)="removeTarget.set(null)" />
      <app-modal [open]="detailTarget() !== null" [title]="detailTarget() ? nameOf(detailTarget()) : i18n.t('common.viewDetails')"
        size="sm" (closed)="closeDetails()">
        @if (detailTarget(); as manager) {
          <div class="rounded-2xl border border-line bg-surface-raised/40 p-3">
            <p class="truncate text-sm font-semibold text-ink">{{ nameOf(manager) }}</p>
            <p class="mt-0.5 truncate text-xs text-muted">{{ teamLabel(manager) }}</p>
            <span class="mt-2 inline-flex rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted">
              {{ statusLabel(manager) }}
            </span>
          </div>
          <ul class="mt-3 space-y-2 text-xs text-muted">
            @for (item of metaFor(manager); track $index) {
              <li class="flex min-w-0 items-start gap-2">
                <fa-icon [icon]="iconFor(item.icon)" class="mt-0.5 shrink-0 text-[11px] text-brand-strong" aria-hidden="true" />
                <span class="min-w-0">{{ item.label }}</span>
              </li>
            }
          </ul>
        }
        @if (detailTarget(); as manager) {
          <div modal-footer class="flex flex-col gap-2">
            @for (action of actionsFor(manager); track action.id) {
              <button type="button" [disabled]="action.disabled"
                class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-sm font-semibold transition hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
                [class.text-coral]="action.tone === 'danger'" [class.text-ink]="action.tone !== 'danger'"
                (click)="onAction(manager, action.id)">
                <fa-icon [icon]="action.icon" aria-hidden="true" />
                {{ action.label }}
              </button>
            }
            @if (!permissions().canManageManagers) {
              <p class="text-xs text-muted">{{ i18n.t('eventDetail.permissionsHint') }}</p>
            }
          </div>
        }
      </app-modal>
      <app-manager-credentials-dialog [open]="credentialsOpen()" [link]="credentials()?.link ?? ''"
        [code]="credentials()?.accessCode ?? ''" [eventTitle]="credentialsEventTitle()"
        [email]="credentials()?.manager.email ?? null" [phone]="credentials()?.manager.phone ?? null"
        [inviteStatus]="credentials()?.emailStatus ?? 'not_sent'" (done)="credentialsDone.emit()" />
    </section>
  `,
})
export class EventManagersSectionComponent {
  private readonly i18n = inject(I18nService);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);

  readonly managers = input.required<EventManager[]>();
  readonly teams = input.required<Team[]>();
  readonly permissions = input.required<EventPermissions>();
  readonly loading = input(false);
  readonly busyId = input<string | null>(null);
  readonly maxValidityDate = input('');
  readonly credentials = input<ManagerCreationResult | null>(null);
  readonly credentialsOpen = input(false);

  readonly newManager = output<void>();
  readonly newCodeConfirmed = output<EventManager>();
  readonly validityConfirmed = output<{ manager: EventManager; date: string }>();
  readonly revokeConfirmed = output<EventManager>();
  readonly removeConfirmed = output<EventManager>();
  readonly credentialsDone = output<void>();

  protected readonly icons = ICONS;
  protected readonly newCodeTarget = signal<EventManager | null>(null);
  protected readonly validityTarget = signal<EventManager | null>(null);
  protected readonly revokeTarget = signal<EventManager | null>(null);
  protected readonly removeTarget = signal<EventManager | null>(null);
  protected readonly detailTarget = signal<EventManager | null>(null);
  protected readonly validityDate = signal('');
  protected readonly busy = computed(() => this.busyId() !== null);
  protected readonly phoneOnly = computed(() => this.managers().some((m) => !m.email && !!m.phone));
  protected readonly formattedMaxDate = computed(() => this.i18n.calendarDate(this.maxValidityDate() || this.today()));
  protected readonly credentialsEventTitle = computed(() => {
    const manager = this.credentials()?.manager;
    return manager ? (this.teams().find((team) => team.id === manager.teamId)?.eventTitle ?? '') : '';
  });

  protected nameOf(manager: EventManager | null): string {
    return manager ? (manager.displayName ?? manager.email ?? manager.phone ?? manager.id) : '';
  }
  protected teamName(manager: EventManager): string {
    return this.teams().find((team) => team.id === manager.teamId)?.name ?? '';
  }
  protected teamLabel(manager: EventManager): string {
    const name = this.teamName(manager);
    return name ? this.i18n.t('eventDetail.managerTeamLabel', { name }) : '';
  }
  /** Estado do link derivado dos campos presentes em `EventManager`. */
  protected statusOf(manager: EventManager): ManagerLinkStatus {
    if (manager.linkRevokedAt) return 'revoked';
    const expiresAt = manager.linkExpiresAt ? Date.parse(manager.linkExpiresAt) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return 'expired';
    if (!manager.email && !manager.hasAccount) return 'blocked';
    return !manager.hasAccount && !manager.lastUsedAt ? 'pending' : 'active';
  }
  protected statusLabel(manager: EventManager): string {
    const status = this.statusOf(manager);
    const key = `eventDetail.managerStatus.${status}` as TranslationKey;
    if (status !== 'active') return this.i18n.t(key);
    const date = manager.linkExpiresAt?.slice(0, 10) || this.maxValidityDate();
    return this.i18n.t(key, { date: date ? this.i18n.calendarDate(date) : this.formattedMaxDate() });
  }
  protected openDetails(manager: EventManager): void {
    this.detailTarget.set(manager);
  }

  protected closeDetails(): void {
    this.detailTarget.set(null);
  }

  protected iconFor(key: string) {
    return ICONS[key as keyof typeof ICONS] ?? ICONS['user'];
  }

  protected primaryFor(manager: EventManager): PersonPrimaryAction | null {
    if (!this.permissions().canManageManagers || this.credentials()?.manager.id !== manager.id) {
      return null;
    }
    return {
      id: 'copyInvite',
      label: this.i18n.t('common.copy'),
      icon: ICONS['copy'],
      hint: this.i18n.t('teamDetail.action.copyInvite'),
    };
  }

  protected metaFor(manager: EventManager): PersonMetaItem[] {
    const items: PersonMetaItem[] = [];
    const contact = manager.email ?? manager.phone;
    if (contact && manager.displayName) items.push({ icon: manager.email ? 'envelope' : 'phone', label: contact });
    const team = this.teamLabel(manager);
    if (team) items.push({ icon: 'guestGroup', label: team });
    items.push({ icon: 'clock', label: this.statusLabel(manager) });
    if (manager.lastUsedAt) items.push({ icon: 'history', label: this.i18n.relative(manager.lastUsedAt) });
    return items;
  }
  protected actionsFor(manager: EventManager): ActionMenuItem[] {
    if (!this.permissions().canManageManagers) return [];
    const busy = this.busy();
    const item = (id: string, key: TranslationKey, icon: string, tone?: 'danger', extra = false): ActionMenuItem => ({
      id, label: this.i18n.t(key), icon: ICONS[icon], tone, disabled: busy || extra,
    });
    const canCopy = this.credentials()?.manager.id === manager.id;
    return [
      item('copyInvite', 'teamDetail.action.copyInvite', 'copy', undefined, !canCopy),
      item('newCode', 'teamDetail.action.newCode', 'key'),
      item('validity', 'teamDetail.action.validity', 'clock'),
      item('revoke', 'teamDetail.action.revoke', 'lock', 'danger', !!manager.linkRevokedAt),
      item('remove', 'teamDetail.action.remove', 'trash', 'danger'),
    ];
  }
  protected onAction(manager: EventManager, action: string): void {
    this.detailTarget.set(null);
    switch (action) {
      case 'copyInvite': void this.copyInvite(manager); break;
      case 'newCode': this.newCodeTarget.set(manager); break;
      case 'validity':
        this.validityDate.set(manager.linkExpiresAt?.slice(0, 10) ?? this.maxValidityDate());
        this.validityTarget.set(manager);
        break;
      case 'revoke': this.revokeTarget.set(manager); break;
      case 'remove': this.removeTarget.set(manager); break;
    }
  }
  protected confirmNewCode(): void {
    const manager = this.newCodeTarget();
    this.newCodeTarget.set(null);
    if (manager) this.newCodeConfirmed.emit(manager);
  }
  protected confirmValidity(): void {
    const manager = this.validityTarget();
    const date = this.validityDate();
    if (!manager || !date || this.busy()) return;
    this.validityTarget.set(null);
    this.validityConfirmed.emit({ manager, date });
  }
  protected closeValidity(): void {
    if (!this.busy()) this.validityTarget.set(null);
  }
  protected confirmRevoke(): void {
    const manager = this.revokeTarget();
    this.revokeTarget.set(null);
    if (manager) this.revokeConfirmed.emit(manager);
  }
  protected confirmRemove(): void {
    const manager = this.removeTarget();
    this.removeTarget.set(null);
    if (manager) this.removeConfirmed.emit(manager);
  }
  protected today(): string {
    return new Date().toISOString().slice(0, 10);
  }
  protected dateFrom(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
  private async copyInvite(manager: EventManager): Promise<void> {
    const result = this.credentials();
    if (!result || result.manager.id !== manager.id) return;
    const team = this.teams().find((item) => item.id === manager.teamId);
    const message = this.i18n.t('teamDetail.inviteMessage', {
      name: this.nameOf(manager), team: team?.name ?? '', event: team?.eventTitle ?? '', link: result.link,
    });
    if (await this.share.copy(message)) this.toasts.success(this.i18n.t('teamDetail.copiedInvite'));
  }
}
