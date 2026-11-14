import { computed, Injectable, signal } from '@angular/core';
import {
  AddGuestResult,
  CreateEventInput,
  EventActivity,
  EventStats,
  Guest,
  GuestInput,
  HostEvent,
  InvitationView,
  RsvpStatus,
  TemplateId,
  WorkspaceTask,
} from '../models/models';
import {
  EVENT_TEMPLATES,
  HOST_PROFILE,
  SEED_ACTIVITY,
  SEED_EVENTS,
  SEED_GUESTS,
  SEED_TASKS,
} from '../data/mock-data';

const cloneEvents = (): HostEvent[] =>
  SEED_EVENTS.map((event) => ({
    ...event,
    bankDetails: event.bankDetails ? { ...event.bankDetails } : null,
  }));

const cloneGuests = (): Guest[] => SEED_GUESTS.map((guest) => ({ ...guest }));
const cloneActivity = (): EventActivity[] => SEED_ACTIVITY.map((item) => ({ ...item }));
const cloneTasks = (): WorkspaceTask[] => SEED_TASKS.map((task) => ({ ...task }));

/**
 * Session-scoped demo workspace.
 * It mirrors the shape of the HTTP contract so it can be replaced by a typed API client
 * without changing the presentation components.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  readonly profile = HOST_PROFILE;
  readonly templates = EVENT_TEMPLATES;

  private readonly eventsState = signal<HostEvent[]>(cloneEvents());
  private readonly guestsState = signal<Guest[]>(cloneGuests());
  private readonly activityState = signal<EventActivity[]>(cloneActivity());
  private readonly tasksState = signal<WorkspaceTask[]>(cloneTasks());

  readonly events = this.eventsState.asReadonly();
  readonly guests = this.guestsState.asReadonly();
  readonly activity = this.activityState.asReadonly();
  readonly tasks = this.tasksState.asReadonly();

  readonly selectedTemplate = signal<TemplateId>('aurora');
  readonly activeManagementEventId = signal<string | null>(null);

  readonly activeEvents = computed(() =>
    this.eventsState().filter((event) => event.status === 'published'),
  );

  readonly upcomingEvents = computed(() =>
    this.activeEvents()
      .filter((event) => new Date(event.startsAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
  );

  readonly nextEvent = computed<HostEvent | null>(() => this.upcomingEvents()[0] ?? null);

  readonly recentEvents = computed(() =>
    this.eventsState()
      .filter((event) => event.status !== 'cancelled')
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, 4),
  );

  readonly globalStats = computed<EventStats & { events: number; drafts: number; completed: number }>(
    () => {
      const guests = this.guestsState();
      const confirmed = guests.filter((guest) => guest.status === 'confirmed').length;
      const declined = guests.filter((guest) => guest.status === 'declined').length;
      const pending = guests.filter((guest) => guest.status === 'pending').length;
      const total = guests.length;
      return {
        events: this.eventsState().filter((event) => event.status === 'published').length,
        drafts: this.eventsState().filter((event) => event.status === 'draft').length,
        completed: this.eventsState().filter((event) => event.status === 'completed').length,
        total,
        confirmed,
        declined,
        pending,
        responseRate: total === 0 ? 0 : Math.round(((confirmed + declined) / total) * 100),
      };
    },
  );

  readonly guestsWithEvent = computed(() =>
    this.guestsState()
      .map((guest) => ({
        guest,
        event: this.eventsState().find((event) => event.id === guest.eventId) ?? null,
      }))
      .filter(
        (entry): entry is { guest: Guest; event: HostEvent } => entry.event !== null,
      ),
  );

  readonly pendingGuests = computed(() =>
    this.guestsWithEvent()
      .filter((entry) => entry.guest.status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime(),
      ),
  );

  readonly activityFeed = computed(() =>
    this.activityState()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .map((item) => ({
        item,
        event: this.eventsState().find((event) => event.id === item.eventId) ?? null,
      }))
      .filter(
        (entry): entry is { item: EventActivity; event: HostEvent } => entry.event !== null,
      ),
  );

  readonly managementEvent = computed<HostEvent | null>(() => {
    const id = this.activeManagementEventId();
    return id ? (this.eventsState().find((event) => event.id === id) ?? null) : null;
  });

  readonly taskProgress = computed(() => {
    const tasks = this.tasksState();
    return {
      done: tasks.filter((task) => task.done).length,
      total: tasks.length,
    };
  });

  eventById(id: string): HostEvent | null {
    return this.eventsState().find((event) => event.id === id) ?? null;
  }

  guestsFor(eventId: string): Guest[] {
    return this.guestsState().filter((guest) => guest.eventId === eventId);
  }

  eventStats(eventId: string): EventStats {
    const guests = this.guestsFor(eventId);
    const confirmed = guests.filter((guest) => guest.status === 'confirmed').length;
    const declined = guests.filter((guest) => guest.status === 'declined').length;
    const pending = guests.filter((guest) => guest.status === 'pending').length;
    const total = guests.length;
    return {
      total,
      confirmed,
      declined,
      pending,
      responseRate: total === 0 ? 0 : Math.round(((confirmed + declined) / total) * 100),
    };
  }

  activityFor(eventId: string): EventActivity[] {
    return this.activityState()
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  tasksFor(eventId: string): WorkspaceTask[] {
    return this.tasksState().filter((task) => task.eventId === eventId);
  }

  setActiveManagement(eventId: string | null): void {
    this.activeManagementEventId.set(eventId);
  }

  findEventByManagementInput(input: string): HostEvent | null {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }
    const candidate = trimmed.split(/[#/]/).filter(Boolean).at(-1) ?? trimmed;
    return this.eventsState().find((event) => event.managementToken === candidate) ?? null;
  }

  findInvitation(token: string): InvitationView | null {
    const event = this.eventsState().find((item) => item.invitationToken === token);
    if (!event || !event.invitationGuestId) {
      return null;
    }
    const guest = this.guestsState().find((item) => item.id === event.invitationGuestId);
    if (!guest) {
      return null;
    }
    const deadline = event.rsvpDeadline ? new Date(event.rsvpDeadline).getTime() : null;
    return {
      event,
      guest,
      deadlinePassed: deadline !== null && Date.now() > deadline,
      countdownDays: Math.max(
        0,
        Math.ceil((new Date(event.startsAt).getTime() - Date.now()) / 86_400_000),
      ),
    };
  }

  updateRsvp(guestId: string, status: RsvpStatus): Guest | null {
    const guest = this.guestsState().find((item) => item.id === guestId) ?? null;
    if (!guest) {
      return null;
    }
    const updated: Guest = {
      ...guest,
      status,
      respondedAt: new Date().toISOString(),
    };
    this.guestsState.update((guests) =>
      guests.map((item) => (item.id === guestId ? updated : item)),
    );
    if (status !== 'pending') {
      this.pushActivity({
        eventId: guest.eventId,
        kind: status === 'confirmed' ? 'rsvp-confirmed' : 'rsvp-declined',
        guestName: guest.name,
      });
    }
    return updated;
  }

  addGuest(eventId: string, input: GuestInput): AddGuestResult {
    const event = this.eventById(eventId);
    if (!event) {
      return { ok: false, reason: 'missing-event' };
    }
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = this.guestsState().some(
      (guest) =>
        guest.eventId === eventId && guest.email.trim().toLowerCase() === normalizedEmail,
    );
    if (duplicate) {
      return { ok: false, reason: 'duplicate' };
    }
    const created: Guest = {
      id: `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      eventId,
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      status: 'pending',
      tableName: null,
      invitedAt: new Date().toISOString(),
      respondedAt: null,
    };
    this.guestsState.update((guests) => [created, ...guests]);
    this.eventsState.update((events) =>
      events.map((item) =>
        item.id === eventId && !item.invitationGuestId
          ? { ...item, invitationGuestId: created.id }
          : item,
      ),
    );
    this.pushActivity({
      eventId,
      kind: 'guest-added',
      guestName: created.name,
    });
    return { ok: true, guest: created };
  }

  removeGuest(guestId: string): void {
    const guest = this.guestsState().find((item) => item.id === guestId);
    if (!guest) {
      return;
    }
    this.guestsState.update((guests) => guests.filter((item) => item.id !== guestId));
    this.eventsState.update((events) =>
      events.map((event) =>
        event.invitationGuestId === guestId ? { ...event, invitationGuestId: null } : event,
      ),
    );
  }

  createEvent(input: CreateEventInput): HostEvent {
    const stamp = Date.now().toString(36);
    const eventId = `evt-${stamp}`;
    const createdAt = new Date().toISOString();
    const guestRecords: Guest[] = input.guests.map((guest, index) => ({
      id: `guest-${stamp}-${index}`,
      eventId,
      name: guest.name.trim(),
      email: guest.email.trim(),
      phone: guest.phone?.trim() || null,
      status: 'pending',
      tableName: null,
      invitedAt: createdAt,
      respondedAt: null,
    }));

    const event: HostEvent = {
      id: eventId,
      title: input.title.trim(),
      type: input.type,
      hostName: input.hostName.trim(),
      hostEmail: input.hostEmail.trim(),
      startsAt: input.startsAt,
      timezone: input.timezone,
      venue: input.venue.trim(),
      city: input.city.trim(),
      onlineLink: input.onlineLink?.trim() || null,
      message: input.message.trim(),
      rules: input.rules.trim(),
      dressCode: input.dressCode.trim(),
      rsvpDeadline: input.rsvpDeadline,
      templateId: input.templateId,
      status: 'published',
      managementToken: `mgmt-${stamp}-${Math.random().toString(36).slice(2, 8)}`,
      invitationToken: `convite-${stamp}`,
      invitationGuestId: guestRecords[0]?.id ?? null,
      contributionEnabled: input.contributionEnabled,
      bankDetails: input.contributionEnabled ? input.bankDetails : null,
      createdAt,
    };

    this.eventsState.update((events) => [event, ...events]);
    if (guestRecords.length > 0) {
      this.guestsState.update((guests) => [...guestRecords, ...guests]);
    }
    this.pushActivity({ eventId, kind: 'event-created', guestName: null });
    this.activeManagementEventId.set(eventId);
    return event;
  }

  updateEvent(
    eventId: string,
    patch: Partial<
      Pick<
        HostEvent,
        'title' | 'venue' | 'city' | 'message' | 'rules' | 'dressCode' | 'status'
      >
    >,
  ): HostEvent | null {
    const current = this.eventById(eventId);
    if (!current) {
      return null;
    }
    const updated: HostEvent = { ...current, ...patch };
    this.eventsState.update((events) =>
      events.map((event) => (event.id === eventId ? updated : event)),
    );
    return updated;
  }

  publishEvent(eventId: string): void {
    this.updateEvent(eventId, { status: 'published' });
  }

  toggleTask(taskId: string): void {
    this.tasksState.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    );
  }

  sendReminder(guestId: string): boolean {
    const guest = this.guestsState().find((item) => item.id === guestId);
    if (!guest) {
      return false;
    }
    this.pushActivity({
      eventId: guest.eventId,
      kind: 'reminder-sent',
      guestName: guest.name,
    });
    return true;
  }

  resetDemo(): void {
    this.eventsState.set(cloneEvents());
    this.guestsState.set(cloneGuests());
    this.activityState.set(cloneActivity());
    this.tasksState.set(cloneTasks());
    this.activeManagementEventId.set(null);
  }

  private pushActivity(input: {
    eventId: string;
    kind: EventActivity['kind'];
    guestName: string | null;
  }): void {
    const item: EventActivity = {
      id: `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      eventId: input.eventId,
      kind: input.kind,
      guestName: input.guestName,
      at: new Date().toISOString(),
    };
    this.activityState.update((activity) => [item, ...activity]);
  }
}
