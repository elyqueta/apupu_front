import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { HostEnvelope, mapProfile } from '../api/mappers';
import { HostProfile } from '../models/models';
import { CachedRepository } from './cached-repository';

export interface ProfileUpdateInput {
  display_name: string;
  phone: string | null;
  birth_date: string | null;
  locale: string;
  timezone: string;
  avatar_url?: string | null;
}

/**
 * Perfil do anfitrião (`GET/PATCH /host/profile`). Carregado pela shell e pelas
 * páginas que editam dados pessoais.
 */
@Injectable({ providedIn: 'root' })
export class ProfileRepository extends CachedRepository<HostProfile> {
  private readonly api = inject(ApiClient);

  protected fetch(): Promise<HostProfile> {
    return this.api
      .get<HostEnvelope>('/host/profile')
      .then((response) => mapProfile(response.host));
  }

  async save(input: ProfileUpdateInput): Promise<HostProfile> {
    const response = await this.api.patch<HostEnvelope>('/host/profile', input);
    const profile = mapProfile(response.host);
    this.setData(profile);
    return profile;
  }

  /** Define o avatar a partir de um URL já existente no servidor. */
  async setAvatarUrl(avatarUrl: string): Promise<HostProfile> {
    const response = await this.api.post<HostEnvelope>('/host/profile/avatar', {
      avatar_url: avatarUrl,
    });
    const profile = mapProfile(response.host);
    this.setData(profile);
    return profile;
  }

  /**
   * Envia uma imagem e define-a como avatar. Pode responder `503`
   * (`avatar_upload_unavailable`) quando o Cloudinary não está configurado;
   * nesse caso o chamador deve oferecer o campo de URL.
   */
  async uploadAvatar(file: File): Promise<HostProfile> {
    const body = new FormData();
    body.append('avatar', file);
    const response = await this.api.postForm<HostEnvelope>('/host/profile/avatar/upload', body);
    const profile = mapProfile(response.host);
    this.setData(profile);
    return profile;
  }

  /** Define a capa a partir de um URL já existente no servidor. */
  async setCoverUrl(coverUrl: string): Promise<HostProfile> {
    const response = await this.api.post<HostEnvelope>('/host/profile/cover', {
      cover_url: coverUrl,
    });
    const profile = mapProfile(response.host);
    this.setData(profile);
    return profile;
  }

  /**
   * Envia uma imagem e define-a como capa. Pode responder `503`
   * (`profile_cover_upload_unavailable`) quando o Cloudinary não está
   * configurado; nesse caso o chamador deve oferecer o campo de URL.
   */
  async uploadCover(file: File): Promise<HostProfile> {
    const body = new FormData();
    body.append('cover', file);
    const response = await this.api.postForm<HostEnvelope>('/host/profile/cover/upload', body);
    const profile = mapProfile(response.host);
    this.setData(profile);
    return profile;
  }

  /** Remove a capa do perfil (operação idempotente). */
  async removeCover(): Promise<HostProfile> {
    const response = await this.api.deleteWithData<HostEnvelope>('/host/profile/cover');
    const profile = mapProfile(response.host);
    this.setData(profile);
    return profile;
  }
}
