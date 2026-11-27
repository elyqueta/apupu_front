import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiTemplate } from '../api/api.models';
import { mapTemplate } from '../api/mappers';
import { EventTemplate } from '../models/models';
import { CachedRepository } from './cached-repository';
import { SYSTEM_TEMPLATES } from './system-templates';

/** Catálogo de modelos de convite (`GET /templates`). */
@Injectable({ providedIn: 'root' })
export class TemplatesRepository extends CachedRepository<EventTemplate[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<EventTemplate[]> {
    const templates = await this.api.get<ApiTemplate[]>('/templates');
    const remote = templates.map(mapTemplate);
    // Bloco 15B: as definições locais de sistema são a fonte canónica e
    // vêm primeiro; um template remoto com o mesmo slug é ignorado.
    const systemSlugs = new Set(SYSTEM_TEMPLATES.map((template) => template.slug));
    return [
      ...SYSTEM_TEMPLATES,
      ...remote.filter((template) => !systemSlugs.has(template.slug)),
    ];
  }
}
