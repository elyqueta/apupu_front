import { computed, Injectable, signal, inject } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { ApiError, toApiError } from '../api/api-error';
import {
  ApiActivity,
  ApiEvent,
  ApiInvitation,
  ApiTask,
  ApiTemplate,
  DashboardData,
  EventLocation,
  Host,
  Pagination,
  ReportSummary,
  CreateEventRequest,
} from '../api/api.models';
import {
  AddGuestResult,
  BankDetails,
  CreateEventInput,
  EventActivity,
  EventStats,
  EventTemplate,
  Guest,
  GuestInput,
  HostEvent,
  HostProfile,
  RsvpStatus,
  TemplateId,
  WorkspaceTask,
} from '../models/models';

interface ApiPage<T> {
  data: T[];
  pagination: Pagination;
}

interface ApiHostGuest extends ApiInvitation {
  event: Pick<ApiEvent, 'id' | 'title' | 'starts_at' | 'status'>;
}

interface HostEnvelope {
  host: Host;
}

interface EventCreateEnvelope {
  event: ApiEvent;
  manage_email_status: 'sent' | 'failed';
  deliveries: Array<{ email: string; status: 'queued' }>;
}

interface EventDetailEnvelope {
  event: ApiEvent;
  invitations: ApiInvitation[];
}

interface HostSessionEnvelope {
  event: ApiEvent;
  csrf_token: string;
  expires_at: string;
  manage_email_status: 'sent' | 'failed';
  manage_token_expires_at: string | null;
}

interface InvitationEnvelope {
  status?: 'queued';
  id?: string;
  event_id?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string | null;
  table_name?: string | null;
  rsvp_status?: 'pending' | 'accepted' | 'declined';
  rsvp_responded_at?: string | null;
  send_status?: 'pending' | 'queued' | 'sent' | 'failed';
  send_count?: number;
  last_sent_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceStore {
  private readonly api = inject(ApiClient);

  private readonly eventsState = signal<HostEvent[]>([]);
  private readonly guestsState = signal<Guest[]>([]);
  private readonly activityState = signal<EventActivity[]>([]);
  private readonly tasksState = signal<WorkspaceTask[]>([]);
  private readonly templatesState = signal<EventTemplate[]>([]);
  private readonly reportState = signal<ReportSummary | null>(null);
  private readonly dashboardState = signal<DashboardData | null>(null);
  private readonly profileState = signal<HostProfile>({
    name: '',
    email: '',
    phone: null,
    birthDate: null,
    locale: 'pt-AO',
    timezone: 'Africa/Luanda',
    avatarUrl: null,
    emailVerified: false,
    profileComplete: false,
  });
  private readonly loadingState = signal(true);
  private readonly errorState = signal<ApiError | null>(null);
  private readonly activeManagementEventIdState = signal<string | null>(null);
  private readonly manageEmailStatusState = signal<'sent' | 'failed' | null>(null);

  readonly events = this.eventsState.asReadonly();
  readonly guests = this.guestsState.asReadonly();
  readonly activity = this.activityState.asReadonly();
  readonly tasks = this.tasksState.asReadonly();
  readonly templates = this.templatesState.asReadonly();
  readonly reportSummary = this.reportState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly manageEmailStatus = this.manageEmailStatusState.asReadonly();
  readonly selectedTemplate = signal<TemplateId | null>(null);
  readonly activeManagementEventId = this.activeManagementEventIdState.asReadonly();

  readonly activeEvents = computed(() =>
    this.eventsState().filter((event) => event.status === 'published'),
  );

  readonly upcomingEvents = computed(() =>
    this.activeEvents()
      .filter((event) => event.startsAt && new Date(event.startsAt).getTime() >= Date.now())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
  );

  readonly nextEvent = computed<HostEvent | null>(() => {
    const next = this.dashboardState()?.next_event;
    return next ? mapEvent(next) : (this.upcomingEvents()[0] ?? null);
  });

  readonly recentEvents = computed(() =>
    [...this.eventsState()]
      .filter((event) => event.status !== 'cancelled')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4),
  );

  readonly globalStats = computed<EventStats & { events: number; drafts: number; completed: number }>(
    () => {
      const totals = this.dashboardState()?.totals;
      if (totals) {
        return {
          events: totals.scheduled,
          drafts: totals.drafts,
          completed: totals.completed,
          total: totals.total_invitations,
          confirmed: totals.accepted,
          pending: totals.pending,
          declined: totals.declined,
          responseRate: totals.total_invitations
            ? Math.round(((totals.accepted + totals.declined) / totals.total_invitations) * 100)
            : 0,
        };
      }
      return this.statsForEvents(this.eventsState());
    },
  );

