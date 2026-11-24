import { TemplateManifest } from './template-manifest';

export type EventType = 'wedding' | 'birthday' | 'corporate' | 'baby' | 'other';

export type EventStatus = 'draft' | 'published' | 'scheduled' | 'completed' | 'cancelled';

export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

/** Papel de quem consulta o evento: proprietário (`host`) ou gestor. */
export type EventAccessRole = 'host' | 'manager';

export type TemplateId = string;

export type Locale = 'pt-AO' | 'en';

export type ThemeMode = 'dark' | 'light' | 'system';

export type IconTone = 'brand' | 'iris' | 'aqua' | 'mint' | 'amber' | 'coral';

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountReference: string;
}

export interface HostEvent {
  id: string;
  title: string;
  type: EventType | null;
  hostName: string;
  hostEmail: string;
  startsAt: string;
  /** Fim do evento, quando definido. */
  endsAt?: string | null;
  timezone: string;
  venue: string;
  city: string;
  onlineLink: string | null;
  message: string;
  rules: string;
  dressCode: string;
  rsvpDeadline: string | null;
  templateId: TemplateId | null;
  /** Imagem de capa (URL absoluto); `null` quando não tem capa. */
  coverUrl: string | null;
  status: EventStatus;
  contributionEnabled: boolean;
  bankDetails: BankDetails | null;
  /** Papel de quem consulta o evento: o anfitrião ou um gestor. */
  accessRole: EventAccessRole;
  /** Bloco 10: privado (só convites individuais) ou público (link aberto). */
  visibility: EventVisibility;
  /** Link aberto do evento; `null` quando é privado. */
  publicUrl: string | null;
  /** O nº de confirmados só aparece no link aberto quando permitido. */
  showAttendeeCount: boolean;
  /** Limites de idade (opcionais); nunca mostrados publicamente. */
  minAge: number | null;
  maxAge: number | null;
  createdAt: string;
  stats?: EventStats;
}

export type EventVisibility = 'public' | 'private';

/**
 * Gestor de um evento, identificado pelo email. Pode não ter conta: nesse
 * caso usa o link enviado por email.
 */
export type ManagerInviteStatus = 'queued' | 'failed' | 'not_sent';

