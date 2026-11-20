import { Component, inject, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { DownloadService } from '../../core/services/download.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { AdminWeeklyReport } from './admin.models';
import { AdminRepository } from './admin.repository';

/** Aba de relatórios: exportação global imediata e downloads semanais. */
@Component({
  selector: 'app-admin-reports',
  imports: [FaIconComponent, SkeletonComponent],
  template: `
    <section data-testid="admin-reports">
      <div class="mb-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-strong">
          {{ i18n.t('admin.nav.reports') }}
        </p>
        <h1 class="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
          {{ i18n.t('admin.reports.title') }}
        </h1>
        <p class="mt-1 text-sm text-muted">{{ i18n.t('admin.reports.subtitle') }}</p>
      </div>

      <div class="rounded-3xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-display text-lg font-semibold text-ink">
              {{ i18n.t('admin.reports.weeklyTitle') }}
            </p>
            <p class="mt-1 text-xs text-muted">{{ i18n.t('admin.reports.weeklyHint') }}</p>
          </div>
          <button
            type="button"
            data-testid="admin-reports-export-all"
            class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 text-sm font-semibold text-brand-strong transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="exporting()"
            (click)="exportAll()"
          >
            <fa-icon
              [icon]="icons[exporting() ? 'spinner' : 'download']"
              class="text-xs"
              aria-hidden="true"
            />
            {{ i18n.t(exporting() ? 'admin.reports.exporting' : 'admin.reports.exportAll') }}
          </button>
        </div>

        @if (loading()) {
          <div class="mt-5"><app-skeleton variant="table" /></div>
        } @else if (error()) {
          <div
            role="alert"
            data-testid="admin-reports-error"
            class="mt-5 rounded-3xl border border-coral/30 bg-coral/10 p-5 text-center"
          >
            <p class="text-sm font-semibold text-coral">{{ error() }}</p>
            <button
              type="button"
              class="mt-3 inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink"
              (click)="load()"
            >
              {{ i18n.t('admin.overview.retry') }}
            </button>
          </div>
        } @else if (!reports().length) {
          <p
            data-testid="admin-reports-empty"
            class="mt-5 rounded-2xl border border-dashed border-line bg-surface-raised/60 p-8 text-center text-sm text-muted"
          >
            {{ i18n.t('admin.reports.empty') }}
          </p>
        } @else {
          <div class="mt-5 overflow-x-auto">
            <table data-testid="admin-reports-list" class="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr class="border-b border-line text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <th scope="col" class="px-2 py-3">{{ i18n.t('admin.reports.week') }}</th>
                  <th scope="col" class="px-2 py-3">{{ i18n.t('admin.reports.generatedAt') }}</th>
                  <th scope="col" class="px-2 py-3 text-right">{{ i18n.t('admin.reports.hosts') }}</th>
                  <th scope="col" class="px-2 py-3 text-right">{{ i18n.t('admin.reports.size') }}</th>
                  <th scope="col" class="px-2 py-3 text-right">
                    <span class="sr-only">{{ i18n.t('admin.reports.download') }}</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (report of reports(); track report.id) {
                  <tr [attr.data-testid]="'admin-reports-row-' + report.id">
                    <td class="px-2 py-3 font-semibold text-ink">
                      {{ i18n.calendarDate(report.weekStart) }}
                    </td>
                    <td class="px-2 py-3 text-xs text-muted">
                      {{ report.generatedAt ? i18n.dateTime(report.generatedAt, timeZone) : i18n.t('common.notAvailable') }}
                    </td>
                    <td class="px-2 py-3 text-right text-ink">{{ i18n.number(report.hostCount) }}</td>
                    <td class="px-2 py-3 text-right text-muted">
                      {{ i18n.t('admin.reports.sizeKb', { count: sizeKb(report.sizeBytes) }) }}
                    </td>
                    <td class="px-2 py-3 text-right">
                      <button
                        type="button"
                        [attr.data-testid]="'admin-reports-download-' + report.id"
                        class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                        (click)="download(report)"
                      >
                        <fa-icon [icon]="icons['download']" class="text-xs" aria-hidden="true" />
                        {{ i18n.t('admin.reports.download') }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class AdminReportsComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly repository = inject(AdminRepository);
  private readonly downloads = inject(DownloadService);
  private readonly toasts = inject(ToastService);

  protected readonly reports = signal<AdminWeeklyReport[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly exporting = signal(false);
  protected readonly timeZone = 'Africa/Luanda';

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.reports.set(await this.repository.weeklyReports());
    } catch {
      this.reports.set([]);
      this.error.set(this.i18n.t('admin.reports.error'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async exportAll(): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    try {
      const file = await this.repository.exportAllUsersReport();
      this.downloads.save(file, 'conto-contigo_relatorio-semanal.pdf');
      this.toasts.success(this.i18n.t('admin.reports.exported'));
    } catch {
      this.toasts.error(this.i18n.t('admin.reports.exportError'));
    } finally {
      this.exporting.set(false);
    }
  }

  protected async download(report: AdminWeeklyReport): Promise<void> {
    try {
      const file = await this.repository.weeklyReportDownload(report.id);
      this.downloads.save(file, report.filename || 'conto-contigo_relatorio-semanal.pdf');
    } catch {
      this.toasts.error(this.i18n.t('admin.reports.error'));
    }
  }

  protected sizeKb(bytes: number): number {
    return bytes > 0 ? Math.max(1, Math.round(bytes / 1024)) : 0;
  }
}
