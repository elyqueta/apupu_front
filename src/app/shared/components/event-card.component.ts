import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { HostEvent } from '../../core/models/models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { EVENT_TYPE_ICONS, ICONS } from '../../core/ui/icons';
import { AvatarStackComponent } from './avatar-stack.component';
import { StatusBadgeComponent } from './status-badge.component';
import { TemplateArtworkComponent } from './template-artwork.component';

@Component({
  selector: 'app-event-card',
  imports: [
    RouterLink,
    FaIconComponent,
    AvatarStackComponent,
    StatusBadgeComponent,
    TemplateArtworkComponent,
  ],
  template: `
    <a
      [routerLink]="['/eventos', event().id]"
      class="group relative flex h-full flex-col overflow-hidden rounded-4xl border border-line bg-surface shadow-card backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-glow focus-visible:-translate-y-1"
    >
      <div class="relative p-3 pb-0">
        <app-template-artwork
          [templateId]="event().templateId"
          variant="cover"
          [showIcon]="false"
          class="block overflow-hidden rounded-3xl"
        />

        <div class="absolute left-6 top-6">
          <app-status-badge [value]="event().status" />
        </div>

        <div
          class="absolute right-6 top-6 min-w-14 rounded-2xl border border-white/20 bg-canvas/55 px-3 py-1.5 text-center text-white shadow-card backdrop-blur-xl"
        >
          <span class="block font-display text-xl font-semibold leading-none">
            {{ i18n.dayNumber(event().startsAt, event().timezone) }}
          </span>
          <span class="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
            {{ i18n.monthShort(event().startsAt, event().timezone) }}
          </span>
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-4 p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-strong">
              {{ typeLabel() }}
            </p>
            <h3 class="mt-1 font-display text-lg font-semibold leading-snug tracking-tight text-ink">
              {{ event().title }}
            </h3>
          </div>
          <span
            class="grid size-10 shrink-0 place-items-center rounded-2xl border border-line bg-surface-raised text-brand-strong transition duration-300 group-hover:border-brand/30 group-hover:text-brand"
          >
            <fa-icon [icon]="typeIcon()" class="text-sm" aria-hidden="true" />
          </span>
        </div>

        <div class="flex flex-col gap-2 text-xs text-muted">
          <span class="flex items-center gap-2">
            <fa-icon [icon]="icons['calendar']" class="text-[11px] text-brand" aria-hidden="true" />
            {{ i18n.longDate(event().startsAt, event().timezone) }}
            <span class="text-muted/60">·</span>
            {{ i18n.time(event().startsAt, event().timezone) }}
          </span>
          <span class="flex items-center gap-2 truncate">
            <fa-icon [icon]="icons['location']" class="text-[11px] text-aqua" aria-hidden="true" />
            <span class="truncate">{{ event().venue }}, {{ event().city }}</span>
          </span>
        </div>

        <div class="mt-auto">
          <div class="flex items-center justify-between gap-3 text-[11px]">
            <span class="font-medium text-muted">{{ i18n.t('events.card.rate') }}</span>
            <span class="font-semibold text-ink">{{ stats().responseRate }}%</span>
          </div>
          <svg viewBox="0 0 100 4" preserveAspectRatio="none" class="mt-2 h-1.5 w-full" aria-hidden="true">
            <rect width="100" height="4" rx="2" class="fill-line" />
            <rect [attr.width]="stats().responseRate" height="4" rx="2" class="fill-mint" />
          </svg>
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-line pt-4">
          <div class="flex items-center gap-2.5">
            @if (guestNames().length > 0) {
              <app-avatar-stack [names]="guestNames()" [max]="3" />
              <span class="text-[11px] text-muted">
                {{ i18n.t('events.card.confirmed', { count: stats().confirmed, total: stats().total }) }}
              </span>
            } @else {
              <span class="text-[11px] text-muted">{{ i18n.t('events.card.noGuests') }}</span>
            }
          </div>
          <span
            class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-strong transition group-hover:gap-2.5"
          >
            {{ i18n.t('events.card.open') }}
            <fa-icon [icon]="icons['arrowRight']" class="text-[10px]" aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  `,
})
export class EventCardComponent {
  private readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly event = input.required<HostEvent>();

  protected readonly stats = computed(() => this.store.eventStats(this.event().id));
  protected readonly guestNames = computed(() =>
    this.store
      .guestsFor(this.event().id)
      .slice(0, 4)
      .map((guest) => guest.name),
  );
  protected readonly typeLabel = computed(() =>
    this.i18n.t(`type.${this.event().type}` as TranslationKey),
  );
  protected readonly typeIcon = computed(() => EVENT_TYPE_ICONS[this.event().type] ?? ICONS['star']);
}
