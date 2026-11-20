import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { EventExportDocument, ReportExportFormat } from '../../../core/data/reports.repository';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/translations';
import { EventPermissions, EventStats, HostEvent, IconTone } from '../../../core/models/models';
import { ICONS } from '../../../core/ui/icons';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { StatGridComponent } from '../../../shared/components/stat-grid.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge.component';
import { TemplateArtworkComponent } from '../../../shared/components/template-artwork.component';

interface StatCardView { key: string; label: string; value: number; hint: string; icon: IconDefinition; tone: IconTone; }
interface ExportDocumentView { document: EventExportDocument; format: ReportExportFormat; label: string; hint: string; icon: IconDefinition; }
interface DetailCell { key: string; label: string; value: string; alert?: boolean; }
interface ActionView { id: string; label: string; icon: IconDefinition; classes: string; }
interface TextView { key: string; label: string; value: string; }

const ACTION_CLASS = 'inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-xs font-semibold text-ink transition hover:border-brand/40';
const PRIMARY_ACTION_CLASS = 'inline-flex h-11 items-center gap-2 rounded-2xl bg-brand px-4 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover';

/** Resumo partilhado pelo painel do anfitrião e pelo painel de gestão do evento. */
@Component({
  selector: 'app-event-summary',
  imports: [FaIconComponent, ConfirmDialogComponent, StatCardComponent, StatGridComponent, StatusBadgeComponent, TemplateArtworkComponent],
  template: `
    <section class="flex flex-col gap-4">
      @if (isManagement()) {
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-surface p-4 shadow-card">
          <p class="text-xs text-muted">{{ i18n.t('eventDetail.manageTitle') }} · {{ i18n.t('eventDetail.manageHint') }}</p>
          <span class="text-xs font-semibold text-brand">{{ i18n.t('settings.active') }}</span>
        </div>
      }

      <article class="overflow-hidden rounded-4xl border border-line bg-surface shadow-card">
        @if (event().coverUrl) {
          <img [src]="event().coverUrl" [alt]="event().title" class="max-h-64 w-full object-cover" />
        } @else {
          <app-template-artwork [templateId]="event().templateId" variant="hero" [kicker]="i18n.t('eventDetail.contextEvent')" [title]="event().title" [subtitle]="typeLabel()" />
        }
        <div class="flex flex-col gap-4 p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-brand">{{ i18n.t('eventDetail.contextEvent') }}</p>
              <h2 class="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{{ event().title }}</h2>
              <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.host') }} · {{ event().hostName }}</p>
            </div>
            <app-status-badge [value]="event().status" />
          </div>
          <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (cell of detailCells(); track cell.key) {
              <div class="rounded-2xl border border-line bg-surface-raised/50 p-3">
                <dt class="text-xs text-muted">{{ cell.label }}</dt>
                <dd class="mt-1 break-words text-xs font-semibold" [class]="cell.alert ? 'text-coral' : 'text-ink'">{{ cell.value }}</dd>
              </div>
            }
          </dl>
          <div class="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            @for (action of actions(); track action.id) {
              <button type="button" [class]="action.classes" (click)="runAction(action.id)">
                <fa-icon [icon]="action.icon" aria-hidden="true" /> {{ action.label }}
              </button>
            }
            @if (permissions().canEditEvent) {
              <span class="text-xs text-muted">{{ i18n.t('eventDetail.editEventHint') }}</span>
            }
            @if (restrictedHintVisible()) {
              <span class="text-xs text-muted">{{ i18n.t('eventDetail.permissionsHint') }}</span>
            }
          </div>
        </div>
      </article>

      <app-stat-grid>
        @for (card of statCards(); track card.key) {
          <app-stat-card [label]="card.label" [value]="card.value" [hint]="card.hint" [icon]="card.icon" [tone]="card.tone" />
        }
      </app-stat-grid>

      <div class="grid gap-4 lg:grid-cols-2">
        <article class="rounded-4xl border border-line bg-surface p-5 shadow-card">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-brand">{{ i18n.t('eventDetail.progressTitle') }}</p>
            <span class="text-xs font-semibold text-ink">{{ stats().responseRate }}%</span>
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="stats().responseRate" [attr.aria-label]="i18n.t('eventDetail.progressTitle')">
            <div class="h-full rounded-full bg-brand" [style.width.%]="stats().responseRate"></div>
          </div>
          <p class="mt-2 text-xs text-muted">{{ i18n.t('eventDetail.progressHint', { responded: respondedCount(), total: stats().total }) }}</p>
        </article>
        <article class="rounded-4xl border border-line bg-surface p-5 shadow-card">
          <p class="text-xs font-semibold uppercase tracking-wider text-brand">{{ i18n.t('eventDetail.primaryInvite') }}</p>
          <h3 class="mt-1 text-sm font-semibold text-ink">{{ i18n.t('eventDetail.invitationCard') }}</h3>
          <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.invitationHint') }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-xs font-semibold text-ink transition hover:border-brand/40" (click)="copyInvitation.emit()"><fa-icon [icon]="icons['copy']" aria-hidden="true" /> {{ i18n.t('eventDetail.copyInvitation') }}</button>
            <button type="button" class="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-xs font-semibold text-ink transition hover:border-brand/40" (click)="openInvitation.emit()"><fa-icon [icon]="icons['arrowUpRight']" aria-hidden="true" /> {{ i18n.t('eventDetail.openInvitation') }}</button>
          </div>
        </article>
      </div>

      @if (permissions().canExport) {
        <article class="rounded-4xl border border-line bg-surface p-5 shadow-card">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-ink">{{ i18n.t('eventDetail.exportMenu') }}</h3>
              <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.exportPeriodHint') }}</p>
            </div>
            <div class="relative">
              <button type="button" class="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-xs font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50" aria-haspopup="menu" [attr.aria-expanded]="exportOpen()" [disabled]="exporting() !== null" (click)="toggleExport()">
                <fa-icon [icon]="exporting() ? icons['spinner'] : icons['download']" [class.animate-spin]="exporting() !== null" aria-hidden="true" />
                {{ exporting() ? i18n.t('eventDetail.exporting') : i18n.t('eventDetail.exportMenu') }}
                <fa-icon [icon]="icons['chevronDown']" aria-hidden="true" />
              </button>
              @if (exportOpen()) {
                <button type="button" class="fixed inset-0 z-20 cursor-default" [attr.aria-label]="i18n.t('common.close')" (click)="closeExport()"></button>
                <div role="menu" class="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-3 shadow-card">
                  <p class="text-xs font-semibold uppercase tracking-wider text-brand">{{ i18n.t('eventDetail.exportPeriodLabel') }}</p>
                  <p class="mt-1 text-xs text-muted">{{ i18n.t('eventDetail.exportPeriodHint') }}</p>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <label class="flex flex-col gap-1">
                      <span class="text-xs text-muted">{{ i18n.t('eventDetail.exportPeriodFrom') }}</span>
                      <input type="date" class="h-11 w-full rounded-2xl border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-brand" [value]="periodFrom()" [max]="periodTo()" (input)="onPeriodFrom($event)" />
                    </label>
                    <label class="flex flex-col gap-1">
                      <span class="text-xs text-muted">{{ i18n.t('eventDetail.exportPeriodTo') }}</span>
                      <input type="date" class="h-11 w-full rounded-2xl border border-line bg-surface px-2 text-xs text-ink outline-none focus:border-brand" [value]="periodTo()" [min]="periodFrom()" (input)="onPeriodTo($event)" />
                    </label>
                  </div>
                  @if (periodInvalid()) {
                    <p class="mt-2 text-xs text-coral">{{ i18n.t('eventDetail.exportPeriodInvalid') }}</p>
                  }
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" role="menuitem" class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand px-2 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:opacity-50" [disabled]="periodInvalid() || exporting() !== null" (click)="requestPeriod('pdf')">
                      <fa-icon [icon]="icons['lines']" aria-hidden="true" /> {{ i18n.t('eventDetail.exportPeriodPdf') }}
                    </button>
                    <button type="button" role="menuitem" class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-2 text-xs font-semibold text-ink transition hover:border-brand/40 disabled:opacity-50" [disabled]="periodInvalid() || exporting() !== null" (click)="requestPeriod('csv')">
                      <fa-icon [icon]="icons['chartSimple']" aria-hidden="true" /> {{ i18n.t('eventDetail.exportPeriodCsv') }}
                    </button>
                  </div>
                  <div class="my-3 h-px bg-line"></div>
                  @for (item of documentExports(); track item.document + item.format) {
                    <button type="button" role="menuitem" class="flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-raised/60 disabled:opacity-50" [disabled]="exporting() !== null" (click)="requestDocument(item.document, item.format)">
                      <fa-icon [icon]="item.icon" class="shrink-0 text-brand" aria-hidden="true" />
                      <span class="min-w-0"><span class="block text-xs font-semibold text-ink">{{ item.label }}</span><span class="block text-xs text-muted">{{ item.hint }}</span></span>
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </article>
      }

      <div class="grid gap-4 sm:grid-cols-3">
        @for (card of textCards(); track card.key) {
          <article class="rounded-4xl border border-line bg-surface p-5 shadow-card">
            <p class="text-xs font-semibold uppercase tracking-wider text-brand">{{ card.label }}</p>
            <p class="mt-2 text-sm leading-6 text-ink">{{ card.value }}</p>
          </article>
        }
      </div>
    </section>

    <app-confirm-dialog [open]="cancelOpen()" [title]="i18n.t('eventDetail.cancelEventTitle')" [message]="i18n.t('eventDetail.cancelEventText')" [confirmLabel]="i18n.t('eventDetail.cancelEventConfirm')" [cancelLabel]="i18n.t('common.cancel')" tone="danger" (confirmed)="confirmCancel()" (cancelled)="closeCancel()" />
  `,
})
export class EventSummaryComponent {
  readonly event = input.required<HostEvent>();
  readonly stats = input.required<EventStats>();
  readonly typeLabel = input('');
  readonly templateName = input('');
  readonly permissions = input.required<EventPermissions>();
  readonly isManagement = input(false);
  readonly exporting = input<string | null>(null);
  readonly deadlinePassed = input(false);
  readonly periodFrom = input('');
  readonly periodTo = input('');
  readonly periodInvalid = input(false);

