import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { CreateEventRequest } from '../api/api.models';

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
  /** Instituição a que pertence (Bloco 13). */
  institution?: { name: string; slug: string } | null;
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

/** Sugestão de evento enviada por um membro (`/host/communities/:id/event-suggestions`). */
export interface ApiEventSuggestion {
  id: string;
  host_id: string;
  display_name: string | null;
  avatar_url: string | null;
  title: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  event_id: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Entrada do feed de atividade da comunidade (evento partilhado por um membro). */
export interface ApiCommunityActivity {
  id: string;
  community_id: string;
  host_id: string;
  host_name: string;
  host_avatar_url: string | null;
  event_id: string;
  event_title: string;
  event_slug: string;
  created_at: string;
}

/** Corpo da sugestão: o payload completo de criação de evento + mensagem opcional. */
export interface EventSuggestionInput {
  event: CreateEventRequest['event'] & { community_id: string };
  guests: CreateEventRequest['guests'];
  message?: string;
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
  /** Qualquer membro ativo (incluindo staff) pode sugerir um evento. */
  canSuggestEvent?: boolean;
  /** Responsável/gestor pode aprovar ou recusar sugestões. */
  canDecideEventSuggestions?: boolean;
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
  pending_event_suggestions?: number;
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

  /** Envia o avatar em `multipart/form-data` (campo `avatar`). */
  uploadAvatar(id: string, file: File): Promise<ApiCommunity> {
    const body = new FormData();
    body.append('avatar', file);
    return this.api.postForm<ApiCommunity>(this.path(id, '/avatar/upload'), body);
  }

  removeAvatar(id: string): Promise<ApiCommunity> {
    return this.api.deleteWithData<ApiCommunity>(this.path(id, '/avatar'));
  }

  /** Envia a capa em `multipart/form-data` (campo `cover`). */
  uploadCover(id: string, file: File): Promise<ApiCommunity> {
    const body = new FormData();
    body.append('cover', file);
    return this.api.postForm<ApiCommunity>(this.path(id, '/cover/upload'), body);
  }

  removeCover(id: string): Promise<ApiCommunity> {
    return this.api.deleteWithData<ApiCommunity>(this.path(id, '/cover'));
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

  /** Sugestões pendentes para revisão (staff). */
  eventSuggestions(id: string): Promise<ApiEventSuggestion[]> {
    return this.api.get<ApiEventSuggestion[]>(this.path(id, '/event-suggestions'));
  }

  /** Sugestões enviadas pelo próprio membro. */
  myEventSuggestions(id: string): Promise<ApiEventSuggestion[]> {
    return this.api.get<ApiEventSuggestion[]>(this.path(id, '/event-suggestions/mine'));
  }

  /** Envia um evento completo para aprovação; nunca cria o evento diretamente. */
  suggestEvent(id: string, body: EventSuggestionInput): Promise<ApiEventSuggestion> {
    return this.api.post<ApiEventSuggestion>(this.path(id, '/event-suggestions'), body);
  }

  decideEventSuggestion(
    id: string,
    suggestionId: string,
    decision: 'approve' | 'reject',
  ): Promise<ApiEventSuggestion> {
    return this.api.post<ApiEventSuggestion>(
      this.path(id, `/event-suggestions/${encodeURIComponent(suggestionId)}/decision`),
      { decision },
    );
  }

  /** O autor cancela a própria sugestão enquanto estiver pendente. */
  cancelEventSuggestion(id: string, suggestionId: string): Promise<void> {
    return this.api.delete(this.path(id, `/event-suggestions/${encodeURIComponent(suggestionId)}`));
  }

  /** Regista no feed da comunidade um evento público partilhado pelo membro. */
  shareEventActivity(id: string, eventId: string): Promise<ApiCommunityActivity> {
    return this.api.post<ApiCommunityActivity>(this.path(id, '/activity'), { event_id: eventId });
  }

  /** Atividade recente (apenas para membros ativos). */
  communityActivity(id: string): Promise<ApiCommunityActivity[]> {
    return this.api.get<ApiCommunityActivity[]>(this.path(id, '/activity'));
  }
}
