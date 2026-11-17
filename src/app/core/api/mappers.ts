import {
  ApiActivity,
  ApiEvent,
  ApiInvitation,
  ApiRsvpStatus,
  ApiTask,
  ApiTemplate,
  EventLocation,
  Host,
} from './api.models';
import {
  BankDetails,
  CreateEventInput,
  EventActivity,
  EventStats,
  EventTemplate,
  Guest,
  GuestInvitation,
  HostEvent,
  HostProfile,
  WorkspaceTask,
} from '../models/models';

/**
 * Mapeadores entre o contrato da API (`snake_case`) e os modelos de vista da
 * aplicação (`camelCase`). Partilhados pelos repositórios em `core/data`.
 */

export interface ApiHostGuest extends ApiInvitation {
  event: Pick<ApiEvent, 'id' | 'title' | 'starts_at' | 'status'>;
}

/**
 * Convite visto pelo convidado em "Meus convites"
 * (`GET /api/v1/host/invitations`).
 */
export interface ApiGuestInvitation {
  id: string;
  event_id: string;
  rsvp_status: ApiRsvpStatus;
  rsvp_responded_at: string | null;
  table_name: string | null;
  invitation_url: string | null;
  invitation_url_expires_at: string | null;
  created_at: string;
  event: Pick<
    ApiEvent,
    | 'id'
    | 'title'
    | 'host_name'
    | 'starts_at'
    | 'timezone'
    | 'location'
    | 'status'
    | 'template_id'
    | 'category'
  >;
}

export interface HostEnvelope {
  host: Host;
}

export function emptyProfile(): HostProfile {
  return {
    name: '',
    email: '',
    phone: null,
    birthDate: null,
    locale: 'pt-AO',
    timezone: 'Africa/Luanda',
    avatarUrl: null,
    emailVerified: false,
    profileComplete: false,
  };
}

export function mapEvent(event: ApiEvent): HostEvent {
  const location = event.location;
  const contribution = event.contribution;
  return {
    id: event.id,
    title: event.title,
    type: event.category,
    hostName: event.host_name,
    hostEmail: event.host_email,
    startsAt: event.starts_at ?? '',
    timezone: event.timezone,
    venue: location.type === 'venue' ? (location.name ?? '') : '',
    city: location.type === 'venue' ? (location.address ?? '') : '',
    onlineLink: location.type === 'online' ? (location.online_url ?? null) : null,
    message: event.message ?? '',
    rules: event.rules ?? '',
    dressCode: event.dress_code ?? '',
    rsvpDeadline: event.rsvp_deadline,
    templateId: event.template_id,
    status: event.status === 'scheduled' ? 'published' : event.status,
    contributionEnabled: contribution.enabled,
    bankDetails:
      contribution.enabled &&
      contribution.bank_name &&
      contribution.account_holder &&
      contribution.account_reference
        ? {
            bankName: contribution.bank_name,
            accountHolder: contribution.account_holder,
            accountReference: contribution.account_reference,
          }
        : null,
    createdAt: event.created_at,
    stats: event.stats
      ? {
          total: event.stats.total_invitations,
          confirmed: event.stats.accepted,
          declined: event.stats.declined,
          pending: event.stats.pending,
          responseRate:
            event.stats.total_invitations === 0
              ? 0
              : Math.round(
                  ((event.stats.accepted + event.stats.declined) / event.stats.total_invitations) *
                    100,
                ),
        }
      : undefined,
  };
}

export function mapInvitation(invitation: ApiInvitation): Guest {
  return {
    id: invitation.id,
    eventId: invitation.event_id,
    name: invitation.guest_name,
    email: invitation.guest_email,
    phone: invitation.guest_phone,
    status: invitation.rsvp_status === 'accepted' ? 'confirmed' : invitation.rsvp_status,
    tableName: invitation.table_name,
    invitationUrl: invitation.invitation_url,
    invitedAt: invitation.created_at,
    respondedAt: invitation.rsvp_responded_at,
  };
}

