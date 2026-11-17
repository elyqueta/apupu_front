import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiActivity, Pagination } from '../api/api.models';
import { mapActivity } from '../api/mappers';
import { EventActivity } from '../models/models';
import { CachedRepository } from './cached-repository';

export interface ActivityPage {
  items: EventActivity[];
  pagination: Pagination;
}

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

  /** Atividade de um evento, paginada (detalhe do evento e área de gestão). */
  async listForEvent(eventId: string, page = 1, pageSize = 10): Promise<ActivityPage> {
    const result = await this.api.getPage<ApiActivity>(
      `/host/events/${encodeURIComponent(eventId)}/activity`,
      { page, page_size: pageSize },
    );
    return { items: result.data.map(mapActivity), pagination: result.pagination };
  }

  /** Remove uma atividade do evento (só o anfitrião, na área de gestão). */
  async remove(eventId: string, activityId: string): Promise<void> {
    await this.api.delete(
      `/host/events/${encodeURIComponent(eventId)}/activity/${encodeURIComponent(activityId)}`,
    );
    this.mutate((items) => (items ?? []).filter((item) => item.id !== activityId));
  }
}
