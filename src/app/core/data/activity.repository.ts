import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiActivity } from '../api/api.models';
import { mapActivity } from '../api/mappers';
import { EventActivity } from '../models/models';
import { CachedRepository } from './cached-repository';

/** Feed de atividade do anfitrião (`GET /host/activity`). */
@Injectable({ providedIn: 'root' })
export class ActivityRepository extends CachedRepository<EventActivity[]> {
  private readonly api = inject(ApiClient);

  protected async fetch(): Promise<EventActivity[]> {
    const page = await this.api.getPage<ApiActivity>('/host/activity', {
      page: 1,
      page_size: 100,
    });
    return page.data.map(mapActivity);
  }
}
