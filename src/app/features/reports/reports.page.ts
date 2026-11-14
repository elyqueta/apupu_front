import { Component, computed, inject } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { EventStats, HostEvent } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

interface EventReportRow {
  event: HostEvent;
  stats: EventStats;
}

interface DistributionSlice {
  key: 'confirmed' | 'pending' | 'declined';
  value: number;
  percent: number;
  offset: number;
  stroke: string;
  dot: string;
}

@Component({
  selector: 'app-reports-page',
  imports: [FaIconComponent, StatCardComponent, StatusBadgeComponent],
  templateUrl: './reports.page.html',
})
export class ReportsPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);

  protected readonly stats = this.store.globalStats;

  protected readonly rows = computed<EventReportRow[]>(() =>
    this.store
      .events()
      .map((event) => ({ event, stats: this.store.eventStats(event.id) }))
      .sort((a, b) => b.stats.responseRate - a.stats.responseRate),
  );

  protected readonly topRows = computed(() => this.rows().slice(0, 4));

  protected readonly distribution = computed<DistributionSlice[]>(() => {
    const stats = this.stats();
    const total = Math.max(stats.total, 1);
    const slices = [
      {
        key: 'confirmed' as const,
        value: stats.confirmed,
        percent: Math.round((stats.confirmed / total) * 100),
        stroke: 'stroke-mint',
        dot: 'bg-mint',
      },
      {
        key: 'pending' as const,
        value: stats.pending,
        percent: Math.round((stats.pending / total) * 100),
        stroke: 'stroke-amber',
        dot: 'bg-amber',
      },
      {
        key: 'declined' as const,
        value: stats.declined,
        percent: Math.round((stats.declined / total) * 100),
        stroke: 'stroke-coral',
        dot: 'bg-coral',
      },
    ];
    let offset = 0;
    return slices.map((slice) => {
      const item = { ...slice, offset: -offset };
      offset += slice.percent;
      return item;
    });
  });

  protected readonly channels: Array<{
    key: 'email' | 'sms' | 'whatsapp';
    icon: string;
    active: boolean;
  }> = [
    { key: 'email', icon: 'envelope', active: true },
    { key: 'sms', icon: 'mobile', active: false },
    { key: 'whatsapp', icon: 'whatsapp', active: false },
  ];

  protected exportSummary(): void {
    this.toasts.success(this.i18n.t('reports.exported'));
  }
}
