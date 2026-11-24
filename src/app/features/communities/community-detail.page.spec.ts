import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiCommunityDetail, shareUrl } from '../../core/data/communities.repository';
import { CommunityDetailPage } from './community-detail.page';

const BASE = 'http://localhost:3000/api/v1';
const SLUG = 'ministerio-jovem';

function detail(overrides: Partial<ApiCommunityDetail> = {}): ApiCommunityDetail {
  return {
    community: {
      id: 'c1',
      name: 'Ministério Jovem',
      slug: SLUG,
      description: 'Adolescentes',
      visibility: 'public',
      avatar_url: null,
      cover_url: null,
      member_count: 3,
      event_count: 1,
      team_count: 0,
      my_role: null,
      my_status: null,
      my_pending_request: false,
      url: `http://localhost:4200/comunidades/${SLUG}`,
      created_at: '2026-11-24T00:00:00.000Z',
    },
    permissions: {
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canDecideRequests: false,
      canChangeRoles: false,
      canLeave: false,
      canCreateEvent: false,
      canCreateTeam: false,
      canShare: false,
      canViewAllReferrals: false,
      canTransfer: false,
      canRequestToJoin: true,
      isMember: false,
      isInvited: false,
    },
    my_ref_code: null,
    events: [],
    teams: [],
    members: [],
    pending_requests: 0,
    transfer: null,
    ...overrides,
  };
}

function setup(): { fixture: ComponentFixture<CommunityDetailPage>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [CommunityDetailPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(CommunityDetailPage);
  fixture.componentRef.setInput('slug', SLUG);
  fixture.detectChanges();
  return { fixture, http };
}

async function settle(fixture: ComponentFixture<CommunityDetailPage>): Promise<void> {
  for (let pass = 0; pass < 2; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

describe('CommunityDetailPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
  });

  it('visitante de comunidade pública vê "Pedir para entrar" e só um pedido é feito', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({ data: detail() });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-join"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-tab-members"]')).toBeNull();
    // Sem ciclos: nenhum pedido extra depois de estabilizar.
    http.expectNone(`${BASE}/host/communities/${SLUG}`);
  });

  it('gestor vê pedidos e definições; membro comum não', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush({
      data: detail({
        permissions: {
          ...detail().permissions,
          canEdit: true,
          canInvite: true,
          canDecideRequests: true,
          canLeave: true,
          canShare: true,
          canRequestToJoin: false,
          isMember: true,
        },
      }),
    });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="community-tab-requests"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-tab-settings"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="community-join"]')).toBeNull();
  });

  it('comunidade privada sem acesso mostra "não encontrada"', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/communities/${SLUG}`).flush(
      { error: { code: 'community_not_found', message: 'x', request_id: 'r' } },
      { status: 404, statusText: 'Not Found' },
    );
    await settle(context.fixture);
    expect(context.fixture.nativeElement.querySelector('[data-testid="community-not-found"]')).not.toBeNull();
  });
});

describe('shareUrl', () => {
  it('acrescenta o código de partilha ao link aberto', () => {
    expect(shareUrl('http://x/e/abc', 'REF123')).toBe('http://x/e/abc?ref=REF123');
    expect(shareUrl('http://x/e/abc?a=1', 'REF123')).toBe('http://x/e/abc?a=1&ref=REF123');
    expect(shareUrl('http://x/e/abc', null)).toBe('http://x/e/abc');
  });
});
