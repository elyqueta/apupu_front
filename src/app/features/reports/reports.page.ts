import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
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
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly toasts = inject(ToastService);

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

  protected exportSummary(): void {
    const report = this.store.reportSummary();
    if (!this.browser || !report) {
      this.toasts.error(this.i18n.t('common.errorGeneric'));
      return;
    }

    const rows = [
      ['Event', 'Status', 'Invitations', 'Accepted', 'Declined', 'Pending', 'Response rate (%)'],
      ...report.events.map((event) => [
        safeCsvText(event.title),
        event.status,
        event.total_invitations,
        event.accepted,
        event.declined,
        event.pending,
        event.total_invitations
          ? Math.round(((event.accepted + event.declined) / event.total_invitations) * 100)
          : 0,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `conto-contigo-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.hidden = true;
    this.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.toasts.success(this.i18n.t('reports.exported'));
  }
}

function safeCsvText(value: string): string {
  return /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}
