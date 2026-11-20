import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { I18nService } from '../../core/i18n/i18n.service';
import { InvitationPage } from './invitation.page';
import { publicInvitationFixture } from './testing/public-invitation.fixture';

const BASE = 'http://localhost:3000/api/v1';
const TOKEN = 'individual-invitation-token';

function setup(): { fixture: ComponentFixture<InvitationPage>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [InvitationPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(InvitationPage);
  fixture.componentRef.setInput('token', TOKEN);
  fixture.detectChanges();
  return { fixture, http };
}

async function settle(fixture: ComponentFixture<InvitationPage>): Promise<void> {
  // O carregamento é disparado por um effect; a estabilização e a
  // deteção de alterações precisam de dois ciclos para refletir o resultado.
  for (let pass = 0; pass < 2; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

function typeRsvpMessage(fixture: ComponentFixture<InvitationPage>, value: string): void {
  const textarea = fixture.nativeElement.querySelector(
    '[data-testid="invitation-rsvp-message"]',
  ) as HTMLTextAreaElement;
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

describe('InvitationPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('envia a mensagem opcional no RSVP e fecha o modal de confirmação', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;

    http.expectOne(path).flush({ data: publicInvitationFixture() });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="invitation-accept"]') as HTMLButtonElement).click();
    await settle(context.fixture);

    typeRsvpMessage(context.fixture, 'Mal vou esperar!');
    (native.querySelector('[data-testid="invitation-rsvp-confirm"]') as HTMLButtonElement).click();

    const request = http.expectOne(`${path}/rsvp`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ status: 'accepted', message: 'Mal vou esperar!' });

    request.flush({
      data: publicInvitationFixture({ rsvpStatus: 'accepted', message: 'Mal vou esperar!' }),
    });
    await settle(context.fixture);

    expect(native.querySelector('[data-testid="invitation-rsvp-confirm"]')).toBeNull();
    expect(
      native.querySelector('[data-testid="invitation-rsvp-status"]')?.textContent,
    ).toContain(TestBed.inject(I18nService).t('invitation.alreadyConfirmed'));
  });

  it('mostra sempre a mesma mensagem genérica para links inválidos, expirados ou revogados', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;
    const error = {
      error: {
        code: 'invitation_not_found',
        message: 'Convite não encontrado.',
        request_id: 'req-1',
      },
    };

    http.expectOne(path).flush(error, { status: 404, statusText: 'Not Found' });
    await settle(context.fixture);
    http.expectOne(`${path}/claim`).flush(error, { status: 404, statusText: 'Not Found' });
    await settle(context.fixture);

    const text = (context.fixture.nativeElement as HTMLElement).textContent ?? '';
    const expected = TestBed.inject(I18nService).t('invitation.inactiveText');
    expect(text).toContain(expected);
    expect(text).not.toContain(error.error.message);
    expect(text).not.toContain('expirado');
  });
});
