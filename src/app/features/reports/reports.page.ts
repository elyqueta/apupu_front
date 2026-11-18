import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { ReportExportFormat, ReportsRepository } from '../../core/data/reports.repository';
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
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);
  private readonly reports = inject(ReportsRepository);
  protected readonly exportOpen = signal(false);
  protected readonly exporting = signal<ReportExportFormat | null>(null);

  constructor() {
    this.store.load({ reports: true, events: true, dashboard: true });
  }

  protected readonly stats = computed(() => {
    const totals = this.store.reportSummary()?.totals;
    const workspaceStats = this.store.globalStats();
    return totals
      ? {
          events: this.store.reportSummary()?.events.length ?? 0,
          drafts: workspaceStats.drafts,
          completed: workspaceStats.completed,
          total: totals.total_invitations,
          confirmed: totals.accepted,
          pending: totals.pending,
          declined: totals.declined,
          responseRate: Math.round(totals.response_rate * 100),
        }
      : this.store.globalStats();
  });

  protected readonly rows = computed<EventReportRow[]>(() => {
    const report = this.store.reportSummary();
    if (!report) {
      return [];
    }
    return report.events
      .map((item) => {
        const event = this.store.eventById(item.event_id);
        if (!event) {
          return null;
        }
        const total = item.total_invitations;
        return {
          event,
          stats: {
            total,
            confirmed: item.accepted,
            declined: item.declined,
            pending: item.pending,
            responseRate: total === 0 ? 0 : Math.round(((item.accepted + item.declined) / total) * 100),
          },
        };
      })
      .filter((row): row is EventReportRow => row !== null)
      .sort((a, b) => b.stats.responseRate - a.stats.responseRate);
  });

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

  protected toggleExport(): void {
    this.exportOpen.update((open) => !open);
  }

  protected async exportReport(format: ReportExportFormat): Promise<void> {
    if (!this.browser || this.exporting() !== null) {
      return;
    }

    this.exportOpen.set(false);
    this.exporting.set(format);

    try {
      const file = await this.reports.export(format);
      const url = URL.createObjectURL(file.blob);
      const link = this.document.createElement('a');
      link.href = url;
      link.download = file.filename ?? `conto-contigo-relatorio.${format}`;
      link.hidden = true;
      this.document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      this.toasts.success(this.i18n.t('reports.exported'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.exporting.set(null);
    }
  }
}