  readonly guestsWithEvent = computed(() => {
    const events = this.eventsState();
    return this.guestsState()
      .map((guest) => ({
        guest,
        event: events.find((event) => event.id === guest.eventId) ?? null,
      }))
      .filter(
        (entry): entry is { guest: Guest; event: HostEvent } => entry.event !== null,
      );
  });

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
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((item) => ({
        item,
        event: this.eventsState().find((event) => event.id === item.eventId) ?? null,
      }))
      .filter(
        (entry): entry is { item: EventActivity; event: HostEvent } => entry.event !== null,
      ),
  );

  readonly managementEvent = computed<HostEvent | null>(() => {
    const id = this.activeManagementEventIdState();
    return id ? (this.eventsState().find((event) => event.id === id) ?? null) : null;
  });

  readonly taskProgress = computed(() => {
    const tasks = this.tasksState();
    return {
      done: tasks.filter((task) => task.done).length,
      total: tasks.length,
    };
  });

  constructor() {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);
    try {
      const [
        events,
        guests,
        activity,
        tasks,
        profile,
        templates,
        dashboard,
        reports,
      ] = await Promise.all([
        this.api.get<ApiPage<ApiEvent>>('/host/events', {
          page: 1,
          page_size: 100,
          sort: 'starts_at',
          order: 'asc',
        }),
        this.api.get<ApiPage<ApiHostGuest>>('/host/guests', {
          page: 1,
          page_size: 100,
        }),
        this.api.get<ApiPage<ApiActivity>>('/host/activity', {
          page: 1,
          page_size: 100,
        }),
        this.api.get<ApiTask[]>('/host/tasks'),
        this.api.get<HostEnvelope>('/host/profile'),
        this.api.get<ApiTemplate[]>('/templates'),
        this.api.get<DashboardData>('/host/dashboard'),
        this.api.get<ReportSummary>('/host/reports/summary'),
      ]);

      const mappedEvents = events.data.map(mapEvent);
      this.eventsState.set(mappedEvents);
      this.guestsState.set(guests.data.map(mapInvitation));
      this.activityState.set(activity.data.map(mapActivity));
      this.tasksState.set(tasks.map(mapTask));
      this.templatesState.set(templates.map(mapTemplate));
      this.profileState.set(mapProfile(profile.host));
      this.dashboardState.set(dashboard);
      this.reportState.set(reports);
    } catch (error: unknown) {
      this.errorState.set(toApiError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  eventById(id: string): HostEvent | null {
    return this.eventsState().find((event) => event.id === id) ?? null;
  }

  guestsFor(eventId: string): Guest[] {
    return this.guestsState().filter((guest) => guest.eventId === eventId);
  }

  eventStats(eventId: string): EventStats {
    const event = this.eventById(eventId);
    if (event?.stats) {
      return event.stats;
    }
    return this.statsForGuests(this.guestsFor(eventId));
  }

  activityFor(eventId: string): EventActivity[] {
    return this.activityState()
      .filter((item) => item.eventId === eventId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  tasksFor(eventId: string): WorkspaceTask[] {
    return this.tasksState().filter((task) => task.eventId === eventId);
  }

  setActiveManagement(eventId: string | null): void {
    this.activeManagementEventIdState.set(eventId);
  }

  async openManagementLink(token: string): Promise<HostEvent> {
    const response = await this.api.post<HostSessionEnvelope>('/host/session', { token });
    const event = mapEvent(response.event);
    this.upsertEvent(event);
    this.activeManagementEventIdState.set(event.id);
    return event;
  }

  async endManagement(eventId: string): Promise<void> {
    await this.api.delete(`/host/session/${encodeURIComponent(eventId)}`);
    this.activeManagementEventIdState.set(null);
  }

  async createEvent(input: CreateEventInput): Promise<HostEvent> {
    const request: CreateEventRequest = {
      event: {
        title: input.title,
        host_name: input.hostName,
        host_email: input.hostEmail,
        category: input.type,
        starts_at: input.startsAt,
        timezone: input.timezone,
        location: locationFromInput(input),
        message: input.message,
        rules: input.rules || undefined,
        dress_code: input.dressCode || undefined,
        template_id: input.templateId,
        theme: { mode: 'dark', palette: 'default' },
        contribution: contributionFromInput(input),
        rsvp_deadline: input.rsvpDeadline,
      },
      guests: input.guests.map((guest) => ({
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
      })),
    };
    const response = await this.api.post<EventCreateEnvelope>('/host/events', request);
    this.manageEmailStatusState.set(response.manage_email_status);
    const event = mapEvent(response.event);
    this.upsertEvent(event);
    await this.reload();
    return this.eventById(event.id) ?? event;
  }

  async updateEvent(
    eventId: string,
    patch: Partial<
      Pick<HostEvent, 'title' | 'venue' | 'city' | 'message' | 'rules' | 'dressCode' | 'status'>
    >,
  ): Promise<HostEvent | null> {
    const current = this.eventById(eventId);
    if (!current) {
      return null;
    }
    const body: Record<string, unknown> = {};
    if (patch.title !== undefined) body['title'] = patch.title;
    if (patch.message !== undefined) body['message'] = patch.message;
    if (patch.rules !== undefined) body['rules'] = patch.rules;
    if (patch.dressCode !== undefined) body['dress_code'] = patch.dressCode;
    if (patch.status !== undefined) {
      body['status'] = patch.status === 'published' ? 'scheduled' : patch.status;
    }
    if (patch.venue !== undefined || patch.city !== undefined) {
      body['location'] = locationFromView(current, {
        venue: patch.venue,
        city: patch.city,
      });
    }
    const response = await this.api.patch<ApiEvent>(`/host/events/${encodeURIComponent(eventId)}`, body);
    const updated = mapEvent(response);
    this.upsertEvent(updated);
    return updated;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.api.delete(`/host/events/${encodeURIComponent(eventId)}`);
    this.eventsState.update((events) => events.filter((event) => event.id !== eventId));
    this.guestsState.update((guests) => guests.filter((guest) => guest.eventId !== eventId));
  }

  async resendManageLink(eventId: string): Promise<'sent' | 'failed'> {
    const response = await this.api.post<{ manage_email_status: 'sent' | 'failed' }>(
      `/host/events/${encodeURIComponent(eventId)}/manage-link/resend`,
    );
    return response.manage_email_status;
  }

  async addGuest(eventId: string, input: GuestInput): Promise<AddGuestResult> {
    const response = await this.api.post<ApiInvitation>(
      `/host/events/${encodeURIComponent(eventId)}/invitations`,
      { name: input.name, email: input.email, phone: input.phone },
    );
    const guest = mapInvitation(response);
    this.guestsState.update((guests) => [guest, ...guests]);
    return { ok: true, guest };
  }

  async removeGuest(guestId: string): Promise<void> {
    const guest = this.guestsState().find((item) => item.id === guestId);
    if (!guest) {
      return;
    }
    await this.api.delete(
      `/host/events/${encodeURIComponent(guest.eventId)}/invitations/${encodeURIComponent(guestId)}`,
    );
    this.guestsState.update((guests) => guests.filter((item) => item.id !== guestId));
  }

  async sendReminder(guestId: string): Promise<boolean> {
    const guest = this.guestsState().find((item) => item.id === guestId);
    if (!guest) {
      return false;
    }
    await this.api.post(
      `/host/events/${encodeURIComponent(guest.eventId)}/invitations/${encodeURIComponent(guestId)}/resend`,
    );
    return true;
  }

  async toggleTask(taskId: string): Promise<void> {
    const current = this.tasksState().find((task) => task.id === taskId);
    if (!current) {
      return;
    }
    const response = await this.api.patch<ApiTask>(`/host/tasks/${encodeURIComponent(taskId)}`, {
      done: !current.done,
    });
    const updated = mapTask(response);
    this.tasksState.update((tasks) =>
      tasks.map((task) => (task.id === taskId ? updated : task)),
    );
  }

  async createTask(label: string, eventId: string | null = null): Promise<WorkspaceTask> {
    const response = await this.api.post<ApiTask>('/host/tasks', {
      label,
      event_id: eventId,
    });
    const task = mapTask(response);
    this.tasksState.update((tasks) => [task, ...tasks]);
    return task;
  }

  async removeTask(taskId: string): Promise<void> {
    await this.api.delete(`/host/tasks/${encodeURIComponent(taskId)}`);
    this.tasksState.update((tasks) => tasks.filter((task) => task.id !== taskId));
  }

  async saveProfile(input: {
    display_name: string;
    phone: string | null;
    birth_date: string | null;
    locale: string;
    timezone: string;
    avatar_url?: string | null;
  }): Promise<HostProfile> {
    const response = await this.api.patch<HostEnvelope>('/host/profile', input);
    const profile = mapProfile(response.host);
    this.profileState.set(profile);
    return profile;
  }

  private upsertEvent(event: HostEvent): void {
    this.eventsState.update((events) => {
      const exists = events.some((item) => item.id === event.id);
      return exists
        ? events.map((item) => (item.id === event.id ? event : item))
        : [event, ...events];
    });
  }

  private statsForEvents(events: HostEvent[]): EventStats & {
    events: number;
    drafts: number;
    completed: number;
  } {
    const total = events.reduce((sum, event) => sum + (event.stats?.total ?? 0), 0);
    const confirmed = events.reduce((sum, event) => sum + (event.stats?.confirmed ?? 0), 0);
    const declined = events.reduce((sum, event) => sum + (event.stats?.declined ?? 0), 0);
    const pending = events.reduce((sum, event) => sum + (event.stats?.pending ?? 0), 0);
    return {
      events: events.filter((event) => event.status === 'published').length,
      drafts: events.filter((event) => event.status === 'draft').length,
      completed: events.filter((event) => event.status === 'completed').length,
      total,
      confirmed,
      declined,
      pending,
      responseRate: total === 0 ? 0 : Math.round(((confirmed + declined) / total) * 100),
    };
  }

  private statsForGuests(guests: Guest[]): EventStats {
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
}

function mapEvent(event: ApiEvent): HostEvent {
  const location = event.location;
  const contribution = event.contribution;
  return {
    id: event.id,
    title: event.title,
    type: event.category,
    hostName: event.host_name,
    hostEmail: event.host_email,
    startsAt: event.starts_at ?? '',
    timezone: event.timezone,
    venue: location.type === 'venue' ? (location.name ?? '') : '',
    city: location.type === 'venue' ? (location.address ?? '') : '',
    onlineLink: location.type === 'online' ? (location.online_url ?? null) : null,
    message: event.message ?? '',
    rules: event.rules ?? '',
    dressCode: event.dress_code ?? '',
    rsvpDeadline: event.rsvp_deadline,
    templateId: event.template_id,
    status: event.status === 'scheduled' ? 'published' : event.status,
    contributionEnabled: contribution.enabled,
    bankDetails:
      contribution.enabled &&
      contribution.bank_name &&
      contribution.account_holder &&
      contribution.account_reference
        ? {
            bankName: contribution.bank_name,
            accountHolder: contribution.account_holder,
            accountReference: contribution.account_reference,
          }
        : null,
    createdAt: event.created_at,
    stats: event.stats
      ? {
          total: event.stats.total_invitations,
          confirmed: event.stats.accepted,
          declined: event.stats.declined,
          pending: event.stats.pending,
          responseRate:
            event.stats.total_invitations === 0
              ? 0
              : Math.round(
                  ((event.stats.accepted + event.stats.declined) /
                    event.stats.total_invitations) *
                    100,
                ),
        }
      : undefined,
  };
}

function mapInvitation(invitation: ApiInvitation): Guest {
  return {
    id: invitation.id,
    eventId: invitation.event_id,
    name: invitation.guest_name,
    email: invitation.guest_email,
    phone: invitation.guest_phone,
    status: invitation.rsvp_status === 'accepted' ? 'confirmed' : invitation.rsvp_status,
    tableName: invitation.table_name,
    invitedAt: invitation.created_at,
    respondedAt: invitation.rsvp_responded_at,
  };
}

function mapActivity(activity: ApiActivity): EventActivity {
  return {
    id: activity.id,
    eventId: activity.event_id,
    kind: activity.kind,
    guestName: activity.guest_name,
    at: activity.at,
  };
}

function mapTask(task: ApiTask): WorkspaceTask {
  return {
    id: task.id,
    eventId: task.event_id,
    label: task.label,
    done: task.done,
  };
}

function mapTemplate(template: ApiTemplate): EventTemplate {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    description: template.description,
    previewImageUrl: template.preview_image_url,
    supportedFields: template.supported_fields,
    themes: template.themes,
  };
}

function mapProfile(host: Host): HostProfile {
  return {
    name: host.profile.display_name,
    email: host.email,
    phone: host.profile.phone,
    birthDate: host.profile.birth_date,
    locale: host.profile.locale === 'en' ? 'en' : 'pt-AO',
    timezone: host.profile.timezone,
    avatarUrl: host.profile.avatar_url,
    emailVerified: host.email_verified,
    profileComplete: host.profile_complete,
  };
}

function locationFromInput(input: CreateEventInput): EventLocation {
  if (input.onlineLink) {
    return { type: 'online', online_url: input.onlineLink };
  }
  return {
    type: 'venue',
    name: input.venue,
    address: input.city || null,
  };
}

function locationFromView(
  current: HostEvent,
  patch: { venue?: string; city?: string },
): EventLocation {
  if (current.onlineLink) {
    return { type: 'online', online_url: current.onlineLink };
  }
  return {
    type: 'venue',
    name: patch.venue ?? current.venue,
    address: patch.city ?? current.city,
  };
}

function contributionFromInput(input: CreateEventInput): {
  enabled: boolean;
  bank_name?: string;
  account_holder?: string;
  account_reference?: string;
} {
  if (!input.contributionEnabled || !input.bankDetails) {
    return { enabled: false };
  }
  const details: BankDetails = input.bankDetails;
  return {
    enabled: true,
    bank_name: details.bankName,
    account_holder: details.accountHolder,
    account_reference: details.accountReference,
  };
}
