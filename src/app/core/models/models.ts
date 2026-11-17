export type EventType = 'wedding' | 'birthday' | 'corporate' | 'baby' | 'other';

export type EventStatus = 'draft' | 'published' | 'scheduled' | 'completed' | 'cancelled';

export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

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
  status: EventStatus;
  contributionEnabled: boolean;
  bankDetails: BankDetails | null;
  createdAt: string;
  stats?: EventStats;
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
  kind: string;
  guestName: string | null;
  at: string;
}

export interface WorkspaceTask {
  id: string;
  eventId: string | null;
  label: string;
  done: boolean;
}

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
  emailVerified: boolean;
  profileComplete: boolean;
}