  readonly resendManageLink = output<void>();
  readonly publish = output<void>();
  readonly editEvent = output<void>();
  readonly cancelEvent = output<void>();
  readonly exportDocument = output<{ document: EventExportDocument; format: ReportExportFormat }>();
  readonly exportPeriod = output<ReportExportFormat>();
  readonly periodFromChange = output<string>();
  readonly periodToChange = output<string>();
  readonly copyInvitation = output<void>();
  readonly openInvitation = output<void>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly exportOpen = signal(false);
  protected readonly cancelOpen = signal(false);

  protected readonly respondedCount = computed(() => this.stats().confirmed + this.stats().declined);
  protected readonly canPublish = computed(() => this.permissions().canChangeEventStatus && this.event().status === 'draft');
  protected readonly restrictedHintVisible = computed(() => {
    const p = this.permissions();
    return !p.canEditEvent && !p.canChangeEventStatus && !p.canResendManageLink && !p.canCancelEvent;
  });
  protected readonly detailCells = computed<DetailCell[]>(() => {
    const event = this.event();
    return [
      { key: 'date', label: this.i18n.t('create.field.date'), value: this.i18n.fullDate(event.startsAt, event.timezone) },
      { key: 'time', label: this.i18n.t('create.field.time'), value: this.i18n.time(event.startsAt, event.timezone) },
      { key: 'venue', label: this.i18n.t('eventDetail.location'), value: `${event.venue}, ${event.city}` },
      { key: 'template', label: this.i18n.t('eventDetail.template'), value: this.templateName() },
      { key: 'deadline', label: this.i18n.t('eventDetail.deadline'), value: this.deadlineLabel(), alert: this.deadlinePassed() && !!event.rsvpDeadline },
      { key: 'status', label: this.i18n.t('common.status'), value: this.i18n.t(`status.${event.status}` as TranslationKey) },
    ];
  });
  protected readonly actions = computed<ActionView[]>(() => {
    const p = this.permissions();
    const actions: ActionView[] = [];
    if (p.canEditEvent) actions.push({ id: 'edit', label: this.i18n.t('eventDetail.editEvent'), icon: ICONS['pen'], classes: ACTION_CLASS });
    if (this.canPublish()) actions.push({ id: 'publish', label: this.i18n.t('eventDetail.publish'), icon: ICONS['paperPlane'], classes: PRIMARY_ACTION_CLASS });
    if (p.canResendManageLink) actions.push({ id: 'resend', label: this.i18n.t('eventDetail.resendManageLink'), icon: ICONS['envelope'], classes: ACTION_CLASS });
    if (p.canCancelEvent) actions.push({ id: 'cancel', label: this.i18n.t('eventDetail.cancelEvent'), icon: ICONS['cancelled'], classes: ACTION_CLASS });
    return actions;
  });
  protected readonly statCards = computed<StatCardView[]>(() => {
    const s = this.stats();
    return [
      { key: 'total', label: this.i18n.t('eventDetail.stats.guests'), value: s.total, hint: this.i18n.t('common.guests'), icon: ICONS['guests'], tone: 'brand' },
      { key: 'confirmed', label: this.i18n.t('eventDetail.stats.confirmed'), value: s.confirmed, hint: this.i18n.t('statusHint.confirmed'), icon: ICONS['success'], tone: 'mint' },
      { key: 'pending', label: this.i18n.t('eventDetail.stats.pending'), value: s.pending, hint: this.i18n.t('statusHint.pending'), icon: ICONS['clock'], tone: 'amber' },
      { key: 'declined', label: this.i18n.t('eventDetail.stats.declined'), value: s.declined, hint: this.i18n.t('statusHint.declined'), icon: ICONS['error'], tone: 'coral' },
    ];
  });
  protected readonly documentExports = computed<ExportDocumentView[]>(() => [
    { document: 'guests', format: 'pdf', label: this.i18n.t('eventDetail.exportGuestsPdf'), hint: this.i18n.t('eventDetail.exportGuestsPdfHint'), icon: ICONS['lines'] },
    { document: 'guests', format: 'csv', label: this.i18n.t('eventDetail.exportGuestsCsv'), hint: this.i18n.t('eventDetail.exportGuestsCsvHint'), icon: ICONS['chartSimple'] },
    { document: 'summary', format: 'pdf', label: this.i18n.t('eventDetail.exportSummaryPdf'), hint: this.i18n.t('eventDetail.exportSummaryPdfHint'), icon: ICONS['chartPie'] },
    { document: 'attendance', format: 'pdf', label: this.i18n.t('eventDetail.exportAttendancePdf'), hint: this.i18n.t('eventDetail.exportAttendancePdfHint'), icon: ICONS['userCheck'] },
  ]);
  protected readonly textCards = computed<TextView[]>(() => {
    const event = this.event();
    const missing = this.i18n.t('common.notAvailable');
    return [
      { key: 'message', label: this.i18n.t('eventDetail.message'), value: event.message || missing },
      { key: 'rules', label: this.i18n.t('eventDetail.rules'), value: event.rules || missing },
      { key: 'dressCode', label: this.i18n.t('eventDetail.dressCode'), value: event.dressCode || missing },
    ];
  });
  private readonly deadlineLabel = computed(() => {
    const event = this.event();
    return event.rsvpDeadline
      ? this.i18n.shortDate(event.rsvpDeadline, event.timezone)
      : this.i18n.t('create.review.noDeadline');
  });

  protected toggleExport(): void { this.exportOpen.update((open) => !open); }
  protected closeExport(): void { this.exportOpen.set(false); }
  protected openCancel(): void { this.cancelOpen.set(true); }
  protected closeCancel(): void { this.cancelOpen.set(false); }
  protected confirmCancel(): void { this.closeCancel(); this.cancelEvent.emit(); }
  protected onPeriodFrom(event: Event): void { this.periodFromChange.emit(this.inputValue(event)); }
  protected onPeriodTo(event: Event): void { this.periodToChange.emit(this.inputValue(event)); }
  protected requestDocument(document: EventExportDocument, format: ReportExportFormat): void {
    this.closeExport();
    this.exportDocument.emit({ document, format });
  }
  protected requestPeriod(format: ReportExportFormat): void {
    if (this.periodInvalid()) return;
    this.closeExport();
    this.exportPeriod.emit(format);
  }
  protected runAction(id: string): void {
    switch (id) {
      case 'edit': this.editEvent.emit(); break;
      case 'publish': this.publish.emit(); break;
      case 'resend': this.resendManageLink.emit(); break;
      case 'cancel': this.openCancel(); break;
    }
  }
  private inputValue(event: Event): string { return (event.target as HTMLInputElement).value; }
}
