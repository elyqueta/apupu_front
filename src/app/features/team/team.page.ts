import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import {
  EventStatus,
  HostEvent,
  TeamManager,
  TemplateId,
} from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../shared/components/template-artwork.component';

interface TeamGroup {
  eventId: string;
  title: string;
  startsAt: string | null;
  status: EventStatus;
  timezone: string;
  coverUrl: string | null;
  templateId: TemplateId | null;
  members: TeamManager[];
}

/**
 * Equipas (`/equipas`): todos os gestores dos eventos da conta num só sítio.
 *
 * A lista vem de `GET /host/managers`; adicionar, reenviar e remover usam as
 * rotas por evento, porque as permissões continuam a ser verificadas evento a
 * evento. Só aparecem eventos de que a conta é anfitriã.
 */
@Component({
  selector: 'app-team-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FaIconComponent,
    SkeletonComponent,
    StatCardComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  templateUrl: './team.page.html',
})
export class TeamPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly search = signal('');
  protected readonly adding = signal(false);
  protected readonly busyId = signal<string | null>(null);

  protected readonly loading = this.store.teamLoading;
  protected readonly members = this.store.teamMembers;

  protected readonly form = this.fb.nonNullable.group({
    eventId: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  /** Eventos que a conta organiza (gestores de outros eventos não os gerem). */
  protected readonly hostEvents = computed<HostEvent[]>(() =>
    this.store.events().filter((event) => this.store.isEventHost(event.id)),
  );

  protected readonly stats = computed(() => {
    const members = this.members();
    return {
      managers: members.length,
      events: new Set(members.map((member) => member.eventId)).size,
      accounts: members.filter((member) => member.hasAccount).length,
    };
  });

  protected readonly groups = computed<TeamGroup[]>(() => {
    const term = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    const byEvent = new Map<string, TeamManager[]>();

    for (const member of this.members()) {
      const list = byEvent.get(member.eventId) ?? [];
      list.push(member);
      byEvent.set(member.eventId, list);
    }

    return [...byEvent.entries()]
      .map(([eventId, members]) => {
        const event = this.store.eventById(eventId);
        const summary = members[0].event;
        return {
          eventId,
          title: event?.title ?? summary.title,
          startsAt: event?.startsAt ?? summary.startsAt,
          status: event?.status ?? summary.status,
          timezone: event?.timezone ?? 'Africa/Luanda',
          coverUrl: event?.coverUrl ?? null,
          templateId: event?.templateId ?? null,
          members: [...members].sort((a, b) => a.email.localeCompare(b.email)),
        } satisfies TeamGroup;
      })
      .filter(
        (group) =>
          !term ||
          group.title.toLocaleLowerCase(this.i18n.locale()).includes(term) ||
          group.members.some((member) =>
            member.email.toLocaleLowerCase(this.i18n.locale()).includes(term),
          ),
      )
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
  });

  constructor() {
    this.store.load({ team: true, events: true });

    // A shell carrega os eventos em paralelo; quando a lista chegar (ou se a
    // página for aberta diretamente), escolhe o primeiro evento por omissão.
    effect(() => {
      const first = this.hostEvents()[0]?.id;
      if (first && !this.form.controls.eventId.value) {
        this.form.controls.eventId.setValue(first);
      }
    });
  }

  protected setSearch(value: string): void {
    this.search.set(value);
  }

  protected async addManager(): Promise<void> {
    if (this.adding()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { eventId, email } = this.form.getRawValue();
    this.adding.set(true);

    try {
      const result = await this.store.addTeamManager(eventId, email.trim());
      this.form.controls.email.setValue('');
      if (result.emailStatus === 'queued') {
        this.toasts.success(this.i18n.t('team.added', { email: result.manager.email }));
      } else {
        this.toasts.error(
          this.i18n.t('team.addedNoEmail', { email: result.manager.email }),
        );
      }
      await this.store.reloadTeam();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.adding.set(false);
    }
  }

  protected async resendInvite(manager: TeamManager): Promise<void> {
    if (this.busyId() !== null) {
      return;
    }
    this.busyId.set(manager.id);

    try {
      const result = await this.store.resendTeamManagerInvite(manager.eventId, manager.id);
      if (result.emailStatus === 'queued') {
        this.toasts.success(this.i18n.t('team.resent', { email: manager.email }));
      } else {
        this.toasts.error(this.i18n.t('team.resentFailed', { email: manager.email }));
      }
      await this.store.reloadTeam();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busyId.set(null);
    }
  }

  protected async removeManager(manager: TeamManager): Promise<void> {
    if (this.busyId() !== null) {
      return;
    }
    this.busyId.set(manager.id);

    try {
      await this.store.removeTeamManager(manager.eventId, manager.id);
      this.toasts.success(this.i18n.t('team.removed', { email: manager.email }));
      await this.store.reloadTeam();
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busyId.set(null);
    }
  }
}
