import { Component, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { TeamsRepository } from '../../../core/data/teams.repository';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { EventPermissions, Team, TeamMember } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { AvatarStackComponent } from '../../../shared/components/avatar-stack.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';
import { TeamMemberDetailDialogComponent } from '../../../shared/components/team-member-detail-dialog.component';

/** Cartões das equipas do evento, com membros e tarefas abertas. */
@Component({
  selector: 'app-event-teams-section',
  imports: [FaIconComponent, AvatarStackComponent, SkeletonComponent, TeamMemberDetailDialogComponent],
  template: `
    <article
      class="rounded-4xl border border-line bg-surface p-5 shadow-card backdrop-blur-2xl"
      [attr.data-event-id]="eventId()"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">
            {{ i18n.t('eventDetail.tabs.teams') }}
          </p>
          @if (!permissions().canManageTeams) {
            <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.permissionsHint') }}</p>
          }
        </div>
        @if (permissions().canManageTeams) {
          <button
            type="button"
            class="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
            (click)="createTeam.emit()"
          >
            <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
            {{ i18n.t('teams.new') }}
          </button>
        }
      </div>

      @if (loading()) {
        <app-skeleton variant="cards" />
      } @else if (teams().length === 0) {
        <div
          class="mt-4 flex flex-col items-center rounded-3xl border border-dashed border-line p-6 text-center sm:p-10"
        >
          <span
            class="grid size-12 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
          >
            <fa-icon [icon]="icons['guestGroup']" class="text-lg" aria-hidden="true" />
          </span>
          <p class="mt-3 text-sm font-semibold text-ink">{{ i18n.t('eventDetail.teamsEmpty') }}</p>
          @if (permissions().canManageTeams) {
            <button
              type="button"
              class="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover"
              (click)="createTeam.emit()"
            >
              <fa-icon [icon]="icons['plus']" class="text-xs" aria-hidden="true" />
              {{ i18n.t('teams.new') }}
            </button>
          }
        </div>
      } @else {
        <ul class="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
          @for (team of teams(); track team.id) {
            <li class="w-[min(20rem,calc(100vw-3.5rem))] shrink-0 snap-start sm:w-[21rem]">
              <article
                class="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface-raised/50 shadow-card transition hover:border-brand/30"
              >
                <!-- Cover / team photo -->
                <div class="relative h-32 shrink-0 overflow-hidden bg-gradient-to-br from-brand/30 via-aqua/15 to-secondary/25 sm:h-36">
                  @if (team.photoUrl) {
                    <img
                      [src]="team.photoUrl"
                      [alt]="team.name"
                      class="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent"></div>
                  } @else {
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.12),transparent_40%)]"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="grid size-14 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white/90 backdrop-blur-sm">
                        <fa-icon [icon]="icons['guestGroup']" class="text-2xl" aria-hidden="true" />
                      </span>
                    </div>
                  }

                  <span
                    class="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm"
                    [class]="team.openTaskCount > 0 ? 'border-amber/30 bg-amber/20 text-amber' : 'border-white/20 bg-black/20 text-white'"
                  >
                    <fa-icon [icon]="icons['checklist']" class="text-[10px]" aria-hidden="true" />
                    {{ i18n.t('eventDetail.teamOpenTasks', { count: team.openTaskCount }) }}
                  </span>

                  <div class="absolute inset-x-0 bottom-0 p-3">
                    <p class="truncate text-sm font-semibold text-white">{{ team.name }}</p>
                    <p class="truncate text-[11px] text-white/80">{{ categoryLabel(team) }}</p>
                  </div>
                </div>

                <div class="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  @if (team.description) {
                    <p class="line-clamp-2 text-xs leading-5 text-muted">{{ team.description }}</p>
                  }

                  <div class="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface/60 px-3 py-2.5">
                    @if (team.membersPreview[0]; as manager) {
                      <button
                        type="button"
                        class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-brand/25 bg-brand/15 text-xs font-bold text-brand-strong transition hover:border-brand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                        [attr.aria-label]="i18n.t('block9.team.viewMember') + ': ' + (manager.displayName ?? i18n.t('teams.previewFallback'))"
                        (click)="openMemberDetail(team.id, manager.id, manager.avatarUrl)"
                      >
                        @if (manager.avatarUrl) {
                          <img [src]="manager.avatarUrl" [alt]="manager.displayName ?? ''" class="absolute inset-0 size-full object-cover" loading="lazy" />
                        } @else {
                          {{ (manager.displayName ?? '?').charAt(0).toUpperCase() }}
                        }
                      </button>
                      <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{{ i18n.t('teamRole.gestor') }}</p>
                        <p class="truncate text-xs font-medium text-ink">{{ manager.displayName ?? i18n.t('teams.previewFallback') }}</p>
                      </div>
                    } @else {
                      <span class="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface-raised text-muted">
                        <fa-icon [icon]="icons['user']" class="text-sm" aria-hidden="true" />
                      </span>
                      <div class="min-w-0 flex-1">
                        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{{ i18n.t('teamRole.gestor') }}</p>
                        <p class="truncate text-xs text-muted">—</p>
                      </div>
                    }
                    <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-ink">
                      <fa-icon [icon]="icons['guestGroup']" class="text-[10px] text-muted" aria-hidden="true" />
                      {{ team.memberCount }}
                    </span>
                  </div>

                  @if (team.membersPreview.length > 0) {
                    <div class="flex min-w-0 items-center justify-between gap-2">
                      <app-avatar-stack
                        [names]="previewNames(team)"
                        [images]="previewImages(team)"
                        [ids]="previewIds(team)"
                        [max]="4"
                        [selectable]="true"
                        [selectLabel]="i18n.t('block9.team.viewMember')"
                        (memberSelected)="openMemberDetail(team.id, $event, previewAvatar(team, $event))"
                      />
                      <span class="shrink-0 text-[11px] text-muted">{{ i18n.t('teams.memberCount', { count: team.memberCount }) }}</span>
                    </div>
                  }

                  <button
                    type="button"
                    class="mt-auto inline-flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 hover:bg-brand/5 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                    [attr.aria-label]="i18n.t('teams.openTeamAria', { name: team.name })"
                    (click)="openTeam.emit(team)"
                  >
                    {{ i18n.t('eventDetail.teamOpen') }}
                    <fa-icon [icon]="icons['chevronRight']" class="text-xs" aria-hidden="true" />
                  </button>
                </div>
              </article>
            </li>
          }
        </ul>
      }

      <app-team-member-detail-dialog
        [open]="memberDetailOpen()"
        [member]="memberDetail()"
        [avatarUrl]="memberDetailAvatar()"
        [loading]="memberDetailLoading()"
        (closed)="memberDetailOpen.set(false)"
      />
    </article>
  `,
})
export class EventTeamsSectionComponent {
  readonly teams = input.required<Team[]>();
  readonly loading = input(false);
  readonly permissions = input.required<EventPermissions>();
  readonly eventId = input.required<string>();

  readonly openTeam = output<Team>();
  readonly createTeam = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly teamsRepository = inject(TeamsRepository);

  protected readonly memberDetailOpen = signal(false);
  protected readonly memberDetail = signal<TeamMember | null>(null);
  protected readonly memberDetailAvatar = signal<string | null>(null);
  protected readonly memberDetailLoading = signal(false);

  protected categoryLabel(team: Team): string {
    return this.i18n.t(`teamCategory.${team.category}` as TranslationKey);
  }

  /**
   * `Team` não expõe um campo de gestor; o primeiro membro da pré-visualização
   * é a aproximação disponível para identificar o responsável da equipa.
   */
  protected managerName(team: Team): string {
    return team.membersPreview[0]?.displayName ?? '';
  }

  protected previewNames(team: Team): string[] {
    return team.membersPreview.map(
      (member) => member.displayName ?? this.i18n.t('teams.previewFallback'),
    );
  }

  protected previewImages(team: Team): (string | null)[] {
    return team.membersPreview.map((member) => member.avatarUrl);
  }

  protected previewIds(team: Team): string[] {
    return team.membersPreview.map((member) => member.id);
  }

  protected previewAvatar(team: Team, memberId: string): string | null {
    return team.membersPreview.find((member) => member.id === memberId)?.avatarUrl ?? null;
  }

  protected async openMemberDetail(
    teamId: string,
    memberId: string,
    avatarUrl: string | null,
  ): Promise<void> {
    this.memberDetailAvatar.set(avatarUrl);
    this.memberDetail.set(null);
    this.memberDetailLoading.set(true);
    this.memberDetailOpen.set(true);
    try {
      const page = await this.teamsRepository.listMembers(teamId, { page: 1, pageSize: 100 });
      this.memberDetail.set(page.items.find((member) => member.id === memberId) ?? null);
    } catch {
      this.memberDetailOpen.set(false);
    } finally {
      this.memberDetailLoading.set(false);
    }
  }
}
