import { ApiRsvpStatus, PublicEvent, PublicInvitation } from '../../core/api/api.models';
import { EventStatus, RsvpStatus } from '../../core/models/models';
import { normalizeManifest } from '../../core/models/template-manifest';
import { InvitationEventView, InvitationView } from './invitation.models';

/** Converte o DTO público na vista usada pelas peças do convite. */
export function mapPublicInvitation(invitation: PublicInvitation): InvitationView {
  const event = mapPublicEventView(invitation.event);

  return {
    event,
    guest: {
      name: invitation.guest.name,
      email: invitation.guest.email ?? '',
      emailHasAccount: invitation.guest.email_has_account,
      status: mapRsvpStatus(invitation.guest.rsvp_status),
      message: invitation.guest.message ?? null,
      answer: invitation.guest.message_answer?.trim() || null,
      answeredAt: invitation.guest.message_answered_at ?? null,
      guestKind: invitation.guest.guest_kind ?? null,
      companionName: invitation.guest.guest_companion_name ?? null,
      partySize: invitation.guest.guest_party_size ?? null,
    },
    deadlinePassed: invitation.rsvp_deadline_passed,
    countdownDays: countdownDaysUntil(event.startsAt),
  };
}

/** Dias até ao início (0 quando já começou). */
export function countdownDaysUntil(startsAt: string): number {
  return Math.max(0, Math.ceil((new Date(startsAt).getTime() - Date.now()) / 86_400_000));
}

/**
 * Evento público (convite individual ou link aberto do Bloco 10) na vista
 * usada pelas peças do convite.
 */
export function mapPublicEventView(event: PublicEvent): InvitationEventView {
  const location = event.location;
  const contribution = event.contribution;
  return {
    id: event.id,
    title: event.title,
    type: event.category ?? null,
    hostName: event.host_name,
    hostEmail: event.host_email ?? '',
    hostPhone: event.host_phone ?? null,
    hostAvatarUrl: event.host_avatar_url ?? null,
    startsAt: event.starts_at,
    endsAt: event.ends_at ?? null,
    rsvpDeadline: event.rsvp_deadline ?? null,
    timezone: event.timezone,
    venue: location.name ?? '',
    address: location.address ?? '',
    city: '',
    onlineLink: location.type === 'online' ? (location.online_url ?? null) : null,
    message: event.message ?? '',
    rules: event.rules ?? '',
    dressCode: event.dress_code ?? '',
    coverUrl: event.cover_url ?? null,
    templateId: null,
    status: mapEventStatus(event.status),
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
    manifest: normalizeManifest(event.template?.manifest),
    templateSlug: event.template?.slug ?? null,
    youtubeVideoId: event.youtube_video_id ?? null,
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    placeLabel: location.place_label ?? null,
    placeName: location.place_name ?? null,
    organizers: (event.organizers ?? []).map((organizer) => ({
      name: organizer.display_name,
      avatarUrl: organizer.avatar_url,
      role: organizer.role,
      email: organizer.email,
      phone: organizer.phone,
    })),
    community: event.community
      ? {
          name: event.community.name,
          slug: event.community.slug,
          avatarUrl: event.community.avatar_url,
          isPublic: event.community.visibility === 'public',
        }
      : null,
  };
}

export function mapEventStatus(status: PublicInvitation['event']['status']): EventStatus {
  return status === 'scheduled' ? 'published' : (status as EventStatus);
}

export function mapRsvpStatus(status: ApiRsvpStatus): RsvpStatus {
  return status === 'accepted' ? 'confirmed' : status;
}
