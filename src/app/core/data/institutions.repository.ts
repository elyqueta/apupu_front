import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';

/** Bloco 13 — contrato da API de instituições (`/host/institutions`). */
export interface ApiInstitution {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  visibility: 'public' | 'private';
  avatar_url: string | null;
  cover_url: string | null;
  community_count: number;
  is_creator: boolean;
  created_at: string;
}

export interface ApiInstitutionRequest {
  id: string;
  institution_id: string;
  institution_name: string;
  community_id: string;
  community_name: string;
  community_slug: string;
  direction: 'community_to_institution' | 'institution_to_community';
  kind: 'link' | 'remove';
  status: 'pending' | 'awaiting_otp' | 'approved' | 'rejected' | 'cancelled';
  community_accepted: boolean;
  created_at: string;
}

export interface ApiInstitutionDetail {
  institution: ApiInstitution;
  communities: {
    id: string;
    name: string;
    slug: string;
    visibility: 'public' | 'private';
    avatar_url: string | null;
    member_count: number;
    i_own: boolean;
  }[];
  events: {
    id: string;
    title: string;
    starts_at: string;
    timezone: string;
    cover_url: string | null;
    public_url: string;
    community_name: string;
  }[];
  requests: ApiInstitutionRequest[];
}

@Injectable({ providedIn: 'root' })
export class InstitutionsRepository {
  private readonly api = inject(ApiClient);
  private readonly base = '/host/institutions';

  list(scope: 'mine' | 'discover', q?: string): Promise<ApiInstitution[]> {
    return this.api.get<ApiInstitution[]>(this.base, { scope, q: q || undefined });
  }

  myRequests(): Promise<ApiInstitutionRequest[]> {
    return this.api.get<ApiInstitutionRequest[]>(`${this.base}/requests/mine`);
  }

  detail(slug: string): Promise<ApiInstitutionDetail> {
    return this.api.get<ApiInstitutionDetail>(`${this.base}/${encodeURIComponent(slug)}`);
  }

  create(input: { name: string; description: string | null; visibility: 'public' | 'private' }): Promise<ApiInstitution> {
    return this.api.post<ApiInstitution>(this.base, input);
  }

  update(id: string, input: Partial<{ name: string; description: string | null; visibility: 'public' | 'private'; cover_url: string | null; avatar_url: string | null }>): Promise<ApiInstitution> {
    return this.api.patch<ApiInstitution>(`${this.base}/${encodeURIComponent(id)}`, input);
  }

  /** Envia o avatar em `multipart/form-data` (campo `avatar`). */
  uploadAvatar(id: string, file: File): Promise<ApiInstitution> {
    const body = new FormData();
    body.append('avatar', file);
    return this.api.postForm<ApiInstitution>(`${this.base}/${encodeURIComponent(id)}/avatar/upload`, body);
  }

  removeAvatar(id: string): Promise<ApiInstitution> {
    return this.api.deleteWithData<ApiInstitution>(`${this.base}/${encodeURIComponent(id)}/avatar`);
  }

  /** Envia a capa em `multipart/form-data` (campo `cover`). */
  uploadCover(id: string, file: File): Promise<ApiInstitution> {
    const body = new FormData();
    body.append('cover', file);
    return this.api.postForm<ApiInstitution>(`${this.base}/${encodeURIComponent(id)}/cover/upload`, body);
  }

  removeCover(id: string): Promise<ApiInstitution> {
    return this.api.deleteWithData<ApiInstitution>(`${this.base}/${encodeURIComponent(id)}/cover`);
  }

  remove(id: string, confirmName: string): Promise<void> {
    return this.api.deleteWithBody(`${this.base}/${encodeURIComponent(id)}`, { confirm_name: confirmName });
  }

  requestJoin(id: string, communityId: string): Promise<ApiInstitutionRequest> {
    return this.api.post<ApiInstitutionRequest>(`${this.base}/${encodeURIComponent(id)}/join-requests`, { community_id: communityId });
  }

  invite(id: string, communityId: string): Promise<ApiInstitutionRequest> {
    return this.api.post<ApiInstitutionRequest>(`${this.base}/${encodeURIComponent(id)}/invitations`, { community_id: communityId });
  }

  startRemoval(id: string, communityId: string): Promise<ApiInstitutionRequest> {
    return this.api.post<ApiInstitutionRequest>(`${this.base}/${encodeURIComponent(id)}/removals`, { community_id: communityId });
  }

  leave(id: string, communityId: string): Promise<void> {
    return this.api.postNoContent(`${this.base}/${encodeURIComponent(id)}/leave`, { community_id: communityId });
  }

  accept(requestId: string): Promise<{ ok: true }> {
    return this.api.post<{ ok: true }>(`${this.base}/requests/${encodeURIComponent(requestId)}/accept`, {});
  }

  reject(requestId: string): Promise<{ ok: true }> {
    return this.api.post<{ ok: true }>(`${this.base}/requests/${encodeURIComponent(requestId)}/reject`, {});
  }

  approve(requestId: string): Promise<ApiInstitutionRequest> {
    return this.api.post<ApiInstitutionRequest>(`${this.base}/requests/${encodeURIComponent(requestId)}/approve`, {});
  }

  confirm(requestId: string, code: string): Promise<ApiInstitutionRequest> {
    return this.api.post<ApiInstitutionRequest>(`${this.base}/requests/${encodeURIComponent(requestId)}/confirm`, { code });
  }
}
