import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiError, toApiError } from '../../core/api/api-error';
import { TeamsRepository } from '../../core/data/teams.repository';
import {
  isTeamNotFound,
  teamErrorMessage,
} from '../../core/i18n/team-errors';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  Team,
  TeamMember,
  TeamMemberRole,
  TeamTask,
  TaskStatus,
} from '../../core/models/models';
import { AuthService } from '../../core/api/auth.service';
import { TeamTasksStore } from '../../core/services/team-tasks.store';
import { TeamsStore } from '../../core/services/teams.store';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TeamFormDialogComponent, TeamFormValue } from './team-form-dialog.component';

type DetailTab = 'tarefas' | 'membros';
type DrawerMode = 'account' | 'list';
type MemberAction = 'promote' | 'demote' | 'remove' | 'resend';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 50;

/**
 * Detalhe de uma equipa: tarefas, membros e administração.
 *
 * As permissões de escrita vêm de `myRole` (devolvido pelo servidor) e são
 * confirmadas pela API — um 403/404 nunca rebenta a página, apenas mostra
 * uma mensagem traduzida.
 */
@Component({
  selector: 'app-team-detail-page',
  imports: [
    RouterLink,
    FaIconComponent,
    SkeletonComponent,
    StatusBadgeComponent,
    AvatarComponent,
    ActionMenuComponent,
    ConfirmDialogComponent,
    TeamFormDialogComponent,
  ],
  templateUrl: './team-detail.page.html',
})
export class TeamDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly repository = inject(TeamsRepository);
  private readonly teamsStore = inject(TeamsStore);
  private readonly tasksStore = inject(TeamTasksStore);
  private readonly workspace = inject(WorkspaceStore);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  private readonly teamId = this.route.snapshot.paramMap.get('teamId') ?? '';

  protected readonly team = signal<Team | null>(null);
  protected readonly members = signal<TeamMember[]>([]);
  protected readonly tasks = this.tasksStore.items;
  protected readonly loading = signal(true);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly tab = signal<DetailTab>('tarefas');

  protected readonly formOpen = signal(false);
  protected readonly formSaving = signal(false);

  protected readonly drawerOpen = signal(false);
  protected readonly drawerMode = signal<DrawerMode>('account');
  protected readonly drawerEmail = signal('');
  protected readonly drawerEmailsText = signal('');
  protected readonly drawerSaving = signal(false);
  protected readonly drawerApiError = signal('');

  protected readonly deleteConfirmOpen = signal(false);
  protected readonly deleteBlockedOpen = signal(false);
  protected readonly deleteBusy = signal(false);
  protected readonly blockedTaskCount = signal(0);
  protected readonly otherTeams = signal<Team[]>([]);
  protected readonly deleteTargetTeamId = signal('');

  protected readonly removeTarget = signal<TeamMember | null>(null);
  protected readonly removeReassignOpen = signal(false);
  protected readonly removeTargetMemberId = signal('');
  protected readonly memberBlockedTaskCount = signal(0);

  protected readonly currentEmail = computed(() =>
    (this.auth.host()?.email ?? '').trim().toLocaleLowerCase(),
  );
  protected readonly currentMemberId = computed(() => {
    const email = this.currentEmail();
    return this.members().find((member) => member.email.trim().toLocaleLowerCase() === email)?.id ?? '';
  });
  protected readonly canManage = computed(() => {
    const role = this.team()?.myRole;
    return role === 'anfitriao' || role === 'gestor';
  });
  protected readonly events = this.workspace.events;

  protected readonly errorMessage = computed(() => {
    const error = this.loadError();
    if (!error) {
      return '';
    }
    return isTeamNotFound(error)
      ? this.i18n.t('errors.teamNotFound')
      : teamErrorMessage(this.i18n, error);
  });

  protected readonly menuItems = computed<ActionMenuItem[]>(() => [
    {
      id: 'edit',
      label: this.i18n.t('common.edit'),
      icon: this.icons['pen'],
      disabled: !this.canManage(),
    },
    {
      id: 'delete',
      label: this.i18n.t('teamDetail.delete'),
      icon: this.icons['trash'],
      tone: 'danger',
      disabled: !this.canManage(),
    },
  ]);

  protected readonly drawerEmails = computed(() =>
    this.drawerMode() === 'account'
      ? this.splitEmails(this.drawerEmail())
      : this.splitEmails(this.drawerEmailsText()),
  );
  protected readonly drawerCount = computed(() => this.drawerEmails().length);
  protected readonly drawerValidation = computed(() => {
    const emails = this.drawerEmails();
    if (emails.length > MAX_EMAILS) {
      return this.i18n.t('errors.tooManyEmails');
    }
    if (emails.length === 0) {
      return '';
    }
    return emails.some((email) => !EMAIL_PATTERN.test(email))
      ? this.i18n.t('teamDetail.emailsInvalid')
      : '';
  });
  protected readonly drawerMessage = computed(
    () => this.drawerValidation() || this.drawerApiError(),
  );

  constructor() {
    this.tab.set(this.tabFromParams(this.route.snapshot.queryParamMap));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = this.tabFromParams(params);
      if (next !== this.tab()) {
        this.tab.set(next);
      }
    });
    void this.load();
  }

  protected setTab(tab: DetailTab): void {
    if (this.tab() === tab) {
      return;
    }
    this.tab.set(tab);
    void this.router.navigate(['/equipas', this.teamId], {
      queryParams: {
        ...this.route.snapshot.queryParams,
        tab: tab === 'membros' ? 'membros' : null,
      },
      replaceUrl: true,
    });
  }

  protected onMenu(action: string): void {
    if (!this.canManage()) {
      return;
    }
    if (action === 'edit') {
      this.formOpen.set(true);
    } else if (action === 'delete') {
      this.deleteConfirmOpen.set(true);
    }
  }

  protected async saveTeam(value: TeamFormValue): Promise<void> {
    if (this.formSaving() || !this.team()) {
      return;
    }
    this.formSaving.set(true);
    try {
      const updated = await this.repository.update(this.team()!.id, {
        name: value.name,
        category: value.category,
        description: value.description,
      });
      this.teamsStore.upsert(updated);
      this.formOpen.set(false);
      this.toasts.success(this.i18n.t('teams.form.updated'));
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.formSaving.set(false);
    }
  }

  protected closeForm(): void {
    if (!this.formSaving()) {
      this.formOpen.set(false);
    }
  }

  protected isAssignee(task: TeamTask): boolean {
    const email = this.currentEmail();
    if (!email) {
      return false;
    }
    const taskEmail = (task.assigneeEmail ?? '').trim().toLocaleLowerCase();
    if (task.assigneeMemberId) {
      return task.assigneeMemberId === this.currentMemberId() || taskEmail === email;
    }
    return taskEmail === email;
  }

  protected taskAssigneeName(task: TeamTask): string {
    return (
      task.assigneeDisplayName ??
      task.assigneeEmail ??
      this.i18n.t('teamDetail.taskUnassigned')
    );
  }

  protected toggleDisabled(task: TeamTask): boolean {
    return !this.isAssignee(task) || this.busyId() !== null;
  }

  protected reassignDisabled(task: TeamTask): boolean {
    return !this.canManage() || this.busyId() !== null;
  }

  protected async toggleTask(task: TeamTask): Promise<void> {
    if (this.toggleDisabled(task)) {
      return;
    }
    const next: TaskStatus = task.status === 'concluida' ? 'por_fazer' : 'concluida';
    this.busyId.set(task.id);
    try {
      await this.tasksStore.setStatus(task.id, next);
      this.toasts.success(
        this.i18n.t(next === 'concluida' ? 'teamDetail.taskCompleted' : 'teamDetail.taskReopened'),
      );
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(
        teamErrorMessage(this.i18n, toApiError(error), { name: this.taskAssigneeName(task) }),
      );
    } finally {
      this.busyId.set(null);
    }
  }

  protected async reassign(task: TeamTask, memberId: string): Promise<void> {
    if (!memberId || this.reassignDisabled(task)) {
      return;
    }
    this.busyId.set(task.id);
    try {
      await this.tasksStore.setAssignee(task.id, memberId);
      this.toasts.success(this.i18n.t('teamDetail.taskReassigned'));
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.busyId.set(null);
    }
  }

  /* ------------------------------- Drawer ------------------------------- */

  protected openDrawer(): void {
    if (!this.canManage()) {
      return;
    }
    this.drawerMode.set('account');
    this.drawerEmail.set('');
    this.drawerEmailsText.set('');
    this.drawerApiError.set('');
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.drawerSaving()) {
      this.drawerOpen.set(false);
    }
  }

  protected setDrawerMode(mode: DrawerMode): void {
    this.drawerMode.set(mode);
    this.drawerApiError.set('');
  }

  protected async addMembers(): Promise<void> {
    if (!this.canManage() || this.drawerSaving() || this.drawerValidation()) {
      return;
    }
    const emails = this.drawerEmails();
    this.drawerSaving.set(true);
    this.drawerApiError.set('');
    try {
      const result = await this.repository.addMembers(this.teamId, emails);
      this.toasts.success(
        this.i18n.t('teamDetail.addResults', {
          added: result.added.length,
          pending: result.pending.length,
          skipped: result.skipped.length,
        }),
      );
      this.drawerOpen.set(false);
      await this.reloadLists();
    } catch (error: unknown) {
      this.drawerApiError.set(this.errorMessageFor(error));
    } finally {
      this.drawerSaving.set(false);
    }
  }

  /* ------------------------------- Membros ------------------------------ */

  protected memberName(member: TeamMember): string {
    return member.displayName ?? member.email;
  }

  protected memberDisabled(member: TeamMember, action: MemberAction): boolean {
    if (!this.canManage() || member.isHost || this.busyId() !== null) {
      return true;
    }
    switch (action) {
      case 'promote':
        return member.role !== 'membro';
      case 'demote':
        return member.role !== 'gestor';
      case 'resend':
        return member.status !== 'convite_pendente';
      case 'remove':
        return false;
    }
  }

  protected memberDisabledHint(member: TeamMember, action: MemberAction): string | null {
    if (!this.canManage() || member.isHost) {
      return this.i18n.t('teamDetail.permissionHint');
    }
    if (!this.memberDisabled(member, action)) {
      return null;
    }
    return this.i18n.t(
      action === 'resend' ? 'teamDetail.resendInvite' : 'teamDetail.permissionHint',
    );
  }

  protected async changeRole(member: TeamMember): Promise<void> {
    if (this.memberDisabled(member, member.role === 'gestor' ? 'demote' : 'promote')) {
      return;
    }
    const next: TeamMemberRole = member.role === 'gestor' ? 'membro' : 'gestor';
    await this.runMemberAction(member, async () => {
      await this.repository.updateMemberRole(this.teamId, member.id, next);
      this.toasts.success(this.i18n.t('teamDetail.roleUpdated', { name: this.memberName(member) }));
    });
  }

  protected async resendInvite(member: TeamMember): Promise<void> {
    if (this.memberDisabled(member, 'resend')) {
      return;
    }
    await this.runMemberAction(member, async () => {
      await this.repository.resendInvite(this.teamId, member.id);
      this.toasts.success(this.i18n.t('teamDetail.inviteResent', { name: this.memberName(member) }));
    });
  }

  protected askRemoveMember(member: TeamMember): void {
    if (this.memberDisabled(member, 'remove')) {
      return;
    }
    this.removeTarget.set(member);
    this.removeTargetMemberId.set('');
  }

  protected closeRemove(): void {
    this.removeTarget.set(null);
    this.removeReassignOpen.set(false);
  }

  protected async confirmRemoveMember(): Promise<void> {
    const member = this.removeTarget();
    if (!member || this.busyId()) {
      return;
    }
    this.busyId.set(member.id);
    try {
      await this.repository.removeMember(this.teamId, member.id);
      this.finishRemove(this.i18n.t('teamDetail.memberRemoved', { name: this.memberName(member) }));
    } catch (error: unknown) {
      const api = toApiError(error);
      if (api.status === 409 || api.code === 'member_has_open_tasks' || api.code === 'team_has_open_tasks') {
        this.memberBlockedTaskCount.set(this.openTaskCount(api));
        this.removeReassignOpen.set(true);
      } else {
        this.toasts.error(this.errorMessageFor(error));
        this.finishRemove('');
      }
    } finally {
      this.busyId.set(null);
    }
  }

  protected async confirmRemoveReassign(): Promise<void> {
    const member = this.removeTarget();
    const target = this.removeTargetMemberId();
    if (!member || !target) {
      this.toasts.error(this.i18n.t('teamDetail.chooseTargetMember'));
      return;
    }
    this.busyId.set(member.id);
    try {
      await this.repository.removeMember(this.teamId, member.id, target);
      this.finishRemove(this.i18n.t('teamDetail.memberRemoved', { name: this.memberName(member) }));
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected reassignMemberOptions(): TeamMember[] {
    const target = this.removeTarget();
    return this.members().filter((member) => member.id !== target?.id && !member.isHost);
  }

  /* ------------------------------ Apagar -------------------------------- */

  protected closeDelete(): void {
    this.deleteConfirmOpen.set(false);
  }

  protected async confirmDelete(): Promise<void> {
    if (!this.canManage() || this.deleteBusy()) {
      return;
    }
    this.deleteBusy.set(true);
    try {
      await this.repository.remove(this.teamId);
      this.finishDelete();
    } catch (error: unknown) {
      const api = toApiError(error);
      if (api.status === 409 || api.code === 'team_has_open_tasks') {
        this.blockedTaskCount.set(this.openTaskCount(api));
        this.deleteConfirmOpen.set(false);
        await this.loadOtherTeams();
        this.deleteBlockedOpen.set(true);
      } else {
        this.deleteConfirmOpen.set(false);
        this.toasts.error(this.errorMessageFor(error));
      }
    } finally {
      this.deleteBusy.set(false);
    }
  }

  protected closeBlockedDelete(): void {
    this.deleteBlockedOpen.set(false);
  }

  protected targetTeamOptions(): Team[] {
    return this.otherTeams();
  }

  protected async deleteAndReassign(): Promise<void> {
    const target = this.deleteTargetTeamId();
    if (!target) {
      this.toasts.error(this.i18n.t('teamDetail.chooseTargetTeam'));
      return;
    }
    await this.runBlockedDelete({ reassignToTeamId: target });
  }

  protected deleteAndArchive(): Promise<void> {
    return this.runBlockedDelete({ archive: true });
  }

  /* ------------------------------ Helpers ------------------------------- */

  protected statusLabel(status: TeamTask['status']): TranslationKey {
    return `status.${status}` as TranslationKey;
  }

  protected priorityLabel(priority: TeamTask['priority']): TranslationKey {
    return `taskPriority.${priority}` as TranslationKey;
  }

  protected memberStatusLabel(status: TeamMember['status']): TranslationKey {
    return `teamMemberStatus.${status}` as TranslationKey;
  }

  protected roleLabel(role: TeamMember['role']): TranslationKey {
    return `teamRole.${role}` as TranslationKey;
  }

  protected categoryLabel(): string {
    const team = this.team();
    return team ? this.i18n.t(`teamCategory.${team.category}` as TranslationKey) : '';
  }

  protected myRoleLabel(): string {
    const team = this.team();
    return team ? this.i18n.t(`teamRole.${team.myRole}` as TranslationKey) : '';
  }

  private async runMemberAction(
    member: TeamMember,
    action: () => Promise<void>,
  ): Promise<void> {
    this.busyId.set(member.id);
    try {
      await action();
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.busyId.set(null);
    }
  }

  private async runBlockedDelete(options: {
    reassignToTeamId?: string;
    archive?: boolean;
  }): Promise<void> {
    if (this.deleteBusy()) {
      return;
    }
    this.deleteBusy.set(true);
    try {
      await this.repository.remove(this.teamId, {
        confirm: true,
        reassignToTeamId: options.reassignToTeamId ?? null,
        archive: options.archive ?? false,
      });
      this.finishDelete();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.deleteBusy.set(false);
    }
  }

  private finishRemove(message: string): void {
    this.removeTarget.set(null);
    this.removeReassignOpen.set(false);
    if (message) {
      this.toasts.success(message);
    }
    void this.reloadLists();
  }

  private finishDelete(): void {
    this.teamsStore.remove(this.teamId);
    this.toasts.success(this.i18n.t('teamDetail.deleted'));
    void this.router.navigate(['/equipas']);
  }

  private async loadOtherTeams(): Promise<void> {
    const eventId = this.team()?.eventId;
    try {
      const page = await this.repository.list({ eventId, pageSize: 100 });
      this.otherTeams.set(page.items.filter((team) => team.id !== this.teamId));
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
      this.otherTeams.set([]);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const team = await this.repository.get(this.teamId);
      this.team.set(team);
      await this.reloadMembersAndTasks();
    } catch (error: unknown) {
      this.loadError.set(toApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadLists(): Promise<void> {
    try {
      await this.reloadMembersAndTasks();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    }
  }

  private async reloadMembersAndTasks(): Promise<void> {
    const members = await this.repository.listMembers(this.teamId, { page: 1, pageSize: 100 });
    this.members.set(members.items);
    await this.tasksStore.load({ teamId: this.teamId, page: 1, pageSize: 100 });
  }

  private errorMessageFor(error: unknown): string {
    return teamErrorMessage(this.i18n, toApiError(error));
  }

  private openTaskCount(error: ApiError): number {
    const details = error.details as
      | { tasks?: unknown[]; open_tasks?: number; count?: number }
      | null
      | undefined;
    if (Array.isArray(details?.tasks)) {
      return details.tasks.length;
    }
    if (typeof details?.open_tasks === 'number') {
      return details.open_tasks;
    }
    return typeof details?.count === 'number' ? details.count : 0;
  }

  private splitEmails(value: string): string[] {
    return value
      .split(/[\s,;]+/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  }

  private tabFromParams(params: ParamMap): DetailTab {
    return params.get('tab') === 'membros' ? 'membros' : 'tarefas';
  }
}
