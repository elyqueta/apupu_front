import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiError, toApiError } from '../../core/api/api-error';
import { EventsRepository } from '../../core/data/events.repository';
import {
  CreateTeamTaskInput,
  TeamsRepository,
} from '../../core/data/teams.repository';
import {
  isTeamNotFound,
  teamErrorMessage,
} from '../../core/i18n/team-errors';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import {
  EventManager,
  ManagerCreationResult,
  Team,
  TeamMember,
  TeamTask,
  TaskStatus,
} from '../../core/models/models';
import { AuthService } from '../../core/api/auth.service';
import { ShareService } from '../../core/services/share.service';
import { TeamTasksStore } from '../../core/services/team-tasks.store';
import { TeamsStore } from '../../core/services/teams.store';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from '../../shared/components/action-menu.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { PersonCardComponent, PersonMetaItem } from '../../shared/components/person-card.component';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatGridComponent } from '../../shared/components/stat-grid.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TaskFormDialogComponent } from '../../shared/components/task-form-dialog.component';
import { TaskDetailDialogComponent } from '../../shared/components/task-detail-dialog.component';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';
import { formatPhoneMask } from '../../core/utils/phone.util';
import { ManagerCredentialsDialogComponent } from './manager-credentials-dialog.component';
import { TeamFormDialogComponent, TeamFormValue } from './team-form-dialog.component';

type DetailTab = 'tarefas' | 'membros';

interface TaskFormValue {
  label: string;
  eventId: string;
  teamId: string | null;
  assigneeMemberId: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Detalhe de uma equipa: tarefas, membros e administração.
 *
 * As permissões de escrita vêm de `myRole` (devolvido pelo servidor) e são
 * confirmadas pela API — um 403/404 nunca rebenta a página, apenas mostra
 * uma mensagem traduzida. Todos os formulários abrem em `app-modal`.
 */
@Component({
  selector: 'app-team-detail-page',
  imports: [
    TaskDetailDialogComponent,
    FaIconComponent,
    ReactiveFormsModule,
    SkeletonComponent,
    StatusBadgeComponent,
    StatCardComponent,
    StatGridComponent,
    ActionMenuComponent,
    PageHeaderComponent,
    PersonCardComponent,
    ConfirmDialogComponent,
    ModalComponent,
    PhoneMaskDirective,
    ManagerCredentialsDialogComponent,
    TaskFormDialogComponent,
    TeamFormDialogComponent,
  ],
  templateUrl: './team-detail.page.html',
})
export class TeamDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repository = inject(TeamsRepository);
  private readonly eventsRepository = inject(EventsRepository);
  private readonly teamsStore = inject(TeamsStore);
  private readonly tasksStore = inject(TeamTasksStore);
  private readonly workspace = inject(WorkspaceStore);
  private readonly auth = inject(AuthService);
  private readonly share = inject(ShareService);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly formatPhone = formatPhoneMask;
  /** Tarefa aberta no detalhe (autor persistente, responsável, prazo). */
  protected readonly detailTask = signal<TeamTask | null>(null);
  protected readonly icons = ICONS;

  private readonly teamId = this.route.snapshot.paramMap.get('teamId') ?? '';
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly backEventId = computed(() => this.queryParams().get('evento')?.trim() ?? '');
  protected readonly backLink = computed(() => {
    const eventId = this.backEventId();
    return eventId ? `/eventos/${eventId}` : '/equipas';
  });
  protected readonly backLabel = computed(() =>
    this.backEventId()
      ? this.i18n.t('eventDetail.backToEvent')
      : this.i18n.t('teamDetail.back'),
  );

  protected readonly team = signal<Team | null>(null);
  protected readonly members = signal<TeamMember[]>([]);
  protected readonly eventManagers = signal<EventManager[]>([]);
  protected readonly tasks = this.tasksStore.items;
  protected readonly loading = signal(true);
  protected readonly loadError = signal<ApiError | null>(null);
  protected readonly busyId = signal<string | null>(null);
  protected readonly tab = signal<DetailTab>('tarefas');
  protected readonly personalOnly = signal(false);

