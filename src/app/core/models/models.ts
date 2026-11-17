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
  createdAt: string;
  stats?: EventStats;
}

/**
 * Gestor de um evento, identificado pelo email. Pode não ter conta: nesse
 * caso usa o link enviado por email.
 */
export interface EventManager {
  id: string;
  eventId: string;
  email: string;
  /** `true` quando já existe uma conta verificada com este email. */
  hasAccount: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ManagerInviteResult {
  manager: EventManager;
  emailStatus: 'queued' | 'failed';
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
  timezone: string;
  venue: string;
  city: string;
  onlineLink: string | null;
  message: string;
  rules: string;
  dressCode: string;
  rsvpDeadline: string | null;
  templateId: TemplateId | null;
  contributionEnabled: boolean;
  bankDetails: BankDetails | null;
  guests: GuestInput[];
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
}
