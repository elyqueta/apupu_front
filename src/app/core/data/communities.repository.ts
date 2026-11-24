import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';

/** Bloco 11 — contrato da API de comunidades (`/host/communities`). */
export type CommunityRole = 'owner' | 'manager' | 'member';
export type CommunityVisibility = 'public' | 'private';

export interface ApiCommunity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: CommunityVisibility;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  event_count: number;
  team_count: number;
  my_role: CommunityRole | null;
  my_status: 'active' | 'invited' | 'left' | 'removed' | null;
  my_pending_request: boolean;
  url: string;
  created_at: string;
}

export interface ApiCommunityMember {
  id: string;
  host_id: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: CommunityRole;
  status: 'active' | 'invited';
  has_host_account: boolean;
  joined_at: string | null;
}

export interface ApiCommunityEvent {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  visibility: 'public' | 'private';
  public_url: string | null;
  cover_url: string | null;
  accepted_count: number;
}

export interface ApiCommunityTeam {
  id: string;
  name: string;
  category: string;
  member_count: number;
  event_count: number;
}

export interface ApiJoinRequest {
  id: string;
  host_id: string;
  display_name: string | null;
  email: string;
  avatar_url: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface ApiTransfer {
  id: string;
  status: 'pending_otp' | 'pending_accept' | 'completed' | 'cancelled' | 'expired';
  direction: 'outgoing' | 'incoming';
  otp_expires_at: string | null;
  created_at: string;
}

export interface CommunityPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canDecideRequests: boolean;
  canChangeRoles: boolean;
  canLeave: boolean;
  canCreateEvent: boolean;
  canCreateTeam: boolean;
  canShare: boolean;
  canViewAllReferrals: boolean;
  canTransfer: boolean;
  canRequestToJoin: boolean;
  isMember: boolean;
  isInvited: boolean;
}

export interface ApiCommunityDetail {
  community: ApiCommunity;
  permissions: CommunityPermissions;
  my_ref_code: string | null;
  events: ApiCommunityEvent[];
  teams: ApiCommunityTeam[];
  members: ApiCommunityMember[];
  pending_requests: number;
  transfer: ApiTransfer | null;
}

export interface ApiReferral {
  member_id: string;
  display_name: string | null;
  invitations: number;
  accepted: number;
}

export interface CommunityInput {
  name: string;
  description: string | null;
  visibility: CommunityVisibility;
  cover_url?: string | null;
  avatar_url?: string | null;
}

/** Acrescenta `?ref=` ao link aberto de um evento público (partilha rastreada). */
export function shareUrl(publicUrl: string, refCode: string | null): string {
  if (!refCode) return publicUrl;
  const separator = publicUrl.includes('?') ? '&' : '?';
  return `${publicUrl}${separator}ref=${encodeURIComponent(refCode)}`;
}

@Injectable({ providedIn: 'root' })
export class CommunitiesRepository {
  private readonly api = inject(ApiClient);

  private path(id: string, suffix = ''): string {
    return `/host/communities/${encodeURIComponent(id)}${suffix}`;
  }

  list(scope: 'mine' | 'discover', q?: string): Promise<ApiCommunity[]> {
    return this.api.get<ApiCommunity[]>('/host/communities', {
      scope,
      ...(q ? { q } : {}),
    });
  }

  detail(idOrSlug: string): Promise<ApiCommunityDetail> {
    return this.api.get<ApiCommunityDetail>(this.path(idOrSlug));
  }

  create(input: CommunityInput): Promise<ApiCommunity> {
    return this.api.post<ApiCommunity>('/host/communities', input);
  }

  update(id: string, input: Partial<CommunityInput>): Promise<ApiCommunity> {
    return this.api.patch<ApiCommunity>(this.path(id), input);
  }

  remove(id: string, confirmName: string): Promise<void> {
    return this.api.deleteWithBody(this.path(id), { confirm_name: confirmName });
  }

  invite(id: string, input: { email?: string; phone?: string; role: 'manager' | 'member' }): Promise<ApiCommunityMember> {
    return this.api.post<ApiCommunityMember>(this.path(id, '/members'), input);
  }

  answerInvite(id: string, accept: boolean): Promise<void> {
    return this.api.postRaw<void>(this.path(id, '/invite/answer'), { accept });
  }

  removeMember(id: string, memberId: string): Promise<void> {
    return this.api.delete(this.path(id, `/members/${encodeURIComponent(memberId)}`));
  }

  changeRole(id: string, memberId: string, role: 'manager' | 'member'): Promise<ApiCommunityMember> {
    return this.api.patch<ApiCommunityMember>(this.path(id, `/members/${encodeURIComponent(memberId)}`), { role });
  }

  leave(id: string): Promise<void> {
    return this.api.postRaw<void>(this.path(id, '/leave'), {});
  }

  requestToJoin(id: string, message: string | null): Promise<ApiJoinRequest> {
    return this.api.post<ApiJoinRequest>(this.path(id, '/join-requests'), { message });
  }

  cancelJoinRequest(id: string): Promise<void> {
    return this.api.delete(this.path(id, '/join-requests/mine'));
  }

  joinRequests(id: string): Promise<ApiJoinRequest[]> {
    return this.api.get<ApiJoinRequest[]>(this.path(id, '/join-requests'));
  }

  decide(id: string, requestId: string, decision: 'approve' | 'reject'): Promise<ApiJoinRequest> {
    return this.api.post<ApiJoinRequest>(
      this.path(id, `/join-requests/${encodeURIComponent(requestId)}/decision`),
      { decision },
    );
  }

  startTransfer(id: string, memberId: string): Promise<ApiTransfer> {
    return this.api.post<ApiTransfer>(this.path(id, '/transfer/start'), { member_id: memberId });
  }

  verifyTransfer(id: string, code: string): Promise<ApiTransfer> {
    return this.api.post<ApiTransfer>(this.path(id, '/transfer/verify-otp'), { code });
  }

  acceptTransfer(id: string): Promise<ApiTransfer> {
    return this.api.post<ApiTransfer>(this.path(id, '/transfer/accept'), {});
  }

  cancelTransfer(id: string): Promise<void> {
    return this.api.postRaw<void>(this.path(id, '/transfer/cancel'), {});
  }

  referrals(id: string): Promise<ApiReferral[]> {
    return this.api.get<ApiReferral[]>(this.path(id, '/referrals'));
  }
}
