import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import {
  ApiAddTeamMembersResult,
  ApiDeleteTeamResult,
  ApiInviteResendResult,
  ApiRemoveTeamMemberResult,
  ApiTask,
  ApiTeam,
  ApiTeamMember,
  ApiUpdateTeamMemberRoleResult,
  Pagination,
} from '../api/api.models';
import {
  mapTeam,
  mapTeamMember,
  mapTeamTask,
} from '../api/mappers';
import {
  AddTeamMembersResult,
  DeleteTeamResult,
  InviteResendResult,
  RemoveTeamMemberResult,
  Team,
  TeamCategory,
  TeamEventStatus,
  TeamMember,
  TeamMemberContact,
  TeamMemberRole,
  TeamMemberStatus,
  TeamMyRole,
  TeamTask,
  UpdateTeamMemberRoleResult,
} from '../models/models';

export interface TeamListQuery {
  q?: string;
  role?: TeamMyRole;
  eventStatus?: TeamEventStatus;
  mine?: boolean;
  category?: TeamCategory;
  eventId?: string;
  page?: number;
  pageSize?: number;
}

export interface TeamPage {
  items: Team[];
  pagination: Pagination;
}

export interface TeamMemberQuery {
  role?: TeamMemberRole;
  status?: TeamMemberStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TeamMemberPage {
  items: TeamMember[];
  pagination: Pagination;
}

export interface CreateTeamInput {
  eventId: string;
  name: string;
  category?: TeamCategory;
  description?: string | null;
  /** Bloco 11: equipa dentro de uma comunidade. */
  communityId?: string | null;
}

export interface UpdateTeamInput {
  name?: string;
  category?: TeamCategory;
  description?: string | null;
}

export interface DeleteTeamOptions {
  /** Necessário quando a equipa ainda tem tarefas abertas. */
  confirm?: boolean;
  reassignToTeamId?: string | null;
  archive?: boolean;
}

/**
 * Equipas e membros (`/host/teams`).
 *
 * As permissões vêm sempre do servidor: um `403`/`404` é propagado como
 * `ApiError` e cabe à página decidir o que mostrar.
 */
@Injectable({ providedIn: 'root' })
export class TeamsRepository {
  private readonly api = inject(ApiClient);

  async list(query: TeamListQuery = {}): Promise<TeamPage> {
    const page = await this.api.getPage<ApiTeam>('/host/teams', {
      event_id: query.eventId,
      category: query.category,
      role: query.role,
      event_status: query.eventStatus,
      mine: query.mine ? 'true' : undefined,
      q: query.q,
      page: query.page,
      page_size: query.pageSize,
    });
    return { items: page.data.map(mapTeam), pagination: page.pagination };
  }

  async get(teamId: string): Promise<Team> {
    const team = await this.api.get<ApiTeam>(`/host/teams/${encodeURIComponent(teamId)}`);
    return mapTeam(team);
  }

  async create(input: CreateTeamInput): Promise<Team> {
    const team = await this.api.post<ApiTeam>('/host/teams', {
      event_id: input.eventId,
      name: input.name,
      category: input.category,
      description: input.description,
      ...(input.communityId ? { community_id: input.communityId } : {}),
    });
    return mapTeam(team);
  }

  /** Bloco 11: eventos geridos pela equipa (só o criador). */
  async setEvents(teamId: string, eventIds: string[], all = false): Promise<Team> {
    const team = await this.api.put<ApiTeam>(`/host/teams/${encodeURIComponent(teamId)}/events`, {
      event_ids: eventIds,
      all,
    });
    return mapTeam(team);
  }

  /** Bloco 11: sair da equipa. */
  async leave(teamId: string): Promise<void> {
    await this.api.postRaw<void>(`/host/teams/${encodeURIComponent(teamId)}/leave`, {});
  }

  async update(teamId: string, input: UpdateTeamInput): Promise<Team> {
    const team = await this.api.patch<ApiTeam>(
      `/host/teams/${encodeURIComponent(teamId)}`,
      input,
    );
    return mapTeam(team);
  }

  async remove(teamId: string, options: DeleteTeamOptions = {}): Promise<DeleteTeamResult> {
    const result = await this.api.deleteWithData<ApiDeleteTeamResult>(
      `/host/teams/${encodeURIComponent(teamId)}`,
      {
        confirm: options.confirm ? 'true' : undefined,
        reassign_to_team_id: options.reassignToTeamId ?? undefined,
        archive: options.archive ? 'true' : undefined,
      },
    );
    return {
      deleted: result.deleted,
      reassignedToTeamId: result.reassigned_to_team_id,
      reassignedTasks: result.reassigned_tasks,
      archivedTasks: result.archived_tasks,
    };
  }

  async listMembers(teamId: string, query: TeamMemberQuery = {}): Promise<TeamMemberPage> {
    const page = await this.api.getPage<ApiTeamMember>(
      `/host/teams/${encodeURIComponent(teamId)}/members`,
      {
        role: query.role,
        status: query.status,
        q: query.q,
        page: query.page,
        page_size: query.pageSize,
      },
    );
    return { items: page.data.map(mapTeamMember), pagination: page.pagination };
  }

  /** Formato novo: uma pessoa de cada vez, com email e/ou telefone. */
  async addMember(teamId: string, contact: TeamMemberContact): Promise<AddTeamMembersResult> {
    const result = await this.api.postRaw<ApiAddTeamMembersResult>(
      `/host/teams/${encodeURIComponent(teamId)}/members`,
      {
        members: [
          {
            display_name: contact.displayName || null,
            email: contact.email || null,
            phone: contact.phone || null,
          },
        ],
      },
    );
    return this.mapAddResult(result);
  }

