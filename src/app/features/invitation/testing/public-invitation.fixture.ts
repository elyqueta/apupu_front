import { ApiEventStatus, ApiRsvpStatus, PublicInvitation } from '../../../core/api/api.models';

export interface InvitationFixtureOverrides {
  rsvpStatus?: ApiRsvpStatus;
  message?: string | null;
  deadlinePassed?: boolean;
  endsAt?: string | null;
  rsvpDeadline?: string | null;
  hostPhone?: string | null;
  coverUrl?: string | null;
  status?: ApiEventStatus;
  messageAnswer?: string | null;
  messageAnsweredAt?: string | null;
}

/** DTO público mínimo, alinhado com `PublicInvitation` do backend. */
export function publicInvitationFixture(
  overrides: InvitationFixtureOverrides = {},
): PublicInvitation {
  return {
    event: {
      id: 'event-1',
      title: 'Casamento da Ana',
      host_name: 'Ana',
      host_email: 'ana@exemplo.ao',
      host_phone: 'hostPhone' in overrides ? overrides.hostPhone ?? null : '+244923456789',
      host_avatar_url: 'https://exemplo.ao/ana.jpg',
      category: 'wedding',
      starts_at: '2027-08-15T17:00:00.000Z',
      ends_at: 'endsAt' in overrides ? overrides.endsAt ?? null : '2027-08-16T01:00:00.000Z',
      timezone: 'Africa/Luanda',
      location: {
        type: 'venue',
        name: 'Salão Principal',
        address: 'Luanda',
        online_url: undefined,
      },
      message: 'Celebramos juntos.',
      rules: 'Traje formal.',
      dress_code: 'Formal',
      cover_url: 'coverUrl' in overrides ? overrides.coverUrl ?? null : null,
      theme: { mode: 'dark', palette: 'default' },
      contribution: { enabled: false },
      rsvp_deadline:
        'rsvpDeadline' in overrides ? overrides.rsvpDeadline ?? null : '2027-08-01T22:59:59.000Z',
      status: overrides.status ?? 'scheduled',
    },
    guest: {
      name: 'João',
      email: 'joao@exemplo.ao',
      email_has_account: true,
      rsvp_status: overrides.rsvpStatus ?? 'pending',
      rsvp_responded_at: null,
      message: 'message' in overrides ? overrides.message ?? null : null,
      message_answer: overrides.messageAnswer ?? null,
      message_answered_at: overrides.messageAnsweredAt ?? null,
    },
    rsvp_deadline_passed: overrides.deadlinePassed ?? false,
    csrf_token: 'csrf-token',
  };
}