  /* Editar equipa */
  protected readonly formOpen = signal(false);
  protected readonly formSaving = signal(false);

  /* Adicionar membro (um contacto de cada vez) */
  protected readonly memberModalOpen = signal(false);
  protected readonly memberModalSaving = signal(false);
  protected readonly memberModalError = signal('');
  protected readonly memberForm = this.fb.group({
    displayName: [''],
    email: ['', Validators.email],
    phone: [''],
  });
  /** Espelho reativo do formulário para os `computed` reavaliarem. */
  private readonly memberFormValue = signal(this.memberForm.getRawValue());

  /* Criar tarefa */
  protected readonly taskModalOpen = signal(false);
  protected readonly taskSaving = signal(false);
  protected readonly dialogTeams = computed(() => {
    const team = this.team();
    return team ? [team] : [];
  });
  protected readonly taskAssignees = computed(() =>
    this.members().map((member) => ({ id: member.id, label: this.memberName(member) })),
  );

  /* Confirmações e diálogos de gestor */
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

  protected readonly revokeTarget = signal<TeamMember | null>(null);
  protected readonly demoteTarget = signal<TeamMember | null>(null);
  protected readonly validityTarget = signal<TeamMember | null>(null);
  protected readonly validityModalOpen = signal(false);
  protected readonly validityDate = signal('');
  protected readonly validityBusy = signal(false);

  protected readonly credentialsOpen = signal(false);
  protected readonly credentials = signal<ManagerCreationResult | null>(null);

  protected readonly currentEmail = computed(() =>
    (this.auth.host()?.email ?? '').trim().toLocaleLowerCase(),
  );
  protected readonly currentMemberId = computed(() =>
    this.members().find((member) => this.memberContact(member).toLocaleLowerCase() === this.currentEmail())
      ?.id ?? '',
  );
  protected readonly canManage = computed(() => {
    const role = this.team()?.myRole;
    return role === 'anfitriao' || role === 'gestor';
  });
  protected readonly events = this.workspace.events;

  protected readonly stats = computed(() => {
    const tasks = this.tasks();
    return [
      { label: this.i18n.t('teamDetail.statMembers'), value: this.members().length, icon: this.icons['guestGroup'], tone: 'brand' as const },
      { label: this.i18n.t('teamDetail.statOpenTasks'), value: tasks.filter((task) => task.status !== 'concluida').length, icon: this.icons['checklist'], tone: 'amber' as const },
      { label: this.i18n.t('teamDetail.statCompleted'), value: tasks.filter((task) => task.status === 'concluida').length, icon: this.icons['success'], tone: 'mint' as const },
      { label: this.i18n.t('teamDetail.statLate'), value: tasks.filter((task) => task.status !== 'concluida' && this.isLate(task)).length, icon: this.icons['clock'], tone: 'coral' as const },
    ];
  });

