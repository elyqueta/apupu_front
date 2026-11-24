export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    /** Contexto adicional (ex.: lista de tarefas abertas ao remover). */
    details?: unknown;
    request_id: string;
  };
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiPage<T> {
  data: T[];
  pagination: Pagination;
}

export type EventCategory = 'wedding' | 'birthday' | 'corporate' | 'baby' | 'other';
export type ApiEventStatus = 'draft' | 'scheduled' | 'cancelled' | 'completed';
export type ApiRsvpStatus = 'pending' | 'accepted' | 'declined';
/** Papel de quem consulta o evento: proprietário (`host`) ou gestor. */
export type ApiEventAccessRole = 'host' | 'manager';

export interface HostProfileData {
  display_name: string;
  phone: string | null;
  birth_date: string | null;
  locale: string;
  timezone: string;
  avatar_url: string | null;
  cover_url: string | null;
  /** `private` por defeito; um perfil privado não aparece em pesquisas. */
  profile_visibility?: 'public' | 'private';
}

export interface Host {
  id: string;
  email: string;
  email_verified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  profile: HostProfileData;
  profile_complete: boolean;
  missing_fields: string[];
  created_at: string;
}

export interface EventLocation {
  type: 'venue' | 'online';
  name?: string;
  address?: string | null;
  online_url?: string;
  /** Bloco 14: localização exata (ambas ou nenhuma). */
  latitude?: number | null;
  longitude?: number | null;
  place_label?: string | null;
}

export interface EventContribution {
  enabled: boolean;
  bank_name?: string | null;
  account_holder?: string | null;
  account_reference?: string | null;
}

export interface EventStats {
  total_invitations: number;
  accepted: number;
  declined: number;
  pending: number;
}

export interface ApiEvent {
  id: string;
  title: string;
  host_name: string;
  host_email: string;
  category: EventCategory | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  location: EventLocation;
  message: string | null;
  rules: string | null;
  dress_code: string | null;
  template_id: string | null;
  /** Imagem de capa (URL absoluto); `null` quando não tem capa. */
  cover_url: string | null;
  theme: { mode: 'light' | 'dark'; palette: string };
  contribution: EventContribution;
  rsvp_deadline: string | null;
  status: ApiEventStatus;
  /** Bloco 10: `private` (só convites individuais) ou `public` (link aberto). */
  visibility?: 'public' | 'private';
  /** Link aberto do evento; `null` quando é privado. */
  public_url?: string | null;
  show_attendee_count?: boolean;
  /** Limites de idade: só na vista de gestão. */
  min_age?: number | null;
  max_age?: number | null;
  /** Papel de quem consulta o evento; ausente na vista pública. */
  access_role?: ApiEventAccessRole;
  /** Bloco 14: vídeo de convite (só o ID) e mesas. */
  youtube_video_id?: string | null;
  use_tables?: boolean;
  created_at: string;
  updated_at: string;
  stats?: EventStats;
}

export interface ApiInvitation {
  id: string;
  event_id: string;
  guest_name: string;
  /** `null` em confirmações pelo link aberto feitas só com telefone. */
  guest_email: string | null;
  guest_phone: string | null;
  /** `personal` (convite individual) ou `public_link` (link aberto). */
  source?: 'personal' | 'public_link';
  guest_age?: number | null;
  /** Selo "Idade alterada". */
  age_flag?: boolean;
  age_flag_reason?: 'birth_date_changed' | null;
  table_name: string | null;
  /** Mensagem opcional deixada pelo convidado ao responder. */
  guest_message?: string | null;
  rsvp_status: ApiRsvpStatus;
  rsvp_responded_at: string | null;
  send_status: 'pending' | 'queued' | 'sent' | 'failed';
  send_count: number;
  last_sent_at: string | null;
  /** Última vez que o anfitrião abriu o WhatsApp com o link deste convite. */
  whatsapp_shared_at: string | null;
  whatsapp_share_count: number;
  /** Primeira abertura do link do convite; `null` se nunca foi aberto. */
  opened_at: string | null;
  invitation_url: string | null;
  invitation_url_expires_at: string | null;
  created_at: string;
  updated_at: string;
  event?: Pick<ApiEvent, 'id' | 'title' | 'starts_at' | 'status'>;
}

export type ApiManagerInviteStatus = 'queued' | 'failed' | 'not_sent';

