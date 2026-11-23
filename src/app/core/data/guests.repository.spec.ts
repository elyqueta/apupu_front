import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { apiRequestInterceptor } from '../api/api.interceptor';
import { ApiInvitation } from '../api/api.models';
import { mapInvitation } from '../api/mappers';
import { GuestsRepository, toApiRsvpStatus } from './guests.repository';

const BASE = 'http://localhost:3000/api/v1';

function invitationFixture(): ApiInvitation {
  return {
    id: 'inv-1',
    event_id: 'evt-1',
    guest_name: 'Ana',
    guest_email: 'ana@exemplo.ao',
    guest_phone: '+244900000000',
    table_name: 'Mesa 2',
    rsvp_status: 'accepted',
    rsvp_responded_at: null,
    send_status: 'sent',
    send_count: 1,
    last_sent_at: null,
    whatsapp_shared_at: null,
    whatsapp_share_count: 0,
    opened_at: null,
    invitation_url: 'https://exemplo.ao/convite/abc',
    invitation_url_expires_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('GuestsRepository · listPage', () => {
  let http: HttpTestingController;
  let repository: GuestsRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        { provide: DOCUMENT, useValue: { cookie: '' } },
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    repository = TestBed.inject(GuestsRepository);
  });

  afterEach(() => http.verify());

  it('sends q, event, status and pagination to the API', async () => {
    const promise = repository.listPage({
      event_id: 'evt-1',
      status: 'confirmed',
      q: 'ana',
      page: 2,
      page_size: 10,
    });
    const request = http.expectOne((candidate) => candidate.url.endsWith('/host/guests'));
    expect(request.request.params.get('event_id')).toBe('evt-1');
    expect(request.request.params.get('rsvp_status')).toBe('accepted');
    expect(request.request.params.get('q')).toBe('ana');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('10');
    request.flush({
      data: [{ ...invitationFixture(), event: { id: 'evt-1', title: 'Festa', starts_at: null, status: 'scheduled' } }],
      pagination: { page: 2, page_size: 10, total: 11, total_pages: 2 },
    });

    const result = await promise;
    expect(result.items[0].guest.name).toBe('Ana');
    expect(result.items[0].event.title).toBe('Festa');
    expect(result.pagination.total).toBe(11);
  });

  it('regista a partilha no WhatsApp de um convite individual', async () => {
    const guest = mapInvitation(invitationFixture());
    const sharedAt = '2026-11-23T10:00:00.000Z';
    const promise = repository.markWhatsappShared(guest);
    const request = http.expectOne((candidate) =>
      candidate.url.endsWith('/host/events/evt-1/invitations/inv-1/whatsapp-shared'),
    );
    expect(request.request.method).toBe('POST');
    request.flush({
      data: {
        ...invitationFixture(),
        whatsapp_shared_at: sharedAt,
        whatsapp_share_count: 1,
      },
    });

    const updated = await promise;
    expect(updated.whatsappSharedAt).toBe(sharedAt);
    expect(updated.whatsappShareCount).toBe(1);
  });

  it('maps UI status to the API rsvp_status', () => {
    expect(toApiRsvpStatus('all')).toBeUndefined();
    expect(toApiRsvpStatus('confirmed')).toBe('accepted');
    expect(toApiRsvpStatus('pending')).toBe('pending');
    expect(toApiRsvpStatus('declined')).toBe('declined');
  });
});
