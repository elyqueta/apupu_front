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
    try {
      http?.verify();
    } finally {
      TestBed.resetTestingModule();
      vi.restoreAllMocks();
    }
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
      native.querySelector('[data-testid="invitation-rsvp-status"]')?.textContent ?? '',
    ).toContain(TestBed.inject(I18nService).t('invitation.alreadyConfirmed'));
  });

  it('mantém as boas-vindas com capa e abre o cartaz com o nome do convidado ao continuar', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;
    const fixture = publicInvitationFixture({ coverUrl: 'https://exemplo.ao/capa.jpg' });
    fixture.event.template = {
      slug: 'gratitude',
      name: 'Gratitude',
      manifest: {
        version: 1,
        palette: { bg: '#FFFDF8', surface: '#FFFFFF', ink: '#111111', accent: '#B8913A', muted: '#8A7A5C' },
        fonts: { display: 'serif', body: 'sans' },
        ornaments: { frame: 'gratitude', corners: 'floral', divider: 'flourish' },
        layout: { align: 'center', blocks: ['title'] },
        cover: 'framed',
        open_style: 'envelope',
        pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
      },
    };

    http.expectOne(path).flush({ data: fixture });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const welcome = native.querySelector('[data-testid="invitation-welcome"]');
    expect(welcome?.getAttribute('data-open-style')).toBe('envelope');
    expect(welcome?.textContent).toContain('João');
    expect(native.querySelector('.inv-stage-poster')).toBeNull();

    (native.querySelector('[data-testid="invitation-welcome-continue"]') as HTMLButtonElement).click();
    await settle(context.fixture);

    expect(native.querySelector('[data-testid="invitation-welcome-cover"]')).toBeNull();
    expect(native.querySelector('.inv-stage-poster')).not.toBeNull();
    expect(native.querySelector('[data-testid="gratitude-guest-name"]')?.textContent).toContain('João');
    expect(native.querySelector('[data-testid="inv-fab"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="invitation-accept"]')).not.toBeNull();
  });

  it('abre diretamente o convite quando não há capa', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;

    http.expectOne(path).flush({ data: publicInvitationFixture() });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="invitation-welcome-cover"]')).toBeNull();
    expect(native.querySelector('.inv-stage-poster')).not.toBeNull();
    expect(native.querySelector('[data-testid="template-guest-name"]')?.textContent).toContain('João');
    expect(native.querySelector('[data-testid="inv-fab"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="invitation-accept"]')).not.toBeNull();
  });

  it('abre o vídeo num modal próprio e mantém organizadores na folha de informações', async () => {
    const context = setup();
    http = context.http;
    const fixture = publicInvitationFixture();
    fixture.event.template = {
      slug: 'marfim-dourado',
      name: 'Marfim',
      manifest: {
        version: 1,
        palette: { bg: '#FBF7EF', surface: '#FFFDF8', ink: '#3A2F1E', accent: '#B8913A', muted: '#8A7A5C' },
        fonts: { display: 'script', body: 'serif' },
        ornaments: { frame: 'thin-gold', corners: 'floral', divider: 'flourish' },
        layout: { align: 'center', blocks: ['title'] },
        cover: 'framed',
        open_style: 'envelope',
        pdf: { frame: 'double', qr_position: 'bottom-center', show_ornaments: true },
      },
    };
    fixture.event.youtube_video_id = 'dQw4w9WgXcQ';
    fixture.event.organizers = [
      { display_name: 'Ana', avatar_url: null, role: 'owner', email: 'ana@exemplo.ao', phone: '923456789' },
    ];
    http.expectOne(`${BASE}/public/invitations/${TOKEN}`).flush({ data: fixture });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="invitation-welcome"]')).not.toBeNull();
    (native.querySelector('[data-testid="invitation-welcome-continue"]') as HTMLButtonElement).click();
    await settle(context.fixture);
    expect(native.querySelector('.inv-stage-poster')).not.toBeNull();

    (native.querySelector('[data-testid="inv-fab"]') as HTMLButtonElement).click();
    await settle(context.fixture);
    expect(native.querySelector('.inv-drawer-open')).not.toBeNull();
    (native.querySelector('[data-testid="inv-menu-video"]') as HTMLButtonElement).click();
    await settle(context.fixture);

    expect(native.querySelector('[data-testid="inv-video-modal"]')).not.toBeNull();
    expect(native.querySelector('iframe')).toBeNull();
    (native.querySelector('[data-testid="inv-video-play"]') as HTMLButtonElement).click();
    await settle(context.fixture);
    const iframe = native.querySelector('[data-testid="inv-video-modal"] iframe');
    expect(iframe?.getAttribute('src')).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');

    const close = native.querySelector(
      `[data-testid="app-modal"] button[aria-label="${TestBed.inject(I18nService).t('common.close')}"]`,
    ) as HTMLButtonElement | null;
    close?.click();
    await settle(context.fixture);
    (native.querySelector('[data-testid="inv-fab"]') as HTMLButtonElement).click();
    (native.querySelector('[data-testid="inv-menu-details"]') as HTMLButtonElement).click();
    await settle(context.fixture);
    expect(native.querySelector('[data-testid="inv-section-organizers"]')?.textContent).toContain('Ana');
  });

  it('mostra apenas o estado de cancelado num evento cancelado', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;

    http.expectOne(path).flush({
      data: publicInvitationFixture({
        coverUrl: 'https://exemplo.ao/capa.jpg',
        status: 'cancelled',
      }),
    });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="invitation-cancelled"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="invitation-welcome-cover"]')).toBeNull();
    expect(native.querySelector('[data-testid="invitation-accept"]')).toBeNull();
    expect(native.textContent).toContain(
      TestBed.inject(I18nService).t('invitation.cancelledTitle'),
    );
  });

  it('mostra a resposta do anfitrião no convite quando existe', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;

    http.expectOne(path).flush({
      data: publicInvitationFixture({
        message: 'Posso levar um amigo?',
        messageAnswer: 'Claro, é bem-vindo!',
        messageAnsweredAt: '2026-11-20T10:00:00.000Z',
      }),
    });
    await settle(context.fixture);

    const native = context.fixture.nativeElement as HTMLElement;
    const reply = native.querySelector('[data-testid="invitation-host-reply"]');
    expect(reply).not.toBeNull();
    expect(reply?.textContent).toContain('Claro, é bem-vindo!');
    expect(reply?.textContent).toContain(
      TestBed.inject(I18nService).t('invitation.hostReplyTitle'),
    );
  });

  it('não mostra a resposta do anfitrião quando não existe', async () => {
    const context = setup();
    http = context.http;
    const path = `${BASE}/public/invitations/${TOKEN}`;

    http.expectOne(path).flush({ data: publicInvitationFixture() });
    await settle(context.fixture);

    expect(
      (context.fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="invitation-host-reply"]',
      ),
    ).toBeNull();
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
