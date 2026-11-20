import { mapEventStatus, mapPublicInvitation, mapRsvpStatus } from './invitation.mapper';
import { publicInvitationFixture } from './testing/public-invitation.fixture';

describe('mapPublicInvitation', () => {
  it('expõe prazos, contacto do anfitrião e mensagem do convidado', () => {
    const view = mapPublicInvitation(
      publicInvitationFixture({ message: 'Vou lá estar!', rsvpStatus: 'accepted' }),
    );

    expect(view.event.title).toBe('Casamento da Ana');
    expect(view.event.type).toBe('wedding');
    expect(view.event.hostEmail).toBe('ana@exemplo.ao');
    expect(view.event.hostPhone).toBe('+244923456789');
    expect(view.event.hostAvatarUrl).toBe('https://exemplo.ao/ana.jpg');
    expect(view.event.endsAt).toBe('2027-08-16T01:00:00.000Z');
    expect(view.event.rsvpDeadline).toBe('2027-08-01T22:59:59.000Z');
    expect(view.guest.status).toBe('confirmed');
    expect(view.guest.message).toBe('Vou lá estar!');
  });

  it('aceita eventos sem fim, sem prazo e sem contacto extra', () => {
    const view = mapPublicInvitation(
      publicInvitationFixture({ endsAt: null, rsvpDeadline: null, hostPhone: null }),
    );

    expect(view.event.endsAt).toBeNull();
    expect(view.event.rsvpDeadline).toBeNull();
    expect(view.event.hostPhone).toBeNull();
    expect(view.guest.message).toBeNull();
  });

  it('mapeia o estado agendado para publicado e o RSVP aceite para confirmado', () => {
    expect(mapEventStatus('scheduled')).toBe('published');
    expect(mapEventStatus('cancelled')).toBe('cancelled');
    expect(mapRsvpStatus('accepted')).toBe('confirmed');
    expect(mapRsvpStatus('declined')).toBe('declined');
  });
});