  protected readonly errorMessage = computed(() => {
    const error = this.loadError();
    if (!error) return '';
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

  protected readonly memberValidation = computed(() => {
    const value = this.memberFormValue();
    if (!value.email.trim() && !value.phone.trim()) {
      return this.i18n.t('managerDialog.contactRequired');
    }
    if (value.email.trim() && !EMAIL_PATTERN.test(value.email.trim())) {
      return this.i18n.t('create.errors.email');
    }
    const digits = value.phone.replace(/\D/g, '');
    if (digits) {
      const local = digits.startsWith('244') ? digits.slice(3) : digits;
      if (!/^9\d{8}$/.test(local)) {
        return this.i18n.t('managerDialog.phoneInvalid');
      }
    }
    return '';
  });

  protected readonly maxValidityDate = computed(() => {
    const startsAt = this.team()?.eventId ? this.workspace.eventById(this.team()!.eventId)?.startsAt : null;
    if (!startsAt) return '';
    const date = new Date(`${startsAt.slice(0, 10)}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  });

  constructor() {
    this.memberForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.memberFormValue.set(this.memberForm.getRawValue());
    });

    this.tab.set(this.tabFromParams(this.route.snapshot.queryParamMap));
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const next = this.tabFromParams(params);
      if (next !== this.tab()) this.tab.set(next);
    });
    void this.load();
  }

  protected setTab(tab: DetailTab): void {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    void this.router.navigate(['/equipas', this.teamId], {
      queryParams: { ...this.route.snapshot.queryParams, tab: tab === 'membros' ? 'membros' : null },
      replaceUrl: true,
    });
  }

  protected togglePersonal(): void {
    this.personalOnly.update((value) => !value);
    void this.reloadTasks();
  }

  protected onMenu(action: string): void {
    if (!this.canManage()) return;
    if (action === 'edit') this.formOpen.set(true);
    else if (action === 'delete') this.deleteConfirmOpen.set(true);
  }

  protected async saveTeam(value: TeamFormValue): Promise<void> {
    if (this.formSaving() || !this.team()) return;
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
    if (!this.formSaving()) this.formOpen.set(false);
  }

  /* ------------------------------- Tarefas ------------------------------- */

  protected isLate(task: TeamTask): boolean {
    if (!task.dueDate || task.status === 'concluida') return false;
    return task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }

  protected isAssignee(task: TeamTask): boolean {
    const email = this.currentEmail();
    if (!email) return false;
    const taskEmail = (task.assigneeEmail ?? '').trim().toLocaleLowerCase();
    if (task.assigneeMemberId) {
      return task.assigneeMemberId === this.currentMemberId() || taskEmail === email;
    }
    return taskEmail === email;
  }

  protected taskAssigneeName(task: TeamTask): string {
    return task.assigneeDisplayName ?? task.assigneeEmail ?? this.i18n.t('teamDetail.taskUnassigned');
  }

  protected toggleDisabled(task: TeamTask): boolean {
    return !this.isAssignee(task) || this.busyId() !== null;
  }

  protected reassignDisabled(_task: TeamTask): boolean {
    return !this.canManage() || this.busyId() !== null;
  }

  protected async toggleTask(task: TeamTask): Promise<void> {
    if (this.toggleDisabled(task)) return;
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
    if (!memberId || this.reassignDisabled(task)) return;
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

  protected openTaskModal(): void {
    if (!this.canManage()) return;
    this.taskModalOpen.set(true);
  }

  protected closeTaskModal(): void {
    if (!this.taskSaving()) this.taskModalOpen.set(false);
  }

  protected async createTask(value: TaskFormValue): Promise<void> {
    if (!this.canManage() || this.taskSaving()) return;
    this.taskSaving.set(true);
    try {
      const input: CreateTeamTaskInput = {
        teamId: value.teamId ?? this.teamId,
        title: value.label.trim(),
        description: null,
        dueDate: null,
        priority: 'normal',
        assigneeMemberId: value.assigneeMemberId,
      };
      await this.tasksStore.create(input);
      this.taskModalOpen.set(false);
      this.toasts.success(this.i18n.t('teamDetail.taskCreated'));
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.taskSaving.set(false);
    }
  }

  /* -------------------------- Adicionar membro --------------------------- */

  protected openMemberModal(): void {
    if (!this.canManage()) return;
    this.memberForm.reset({ displayName: '', email: '', phone: '' });
    this.memberModalError.set('');
    this.memberModalOpen.set(true);
  }

  protected closeMemberModal(): void {
    if (!this.memberModalSaving()) this.memberModalOpen.set(false);
  }

  protected async addMember(): Promise<void> {
    if (!this.canManage() || this.memberModalSaving() || this.memberValidation()) {
      this.memberForm.markAllAsTouched();
      return;
    }
    this.memberModalSaving.set(true);
    this.memberModalError.set('');
    try {
      const value = this.memberForm.getRawValue();
      const result = await this.repository.addMember(this.teamId, {
        displayName: value.displayName.trim() || null,
        email: value.email.trim() || null,
        phone: value.phone.trim() || null,
      });
      this.memberModalOpen.set(false);
      this.toasts.success(
        this.i18n.t('teamDetail.addResults', {
          added: result.added.length,
          pending: result.pending.length,
          skipped: result.skipped.length,
        }),
      );
      await this.reloadLists();
    } catch (error: unknown) {
      this.memberModalError.set(this.errorMessageFor(error));
    } finally {
      this.memberModalSaving.set(false);
    }
  }

  /* ------------------------------- Membros ------------------------------- */

  protected memberContact(member: TeamMember): string {
    return member.email ?? member.phone ?? member.displayName ?? '';
  }

  protected memberName(member: TeamMember): string {
    return member.displayName || this.memberContact(member) || this.i18n.t('teams.previewFallback');
  }

  protected memberSubtitle(member: TeamMember): string {
    return [member.email, member.phone].filter(Boolean).join(' · ');
  }

  protected memberMeta(member: TeamMember): PersonMetaItem[] {
    const items: PersonMetaItem[] = [
      { icon: 'user', label: this.i18n.t(this.roleLabel(member.role)) },
      { icon: 'info', label: this.i18n.t(this.memberStatusLabel(member.status)) },
    ];
    if (member.openTaskCount > 0) {
      items.push({
        icon: 'checklist',
        label: this.i18n.t('teamDetail.openTasksMember', { count: member.openTaskCount }),
      });
    }
    if (!member.hasEventAccess) {
      items.push({ icon: 'warning', label: this.i18n.t('teamDetail.noAccessWarning') });
    }
    return items;
  }

  protected memberActions(member: TeamMember): ActionMenuItem[] {
    if (!this.canManage() || member.isHost) return [];
    const manager = this.managerFor(member);
    const actions: ActionMenuItem[] = [
      {
        id: 'resend',
        label: this.i18n.t('teamDetail.action.resend'),
        icon: this.icons['paperPlane'],
        disabled: member.role !== 'gestor' || member.status === 'ativo' || !member.email,
      },
      {
        id: 'copyInvite',
        label: this.i18n.t('teamDetail.action.copyInvite'),
        icon: this.icons['copy'],
        disabled: !manager,
      },
      {
        id: 'newCode',
        label: this.i18n.t('teamDetail.action.newCode'),
        icon: this.icons['key'],
        disabled: !manager,
      },
      {
        id: 'validity',
        label: this.i18n.t('teamDetail.action.validity'),
        icon: this.icons['clock'],
        disabled: !manager,
      },
      {
        id: 'revoke',
        label: this.i18n.t('teamDetail.action.revoke'),
        icon: this.icons['lock'],
        tone: 'danger',
        disabled: !manager || member.role !== 'gestor' || !!manager.linkRevokedAt,
      },
      {
        id: member.role === 'gestor' ? 'demote' : 'promote',
        label: this.i18n.t(member.role === 'gestor' ? 'teamDetail.action.demote' : 'teamDetail.action.promote'),
        icon: this.icons[member.role === 'gestor' ? 'minus' : 'userCheck'],
      },
      {
        id: 'remove',
        label: this.i18n.t('teamDetail.action.remove'),
        icon: this.icons['trash'],
        tone: 'danger',
      },
    ];
    return actions;
  }

  protected managerFor(member: TeamMember): EventManager | null {
    const email = member.email?.trim().toLocaleLowerCase();
    const phone = member.phone?.replace(/\D/g, '');
    return (
      this.eventManagers().find((manager) => {
        if (email && manager.email?.trim().toLocaleLowerCase() === email) return true;
        const managerPhone = manager.phone?.replace(/\D/g, '');
        return Boolean(phone && managerPhone && managerPhone === phone);
      }) ?? null
    );
  }

  protected async onMemberAction(member: TeamMember, action: string): Promise<void> {
    if (this.busyId() !== null) return;
    switch (action) {
      case 'resend':
        await this.resendInvite(member);
        return;
      case 'copyInvite':
        await this.copyInvite(member);
        return;
      case 'newCode':
        await this.regenerateCode(member);
        return;
      case 'validity':
        this.openValidity(member);
        return;
      case 'revoke':
        this.revokeTarget.set(member);
        return;
      case 'promote':
        this.promoteTarget.set(member);
        return;
      case 'demote':
        this.demoteTarget.set(member);
        return;
      case 'remove':
        this.askRemoveMember(member);
        return;
    }
  }

  protected readonly promoteTarget = signal<TeamMember | null>(null);

  protected async confirmPromote(): Promise<void> {
    const member = this.promoteTarget();
    if (!member) return;
    this.busyId.set(member.id);
    try {
      const result = await this.repository.updateMemberRole(this.teamId, member.id, 'gestor');
      this.promoteTarget.set(null);
      this.toasts.success(this.i18n.t('teamDetail.roleUpdated', { name: this.memberName(member) }));
      if (result.accessCode || result.accessLink) {
        this.showCredentials({
          manager: {
            ...(this.managerFor(member) as EventManager),
            id: result.eventManagerId ?? '',
          },
          team: this.team()!,
          link: result.accessLink ?? '',
          accessCode: result.accessCode ?? '',
          emailStatus: 'not_sent',
        });
      }
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected async confirmDemote(): Promise<void> {
    const member = this.demoteTarget();
    if (!member) return;
    await this.runMemberAction(member, async () => {
      const result = await this.repository.updateMemberRole(this.teamId, member.id, 'membro');
      if (result.eventManagerId) {
        await this.eventsRepository.revokeManagerLink(this.team()!.eventId, result.eventManagerId);
      }
      this.demoteTarget.set(null);
      this.toasts.success(this.i18n.t('teamDetail.roleUpdated', { name: this.memberName(member) }));
    });
  }

  protected async resendInvite(member: TeamMember): Promise<void> {
    await this.runMemberAction(member, async () => {
      await this.repository.resendInvite(this.teamId, member.id);
      this.toasts.success(this.i18n.t('teamDetail.inviteResent', { name: this.memberName(member) }));
    });
  }

  protected async copyInvite(member: TeamMember): Promise<void> {
    const manager = this.managerFor(member);
    if (!manager) {
      this.toasts.error(this.i18n.t('teamDetail.noManager'));
      return;
    }
    const message = this.i18n.t('teamDetail.inviteMessage', {
      name: this.memberName(member),
      team: this.team()?.name ?? '',
      event: this.team()?.eventTitle ?? '',
      link: `https://apupu.co/gerir/${manager.id}`,
    });
    const ok = await this.share.copy(message);
    if (ok) this.toasts.success(this.i18n.t('teamDetail.copiedInvite'));
  }

  protected async regenerateCode(member: TeamMember): Promise<void> {
    const manager = this.managerFor(member);
    if (!manager) return;
    this.busyId.set(member.id);
    try {
      const result = await this.eventsRepository.regenerateManagerAccess(
        this.team()!.eventId,
        manager.id,
      );
      this.showCredentials({
        manager,
        team: this.team()!,
        link: result.link ?? '',
        accessCode: result.accessCode ?? '',
        emailStatus: result.emailStatus,
      });
      this.toasts.success(this.i18n.t('teamDetail.codeRegenerated'));
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected openValidity(member: TeamMember): void {
    const manager = this.managerFor(member);
    if (!manager) return;
    this.validityTarget.set(member);
    this.validityDate.set(manager.linkExpiresAt?.slice(0, 10) ?? this.maxValidityDate());
    this.validityModalOpen.set(true);
  }

  protected closeValidity(): void {
    if (!this.validityBusy()) this.validityModalOpen.set(false);
  }

  protected async saveValidity(): Promise<void> {
    const member = this.validityTarget();
    const manager = member ? this.managerFor(member) : null;
    const date = this.validityDate();
    if (!member || !manager || !date || this.validityBusy()) return;
    this.validityBusy.set(true);
    try {
      await this.eventsRepository.updateManagerLink(
        this.team()!.eventId,
        manager.id,
        `${date}T12:00:00.000Z`,
      );
      this.validityModalOpen.set(false);
      this.toasts.success(this.i18n.t('teamDetail.validitySaved'));
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.validityBusy.set(false);
    }
  }

  protected async confirmRevoke(): Promise<void> {
    const member = this.revokeTarget();
    const manager = member ? this.managerFor(member) : null;
    if (!member || !manager) return;
    this.busyId.set(member.id);
    try {
      await this.eventsRepository.revokeManagerLink(this.team()!.eventId, manager.id);
      this.revokeTarget.set(null);
      this.toasts.success(this.i18n.t('teamDetail.accessRevoked'));
      await this.reloadLists();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    } finally {
      this.busyId.set(null);
    }
  }

  protected closeManagerConfirm(kind: 'revoke' | 'demote' | 'promote'): void {
    if (kind === 'revoke') this.revokeTarget.set(null);
    else if (kind === 'demote') this.demoteTarget.set(null);
    else this.promoteTarget.set(null);
  }

  private showCredentials(result: ManagerCreationResult): void {
    this.credentials.set(result);
    this.credentialsOpen.set(true);
  }

  protected closeCredentials(): void {
    this.credentialsOpen.set(false);
  }

  protected askRemoveMember(member: TeamMember): void {
    this.removeTarget.set(member);
    this.removeTargetMemberId.set('');
  }

  protected closeRemove(): void {
    this.removeTarget.set(null);
    this.removeReassignOpen.set(false);
  }

  protected async confirmRemoveMember(): Promise<void> {
    const member = this.removeTarget();
    if (!member || this.busyId()) return;
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
    if (!this.canManage() || this.deleteBusy()) return;
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
    if (this.deleteBusy()) return;
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
    if (message) this.toasts.success(message);
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
      await this.reloadManagers();
    } catch (error: unknown) {
      this.loadError.set(toApiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadLists(): Promise<void> {
    try {
      await this.reloadMembersAndTasks();
      await this.reloadManagers();
    } catch (error: unknown) {
      this.toasts.error(this.errorMessageFor(error));
    }
  }

  private async reloadTasks(): Promise<void> {
    await this.tasksStore.load({
      teamId: this.teamId,
      page: 1,
      pageSize: 100,
      personal: this.personalOnly() || undefined,
    });
  }

  private async reloadMembersAndTasks(): Promise<void> {
    const members = await this.repository.listMembers(this.teamId, { page: 1, pageSize: 100 });
    this.members.set(members.items);
    await this.reloadTasks();
  }

  private async reloadManagers(): Promise<void> {
    const eventId = this.team()?.eventId;
    if (!eventId) return;
    try {
      this.eventManagers.set(await this.eventsRepository.listManagers(eventId));
    } catch {
      this.eventManagers.set([]);
    }
  }

  private errorMessageFor(error: unknown): string {
    return teamErrorMessage(this.i18n, toApiError(error));
  }

  private openTaskCount(error: ApiError): number {
    const details = error.details as
      | { tasks?: unknown[]; open_tasks?: number; count?: number }
      | null
      | undefined;
    if (Array.isArray(details?.tasks)) return details.tasks.length;
    if (typeof details?.open_tasks === 'number') return details.open_tasks;
    return typeof details?.count === 'number' ? details.count : 0;
  }

  private tabFromParams(params: ParamMap): DetailTab {
    return params.get('tab') === 'membros' ? 'membros' : 'tarefas';
  }
}
