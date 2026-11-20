import { DOCUMENT } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-config';
import { apiRequestInterceptor } from '../api/api.interceptor';
import { EventsRepository } from './events.repository';

const BASE = 'http://localhost:3000/api/v1';

describe('EventsRepository · acesso e validade de links', () => {
  let http: HttpTestingController;
  let repository: EventsRepository;

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
    repository = TestBed.inject(EventsRepository);
  });

  afterEach(() => http.verify());

  it('envia a nova validade do convite no formato esperado pelo backend', async () => {
    const promise = repository.updateInvitationLink('evt-1', 'inv-1', '2026-12-20T23:59:59.000Z');
    const request = http.expectOne(
      `${BASE}/host/events/evt-1/invitations/inv-1/link`,
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ expires_at: '2026-12-20T23:59:59.000Z' });
    request.flush({ data: {} });
    await promise;
  });

  it('troca o código do próprio gestor com a sessão de gestão', async () => {
    const promise = repository.rotateOwnManagerAccess();
    const request = http.expectOne(`${BASE}/host/manager/access-code`);
    expect(request.request.method).toBe('POST');
    request.flush({
      data: {
        manager: {
          id: 'mgr-1',
          event_id: 'evt-1',
          email: null,
          phone: '+244900000000',
          display_name: 'Gestor',
          team_id: 'team-1',
          link_expires_at: '2026-11-27T00:00:00.000Z',
          link_revoked_at: null,
          has_account: false,
          last_used_at: null,
          created_at: '2026-11-01T00:00:00.000Z',
          updated_at: '2026-11-20T00:00:00.000Z',
        },
        link: 'https://exemplo.ao/gestao/evento/evt-1?token=abc',
        access_code: 'ABC123',
        invite_email_status: 'not_sent',
      },
    });

    const result = await promise;
    expect(result.accessCode).toBe('ABC123');
    expect(result.link).toContain('/gestao/evento/evt-1');
    expect(result.emailStatus).toBe('not_sent');
  });
});
