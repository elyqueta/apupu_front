export type EventType = 'wedding' | 'birthday' | 'corporate' | 'baby' | 'other';

export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export type TemplateId = 'aurora' | 'constellation' | 'waves' | 'silk';

export type Locale = 'pt-AO' | 'en';

export type ThemeMode = 'dark' | 'light' | 'system';

export type IconTone = 'brand' | 'iris' | 'aqua' | 'mint' | 'amber' | 'coral';

export interface BankDetails {
  bankName: string;
  accountName: string;
  iban: string;
}

export interface HostEvent {
  id: string;
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
  templateId: TemplateId;
  status: EventStatus;
  managementToken: string;
  invitationToken: string;
  invitationGuestId: string | null;
  contributionEnabled: boolean;
  bankDetails: BankDetails | null;
  createdAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string | null;
  status: RsvpStatus;
  tableName: string | null;
  invitedAt: string;
  respondedAt: string | null;
}

export interface EventTemplate {
  id: TemplateId;
  tag: string;
  status: 'preview';
}

export interface EventActivity {
  id: string;
  eventId: string;
  kind: 'rsvp-confirmed' | 'rsvp-declined' | 'guest-added' | 'reminder-sent' | 'event-created';
  guestName: string | null;
  at: string;
}

export interface WorkspaceTask {
  id: string;
  eventId: string | null;
  labelKey: string;
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
  templateId: TemplateId;
  contributionEnabled: boolean;
  bankDetails: BankDetails | null;
  guests: GuestInput[];
}

export interface InvitationView {
  event: HostEvent;
  guest: Guest;
  deadlinePassed: boolean;
  countdownDays: number;
}

export type AddGuestResult =
  | { ok: true; guest: Guest }
  | { ok: false; reason: 'duplicate' | 'missing-event' };

export interface HostProfile {
  name: string;
  email: string;
  role: string;
  location: string;
}
