import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';

/** Bloco 12 — contrato do feed público, pesquisa, perfis e amizades. */
export type FeedType = 'events' | 'communities' | 'people';

export interface FeedEvent {
  type: 'event';
  id: string;
  title: string;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  status?: 'scheduled' | 'published' | 'completed' | 'cancelled';
  location: string | null;
  online: boolean;
  cover_url: string | null;
  template: { id: string | null; palette: string; mode: string };
  host_name: string;
  host_avatar_url?: string | null;
  /** Início da mensagem pública do convite. */
  excerpt?: string | null;
  published_at?: string;
  public_url: string;
  slug: string;
  community: { name: string | null; slug: string } | null;
  attendee_count?: number;
}

export interface FeedCommunity {
  type: 'community';
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
}

/** Bloco 13: instituição pública mostrada no separador "Comunidades". */
export interface FeedInstitution {
  type: 'institution';
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  community_count: number;
}

export interface FeedPerson {
  type: 'person';
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

export type FeedItem = FeedEvent | FeedCommunity | FeedInstitution | FeedPerson;

export interface FeedPage<T = FeedItem> {
  items: T[];
  next_cursor: string | null;
}

export interface SearchResults {
  events: FeedEvent[];
  communities: FeedCommunity[];
  people: FeedPerson[];
}

export interface ProfileDetail extends FeedPerson {
  is_self: boolean;
  friend_count: number;
  events: FeedEvent[];
  communities: FeedCommunity[];
  mutual_friends: { total: number; preview: FeedPerson[] };
  mutual_communities: FeedCommunity[];
  friendship: { id: string | null; status: 'none' | 'pending' | 'accepted'; direction: 'incoming' | 'outgoing' | null };
}

export interface PublicCommunity extends FeedCommunity {
  events: FeedEvent[];
}

export interface FriendEntry {
  id: string;
  person: { id: string; display_name: string | null; avatar_url: string | null };
  created_at: string;
}

export interface FriendLists {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

@Injectable({ providedIn: 'root' })
export class SocialRepository {
  private readonly api = inject(ApiClient);

  feed(type: FeedType, opts: { q?: string; category?: string; cursor?: string | null } = {}): Promise<FeedPage> {
    return this.api.get<FeedPage>('/public/feed', {
      type,
      q: opts.q || undefined,
      category: opts.category || undefined,
      cursor: opts.cursor || undefined,
    });
  }

  search(q: string): Promise<SearchResults> {
    return this.api.get<SearchResults>('/public/search', { q });
  }

  publicProfile(id: string): Promise<FeedPerson> {
    return this.api.get<FeedPerson>(`/public/profiles/${encodeURIComponent(id)}`);
  }

  profile(id: string): Promise<ProfileDetail> {
    return this.api.get<ProfileDetail>(`/host/profiles/${encodeURIComponent(id)}`);
  }

  profileEvents(id: string, past: boolean, cursor?: string | null): Promise<FeedPage<FeedEvent>> {
    return this.api.get<FeedPage<FeedEvent>>(`/host/profiles/${encodeURIComponent(id)}/events`, {
      past: String(past),
      cursor: cursor || undefined,
    });
  }

  publicCommunity(slug: string): Promise<PublicCommunity> {
    return this.api.get<PublicCommunity>(`/public/communities/${encodeURIComponent(slug)}`);
  }

  communityEvents(slug: string, past: boolean, cursor?: string | null): Promise<FeedPage<FeedEvent>> {
    return this.api.get<FeedPage<FeedEvent>>(`/host/community-events/${encodeURIComponent(slug)}`, {
      past: String(past),
      cursor: cursor || undefined,
    });
  }

  friends(): Promise<FriendLists> {
    return this.api.get<FriendLists>('/host/friends');
  }

  requestFriend(hostId: string): Promise<{ id: string }> {
    return this.api.post<{ id: string }>('/host/friends/requests', { host_id: hostId });
  }

  respond(friendshipId: string, accept: boolean): Promise<{ ok: true }> {
    return this.api.post<{ ok: true }>(`/host/friends/${encodeURIComponent(friendshipId)}/decision`, { accept });
  }

  remove(friendshipId: string): Promise<void> {
    return this.api.delete(`/host/friends/${encodeURIComponent(friendshipId)}`);
  }
}
