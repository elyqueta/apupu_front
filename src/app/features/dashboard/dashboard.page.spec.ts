import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Guest, HostEvent, RsvpStatus } from '../../core/models/models';
import { ShareService } from '../../core/services/share.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { DashboardPage } from './dashboard.page';

const event = {
  id: 'evt-1',
  title: 'Casamento da Ana',
  startsAt: '2030-06-20T15:00:00Z',
} as unknown as HostEvent;

function guest(id: string, status: RsvpStatus, phone: string | null): Guest {
  return {
    id,
    eventId: event.id,
    name: `Convidado ${id}`,
    email: `${id}@example.com`,
    phone,
    status,
    tableName: null,
    guestKind: null,
    companionName: null,
    partySize: null,
    invitationUrl: 'https://example.com/convite/1',
    openedAt: null,
    whatsappSharedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    whatsappShareCount: 1,
    source: 'personal',
    ageFlag: false,
    invitedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    respondedAt: null,
  };
}

interface GuestEntry {
  guest: Guest;
  event: HostEvent;
}

describe('DashboardPage · convidados', () => {
  const entries = signal<GuestEntry[]>([
    { guest: guest('pending-phone', 'pending', '912345678'), event },
    { guest: guest('pending-email', 'pending', null), event },
    { guest: guest('confirmed', 'confirmed', null), event },
    { guest: guest('declined', 'declined', null), event },
  ]);
  const share = {
    whatsappUrl: vi.fn().mockReturnValue('https://wa.me/244912345678?text=convite'),
    openExternal: vi.fn(),
  };
  const toasts = { success: vi.fn(), error: vi.fn() };
  const store = {
    load: vi.fn(),
    guests: signal(entries().map((entry) => entry.guest)),
    guestsWithEvent: entries,
    nextEvent: signal<HostEvent | null>(event),
    globalStats: signal({
      events: 1,
      drafts: 0,
      completed: 0,
      total: 4,
      confirmed: 1,
      pending: 2,
      declined: 1,
      responseRate: 50,
    }),
    taskProgress: signal({ done: 0, total: 0 }),
    recentEvents: signal([]),
    tasks: signal([]),
    activityFeed: signal([]),
    profile: signal({ name: 'Ana Costa', email: 'ana@example.com' }),
    loading: signal(false),
    error: signal(null),
    eventStats: vi.fn().mockReturnValue(null),
    isEventHost: vi.fn().mockReturnValue(true),
    sendReminder: vi.fn().mockResolvedValue(true),
    markWhatsappShared: vi.fn().mockImplementation(async (value: Guest) => value),
    retry: vi.fn(),
    toggleTask: vi.fn().mockResolvedValue(undefined),
  };

  let page: DashboardPage;

  beforeEach(() => {
    localStorage.clear();
    entries.set([
      { guest: guest('pending-phone', 'pending', '912345678'), event },
      { guest: guest('pending-email', 'pending', null), event },
      { guest: guest('confirmed', 'confirmed', null), event },
      { guest: guest('declined', 'declined', null), event },
    ]);
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: WorkspaceStore, useValue: store },
        { provide: ShareService, useValue: share },
        { provide: ToastService, useValue: toasts },
      ],
    });
    TestBed.overrideComponent(DashboardPage, { set: { template: '<div></div>', imports: [] } });
    page = TestBed.createComponent(DashboardPage).componentInstance;
  });

  it('starts on pending and switches the guest filter', () => {
    const view = page as unknown as {
      guestStatusFilter: () => RsvpStatus;
      statusCounts: () => Record<RsvpStatus, number>;
      filteredGuests: () => GuestEntry[];
      setFilter: (status: RsvpStatus) => void;
    };

    expect(view.guestStatusFilter()).toBe('pending');
    expect(view.statusCounts()).toEqual({ confirmed: 1, declined: 1, pending: 2 });
    expect(view.filteredGuests().map((entry) => entry.guest.id)).toEqual([
      'pending-phone',
      'pending-email',
    ]);

    view.setFilter('confirmed');
    expect(view.filteredGuests().map((entry) => entry.guest.id)).toEqual(['confirmed']);
  });

  it('uses WhatsApp as primary action when the guest has a phone', () => {
    const view = page as unknown as {
      primaryFor: (entry: GuestEntry) => { id: string; label: string };
      metaFor: (entry: GuestEntry) => { icon: string; label: string }[];
      onGuestAction: (action: string, entry: GuestEntry) => void;
    };
    const entry = entries()[0];

    expect(view.primaryFor(entry).id).toBe('whatsapp');
    expect(view.metaFor(entry)[0].label).toBe(event.title);
    expect(view.metaFor(entry)[1].label).toContain('3 dias');
    expect(view.metaFor(entry)[2].label).toContain('Link partilhado por WhatsApp');
    expect(view.metaFor(entry)[2].label).toContain('há 2 dias');

    view.onGuestAction('whatsapp', entry);
    expect(share.whatsappUrl).toHaveBeenCalled();
    expect(share.openExternal).toHaveBeenCalledWith('https://wa.me/244912345678?text=convite');
    expect(store.markWhatsappShared).toHaveBeenCalledWith(entry.guest);
  });

  it('groups guests into carousel panels of three', () => {
    entries.set([
      { guest: guest('p1', 'pending', null), event },
      { guest: guest('p2', 'pending', null), event },
      { guest: guest('p3', 'pending', null), event },
      { guest: guest('p4', 'pending', null), event },
    ]);
    const view = page as unknown as {
      guestPages: () => GuestEntry[][];
      carouselPages: () => number;
    };

    expect(view.guestPages().map((panel) => panel.map((entry) => entry.guest.id))).toEqual([
      ['p1', 'p2', 'p3'],
      ['p4'],
    ]);
    expect(view.carouselPages()).toBe(2);
  });
});