export interface EventManager {
  id: string;
  eventId: string;
  teamId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  linkExpiresAt: string | null;
  linkRevokedAt: string | null;
  /** `true` quando já existe uma conta verificada com este email. */
  hasAccount: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ManagerInviteResult {
  manager: EventManager;
  emailStatus: ManagerInviteStatus;
  link?: string;
  accessCode?: string;
}

export interface CreateManagerInput {
  teamName: string;
  teamCategory: TeamCategory;
  teamDescription: string | null;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  /** `null` → validade por defeito de 7 dias. */
  linkExpiresAt: string | null;
}

export interface ManagerCreationResult {
  manager: EventManager;
  team: Team;
  link: string;
  accessCode: string;
  emailStatus: ManagerInviteStatus;
}

export interface TeamMemberContact {
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** Evento a que um gestor pertence, na página global de equipas. */
export interface TeamEventSummary {
  id: string;
  title: string;
  startsAt: string | null;
  status: EventStatus;
}

/** Gestor de um dos eventos da conta (`GET /host/managers`). */
export interface TeamManager extends EventManager {
  event: TeamEventSummary;
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string | null;
  status: RsvpStatus;
  tableName: string | null;
  /** URL absoluto para partilhar; `null` quando o convite foi revogado. */
  invitationUrl: string | null;
  /** Primeira abertura do link do convite; `null` se nunca foi aberto. */
  openedAt: string | null;
  /** Última partilha iniciada no WhatsApp; não confirma envio nem leitura. */
  whatsappSharedAt: string | null;
  whatsappShareCount: number;
  /** Origem: convite individual ou confirmação pelo link aberto do evento. */
  source: 'personal' | 'public_link';
  /** Selo "Idade alterada": confirmou depois de mudar a data de nascimento. */
  ageFlag: boolean;
  /** Mensagem opcional deixada ao responder ao convite. */
  message?: string | null;
  invitedAt: string;
  respondedAt: string | null;
}

/**
 * Perspetiva do convidado: um evento para o qual a conta autenticada foi
 * convidada (por oposição a `HostEvent`, que é um evento que a conta organiza).
 */
export interface GuestInvitation {
  id: string;
  eventId: string;
  title: string;
  hostName: string;
  startsAt: string | null;
  timezone: string;
  venue: string;
  city: string;
  onlineLink: string | null;
  type: EventType | null;
  templateId: TemplateId | null;
  /** Imagem de capa do evento, quando o anfitrião definiu uma. */
  coverUrl: string | null;
  status: RsvpStatus;
  tableName: string | null;
  /** Link individual do convite; `null` quando ainda não está disponível. */
  invitationUrl: string | null;
  invitedAt: string;
  respondedAt: string | null;
}

export interface EventTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  previewImageUrl: string | null;
  supportedFields: string[];
  themes: Array<{ mode: 'light' | 'dark'; palette: string }>;
  /** Bloco 14: aparência, abertura e PDF. */
  manifest: TemplateManifest;
}

export interface EventActivity {
  id: string;
  eventId: string;
  /** Título do evento; presente nas listagens globais. */
  eventTitle: string | null;
  kind: string;
  guestName: string | null;
  at: string;
}

export interface WorkspaceTask {
  id: string;
  eventId: string | null;
  /** Título do evento associado (quando existe). */
  eventTitle: string | null;
  /** Gestor a quem a tarefa está atribuída; `null` para tarefas do anfitrião. */
  managerId: string | null;
  managerEmail: string | null;
  label: string;
  done: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Vista completa da tarefa para o detalhe (autor, responsável, prazo…). */
  detail: TeamTask;
}

/** Tipos de notificação in-app gerados a partir de atividades e lembretes. */
export type NotificationKind =
  | 'rsvp_accepted'
  | 'rsvp_declined'
  | 'guest_added'
  | 'reminder_sent'
  | 'event_created'
  | 'event_upcoming'
  | 'rsvp_deadline'
  | 'task_assigned'
  | 'task_completed';

export interface HostNotification {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  activityId: string | null;
  kind: NotificationKind;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export type NotificationStatus = 'all' | 'unread' | 'read';

export interface EventStats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  responseRate: number;
}

export interface GuestInput {
  name: string;
  email: string;
  phone: string | null;
}

export interface CreateEventInput {
  title: string;
  type: EventType;
  hostName: string;
  hostEmail: string;
  startsAt: string;
  /** Fim opcional do evento (deve ser posterior a `startsAt`). */
  endsAt?: string | null;
  timezone: string;
  venue: string;
  city: string;
  onlineLink: string | null;
  message: string;
  rules: string;
  dressCode: string;
  rsvpDeadline: string | null;
  templateId: TemplateId | null;
  /** URL da capa definida na criação; `null` usa a arte do modelo. */
  coverUrl: string | null;
  contributionEnabled: boolean;
  bankDetails: BankDetails | null;
  guests: GuestInput[];
  visibility?: EventVisibility;
  showAttendeeCount?: boolean;
  minAge?: number | null;
  maxAge?: number | null;
  /** Bloco 11: evento da comunidade (`null` = pessoal). */
  communityId?: string | null;
}

export interface AddGuestResult {
  ok: true;
  guest: Guest;
}

export interface HostProfile {
  name: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  locale: Locale;
  timezone: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  emailVerified: boolean;
  profileComplete: boolean;
  /** Privado por defeito: um perfil privado não aparece em pesquisas. */
  profileVisibility: 'public' | 'private';
}

/* ------------------------------------------------------------------ */
/* Equipas, membros e tarefas por equipa (Fase 4)                      */
/* ------------------------------------------------------------------ */

export type TeamCategory =
  | 'logistica'
  | 'decoracao'
  | 'musica'
  | 'catering'
  | 'rececao'
  | 'outra';

/** Papel da conta autenticada **na equipa**. */
export type TeamMyRole = 'anfitriao' | 'gestor' | 'membro';

/** Estado observável do evento, derivado de `status` e das datas. */
export type TeamEventStatus =
  | 'agendado'
  | 'em_curso'
  | 'concluido'
  | 'cancelado'
  | 'rascunho';

export type TeamMemberRole = 'gestor' | 'membro';
export type TeamMemberStatus = 'ativo' | 'convite_pendente' | 'convite_telefone';
export type TeamMemberOrigin = 'convidado' | 'email' | 'telefone';

export type TaskStatus = 'por_fazer' | 'em_curso' | 'concluida';
export type TaskPriority = 'baixa' | 'normal' | 'alta';

/** Membro mostrado no cartão da equipa (sem emails, até 4 entradas). */
export interface TeamMemberPreview {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface Team {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStatus: TeamEventStatus;
  myRole: TeamMyRole;
  name: string;
  category: TeamCategory;
  description: string | null;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  membersPreview: TeamMemberPreview[];
  openTaskCount: number;
  /** Bloco 11: comunidade da equipa (`null` = sem comunidade). */
  communityId: string | null;
  /** Conta que criou a equipa (só ela associa outros eventos). */
  creatorId: string | null;
  /** Eventos geridos pela equipa (inclui o principal). */
  eventIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  origin: TeamMemberOrigin;
  isHost: boolean;
  openTaskCount: number;
  /** `false` → responsável sem acesso ao evento. */
  hasEventAccess: boolean;
  joinedAt: string | null;
  createdAt: string;
}

export interface TeamMemberAddRow {
  email: string | null;
  phone: string | null;
  memberId: string | null;
  status: TeamMemberStatus;
  reason?: string;
}

export interface AddTeamMembersResult {
  added: TeamMemberAddRow[];
  pending: TeamMemberAddRow[];
  skipped: TeamMemberAddRow[];
}

export interface UpdateTeamMemberRoleResult {
  member: TeamMember;
  eventManagerId: string | null;
  accessCode?: string;
  accessLink?: string;
}

export interface DeleteTeamResult {
  deleted: true;
  reassignedToTeamId: string | null;
  reassignedTasks: number;
  archivedTasks: number;
}

export interface RemoveTeamMemberResult {
  removed: true;
  reassignedTasks: number;
}

export interface InviteResendResult {
  sendCount: number;
  lastSentAt: string;
  expiresAt: string;
}

export interface TeamTask {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  teamId: string | null;
  teamName: string | null;
  assigneeMemberId: string | null;
  assigneeEmail: string | null;
  assigneeDisplayName: string | null;
  /** `false` → responsável sem acesso ao evento. */
  assigneeHasAccess: boolean | null;
  title: string;
  description: string | null;
  /** Dia de calendário `YYYY-MM-DD`, sem hora nem fuso. */
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdByHostId: string | null;
  /** Nome de quem criou a tarefa (persistente). */
  createdByName: string | null;
  completedByMemberId: string | null;
  /** Nome de quem concluiu a tarefa. */
  completedByName: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */

/**
 * Permissões do painel de um evento. Derivadas apenas de
 * `apupu_back/docs/API-CONTRACT.md:573–585` e do middleware das rotas;
 * nunca de uma suposição sobre o papel de quem está a ver a página.
 */
export interface EventPermissions {
  /** Editar dados do evento (não inclui `status`/`host_email`). */
  canEditEvent: boolean;
  /** Adicionar convidados. */
  canManageGuests: boolean;
  /** Criar/editar equipas e tarefas. */
  canManageTeams: boolean;
  /** Criar/gerir gestores e os respetivos links/códigos. */
  canManageManagers: boolean;
  /** Exportar relatórios e documentos. */
  canExport: boolean;
  /** Cancelar ou apagar o evento. */
  canCancelEvent: boolean;
  /* Ações reservadas que o contrato não inclui nos booleanos acima. */
  canChangeEventStatus: boolean;
  canEditExistingGuests: boolean;
  canDeleteActivity: boolean;
  canManageTasks: boolean;
  canResendManageLink: boolean;
}

/** Anfitrião: todas as ações do contrato. */
export function hostPermissions(): EventPermissions {
  return {
    canEditEvent: true,
    canManageGuests: true,
    canManageTeams: true,
    canManageManagers: true,
    canExport: true,
    canCancelEvent: true,
    canChangeEventStatus: true,
    canEditExistingGuests: true,
    canDeleteActivity: true,
    canManageTasks: true,
    canResendManageLink: true,
  };
}

/**
 * Gestor por link: apenas o que o contrato e o middleware permitem.
 * `contractData` é o dado devolvido pela API (`access_role`); quando ausente,
 * assume-se o papel de gestor (o mais restritivo).
 */
export function managerPermissions(
  contractData: { accessRole?: EventAccessRole | null } = { accessRole: 'manager' },
): EventPermissions {
  if (contractData.accessRole === 'host') {
    return hostPermissions();
  }
  return {
    canEditEvent: true,
    canManageGuests: true,
    canManageTeams: false,
    canManageManagers: false,
    canExport: false,
    canCancelEvent: false,
    canChangeEventStatus: false,
    canEditExistingGuests: false,
    canDeleteActivity: false,
    canManageTasks: false,
    canResendManageLink: false,
  };
}

/** Fábrica única usada pelas duas páginas do painel do evento. */
export function eventPermissionsFor(accessRole: EventAccessRole): EventPermissions {
  return accessRole === 'host' ? hostPermissions() : managerPermissions({ accessRole });
}
