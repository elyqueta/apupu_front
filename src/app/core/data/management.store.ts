import { inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiEvent, ApiEventAccessRole } from '../api/api.models';
import { mapEvent } from '../api/mappers';
import { EventAccessRole, HostEvent } from '../models/models';
import { Resettable, SessionCache } from '../services/session-cache';
import { EventsRepository } from './events.repository';

interface HostSessionEnvelope {
  event: ApiEvent;
  role?: ApiEventAccessRole;
  access_role?: ApiEventAccessRole;
  csrf_token: string;
  expires_at: string;
  manage_email_status: 'queued' | 'failed' | null;
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
  private readonly roleState = signal<EventAccessRole | null>(null);

  readonly activeEventId = this.activeEventIdState.asReadonly();
  readonly manageEmailStatus = this.manageEmailStatusState.asReadonly();
  /** Papel da sessão de gestão ativa (`host`, `manager` ou `communityMember`). */
  readonly role = this.roleState.asReadonly();

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
    const role: EventAccessRole = response.access_role ?? response.role ?? 'host';
    const event = mapEvent({ ...response.event, access_role: role });
    this.events.upsert(event);
    this.activeEventIdState.set(event.id);
    this.roleState.set(role);
    this.manageEmailStatusState.set(response.manage_email_status ?? null);
    return event;
  }

  async end(eventId: string): Promise<void> {
    await this.api.delete(`/host/session/${encodeURIComponent(eventId)}`);
    this.activeEventIdState.set(null);
    this.roleState.set(null);
  }

  reset(): void {
    this.activeEventIdState.set(null);
    this.manageEmailStatusState.set(null);
    this.roleState.set(null);
  }
}
