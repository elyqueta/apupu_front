import { Component, inject, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { EventPermissions, Team } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { AvatarStackComponent } from '../../../shared/components/avatar-stack.component';
import { SkeletonComponent } from '../../../shared/components/skeleton.component';

/** Cartões das equipas do evento, com membros e tarefas abertas. */
@Component({
  selector: 'app-event-teams-section',
  imports: [FaIconComponent, AvatarStackComponent, SkeletonComponent],
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
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (team of teams(); track team.id) {
            <li class="min-w-0">
              <article
                class="flex h-full min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface-raised/50 p-4 shadow-card"
              >
                <div class="flex min-w-0 items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink">{{ team.name }}</p>
                    <p class="mt-0.5 truncate text-xs text-muted">{{ categoryLabel(team) }}</p>
                  </div>
                  <span
                    class="grid size-9 shrink-0 place-items-center rounded-xl border border-brand/25 bg-brand/15 text-brand-strong"
                  >
                    <fa-icon [icon]="icons['guestGroup']" class="text-sm" aria-hidden="true" />
                  </span>
                </div>

                @if (team.description) {
                  <p class="text-xs leading-5 text-muted">{{ team.description }}</p>
                }

                @if (managerName(team); as name) {
                  <p class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                    <fa-icon [icon]="icons['user']" class="shrink-0 text-xs" aria-hidden="true" />
                    <span class="min-w-0 truncate">{{ i18n.t('eventDetail.teamManager', { name }) }}</span>
                  </p>
                }

                <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                  <span class="inline-flex items-center gap-1.5">
                    <fa-icon [icon]="icons['guestGroup']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('teams.memberCount', { count: team.memberCount }) }}
                  </span>
                  <span
                    class="inline-flex items-center gap-1.5"
                    [class.text-amber]="team.openTaskCount > 0"
                  >
                    <fa-icon [icon]="icons['checklist']" class="text-xs" aria-hidden="true" />
                    {{ i18n.t('eventDetail.teamOpenTasks', { count: team.openTaskCount }) }}
                  </span>
                </div>

                @if (team.membersPreview.length > 0) {
                  <app-avatar-stack
                    [names]="previewNames(team)"
                    [images]="previewImages(team)"
                    [max]="3"
                  />
                }

                <button
                  type="button"
                  class="mt-auto inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand/40 hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                  [attr.aria-label]="i18n.t('teams.openTeamAria', { name: team.name })"
                  (click)="openTeam.emit(team)"
                >
                  {{ i18n.t('eventDetail.teamOpen') }}
                  <fa-icon [icon]="icons['chevronRight']" class="text-xs" aria-hidden="true" />
                </button>
              </article>
            </li>
          }
        </ul>
      }
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
}
