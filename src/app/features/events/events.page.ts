import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventStatus, HostEvent } from '../../core/models/models';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { EventCardComponent } from '../../shared/components/event-card.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';

type EventFilter = 'all' | 'published' | 'draft' | 'completed';

@Component({
  selector: 'app-events-page',
  imports: [RouterLink, FaIconComponent, EventCardComponent, StatCardComponent],
  templateUrl: './events.page.html',
})
export class EventsPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly activeFilter = signal<EventFilter>('all');
  protected readonly search = signal('');

  protected readonly filters: Array<{ id: EventFilter; labelKey: TranslationKey }> = [
    { id: 'all', labelKey: 'events.filter.all' },
    { id: 'published', labelKey: 'events.filter.published' },
    { id: 'draft', labelKey: 'events.filter.draft' },
    { id: 'completed', labelKey: 'events.filter.completed' },
  ];

  protected readonly stats = this.store.globalStats;

  protected readonly averageRate = computed(() => {
    const events = this.store.events();
    if (events.length === 0) {
      return 0;
    }
    const total = events.reduce((sum, event) => sum + this.store.eventStats(event.id).responseRate, 0);
    return Math.round(total / events.length);
  });

  protected readonly counts = computed(() => {
    const events = this.store.events();
    return {
      all: events.length,
      published: events.filter((event) => event.status === 'published').length,
      draft: events.filter((event) => event.status === 'draft').length,
      completed: events.filter((event) => event.status === 'completed').length,
    } satisfies Record<EventFilter, number>;
  });

  protected readonly filtered = computed<HostEvent[]>(() => {
    const filter = this.activeFilter();
    const term = this.search().trim().toLocaleLowerCase(this.i18n.locale());
    return this.store
      .events()
      .filter((event) => filter === 'all' || event.status === (filter as EventStatus))
      .filter((event) => {
        if (!term) {
          return true;
        }
        return `${event.title} ${event.hostName} ${event.venue} ${event.city}`
          .toLocaleLowerCase(this.i18n.locale())
          .includes(term);
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  });

  protected count(filter: EventFilter): number {
    return this.counts()[filter];
  }

  protected setFilter(filter: EventFilter): void {
    this.activeFilter.set(filter);
  }
}
