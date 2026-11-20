import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Host } from '../../core/api/api.models';
import { AuthService } from '../../core/api/auth.service';
import { superAdminGuard } from './admin.guard';

function host(overrides: Partial<Host> = {}): Host {
  return {
    id: 'host-1',
    email: 'host@example.com',
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Host',
      phone: null,
      birth_date: null,
      locale: 'pt-AO',
      timezone: 'Africa/Luanda',
      avatar_url: null,
      cover_url: null,
    },
    profile_complete: true,
    missing_fields: [],
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/admin/eventos' } as RouterStateSnapshot;

async function run(session: Host | null): Promise<boolean | UrlTree> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { restoreSession: vi.fn().mockResolvedValue(session) },
      },
    ],
  });
  return TestBed.runInInjectionContext(() => superAdminGuard(route, state)) as Promise<
    boolean | UrlTree
  >;
}

describe('superAdminGuard', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('envia quem não tem sessão para o login com returnUrl', async () => {
    const result = await run(null);
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/entrar?returnUrl=%2Fadmin%2Feventos',
    );
  });

  it('devolve quem tem sessão sem flag de super admin ao painel', async () => {
    const result = await run(host());
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/painel');
  });

  it('aceita a flag snake_case da sessão', async () => {
    const session = host() as Host & { is_super_admin?: boolean };
    session.is_super_admin = true;
    expect(await run(session)).toBe(true);
  });

  it('aceita a flag camelCase da sessão', async () => {
    const session = host() as Host & { isSuperAdmin?: boolean };
    session.isSuperAdmin = true;
    expect(await run(session)).toBe(true);
  });
});
