import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../api/api-config';
import { apiRequestInterceptor } from '../api/api.interceptor';
import { ApiEvent, ApiNotification } from '../api/api.models';
import { ShellComponent } from './shell.component';

const BASE = 'http://localhost:3000/api/v1';

interface Page {
  data: unknown[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
}

function page(data: unknown[] = []): Page {
  return {
    data,
    pagination: { page: 1, page_size: 100, total: data.length, total_pages: data.length ? 1 : 0 },
  };
}

function eventFixture(): ApiEvent {
  return {
    id: 'evt-1',
    title: 'Festa QA Um',
    host_name: 'Ana',
    host_email: 'ana@exemplo.pt',
    category: 'other',
    starts_at: '2026-06-01T18:00:00Z',
    ends_at: null,
    timezone: 'Africa/Luanda',
    location: { type: 'venue', name: 'Salão', address: 'Luanda' },
    message: null,
    rules: null,
    dress_code: null,
    template_id: null,
    cover_url: null,
    theme: { mode: 'dark', palette: 'default' },
    contribution: { enabled: false },
    rsvp_deadline: null,
    status: 'scheduled',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function notificationFixture(): ApiNotification {
  return {
    id: 'nt-1',
    event_id: 'evt-1',
    event_title: 'Festa QA Um',
    activity_id: null,
    kind: 'rsvp_accepted',
    title: 'Rui confirmou presença',
    body: null,
    metadata: {},
    read: false,
    read_at: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function hostFixture(): unknown {
  return {
    id: 'host-1',
    email: 'ana@exemplo.pt',
    email_verified: true,
    status: 'active',
    profile: {
      display_name: 'Ana',
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

describe('ShellComponent · global search', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiRequestInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: API_BASE_URL, useValue: BASE },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();

    http
      .expectOne((request) => request.url.endsWith('/host/profile'))
      .flush({ data: { host: hostFixture() } });
    http.expectOne((request) => request.url.endsWith('/host/activity')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/events')).flush(page([eventFixture()]));
    http
      .expectOne((request) => request.url.endsWith('/host/notifications'))
      .flush({ ...page([notificationFixture()]), unread_count: 1 });
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  function query<T extends HTMLElement>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  function flushWarm(): void {
    http.expectOne((request) => request.url.endsWith('/host/guests')).flush(page());
    http.expectOne((request) => request.url.endsWith('/host/tasks')).flush(page());
  }

  it('opens on the desktop input with suggestion groups and combobox semantics', async () => {
    const input = query<HTMLInputElement>('input[aria-controls="search-suggestions-desktop"]');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    input.focus();
    flushWarm();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(query('#search-suggestions-desktop')).not.toBeNull();
    expect(query('#search-suggestions-desktop')?.textContent).toContain('Atalhos');
  });

  it('focuses the mobile input in the same gesture as the magnifier tap', async () => {
    const trigger = query<HTMLButtonElement>('[data-search-trigger]');
    const mobileRoot = query<HTMLElement>('[data-search-root].fixed');
    const input = query<HTMLInputElement>('input[aria-controls="search-suggestions-mobile"]');
    expect(mobileRoot.classList.contains('hidden')).toBe(true);

    trigger.click();

    expect(document.activeElement).toBe(input);
    flushWarm();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mobileRoot.classList.contains('hidden')).toBe(false);
    expect(query('#search-suggestions-mobile')).not.toBeNull();
  });

  it('moves aria-activedescendant with the arrow keys', async () => {
    const input = query<HTMLInputElement>('input[aria-controls="search-suggestions-desktop"]');
    input.focus();
    flushWarm();
    fixture.detectChanges();
    await fixture.whenStable();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();

    const activeId = input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId as string)).not.toBeNull();
  });

  it('persists the collapsed sidebar state and reflows the layout', () => {
    const toggle = query<HTMLButtonElement>('[data-testid="sidebar-toggle"]');
    const aside = query<HTMLElement>('aside');
    expect(aside.classList.contains('lg:w-[18.5rem]')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(aside.classList.contains('lg:w-[4.5rem]')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem('apupu.sidebar.collapsed')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(aside.classList.contains('lg:w-[18.5rem]')).toBe(true);
    expect(localStorage.getItem('apupu.sidebar.collapsed')).toBe('false');
  });

  it('clears the term and restores focus on Escape', async () => {
    const trigger = query<HTMLButtonElement>('[data-search-trigger]');
    trigger.click();
    flushWarm();
    fixture.detectChanges();
    await fixture.whenStable();

    const input = query<HTMLInputElement>('input[aria-controls="search-suggestions-mobile"]');
    input.value = 'festa';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(query<HTMLElement>('[data-search-root].fixed').classList.contains('hidden')).toBe(true);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(trigger);
  });
});
