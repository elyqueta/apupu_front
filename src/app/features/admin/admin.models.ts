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
  avatarUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  birthDate: string | null;
  locale: string;
  timezone: string;
  emailVerifiedAt: string | null;
  profileComplete: boolean;
}

export interface AdminProfileEvent {
  id: string;
  title: string;
  status: string;
  startsAt: string | null;
  createdAt: string | null;
  guestCount: number;
}

export interface AdminProfileTeam {
  id: string;
  name: string;
  memberCount: number;
  eventTitle: string | null;
}

/** Detalhe de conta devolvido por `GET /admin/users/:userId`. */
export interface AdminUserDetail extends AdminUser {
  events: AdminProfileEvent[];
  teams: AdminProfileTeam[];
}

/** PDF semanal guardado para download no painel. */
export interface AdminWeeklyReport {
  id: string;
  weekStart: string;
  status: 'generating' | 'ready';
  filename: string;
  sizeBytes: number;
  hostCount: number;
  generatedAt: string | null;
  createdAt: string | null;
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

export type SupportMessageStatus = 'open' | 'resolved';

/** Mensagem enviada pelo formulário público de apoio. */
export interface AdminSupportMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  status: SupportMessageStatus;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

/** Email inscrito para receber novidades do site. */
export interface AdminNewsletterSubscription {
  id: string;
  email: string;
  createdAt: string | null;
}

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

export interface AdminSupportQuery {
  q?: string;
  status?: SupportMessageStatus | 'all';
  from?: string;
  to?: string;
  page: number;
  page_size: number;
}

export interface AdminNewsletterQuery {
  q?: string;
  from?: string;
  to?: string;
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
  avatar_url?: string | null;
  avatarUrl?: string | null;
  cover_url?: string | null;
  coverUrl?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  birthDate?: string | null;
  locale?: string | null;
  timezone?: string | null;
  email_verified_at?: string | null;
  emailVerifiedAt?: string | null;
  profile_complete?: boolean;
  profileComplete?: boolean;
}

interface AdminProfileEventDto {
  id?: string;
  title?: string | null;
  status?: string | null;
  starts_at?: string | null;
  startsAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  guest_count?: number;
  guestCount?: number;
}

interface AdminProfileTeamDto {
  id?: string;
  name?: string | null;
  member_count?: number;
  memberCount?: number;
  event_title?: string | null;
  eventTitle?: string | null;
}

interface AdminUserDetailDto extends AdminUserDto {
  events?: AdminProfileEventDto[];
  teams?: AdminProfileTeamDto[];
}

interface AdminWeeklyReportDto {
  id: string;
  week_start?: string;
  weekStart?: string;
  status?: string;
  filename?: string;
  size_bytes?: number;
  sizeBytes?: number;
  host_count?: number;
  hostCount?: number;
  generated_at?: string | null;
  generatedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

interface AdminActivityDto {
  id?: string;
  actor?: string | null;
  actor_email?: string | null;
  admin_email?: string | null;
  admin_name?: string | null;
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

interface AdminSupportMessageDto {
  id: string;
  name?: string | null;
  email?: string | null;
  message?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  resolved_at?: string | null;
  resolvedAt?: string | null;
  resolved_by?: string | null;
  resolvedBy?: string | null;
}

interface AdminNewsletterSubscriptionDto {
  id: string;
  email?: string | null;
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
    avatarUrl: dto.avatar_url ?? dto.avatarUrl ?? null,
    coverUrl: dto.cover_url ?? dto.coverUrl ?? null,
    phone: dto.phone ?? null,
    birthDate: dto.birth_date ?? dto.birthDate ?? null,
    locale: firstText(dto.locale) || 'pt-AO',
    timezone: firstText(dto.timezone) || 'Africa/Luanda',
    emailVerifiedAt: dto.email_verified_at ?? dto.emailVerifiedAt ?? null,
    profileComplete: dto.profile_complete ?? dto.profileComplete ?? false,
  };
}

export function mapAdminUserDetail(dto: AdminUserDetailDto): AdminUserDetail {
  return {
    ...mapAdminUser(dto),
    events: (dto.events ?? []).map((event) => ({
      id: firstText(event.id),
      title: firstText(event.title),
      status: firstText(event.status),
      startsAt: event.starts_at ?? event.startsAt ?? null,
      createdAt: event.created_at ?? event.createdAt ?? null,
      guestCount: firstNumber(event.guest_count, event.guestCount),
    })),
    teams: (dto.teams ?? []).map((team) => ({
      id: firstText(team.id),
      name: firstText(team.name),
      memberCount: firstNumber(team.member_count, team.memberCount),
      eventTitle: team.event_title ?? team.eventTitle ?? null,
    })),
  };
}

export function mapAdminWeeklyReport(dto: AdminWeeklyReportDto): AdminWeeklyReport {
  return {
    id: dto.id,
    weekStart: firstText(dto.week_start, dto.weekStart),
    status: dto.status === 'ready' ? 'ready' : 'generating',
    filename: firstText(dto.filename),
    sizeBytes: firstNumber(dto.size_bytes, dto.sizeBytes),
    hostCount: firstNumber(dto.host_count, dto.hostCount),
    generatedAt: dto.generated_at ?? dto.generatedAt ?? null,
    createdAt: dto.created_at ?? dto.createdAt ?? null,
  };
}

export function mapAdminSupportMessage(dto: AdminSupportMessageDto): AdminSupportMessage {
  return {
    id: dto.id,
    name: firstText(dto.name),
    email: firstText(dto.email),
    message: firstText(dto.message),
    status: dto.status === 'resolved' ? 'resolved' : 'open',
    createdAt: dto.created_at ?? dto.createdAt ?? null,
    resolvedAt: dto.resolved_at ?? dto.resolvedAt ?? null,
    resolvedBy: firstText(dto.resolved_by, dto.resolvedBy) || null,
  };
}

export function mapAdminNewsletterSubscription(
  dto: AdminNewsletterSubscriptionDto,
): AdminNewsletterSubscription {
  return {
    id: dto.id,
    email: firstText(dto.email),
    createdAt: dto.created_at ?? dto.createdAt ?? null,
  };
}

export function mapAdminActivity(dto: AdminActivityDto): AdminActivity {
  return {
    id: firstText(dto.id) || `${firstText(dto.action)}-${firstText(dto.created_at, dto.createdAt)}`,
    actor: firstText(dto.actor, dto.admin_name, dto.actor_email, dto.admin_email, dto.who),
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

/**
 * Códigos gravados em `admin_audit_log` e a sua descrição legível.
 *
 * Mantido num único sítio para que "Atividade recente" e "Auditoria" mostrem
 * exactamente o mesmo texto. As cinco entradas sem prefixo são códigos
 * legados que ainda podem existir em registos antigos.
 */
export const ADMIN_ACTION_KEYS: Record<string, TranslationKey> = {
  admin_overview_viewed: 'admin.audit.action.overviewViewed',
  admin_events_listed: 'admin.audit.action.eventsListed',
  admin_event_viewed: 'admin.audit.action.eventViewed',
  admin_cancel_otp_requested: 'admin.audit.action.cancelOtpRequested',
  admin_event_cancelled: 'admin.audit.action.eventCancelled',
  admin_users_listed: 'admin.audit.action.usersListed',
  admin_user_viewed: 'admin.audit.action.userViewed',
  admin_user_suspended: 'admin.audit.action.userSuspended',
  admin_user_reactivated: 'admin.audit.action.userReactivated',
  admin_sessions_revoked: 'admin.audit.action.sessionsRevoked',
  admin_audit_listed: 'admin.audit.action.auditListed',
  admin_support_listed: 'admin.audit.action.supportListed',
  admin_support_viewed: 'admin.audit.action.supportViewed',
  support_message_resolved: 'admin.audit.action.supportResolved',
  admin_newsletter_listed: 'admin.audit.action.newsletterListed',
  newsletter_subscription_removed: 'admin.audit.action.newsletterRemoved',
  admin_newsletter_exported: 'admin.audit.action.newsletterExported',
  admin_user_report_exported: 'admin.audit.action.userReportExported',
  admin_all_users_report_exported: 'admin.audit.action.allUsersReportExported',
  cancel_event: 'admin.audit.action.cancel_event',
  suspend_user: 'admin.audit.action.suspend_user',
  reactivate_user: 'admin.audit.action.reactivate_user',
  revoke_sessions: 'admin.audit.action.revoke_sessions',
  create_event: 'admin.audit.action.create_event',
};

const ADMIN_TARGET_KEYS: Record<string, TranslationKey> = {
  admin: 'admin.audit.target.admin',
  event: 'admin.audit.target.event',
  host: 'admin.audit.target.host',
  newsletter_subscription: 'admin.audit.target.newsletter',
  support_message: 'admin.audit.target.support',
};

/** Descreve uma acção em vez de mostrar o código cru da auditoria. */
export function adminActionLabel(action: string, i18n: I18nService): string {
  const key = ADMIN_ACTION_KEYS[action];
  if (key) {
    return i18n.t(key);
  }
  return action
    ? i18n.t('admin.audit.action.unknownDetail', { action })
    : i18n.t('admin.audit.action.unknown');
}

/** Tipo de entidade visado pela acção, em texto legível. */
export function adminTargetLabel(targetType: string, i18n: I18nService): string {
  const key = ADMIN_TARGET_KEYS[targetType];
  return key ? i18n.t(key) : targetType || i18n.t('admin.audit.target.unknown');
}
