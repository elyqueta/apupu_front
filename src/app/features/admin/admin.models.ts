import { HttpErrorResponse } from '@angular/common/http';
import { Pagination } from '../../core/api/api.models';
import { toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';

/** Modelos da área de super admin. Os DTOs da API usam snake_case. */

export type AdminEventStatus = 'active' | 'completed' | 'cancelled';
export type AdminRole = 'host' | 'manager' | 'super_admin';
export type AdminUserStatus = 'active' | 'suspended' | 'deleted';

export interface AdminEvent {
  id: string;
  title: string;
  hostName: string;
  hostEmail: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  status: AdminEventStatus;
  guestCount: number;
  teamCount: number;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface AdminGuestSummary {
  id: string;
  name: string;
  rsvpStatus: string;
}

export interface AdminTeamSummary {
  id: string;
  name: string;
  memberCount: number;
}

export interface AdminEventDetail extends AdminEvent {
  guests: AdminGuestSummary[];
  teams: AdminTeamSummary[];
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: AdminRole;
  status: AdminUserStatus;
  createdAt: string | null;
  eventsCreated: number;
}

export interface AdminActivity {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string | null;
}

export interface AdminOverview {
  users: number;
  activeEvents: number;
  cancelledEvents: number;
  invitations: number;
  activity: AdminActivity[];
}

export type AdminAuditEntry = AdminActivity;

export interface AdminPage<T> {
  items: T[];
  pagination: Pagination;
}

export interface AdminEventsQuery {
  q?: string;
  status?: AdminEventStatus;
  host?: string;
  from?: string;
  to?: string;
  page: number;
  page_size: number;
}

export interface AdminUsersQuery {
  q?: string;
  role?: AdminRole;
  status?: AdminUserStatus;
  from?: string;
  page: number;
  page_size: number;
}

export interface AdminAuditQuery {
  q?: string;
  action?: string;
  from?: string;
  page: number;
  page_size: number;
}

/* ---------- DTOs tolerantes a variações de nomes do contrato ---------- */

interface AdminEventDto {
  id: string;
  title?: string;
  host_name?: string | null;
  hostName?: string | null;
  host_email?: string | null;
  hostEmail?: string | null;
  starts_at?: string | null;
  startsAt?: string | null;
  ends_at?: string | null;
  endsAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  status?: string;
  guest_count?: number;
  guestCount?: number;
  invitation_count?: number;
  team_count?: number;
  teamCount?: number;
  cancelled_at?: string | null;
  cancelledAt?: string | null;
  cancelled_reason?: string | null;
  cancellationReason?: string | null;
}

interface AdminEventDetailDto extends AdminEventDto {
  guests?: AdminGuestDto[];
  team?: AdminTeamDto | AdminTeamDto[];
  teams?: AdminTeamDto[];
}

interface AdminGuestDto {
  id?: string;
  guest_name?: string | null;
  name?: string | null;
  rsvp_status?: string | null;
  rsvpStatus?: string | null;
}

interface AdminTeamDto {
  id?: string;
  name?: string | null;
  member_count?: number;
  memberCount?: number;
}

interface AdminUserDto {
  id: string;
  email?: string;
  display_name?: string | null;
  displayName?: string | null;
  profile?: { display_name?: string | null };
  role?: string | null;
  is_super_admin?: boolean;
  isSuperAdmin?: boolean;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  events_created?: number;
  eventsCreated?: number;
}

interface AdminActivityDto {
  id?: string;
  actor?: string | null;
  actor_email?: string | null;
  admin_email?: string | null;
  who?: string | null;
  action?: string | null;
  target_type?: string | null;
  targetType?: string | null;
  target_id?: string | null;
  targetId?: string | null;
  reason?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

interface AdminOverviewDto {
  stats?: {
    users?: number;
    active_events?: number;
    activeEvents?: number;
    cancelled_events?: number;
    cancelledEvents?: number;
    invitations?: number;
    invitations_sent?: number;
  };
  activity?: AdminActivityDto[];
  recent_activity?: AdminActivityDto[];
}

/* ---------- Mapeadores ---------- */

function firstText(...values: (string | null | undefined)[]): string {
  return values.find((value) => typeof value === 'string' && value.trim() !== '') ?? '';
}

function firstNumber(...values: (number | undefined)[]): number {
  return values.find((value) => typeof value === 'number' && Number.isFinite(value)) ?? 0;
}

export function mapAdminEvent(dto: AdminEventDto): AdminEvent {
  return {
    id: dto.id,
    title: firstText(dto.title),
    hostName: firstText(dto.host_name, dto.hostName),
    hostEmail: firstText(dto.host_email, dto.hostEmail),
    startsAt: dto.starts_at ?? dto.startsAt ?? null,
    endsAt: dto.ends_at ?? dto.endsAt ?? null,
    createdAt: dto.created_at ?? dto.createdAt ?? null,
    status: mapEventStatus(dto.status),
    guestCount: firstNumber(dto.guest_count, dto.guestCount, dto.invitation_count),
    teamCount: firstNumber(dto.team_count, dto.teamCount),
    cancelledAt: dto.cancelled_at ?? dto.cancelledAt ?? null,
    cancellationReason: firstText(dto.cancelled_reason, dto.cancellationReason) || null,
  };
}

export function mapAdminEventDetail(dto: AdminEventDetailDto): AdminEventDetail {
  const rawTeams = dto.teams ?? (Array.isArray(dto.team) ? dto.team : dto.team ? [dto.team] : []);
  return {
    ...mapAdminEvent(dto),
    guests: (dto.guests ?? []).map((guest) => ({
      id: firstText(guest.id) || guest.name || guest.guest_name || '',
      name: firstText(guest.guest_name, guest.name),
      rsvpStatus: firstText(guest.rsvp_status, guest.rsvpStatus),
    })),
    teams: rawTeams.map((team) => ({
      id: firstText(team.id),
      name: firstText(team.name),
      memberCount: firstNumber(team.member_count, team.memberCount),
    })),
  };
}

export function mapAdminUser(dto: AdminUserDto): AdminUser {
  return {
    id: dto.id,
    email: firstText(dto.email),
    displayName: firstText(dto.display_name, dto.displayName, dto.profile?.display_name),
    role: mapRole(dto.role, dto.is_super_admin ?? dto.isSuperAdmin),
    status: mapUserStatus(dto.status),
    createdAt: dto.created_at ?? dto.createdAt ?? null,
    eventsCreated: firstNumber(dto.events_created, dto.eventsCreated),
  };
}

export function mapAdminActivity(dto: AdminActivityDto): AdminActivity {
  return {
    id: firstText(dto.id) || `${firstText(dto.action)}-${firstText(dto.created_at, dto.createdAt)}`,
    actor: firstText(dto.actor, dto.actor_email, dto.admin_email, dto.who),
    action: firstText(dto.action),
    targetType: firstText(dto.target_type, dto.targetType),
    targetId: firstText(dto.target_id, dto.targetId),
    reason: firstText(dto.reason) || null,
    createdAt: dto.created_at ?? dto.createdAt ?? null,
  };
}

export function mapAdminOverview(dto: AdminOverviewDto): AdminOverview {
  return {
    users: firstNumber(dto.stats?.users),
    activeEvents: firstNumber(dto.stats?.active_events, dto.stats?.activeEvents),
    cancelledEvents: firstNumber(dto.stats?.cancelled_events, dto.stats?.cancelledEvents),
    invitations: firstNumber(dto.stats?.invitations, dto.stats?.invitations_sent),
    activity: (dto.activity ?? dto.recent_activity ?? []).slice(0, 10).map(mapAdminActivity),
  };
}

function mapEventStatus(value: string | undefined): AdminEventStatus {
  if (value === 'cancelled' || value === 'cancelado') {
    return 'cancelled';
  }
  if (value === 'completed' || value === 'concluido' || value === 'terminado') {
    return 'completed';
  }
  return 'active';
}

function mapRole(value: string | null | undefined, isSuperAdmin: boolean | undefined): AdminRole {
  if (isSuperAdmin === true || value === 'super_admin') {
    return 'super_admin';
  }
  return value === 'manager' || value === 'gestor' ? 'manager' : 'host';
}

function mapUserStatus(value: string | null | undefined): AdminUserStatus {
  if (value === 'suspended' || value === 'suspenso') {
    return 'suspended';
  }
  if (value === 'deleted' || value === 'eliminado') {
    return 'deleted';
  }
  return 'active';
}

/** Traduz códigos de erro da API para mensagens pt-PT e genéricas. */
export function adminErrorMessage(error: unknown, i18n: I18nService): string {
  const apiError = toApiError(error);
  const known: Record<string, TranslationKey> = {
    admin_forbidden: 'admin.error.forbidden',
    admin_self_action: 'admin.error.self',
    admin_otp_invalid: 'admin.error.otp',
    validation_failed: 'admin.error.validation',
    event_cancelled: 'admin.error.cancelled',
    rate_limited: 'admin.error.rateLimited',
  };
  const key = known[apiError.code];
  if (key) {
    return i18n.t(key);
  }
  // Erros de rede/resposta inesperada também ficam genéricos, sem detalhes internos.
  if (error instanceof HttpErrorResponse || error instanceof Error) {
    return i18n.t('admin.error.generic');
  }
  return i18n.t('admin.error.generic');
}
