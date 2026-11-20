import { ApiRsvpStatus, PublicInvitation } from '../../core/api/api.models';
import { EventStatus, RsvpStatus } from '../../core/models/models';
import { InvitationView } from './invitation.models';

/** Converte o DTO público na vista usada pelas peças do convite. */
export function mapPublicInvitation(invitation: PublicInvitation): InvitationView {
  const event = invitation.event;
  const location = event.location;
  const contribution = event.contribution;
  const startsAt = event.starts_at;
  const countdownDays = Math.max(
    0,
    Math.ceil((new Date(startsAt).getTime() - Date.now()) / 86_400_000),
  );

  return {
    event: {
      id: event.id,
      title: event.title,
      type: event.category ?? null,
      hostName: event.host_name,
      hostEmail: event.host_email ?? '',
      hostPhone: event.host_phone ?? null,
      hostAvatarUrl: event.host_avatar_url ?? null,
      startsAt,
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
    },
    guest: {
      name: invitation.guest.name,
      email: invitation.guest.email,
      emailHasAccount: invitation.guest.email_has_account,
      status: mapRsvpStatus(invitation.guest.rsvp_status),
      message: invitation.guest.message ?? null,
    },
    deadlinePassed: invitation.rsvp_deadline_passed,
    countdownDays,
  };
}

export function mapEventStatus(status: PublicInvitation['event']['status']): EventStatus {
  return status === 'scheduled' ? 'published' : (status as EventStatus);
}

export function mapRsvpStatus(status: ApiRsvpStatus): RsvpStatus {
  return status === 'accepted' ? 'confirmed' : status;
}