export function mapGuestInvitation(invitation: ApiGuestInvitation): GuestInvitation {
  const location = invitation.event.location;
  return {
    id: invitation.id,
    eventId: invitation.event_id,
    title: invitation.event.title,
    hostName: invitation.event.host_name,
    startsAt: invitation.event.starts_at,
    timezone: invitation.event.timezone,
    venue: location.type === 'venue' ? (location.name ?? '') : '',
    city: location.type === 'venue' ? (location.address ?? '') : '',
    onlineLink: location.type === 'online' ? (location.online_url ?? null) : null,
    type: invitation.event.category,
    templateId: invitation.event.template_id,
    status: invitation.rsvp_status === 'accepted' ? 'confirmed' : invitation.rsvp_status,
    tableName: invitation.table_name,
    invitationUrl: invitation.invitation_url,
    invitedAt: invitation.created_at,
    respondedAt: invitation.rsvp_responded_at,
  };
}

export function mapActivity(activity: ApiActivity): EventActivity {
  return {
    id: activity.id,
    eventId: activity.event_id,
    kind: activity.kind,
    guestName: activity.guest_name,
    at: activity.at,
  };
}

export function mapTask(task: ApiTask): WorkspaceTask {
  return {
    id: task.id,
    eventId: task.event_id,
    label: task.label,
    done: task.done,
  };
}

export function mapTemplate(template: ApiTemplate): EventTemplate {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    previewImageUrl: template.preview_image_url,
    supportedFields: template.supported_fields,
    themes: template.themes,
  };
}

export function mapProfile(host: Host): HostProfile {
  return {
    name: host.profile.display_name,
    email: host.email,
    phone: host.profile.phone,
    birthDate: host.profile.birth_date,
    locale: host.profile.locale === 'en' ? 'en' : 'pt-AO',
    timezone: host.profile.timezone,
    avatarUrl: host.profile.avatar_url,
    emailVerified: host.email_verified,
    profileComplete: host.profile_complete,
  };
}

export function locationFromInput(input: CreateEventInput): EventLocation {
  if (input.onlineLink) {
    return { type: 'online', online_url: input.onlineLink };
  }
  return {
    type: 'venue',
    name: input.venue,
    address: input.city || null,
  };
}

export function locationFromView(
  current: HostEvent,
  patch: { venue?: string; city?: string },
): EventLocation {
  if (current.onlineLink) {
    return { type: 'online', online_url: current.onlineLink };
  }
  return {
    type: 'venue',
    name: patch.venue ?? current.venue,
    address: patch.city ?? current.city,
  };
}

export function contributionFromInput(input: CreateEventInput): {
  enabled: boolean;
  bank_name?: string;
  account_holder?: string;
  account_reference?: string;
} {
  if (!input.contributionEnabled || !input.bankDetails) {
    return { enabled: false };
  }
  const details: BankDetails = input.bankDetails;
  return {
    enabled: true,
    bank_name: details.bankName,
    account_holder: details.accountHolder,
    account_reference: details.accountReference,
  };
}

export function statsForGuests(guests: Guest[]): EventStats {
  const confirmed = guests.filter((guest) => guest.status === 'confirmed').length;
  const declined = guests.filter((guest) => guest.status === 'declined').length;
  const pending = guests.filter((guest) => guest.status === 'pending').length;
  const total = guests.length;
  return {
    total,
    confirmed,
    declined,
    pending,
    responseRate: total === 0 ? 0 : Math.round(((confirmed + declined) / total) * 100),
  };
}

export function statsForEvents(
  events: HostEvent[],
): EventStats & { events: number; drafts: number; completed: number } {
  const total = events.reduce((sum, event) => sum + (event.stats?.total ?? 0), 0);
  const confirmed = events.reduce((sum, event) => sum + (event.stats?.confirmed ?? 0), 0);
  const declined = events.reduce((sum, event) => sum + (event.stats?.declined ?? 0), 0);
  const pending = events.reduce((sum, event) => sum + (event.stats?.pending ?? 0), 0);
  return {
    events: events.filter((event) => event.status === 'published').length,
    drafts: events.filter((event) => event.status === 'draft').length,
    completed: events.filter((event) => event.status === 'completed').length,
    total,
    confirmed,
    declined,
    pending,
    responseRate: total === 0 ? 0 : Math.round(((confirmed + declined) / total) * 100),
  };
}