  /** Formato legado, mantido para clientes antigos e testes existentes. */
  async addMembers(teamId: string, emails: string[]): Promise<AddTeamMembersResult> {
    const result = await this.api.postRaw<ApiAddTeamMembersResult>(
      `/host/teams/${encodeURIComponent(teamId)}/members`,
      { emails },
    );
    return this.mapAddResult(result);
  }

  private mapAddResult(result: ApiAddTeamMembersResult): AddTeamMembersResult {
    const toRow = (row: ApiAddTeamMembersResult['added'][number]) => ({
      email: row.email,
      phone: row.phone ?? null,
      memberId: row.member_id,
      status: row.status,
      reason: row.reason,
    });
    return {
      added: result.added.map(toRow),
      pending: result.pending.map(toRow),
      skipped: result.skipped.map(toRow),
    };
  }

  async updateMemberRole(
    teamId: string,
    memberId: string,
    role: TeamMemberRole,
  ): Promise<UpdateTeamMemberRoleResult> {
    const result = await this.api.patch<ApiUpdateTeamMemberRoleResult>(
      `/host/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
      { role },
    );
    return {
      member: mapTeamMember(result.member),
      eventManagerId: result.event_manager_id,
      accessCode: result.access_code,
      accessLink: result.access_link,
    };
  }

  async removeMember(
    teamId: string,
    memberId: string,
    reassignToMemberId: string | null = null,
  ): Promise<RemoveTeamMemberResult> {
    const result = await this.api.deleteWithData<ApiRemoveTeamMemberResult>(
      `/host/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}`,
      { reassign_to_member_id: reassignToMemberId ?? undefined },
    );
    return { removed: result.removed, reassignedTasks: result.reassigned_tasks };
  }

  async resendInvite(teamId: string, memberId: string): Promise<InviteResendResult> {
    const result = await this.api.post<ApiInviteResendResult>(
      `/host/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(memberId)}/invite/resend`,
    );
    return {
      sendCount: result.send_count,
      lastSentAt: result.last_sent_at,
      expiresAt: result.expires_at,
    };
  }
}

export interface TeamTaskQuery {
  teamId?: string;
  eventId?: string;
  status?: 'all' | 'por_fazer' | 'em_curso' | 'concluida';
  assigneeMemberId?: string;
  priority?: 'baixa' | 'normal' | 'alta';
  personal?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface TeamTaskPage {
  items: TeamTask[];
  pagination: Pagination;
}

export interface CreateTeamTaskInput {
  teamId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: 'baixa' | 'normal' | 'alta';
  assigneeMemberId?: string | null;
}

export interface UpdateTeamTaskInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: 'baixa' | 'normal' | 'alta';
}

/** Tarefas por equipa (`/host/tasks`). */
@Injectable({ providedIn: 'root' })
export class TeamTasksRepository {
  private readonly api = inject(ApiClient);

  async list(query: TeamTaskQuery = {}): Promise<TeamTaskPage> {
    const page = await this.api.getPage<ApiTask>('/host/tasks', {
      team_id: query.teamId,
      event_id: query.eventId,
      status: query.status,
      assignee_member_id: query.assigneeMemberId,
      priority: query.priority,
      personal: query.personal ? 'true' : undefined,
      q: query.q,
      page: query.page,
      page_size: query.pageSize,
    });
    return { items: page.data.map(mapTeamTask), pagination: page.pagination };
  }

  async create(input: CreateTeamTaskInput): Promise<TeamTask> {
    const task = await this.api.post<ApiTask>('/host/tasks', {
      team_id: input.teamId,
      title: input.title,
      description: input.description,
      due_date: input.dueDate,
      priority: input.priority,
      assignee_member_id: input.assigneeMemberId,
    });
    return mapTeamTask(task);
  }

  async update(taskId: string, input: UpdateTeamTaskInput): Promise<TeamTask> {
    const task = await this.api.patch<ApiTask>(
      `/host/tasks/${encodeURIComponent(taskId)}`,
      {
        title: input.title,
        description: input.description,
        due_date: input.dueDate,
        priority: input.priority,
      },
    );
    return mapTeamTask(task);
  }

  async setStatus(
    taskId: string,
    status: 'por_fazer' | 'em_curso' | 'concluida',
  ): Promise<TeamTask> {
    const task = await this.api.patch<ApiTask>(
      `/host/tasks/${encodeURIComponent(taskId)}/status`,
      { status },
    );
    return mapTeamTask(task);
  }

  async setAssignee(taskId: string, assigneeMemberId: string): Promise<TeamTask> {
    const task = await this.api.patch<ApiTask>(
      `/host/tasks/${encodeURIComponent(taskId)}/assignee`,
      { assignee_member_id: assigneeMemberId },
    );
    return mapTeamTask(task);
  }

  async move(
    taskId: string,
    teamId: string,
    assigneeMemberId?: string | null,
  ): Promise<TeamTask> {
    const task = await this.api.post<ApiTask>(
      `/host/tasks/${encodeURIComponent(taskId)}/move`,
      {
        team_id: teamId,
        assignee_member_id: assigneeMemberId ?? undefined,
      },
    );
    return mapTeamTask(task);
  }

  async remove(taskId: string): Promise<void> {
    await this.api.delete(`/host/tasks/${encodeURIComponent(taskId)}`);
  }
}
