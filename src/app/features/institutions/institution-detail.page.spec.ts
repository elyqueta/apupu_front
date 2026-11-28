import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { ApiInstitutionDetail } from '../../core/data/institutions.repository';
import { InstitutionDetailPage } from './institution-detail.page';

const BASE = 'http://localhost:3000/api/v1';
const SLUG = 'diocese';

function detail(overrides: Partial<ApiInstitutionDetail['institution']> = {}, rest: Partial<ApiInstitutionDetail> = {}): ApiInstitutionDetail {
  return {
    institution: {
      id: 'i1',
      name: 'Diocese',
      slug: SLUG,
      description: null,
      visibility: 'public',
      avatar_url: null,
      cover_url: null,
      community_count: 1,
      is_creator: false,
      created_at: '2026-11-24T00:00:00.000Z',
      ...overrides,
    },
    communities: [{ id: 'c1', name: 'Jovens', slug: 'jovens', visibility: 'public', avatar_url: null, member_count: 4, i_own: false }],
    events: [],
    requests: [],
    ...rest,
  };
}

function setup(): { fixture: ComponentFixture<InstitutionDetailPage>; http: HttpTestingController } {
  TestBed.configureTestingModule({
    imports: [InstitutionDetailPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: API_BASE_URL, useValue: BASE },
      { provide: PLATFORM_ID, useValue: 'server' },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(InstitutionDetailPage);
  fixture.componentRef.setInput('slug', SLUG);
  fixture.detectChanges();
  return { fixture, http };
}

async function settle(fixture: ComponentFixture<InstitutionDetailPage>): Promise<void> {
  for (let pass = 0; pass < 2; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
}

describe('InstitutionDetailPage', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
  });

  it('visitante vê "associar comunidade" e não vê pedidos nem apagar', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/institutions/${SLUG}`).flush({ data: detail() });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="institution-request-join"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="institution-requests"]')).toBeNull();
    expect(native.querySelector('[data-testid="institution-delete"]')).toBeNull();
    http.expectNone(`${BASE}/host/institutions/${SLUG}`);
  });

  it('criador vê pedidos; aprovar pede o código e abre o modal OTP', async () => {
    const context = setup();
    http = context.http;
    const request = {
      id: 'r1',
      institution_id: 'i1',
      institution_name: 'Diocese',
      community_id: 'c2',
      community_name: 'Coro',
      community_slug: 'coro',
      direction: 'community_to_institution' as const,
      kind: 'link' as const,
      status: 'pending' as const,
      community_accepted: true,
      created_at: '2026-11-24T00:00:00.000Z',
    };
    http.expectOne(`${BASE}/host/institutions/${SLUG}`).flush({ data: detail({ is_creator: true }, { requests: [request] }) });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="institution-requests"]')).not.toBeNull();
    const approve = Array.from(native.querySelectorAll<HTMLButtonElement>('[data-testid="institution-request-r1"] button')).at(-1);
    approve?.click();
    http.expectOne(`${BASE}/host/institutions/requests/r1/approve`).flush({ data: { ...request, status: 'awaiting_otp' } });
    await settle(context.fixture);
    expect(document.querySelector('[data-testid="institution-otp"]')).not.toBeNull();
  });

  it('apagar instituição usa cartão de ação discreto e mantém a confirmação antes de apagar', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/institutions/${SLUG}`).flush({ data: detail({ is_creator: true }) });
    await settle(context.fixture);
    const native = context.fixture.nativeElement as HTMLElement;
    const trigger = native.querySelector('[data-testid="institution-delete"]') as HTMLButtonElement;
    expect(trigger).not.toBeNull();
    expect(trigger.className).not.toContain('ui-btn-danger');
    const section = trigger.closest('section') as HTMLElement;
    expect(section.classList.contains('bg-surface')).toBe(true);
    expect(section.classList.contains('border-line')).toBe(true);
    expect(section.classList.contains('shadow-card')).toBe(true);
    expect(section.querySelector('span.size-10')?.classList.contains('text-coral')).toBe(true);
    expect(section.querySelector('span.font-semibold')?.classList.contains('text-ink')).toBe(true);
    expect(section.querySelector('fa-icon.text-xs')?.classList.contains('text-muted')).toBe(true);
    trigger.click();
    context.fixture.detectChanges();
    expect(native.querySelector('input[name="confirmName"]')).not.toBeNull();
    const confirm = Array.from(native.querySelectorAll<HTMLButtonElement>('button[type="submit"]')).find((button) =>
      button.className.includes('ui-btn-danger'),
    );
    expect(confirm).not.toBeUndefined();
    expect(confirm?.disabled).toBe(true);
  });

  it('instituição inexistente mostra "não encontrada"', async () => {
    const context = setup();
    http = context.http;
    http.expectOne(`${BASE}/host/institutions/${SLUG}`).flush(
      { error: { code: 'institution_not_found', message: 'x', request_id: 'r' } },
      { status: 404, statusText: 'Not Found' },
    );
    await settle(context.fixture);
    expect(context.fixture.nativeElement.querySelector('[data-testid="institution-not-found"]')).not.toBeNull();
  });
});