export interface ApiEventManager {
  id: string;
  event_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  team_id: string;
  link_expires_at: string | null;
  link_revoked_at: string | null;
  /** `true` quando já existe uma conta verificada com este email. */
  has_account: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiManagerInviteResult {
  manager: ApiEventManager;
  invite_email_status: ApiManagerInviteStatus;
  link?: string;
  access_code?: string;
}

export interface ApiCreateManagerResult extends ApiManagerInviteResult {
  team: ApiTeam;
  link: string;
  access_code: string;
}

/** Gestor na listagem global de equipas (`GET /host/managers`). */
export interface ApiHostEventManager extends ApiEventManager {
  event: {
    id: string;
    title: string;
    starts_at: string | null;
    status: ApiEventStatus;
  };
}

export interface PublicEvent {
  id: string;
  title: string;
  host_name: string;
  /** Contacto mínimo do anfitrião; telefone/avatar podem ser nulos. */
  host_email?: string;
  host_phone?: string | null;
  host_avatar_url?: string | null;
  category?: EventCategory | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: EventLocation;
  message: string | null;
  rules: string | null;
  dress_code: string | null;
  cover_url: string | null;
  theme: { mode: 'light' | 'dark'; palette: string };
  contribution: EventContribution;
  rsvp_deadline: string | null;
  status: ApiEventStatus;
  /** Bloco 14 */
  youtube_video_id?: string | null;
  template?: { slug: string; name: string; manifest: unknown } | null;
  organizers?: ApiOrganizer[];
  community?: { name: string; slug: string; avatar_url: string | null; visibility: string } | null;
}

/** Bloco 14: organizador visível no convite (nunca membros). */
export interface ApiOrganizer {
  display_name: string;
  avatar_url: string | null;
  role: 'owner' | 'manager';
  email: string | null;
  phone: string | null;
}

/** Link aberto de um evento público (`GET /public/events/:slug`, Bloco 10). */
export interface ApiOpenEvent extends PublicEvent {
  slug: string;
  has_age_restriction: boolean;
  rsvp_deadline_passed: boolean;
  /** Só existe quando o anfitrião tornou público o nº de confirmados. */
  attendee_count?: number;
}

export interface ApiOpenEventViewer {
  name: string;
  email: string;
  phone: string | null;
  has_birth_date: boolean;
  rsvp_status: ApiRsvpStatus | null;
}

export interface ApiOpenEventEnvelope {
  event: ApiOpenEvent;
  viewer: ApiOpenEventViewer | null;
  csrf_token: string | null;
}

export interface ApiOpenEventRsvpResult {
  event: ApiOpenEvent;
  rsvp: { name: string; status: ApiRsvpStatus; responded_at: string | null };
}

export interface ApiActivity {
  id: string;
  event_id: string;
  kind: string;
  guest_name: string | null;
  at: string;
  event_title?: string;
}

export type ApiTeamCategory =
  | 'logistica'
  | 'decoracao'
  | 'musica'
  | 'catering'
  | 'rececao'
  | 'outra';
export type ApiTeamMyRole = 'anfitriao' | 'gestor' | 'membro';
export type ApiTeamEventStatus =
  | 'agendado'
  | 'em_curso'
  | 'concluido'
  | 'cancelado'
  | 'rascunho';
export type ApiTeamMemberRole = 'gestor' | 'membro';
export type ApiTeamMemberStatus = 'ativo' | 'convite_pendente' | 'convite_telefone';
export type ApiTeamMemberOrigin = 'convidado' | 'email' | 'telefone';
export type ApiTaskStatus = 'por_fazer' | 'em_curso' | 'concluida';
export type ApiTaskPriority = 'baixa' | 'normal' | 'alta';

/** Pré-visualização de membros devolvida em todas as respostas de equipa. */
export interface ApiTeamMemberPreview {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Equipa com o resumo do evento e o papel da conta autenticada. */
export interface ApiTeam {
  id: string;
  event_id: string;
  event_title: string;
  event_status: ApiTeamEventStatus;
  my_role: ApiTeamMyRole;
  name: string;
  category: ApiTeamCategory;
  description: string | null;
  member_count: number;
  task_count: number;
  completed_task_count: number;
  members_preview: ApiTeamMemberPreview[];
  open_task_count: number;
  /** Bloco 11: comunidade, criador e eventos geridos pela equipa. */
  community_id?: string | null;
  creator_id?: string | null;
  event_ids?: string[];
  event_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiTeamMember {
  id: string;
  team_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  role: ApiTeamMemberRole;
  status: ApiTeamMemberStatus;
  origin: ApiTeamMemberOrigin;
  is_host: boolean;
  open_task_count: number;
  /** `false` → responsável sem acesso ao evento. */
  has_event_access: boolean;
  joined_at: string | null;
  created_at: string;
}

export interface ApiTeamMemberAddRow {
  email: string | null;
  phone?: string | null;
  member_id: string | null;
  status: ApiTeamMemberStatus;
  reason?: string;
}

/** `POST /host/teams/{id}/members` devolve o corpo sem envelope `data`. */
export interface ApiAddTeamMembersResult {
  added: ApiTeamMemberAddRow[];
  pending: ApiTeamMemberAddRow[];
  skipped: ApiTeamMemberAddRow[];
}

export interface ApiUpdateTeamMemberRoleResult {
  member: ApiTeamMember;
  event_manager_id: string | null;
  access_code?: string;
  access_link?: string;
}

export interface ApiDeleteTeamResult {
  deleted: true;
  reassigned_to_team_id: string | null;
  reassigned_tasks: number;
  archived_tasks: number;
}

export interface ApiRemoveTeamMemberResult {
  removed: true;
  reassigned_tasks: number;
}

export interface ApiInviteResendResult {
  send_count: number;
  last_sent_at: string;
  expires_at: string;
}

export interface ApiTask {
  id: string;
  event_id: string | null;
  event_title: string | null;
  team_id: string | null;
  team_name: string | null;
  assignee_member_id: string | null;
  assignee_email: string | null;
  assignee_display_name: string | null;
  /** `false` → mostrar "Responsável sem acesso". */
  assignee_has_access: boolean | null;
  manager_id: string | null;
  manager_email: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: ApiTaskPriority;
  status: ApiTaskStatus;
  created_by_host_id: string | null;
  /** Autor da tarefa (persistente, mesmo sem a conta). */
  created_by_name?: string | null;
  completed_by_member_id: string | null;
  completed_by_name?: string | null;
  completed_at: string | null;
  archived_at: string | null;
  /** @deprecated Use `title`. */
  label: string;
  /** @deprecated Use `status === 'concluida'`. */
  done: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiNotification {
  id: string;
  event_id: string | null;
  event_title: string | null;
  activity_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ApiNotificationPage extends ApiPage<ApiNotification> {
  unread_count: number;
}

export interface ApiTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  supported_fields: string[];
  themes: Array<{ mode: 'light' | 'dark'; palette: string }>;
  is_active: boolean;
  kind?: 'system' | 'user';
  manifest?: unknown;
}

export interface PublicInvitation {
  event: PublicEvent;
  guest: {
    name: string;
    email: string;
    /** `true` quando o email do convite já tem conta registada. */
    email_has_account: boolean;
    /** Mensagem opcional deixada ao responder. */
    message?: string | null;
    /** Resposta do anfitrião à mensagem do convidado. */
    message_answer?: string | null;
    /** Data em que a resposta foi enviada. */
    message_answered_at?: string | null;
    rsvp_status: ApiRsvpStatus;
    rsvp_responded_at: string | null;
  };
  rsvp_deadline_passed: boolean;
  csrf_token?: string;
}

export interface DashboardData {
  next_event: ApiEvent | null;
  upcoming: ApiEvent[];
  totals: {
    events: number;
    drafts: number;
    scheduled: number;
    cancelled: number;
    completed: number;
    total_invitations: number;
    accepted: number;
    declined: number;
    pending: number;
  };
}

export interface ReportSummary {
  events: Array<{
    event_id: string;
    title: string;
    status: ApiEventStatus;
    total_invitations: number;
    accepted: number;
    declined: number;
    pending: number;
  }>;
  totals: {
    total_invitations: number;
    accepted: number;
    declined: number;
    pending: number;
    response_rate: number;
    acceptance_rate: number;
  };
}

export interface CreateEventRequest {
  event: {
    title: string;
    host_name: string;
    host_email: string;
    category: EventCategory;
    starts_at: string;
    ends_at?: string;
    timezone: string;
    location: EventLocation;
    message: string;
    rules?: string;
    dress_code?: string;
    template_id: string | null;
    theme: { mode: 'light' | 'dark'; palette: string };
    contribution: EventContribution;
    rsvp_deadline?: string | null;
    cover_url?: string | null;
    visibility?: 'public' | 'private';
    show_attendee_count?: boolean;
    min_age?: number | null;
    max_age?: number | null;
    community_id?: string | null;
    youtube_video_id?: string | null;
    use_tables?: boolean;
  };
  guests: Array<{
    name: string;
    email: string;
    phone?: string | null;
    table_name?: string | null;
  }>;
}

export interface CreateEventResult {
  event: ApiEvent;
  manage_email_status: 'queued' | 'failed';
  deliveries: Array<{ email: string; status: 'queued' }>;
}
