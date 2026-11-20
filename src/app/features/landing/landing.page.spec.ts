import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Host } from '../../core/api/api.models';
import { AuthService } from '../../core/api/auth.service';
import { LandingPage } from './landing.page';

function hostFixture(): Host {
  return {
    id: 'host-1',
    email: 'admin@example.com',
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Admin',
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
  };
}

/** Configura a página com a sessão já resolvida, sem pedidos HTTP de autenticação. */
function setup(session: Host | null = null): ComponentFixture<LandingPage> {
  TestBed.configureTestingModule({
    imports: [LandingPage],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: 'browser' },
    ],
  });

  vi.spyOn(TestBed.inject(AuthService), 'restoreSession').mockResolvedValue(session);
  const fixture = TestBed.createComponent(LandingPage);
  fixture.detectChanges();
  return fixture;
}

describe('LandingPage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('mostra as secções públicas e o aviso de protótipo por ordem', async () => {
    const fixture = setup();
    await fixture.whenStable();
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('[data-testid="prototype-notice"]')).toBeTruthy();
    for (const testId of [
      'landing-hero',
      'landing-benefits',
      'landing-steps',
      'landing-audience',
      'landing-about',
      'landing-ns2',
      'landing-cta',
      'landing-footer',
    ]) {
      expect(root.querySelector(`[data-testid="${testId}"]`), testId).toBeTruthy();
    }
    expect(root.querySelector('[data-testid="landing-cta-signup"]')?.getAttribute('href')).toBe(
      '/criar-conta',
    );
    expect(root.querySelector('[data-testid="landing-cta-login"]')?.getAttribute('href')).toBe(
      '/entrar',
    );
  });

  it('abre e fecha o menu móvel', () => {
    const fixture = setup();
    const root: HTMLElement = fixture.nativeElement;
    const button = root.querySelector<HTMLButtonElement>('[data-testid="landing-mobile-menu"]');

    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[data-testid="landing-mobile-nav"]')).toBeFalsy();

    button?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('[data-testid="landing-mobile-nav"]')).toBeTruthy();

    button?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[data-testid="landing-mobile-nav"]')).toBeFalsy();
  });

  it('define título e descrição SEO a partir das chaves i18n', () => {
    setup();
    expect(TestBed.inject(Title).getTitle()).toContain('Conto Contigo');
    expect(TestBed.inject(Meta).getTag('name="description"')?.getAttribute('content')).toContain(
      'Cria eventos',
    );
  });

  it('redireciona para o painel quando já existe sessão', async () => {
    TestBed.configureTestingModule({
      imports: [LandingPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    vi.spyOn(TestBed.inject(AuthService), 'restoreSession').mockResolvedValue(hostFixture());
    const redirect = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LandingPage);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(redirect).toHaveBeenCalledWith(['/painel'], { replaceUrl: true });
    fixture.destroy();
  });
});
