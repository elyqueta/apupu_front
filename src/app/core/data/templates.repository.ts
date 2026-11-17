import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiTemplate } from '../api/api.models';
import { mapTemplate } from '../api/mappers';
import { EventTemplate } from '../models/models';
import { CachedRepository } from './cached-repository';

/** Catálogo de modelos de convite (`GET /templates`). */
@Injectable({ providedIn: 'root' })
export class TemplatesRepository extends CachedRepository<EventTemplate[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<EventTemplate[]> {
    const templates = await this.api.get<ApiTemplate[]>('/templates');
    return templates.map(mapTemplate);
  }
}
