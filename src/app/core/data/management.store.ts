import { inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiEvent } from '../api/api.models';
import { mapEvent } from '../api/mappers';
import { HostEvent } from '../models/models';
import { Resettable, SessionCache } from '../services/session-cache';
import { EventsRepository } from './events.repository';

interface HostSessionEnvelope {
  event: ApiEvent;
  csrf_token: string;
  expires_at: string;
  manage_email_status: 'queued' | 'failed';
  manage_token_expires_at: string | null;
}

/**
 * Fluxo de gestão por link (`/host/session`): mantém o evento atualmente gerido
 * e o estado do email com o link de gestão. Limpo quando a sessão muda.
 */
@Injectable({ providedIn: 'root' })
export class ManagementStore implements Resettable {
  private readonly api = inject(ApiClient);
  private readonly events = inject(EventsRepository);
  private readonly sessions = inject(SessionCache);

  private readonly activeEventIdState = signal<string | null>(null);
  private readonly manageEmailStatusState = signal<'queued' | 'failed' | null>(null);

  readonly activeEventId = this.activeEventIdState.asReadonly();
  readonly manageEmailStatus = this.manageEmailStatusState.asReadonly();

  constructor() {
    this.sessions.register(this);
  }

  setActive(eventId: string | null): void {
    this.activeEventIdState.set(eventId);
  }

  setManageEmailStatus(status: 'queued' | 'failed'): void {
    this.manageEmailStatusState.set(status);
  }

  async open(token: string): Promise<HostEvent> {
    const response = await this.api.post<HostSessionEnvelope>('/host/session', { token });
    const event = mapEvent(response.event);
    this.events.upsert(event);
    this.activeEventIdState.set(event.id);
    return event;
  }

  async end(eventId: string): Promise<void> {
    await this.api.delete(`/host/session/${encodeURIComponent(eventId)}`);
    this.activeEventIdState.set(null);
  }

  reset(): void {
    this.activeEventIdState.set(null);
    this.manageEmailStatusState.set(null);
  }
}
