import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';

export interface EventDraft {
  id: string;
  title: string | null;
  step: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ApiEventDraft {
  id: string;
  title: string | null;
  step: number;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function mapDraft(row: ApiEventDraft): EventDraft {
  return {
    id: row.id,
    title: row.title,
    step: row.step,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable({ providedIn: 'root' })
export class EventDraftsRepository {
  private readonly api = inject(ApiClient);

  async list(): Promise<EventDraft[]> {
    const rows = await this.api.get<ApiEventDraft[]>('/host/event-drafts');
    return rows.map(mapDraft);
  }

  async get(id: string): Promise<EventDraft> {
    return mapDraft(await this.api.get<ApiEventDraft>(`/host/event-drafts/${encodeURIComponent(id)}`));
  }

  async create(input: { title: string | null; step: number; payload: Record<string, unknown> }): Promise<EventDraft> {
    return mapDraft(await this.api.post<ApiEventDraft>('/host/event-drafts', input));
  }

  async update(id: string, input: { title: string | null; step: number; payload: Record<string, unknown> }): Promise<EventDraft> {
    return mapDraft(await this.api.put<ApiEventDraft>(`/host/event-drafts/${encodeURIComponent(id)}`, input));
  }

  async remove(id: string): Promise<void> {
    await this.api.delete(`/host/event-drafts/${encodeURIComponent(id)}`);
  }
}
