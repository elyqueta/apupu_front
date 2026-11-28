import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiOpenEvent, ApiOpenEventEnvelope } from '../../core/api/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_MANIFEST } from '../../core/models/template-manifest';
import { publicInvitationFixture } from '../invitation/testing/public-invitation.fixture';
import { PublicEventPage } from './public-event.page';

const BASE = 'http://localhost:3000/api/v1';
const SLUG = 'abcDEF123_-x';

function openEvent(overrides: Partial<ApiOpenEvent> = {}): ApiOpenEvent {
  return {
    ...publicInvitationFixture().event,
    rsvp_deadline: null,
    slug: SLUG,
    has_age_restriction: false,
    rsvp_deadline_passed: false,
    template: {
      slug: 'gratitude',
      name: 'Gratitude',
      manifest: {
        ...DEFAULT_MANIFEST,
        ornaments: { ...DEFAULT_MANIFEST.ornaments, frame: 'gratitude' },
      },
    },
    ...overrides,
  };
}

function envelope(overrides: Partial<ApiOpenEventEnvelope> = {}): ApiOpenEventEnvelope {
  return { event: openEvent(), viewer: null, csrf_token: null, ...overrides };
}

function setup(): { fixture: ComponentFixture<PublicEventPage>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [PublicEventPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(PublicEventPage);
  fixture.componentRef.setInput('slug', SLUG);
  fixture.detectChanges();
  return { fixture, http };
}

async function settle(fixture: ComponentFixture<PublicEventPage>): Promise<void> {
  for (let pass = 0; pass < 2; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

function type(fixture: ComponentFixture<PublicEventPage>, testId: string, value: string): void {
  const input = fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
}

function openRsvp(fixture: ComponentFixture<PublicEventPage>): void {
  const native = fixture.nativeElement as HTMLElement;
  (native.querySelector('[data-testid="inv-fab"]') as HTMLButtonElement).click();
  fixture.detectChanges();
  (native.querySelector('[data-testid="public-rsvp-open"]') as HTMLButtonElement).click();
  fixture.detectChanges();
}

describe('PublicEventPage (link aberto)', () => {
  let http: HttpTestingController;

  afterEach(() => {
    try {
      http?.verify();
    } finally {
      // Um pedido por fechar não pode deixar o TestBed configurado: isso
      // impediria o setup() do teste seguinte de o reconfigurar.
      TestBed.resetTestingModule();
    }
  });

  it('confirma presença com nome + telefone e nunca mostra limites de idade', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({
      data: envelope({ event: openEvent({ has_age_restriction: true, attendee_count: 4 }) }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;

    // Sem nome identificado, o cartaz não mostra saudação.
    expect(native.querySelector('[data-testid="gratitude-guest-name"]')).toBeNull();

    // A contagem de confirmados é só do feed: nunca aparece no convite público.
    expect(native.querySelector('[data-testid="public-event-attendees"]')).toBeNull();
    expect(native.textContent).not.toContain('confirmados');
    expect(native.textContent).not.toMatch(/min_age|max_age|Idade mínima|Idade máxima/);

    openRsvp(context.fixture);
    expect(native.querySelector('[data-testid="app-modal"]')).not.toBeNull();
    expect(native.textContent).toContain(TestBed.inject(I18nService).t('block16.rsvp.pending'));

    type(context.fixture, 'public-rsvp-name', 'Rui Costa');
    type(context.fixture, 'public-rsvp-phone', '923456789');
    type(context.fixture, 'public-rsvp-age', '30');
    (native.querySelector('[data-testid="public-rsvp-accept"]') as HTMLButtonElement).click();

    const request = http.expectOne(`${BASE}/public/events/${SLUG}/rsvp`);
    expect(request.request.body).toMatchObject({
      status: 'accepted',
      name: 'Rui Costa',
      phone: '923456789',
      age: 30,
    });
    request.flush({
      data: { event: openEvent(), rsvp: { name: 'Rui Costa', status: 'accepted', responded_at: null } },
    });
    await settle(context.fixture);
    expect(native.querySelector('[data-testid="public-rsvp-success"]')?.textContent).toContain(
      TestBed.inject(I18nService).t('block10.public.answerAccepted'),
    );
    expect(native.querySelector('[data-testid="public-rsvp-open"]')?.textContent).toContain(
      TestBed.inject(I18nService).t('block10.public.change'),
    );
    expect(native.querySelector('[data-testid="gratitude-guest-name"]')?.textContent).toContain(
      TestBed.inject(I18nService).t('invitation.guestGreeting', { name: 'Rui Costa' }),
    );
    expect(native.querySelector('[data-testid="app-modal"]')).toBeNull();
  });

  it('mostra o nome da conta autenticada no cartaz do convite', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({
      data: envelope({
        viewer: {
          name: 'Ana Silva',
          email: 'ana@exemplo.ao',
          phone: null,
          has_birth_date: true,
          rsvp_status: null,
        },
      }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;

    expect(native.querySelector('[data-testid="gratitude-guest-name"]')?.textContent).toContain(
      TestBed.inject(I18nService).t('invitation.guestGreeting', { name: 'Ana Silva' }),
    );
    expect(native.querySelector('[data-testid="gratitude-title"] text')?.textContent).toContain(
      publicInvitationFixture().event.title.toUpperCase(),
    );
  });

  it('sem contacto não envia nada', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({ data: envelope() });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;

    openRsvp(context.fixture);
    type(context.fixture, 'public-rsvp-name', 'Rui Costa');
    (native.querySelector('[data-testid="public-rsvp-accept"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();

    http.expectNone(`${BASE}/public/events/${SLUG}/rsvp`);
    expect(native.querySelector('[data-testid="public-rsvp-error"]')?.textContent).toContain(
      TestBed.inject(I18nService).t('block10.public.contactError'),
    );
  });

  it('a recusa por idade mostra sempre a mensagem genérica', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({
      data: envelope({ event: openEvent({ has_age_restriction: true }) }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;

    openRsvp(context.fixture);
    type(context.fixture, 'public-rsvp-name', 'Rui Costa');
    type(context.fixture, 'public-rsvp-email', 'rui@exemplo.ao');
    type(context.fixture, 'public-rsvp-age', '12');
    (native.querySelector('[data-testid="public-rsvp-accept"]') as HTMLButtonElement).click();

    http.expectOne(`${BASE}/public/events/${SLUG}/rsvp`).flush(
      {
        error: {
          code: 'public_rsvp_refused',
          message: 'Não foi possível confirmar a sua presença neste evento.',
          request_id: 'r1',
        },
      },
      { status: 403, statusText: 'Forbidden' },
    );
    await settle(context.fixture);
    expect(native.querySelector('[data-testid="public-rsvp-error"]')?.textContent?.trim()).toBe(
      TestBed.inject(I18nService).t('block10.public.refused'),
    );
  });

  it('conta sem data de nascimento num evento com restrição não confirma', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({
      data: envelope({
        event: openEvent({ has_age_restriction: true }),
        viewer: { name: 'Conta', email: 'conta@exemplo.ao', phone: null, has_birth_date: false, rsvp_status: null },
        csrf_token: 'csrf',
      }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    openRsvp(context.fixture);
    expect((native.querySelector('[data-testid="public-rsvp-accept"]') as HTMLButtonElement).disabled).toBe(true);
    expect(native.textContent).toContain(TestBed.inject(I18nService).t('block10.public.ageProfileRequired'));
  });

  it('o botão flutuante abre o menu e cada link fecha o menu ao abrir o modal', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({ data: envelope() });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;

    expect(native.querySelector('[data-testid="inv-fab"]')?.getAttribute('aria-expanded')).toBe('false');
    (native.querySelector('[data-testid="inv-fab"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();

    expect(native.querySelector('[data-testid="inv-menu-details"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="inv-drawer-backdrop"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="inv-fab"]')?.getAttribute('aria-expanded')).toBe('true');

    (native.querySelector('[data-testid="inv-menu-locations"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();

    expect(native.querySelector('[data-testid="inv-fab"]')?.getAttribute('aria-expanded')).toBe('false');
    expect(native.querySelector('[data-testid="inv-drawer-backdrop"]')).toBeNull();
    expect(native.querySelector('[data-testid="app-modal"]')).not.toBeNull();
  });

  it('a resposta abre pelo menu e o vídeo fica abaixo do cartaz', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush({
      data: envelope({ event: openEvent({ youtube_video_id: 'dQw4w9WgXcQ' }) }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;

    expect(native.querySelector('[data-testid="public-video"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="public-video-play"]')).not.toBeNull();
    expect(native.querySelector('iframe')).toBeNull();
    (native.querySelector('[data-testid="public-video-play"]') as HTMLButtonElement).click();
    context.fixture.detectChanges();
    expect(native.querySelector('iframe')).not.toBeNull();

    openRsvp(context.fixture);
    expect(native.querySelector('[data-testid="app-modal"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="inv-fab"]')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('slug inexistente mostra o estado "não encontrado"', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/public/events/${SLUG}`).flush(
      { error: { code: 'public_event_not_found', message: 'Evento não encontrado.', request_id: 'r2' } },
      { status: 404, statusText: 'Not Found' },
    );
    await settle(context.fixture);
    expect(context.fixture.nativeElement.querySelector('[data-testid="public-event-not-found"]')).not.toBeNull();
  });
});
