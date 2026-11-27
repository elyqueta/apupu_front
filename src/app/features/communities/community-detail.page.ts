import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import {
  ApiCommunityDetail,
  ApiCommunityEvent,
  ApiCommunityMember,
  ApiJoinRequest,
  ApiReferral,
  CommunitiesRepository,
  shareUrl,
} from '../../core/data/communities.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PersonCardComponent, PersonMetaItem } from '../../shared/components/person-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';
import { LinkCopyService } from '../../shared/services/link-copy.service';
import { phoneDigits } from '../../core/utils/phone.util';
import { CommunityFormDialogComponent } from './community-form-dialog.component';

type Tab = 'summary' | 'events' | 'teams' | 'members' | 'requests' | 'shares' | 'settings';
type State = 'loading' | 'ready' | 'not_found' | 'error';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Perfil da comunidade (Bloco 11): capa + avatar, separadores e ações
 * conforme o papel. Tudo o que cria, edita ou convida abre em modal com as
 * ações no fim do formulário.
 */
@Component({
  selector: 'app-community-detail-page',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    FaIconComponent,
    SkeletonComponent,
    ModalComponent,
    ConfirmDialogComponent,
    ActionMenuComponent,
    PersonCardComponent,
    PhoneMaskDirective,
    CommunityFormDialogComponent,
  ],
  templateUrl: './community-detail.page.html',
})
export class CommunityDetailPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repo = inject(CommunitiesRepository);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly linkCopy = inject(LinkCopyService);

  /** `:slug` da rota. */
  readonly slug = input('');

  protected readonly state = signal<State>('loading');
  protected readonly detail = signal<ApiCommunityDetail | null>(null);
  protected readonly tab = signal<Tab>('summary');
  protected readonly busy = signal(false);

  protected readonly requests = signal<ApiJoinRequest[]>([]);
  protected readonly referrals = signal<ApiReferral[] | null>(null);

  protected readonly editOpen = signal(false);
  protected readonly joinOpen = signal(false);
  protected readonly joinMessage = signal('');
  protected readonly leaveOpen = signal(false);
  protected readonly inviteOpen = signal(false);
  protected readonly invite = signal({ email: '', phone: '', role: 'member' as 'member' | 'manager' });
  protected readonly inviteError = signal('');
  protected readonly removeTarget = signal<ApiCommunityMember | null>(null);
  protected readonly decideTarget = signal<ApiJoinRequest | null>(null);
  protected readonly deleteOpen = signal(false);
  protected readonly deleteTyped = signal('');
  protected readonly transferOpen = signal(false);
  protected readonly transferMember = signal('');
  protected readonly transferStep = signal<'choose' | 'code'>('choose');
  protected readonly transferCode = signal('');
  protected readonly transferError = signal('');

  protected readonly community = computed(() => this.detail()?.community ?? null);
  protected readonly can = computed(() => this.detail()?.permissions ?? null);
  protected readonly tabs = computed<{ id: Tab; label: TranslationKey; count?: number }[]>(() => {
    const perms = this.can();
    const detail = this.detail();
    const tabs: { id: Tab; label: TranslationKey; count?: number }[] = [
      { id: 'summary', label: 'block11.tab.summary' },
      { id: 'events', label: 'block11.tab.events', count: detail?.events.length },
    ];
    if (perms?.isMember) {
      tabs.push({ id: 'teams', label: 'block11.tab.teams', count: detail?.teams.length });
      tabs.push({ id: 'members', label: 'block11.tab.members', count: detail?.members.length });
      tabs.push({ id: 'shares', label: 'block11.tab.shares' });
    }
    if (perms?.canDecideRequests) {
      tabs.push({ id: 'requests', label: 'block11.tab.requests', count: detail?.pending_requests });
    }
    if (perms?.canEdit) {
      tabs.push({ id: 'settings', label: 'block11.tab.settings' });
    }
    return tabs;
  });

  protected readonly upcoming = computed(() =>
    (this.detail()?.events ?? []).filter((event) => new Date(event.starts_at).getTime() >= Date.now()),
  );
  protected readonly past = computed(() =>
    (this.detail()?.events ?? []).filter((event) => new Date(event.starts_at).getTime() < Date.now()),
  );
  protected readonly transferCandidates = computed(() =>
    (this.detail()?.members ?? []).filter(
      (member) => member.status === 'active' && member.role !== 'owner' && member.has_host_account,
    ),
  );

  constructor() {
    // Só o slug e o separador disparam pedidos; o resto é lido sem rastreio
    // para não criar ciclos (load lê e escreve sinais).
    effect(() => {
      const slug = this.slug();
      if (slug) untracked(() => void this.load(slug));
    });
    effect(() => {
      const tab = this.tab();
      untracked(() => {
        if (tab === 'requests') void this.loadRequests();
        if (tab === 'shares') void this.loadReferrals();
      });
    });
  }

  protected async load(slug = this.slug()): Promise<void> {
    if (!this.detail()) this.state.set('loading');
    try {
      const detail = await this.repo.detail(slug);
      this.detail.set(detail);
      this.state.set('ready');
      if (!this.tabs().some((item) => item.id === this.tab())) this.tab.set('summary');
    } catch (error: unknown) {
      this.state.set(toApiError(error).status === 404 ? 'not_found' : 'error');
    }
  }

  private async loadRequests(): Promise<void> {
    const community = this.community();
    if (!community || !this.can()?.canDecideRequests) return;
    try {
      this.requests.set(await this.repo.joinRequests(community.id));
    } catch {
      this.toasts.error(this.i18n.t('block11.common.error'));
    }
  }

  private async loadReferrals(): Promise<void> {
    const community = this.community();
    if (!community || !this.can()?.isMember) return;
    try {
      this.referrals.set(await this.repo.referrals(community.id));
    } catch {
      this.referrals.set([]);
    }
  }

  /** Executa uma ação, mostra o toast de sucesso e recarrega a comunidade. */
  private async run(action: () => Promise<unknown>, successKey: TranslationKey): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    try {
      await action();
      this.toasts.success(this.i18n.t(successKey));
      await this.load();
      return true;
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.toasts.error(
        apiError.status === 403 ? this.i18n.t('block11.common.forbidden') : apiError.message || this.i18n.t('block11.common.error'),
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  protected roleLabel(role: string): string {
    return this.i18n.t(`block11.role.${role}` as TranslationKey);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  /* ─────────────────────────── adesão e saída ─────────────────────────── */

  protected async requestToJoin(): Promise<void> {
    const community = this.community();
    if (!community) return;
    if (await this.run(() => this.repo.requestToJoin(community.id, this.joinMessage().trim() || null), 'block11.detail.joinSent')) {
      this.joinOpen.set(false);
      this.joinMessage.set('');
    }
  }

  protected async cancelRequest(): Promise<void> {
    const community = this.community();
    if (community) await this.run(() => this.repo.cancelJoinRequest(community.id), 'block11.detail.requestCancelled');
  }

  protected async answerInvite(accept: boolean): Promise<void> {
    const community = this.community();
    if (!community) return;
    await this.run(
      () => this.repo.answerInvite(community.id, accept),
      accept ? 'block11.detail.inviteAccepted' : 'block11.detail.inviteDeclined',
    );
  }

  protected async leave(): Promise<void> {
    const community = this.community();
    if (!community) return;
    if (await this.run(() => this.repo.leave(community.id), 'block11.detail.left')) {
      this.leaveOpen.set(false);
    }
  }

  /* ─────────────────────────────── eventos ─────────────────────────────── */

  protected async copyShare(event: ApiCommunityEvent): Promise<void> {
    if (!event.public_url) return;
    const copied = await this.linkCopy.copy(shareUrl(event.public_url, this.detail()?.my_ref_code ?? null));
    if (copied && this.detail()?.my_ref_code) {
      this.toasts.info(this.i18n.t('block11.events.shareCopied'));
    }
  }

  protected newEvent(): void {
    const community = this.community();
    if (community) void this.router.navigate(['/criar-evento'], { queryParams: { comunidade: community.id } });
  }

  /* ─────────────────────────────── membros ─────────────────────────────── */

  protected memberMeta(member: ApiCommunityMember): PersonMetaItem[] {
    const meta: PersonMetaItem[] = [{ icon: 'user', label: this.roleLabel(member.role) }];
    if (member.joined_at) {
      meta.push({ icon: 'clock', label: this.i18n.shortDate(member.joined_at, 'Africa/Luanda') });
    }
    return meta;
  }

  protected memberActions(member: ApiCommunityMember): ActionMenuItem[] {
    const perms = this.can();
    if (!perms || member.role === 'owner') return [];
    const items: ActionMenuItem[] = [];
    if (perms.canChangeRoles && member.status === 'active') {
      items.push(
        member.role === 'manager'
          ? { id: 'member', label: this.i18n.t('block11.members.makeMember'), icon: ICONS['user'] }
          : { id: 'manager', label: this.i18n.t('block11.members.makeManager'), icon: ICONS['userCheck'] },
      );
    }
    const myRole = this.community()?.my_role;
    if (perms.canInvite && (member.role === 'member' || myRole === 'owner')) {
      items.push({ id: 'remove', label: this.i18n.t('block11.members.remove'), icon: ICONS['trash'], tone: 'danger' });
    }
    return items;
  }

  protected async onMemberAction(member: ApiCommunityMember, action: string): Promise<void> {
    const community = this.community();
    if (!community) return;
    if (action === 'remove') {
      this.removeTarget.set(member);
      return;
    }
    if (action === 'manager' || action === 'member') {
      await this.run(() => this.repo.changeRole(community.id, member.id, action), 'block11.members.roleChanged');
    }
  }

  protected async confirmRemove(): Promise<void> {
    const community = this.community();
    const target = this.removeTarget();
    if (!community || !target) return;
    if (await this.run(() => this.repo.removeMember(community.id, target.id), 'block11.members.removed')) {
      this.removeTarget.set(null);
    }
  }

  protected openInvite(): void {
    this.invite.set({ email: '', phone: '', role: 'member' });
    this.inviteError.set('');
    this.inviteOpen.set(true);
  }

  protected async sendInvite(event: Event): Promise<void> {
    event.preventDefault();
    const community = this.community();
    if (!community) return;
    const value = this.invite();
    const email = value.email.trim();
    const phone = phoneDigits(value.phone);
    if (!email && !phone) {
      this.inviteError.set(this.i18n.t('block11.invite.contactError'));
      return;
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      this.inviteError.set(this.i18n.t('block11.invite.emailError'));
      return;
    }
    this.inviteError.set('');
    const ok = await this.run(
      () =>
        this.repo.invite(community.id, {
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          role: value.role,
        }),
      'block11.invite.sent',
    );
    if (ok) this.inviteOpen.set(false);
  }

  protected patchInvite(patch: Partial<{ email: string; phone: string; role: 'member' | 'manager' }>): void {
    this.invite.update((current) => ({ ...current, ...patch }));
  }

  /* ─────────────────────────────── pedidos ─────────────────────────────── */

  protected async decide(decision: 'approve' | 'reject'): Promise<void> {
    const community = this.community();
    const request = this.decideTarget();
    if (!community || !request) return;
    const ok = await this.run(
      () => this.repo.decide(community.id, request.id, decision),
      decision === 'approve' ? 'block11.requests.approved' : 'block11.requests.rejected',
    );
    if (ok) {
      this.decideTarget.set(null);
      await this.loadRequests();
    }
  }

  /* ───────────────────────────── definições ────────────────────────────── */

  protected async confirmDelete(event: Event): Promise<void> {
    event.preventDefault();
    const community = this.community();
    if (!community || this.deleteTyped().trim() !== community.name.trim()) return;
    this.busy.set(true);
    try {
      await this.repo.remove(community.id, this.deleteTyped());
      this.toasts.success(this.i18n.t('block11.settings.deleted'));
      void this.router.navigate(['/comunidades']);
    } catch {
      this.toasts.error(this.i18n.t('block11.common.error'));
    } finally {
      this.busy.set(false);
    }
  }

  protected openTransfer(): void {
    this.transferStep.set('choose');
    this.transferMember.set(this.transferCandidates()[0]?.id ?? '');
    this.transferCode.set('');
    this.transferError.set('');
    this.transferOpen.set(true);
  }

  protected async startTransfer(event: Event): Promise<void> {
    event.preventDefault();
    const community = this.community();
    if (!community || !this.transferMember() || this.busy()) return;
    this.busy.set(true);
    this.transferError.set('');
    try {
      await this.repo.startTransfer(community.id, this.transferMember());
      this.transferStep.set('code');
      this.toasts.success(this.i18n.t('block11.transfer.codeSent'));
    } catch (error: unknown) {
      this.transferError.set(toApiError(error).message || this.i18n.t('block11.common.error'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async verifyTransfer(event: Event): Promise<void> {
    event.preventDefault();
    const community = this.community();
    if (!community || !/^\d{6}$/.test(this.transferCode()) || this.busy()) {
      this.transferError.set(this.i18n.t('block11.transfer.codeError'));
      return;
    }
    this.busy.set(true);
    this.transferError.set('');
    try {
      await this.repo.verifyTransfer(community.id, this.transferCode());
      this.transferOpen.set(false);
      this.toasts.success(this.i18n.t('block11.transfer.waiting'));
      await this.load();
    } catch {
      this.transferError.set(this.i18n.t('block11.transfer.codeError'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async acceptTransfer(): Promise<void> {
    const community = this.community();
    if (community) await this.run(() => this.repo.acceptTransfer(community.id), 'block11.transfer.accepted');
  }

  protected async cancelTransfer(): Promise<void> {
    const community = this.community();
    if (community) await this.run(() => this.repo.cancelTransfer(community.id), 'block11.transfer.cancelled');
  }

  protected onSaved(): void {
    this.editOpen.set(false);
    void this.load();
  }
}
