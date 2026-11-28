import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';
import { FeedEvent, PublicCommunity, SocialRepository } from '../../core/data/social.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { PublicCommunityPage } from './public-community.page';

function event(id: string, startsAt: string, status: FeedEvent['status']): FeedEvent {
  return {
    type: 'event',
    id,
    title: `Evento ${id}`,
    category: null,
    starts_at: startsAt,
    ends_at: null,
    timezone: 'Africa/Luanda',
    location: null,
    online: false,
    cover_url: null,
    template: { id: null, palette: 'default', mode: 'light' },
    host_name: 'Ana',
    public_url: `http://localhost:4200/e/${id}`,
    slug: id,
    community: null,
    status,
  };
}

const community: PublicCommunity = {
  type: 'community',
  id: 'c1',
  name: 'Jovens',
  slug: 'jovens',
  description: 'Comunidade de jovens',
  avatar_url: null,
  cover_url: null,
  member_count: 3,
  events: [
    event('up1', '2027-01-10T15:00:00.000Z', 'published'),
    event('past1', '2025-05-10T15:00:00.000Z', 'completed'),
    event('cancel1', '2025-06-10T15:00:00.000Z', 'cancelled'),
  ],
};

async function setup(): Promise<{ fixture: ComponentFixture<PublicCommunityPage>; native: HTMLElement; i18n: I18nService }> {
  TestBed.configureTestingModule({
    imports: [PublicCommunityPage],
    providers: [
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: 'server' },
      {
        provide: SocialRepository,
        useValue: {
          publicCommunity: vi.fn().mockResolvedValue(community),
          communityEvents: vi.fn().mockResolvedValue({ items: [] }),
        },
      },
      {
        provide: AuthService,
        useValue: {
          host: signal(null),
          restoreSession: vi.fn().mockResolvedValue(null),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PublicCommunityPage);
  fixture.componentRef.setInput('slug', 'jovens');
  fixture.detectChanges();
  for (let pass = 0; pass < 5; pass += 1) {
    await fixture.whenStable();
    fixture.detectChanges();
  }
  return {
    fixture,
    native: fixture.nativeElement as HTMLElement,
    i18n: TestBed.inject(I18nService),
  };
}

describe('PublicCommunityPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('visitante vê o convite para criar conta com os textos do bloco 12', async () => {
    const { native, i18n } = await setup();

    const info = native.querySelector('[data-testid="public-community-join"]');
    expect(info?.textContent).toContain(i18n.t('block12.community.joinTitle'));
    expect(info?.textContent).toContain(i18n.t('block12.community.joinMessage'));
    expect(info?.querySelector('a')?.getAttribute('href')).toBe('/criar-conta');
    expect(native.querySelector('[data-testid="public-community-join-cta"]')?.getAttribute('href')).toBe('/criar-conta');
    expect(native.querySelector('[data-testid="public-community-join-cta"]')?.textContent).toContain(
      i18n.t('block12.community.joinVisitor'),
    );
    expect(native.querySelector('[data-testid="public-community-open"]')).toBeNull();
  });

  it('eventos cancelados não aparecem na secção de eventos anteriores', async () => {
    const { native } = await setup();

    const past = native.querySelector('[data-testid="public-community-past"]');
    expect(past?.querySelector('[data-testid="feed-event-cancel1"]')).toBeNull();
    expect(past?.querySelector('[data-testid="feed-event-past1"]')).not.toBeNull();
    expect(native.querySelector('[data-testid="public-community-upcoming"] [data-testid="feed-event-up1"]')).not.toBeNull();
  });

  it('mantém o avatar grande fora do contentor da capa com overflow', async () => {
    const { native } = await setup();

    const profile = native.querySelector('[data-testid="public-community-profile"]') as HTMLElement;
    const coverWrapper = profile.firstElementChild as HTMLElement;
    const avatar = profile.querySelector('app-avatar') as HTMLElement;

    expect(coverWrapper.className).toContain('overflow-hidden');
    expect(avatar.closest('.overflow-hidden')).toBeNull();
    expect(avatar.parentElement?.parentElement?.parentElement).toBe(profile);
    expect(profile.className).toContain('relative');
    expect(profile.className).not.toContain('overflow-hidden');
  });
});
