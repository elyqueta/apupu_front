export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
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

export interface HostProfileData {
  display_name: string;
  phone: string | null;
  birth_date: string | null;
  locale: string;
  timezone: string;
  avatar_url: string | null;
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
  theme: { mode: 'light' | 'dark'; palette: string };
  contribution: EventContribution;
  rsvp_deadline: string | null;
  status: ApiEventStatus;
  created_at: string;
  updated_at: string;
  stats?: EventStats;
}

export interface ApiInvitation {
  id: string;
  event_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  table_name: string | null;
  rsvp_status: ApiRsvpStatus;
  rsvp_responded_at: string | null;
  send_status: 'pending' | 'queued' | 'sent' | 'failed';
  send_count: number;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
  event?: Pick<ApiEvent, 'id' | 'title' | 'starts_at' | 'status'>;
}

export interface PublicEvent {
  id: string;
  title: string;
  host_name: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location: EventLocation;
  message: string | null;
  rules: string | null;
  dress_code: string | null;
  theme: { mode: 'light' | 'dark'; palette: string };
  contribution: EventContribution;
  rsvp_deadline: string | null;
  status: ApiEventStatus;
}

export interface ApiActivity {
  id: string;
  event_id: string;
  kind: string;
  guest_name: string | null;
  at: string;
  event_title?: string;
}

export interface ApiTask {
  id: string;
  event_id: string | null;
  label: string;
  done: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface PublicInvitation {
  event: PublicEvent;
  guest: {
    name: string;
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
