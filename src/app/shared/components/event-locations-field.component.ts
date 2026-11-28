import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import type { EventLocationEntry } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';
import { canAddLocation, hasExactLocation } from '../../core/utils/event-locations';
import { ConfirmDialogComponent } from './confirm-dialog.component';

/** Bloco 16 — lista de locais na criação/edição do evento (sem arrastar). */
@Component({
  selector: 'app-event-locations-field',
  imports: [FaIconComponent, ConfirmDialogComponent],
  template: `
    <section class="rounded-2xl border border-line bg-surface-raised/40 p-4" data-testid="event-locations-field">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {{ i18n.t('block16.locations.title') }}
        </h3>
        <span class="text-[10px] font-semibold text-muted">{{ locations().length }}/5</span>
      </div>

      @if (!locations().length) {
        <p class="mt-3 text-sm text-muted">{{ i18n.t('block16.locations.empty') }}</p>
      }

      <div class="mt-3 flex flex-col gap-3">
        @for (item of locations(); track $index) {
          <article class="rounded-xl border border-line bg-surface p-3 shadow-card" [attr.data-testid]="'location-card-' + $index">
            <div class="flex flex-wrap items-center gap-2">
              @if (item.label) {
                <span class="ui-chip">{{ item.label }}</span>
              }
              @if (item.startsAt) {
                <span class="ui-chip"><fa-icon [icon]="icons['clock']" aria-hidden="true" />{{ i18n.time(item.startsAt, timezone()) }}</span>
              }
              @if (item.kind === 'online') {
                <span class="ui-chip">{{ i18n.t('block16.locations.online') }}</span>
              }
              @if (item.isPrimary) {
                <span class="ui-chip border-brand/30 bg-brand/10 text-brand-strong" data-testid="location-primary-badge">{{ i18n.t('block16.locations.primary') }}</span>
              }
            </div>

            <h4 class="mt-2 break-words text-sm font-semibold text-ink" data-testid="location-card-title">
              {{ item.kind === 'online' ? (item.onlineUrl || i18n.t('block16.locations.online')) : (item.address || i18n.t('block16.locations.address')) }}
            </h4>
            @if (item.kind === 'venue') {
              @if (item.venueName && item.venueName !== item.address) {
                <p class="mt-0.5 text-xs text-muted">{{ item.venueName }}</p>
              }
              @if (item.city) {
                <p class="mt-0.5 text-xs text-muted">{{ item.city }}</p>
              }
              <p class="mt-1 inline-flex items-center gap-1.5 text-[11px]" [class]="exact(item) ? 'font-semibold text-mint' : 'text-muted'" [attr.data-testid]="exact(item) ? 'location-exact' : 'location-no-point'">
                <fa-icon [icon]="icons[exact(item) ? 'mapPin' : 'info']" aria-hidden="true" />
                {{ i18n.t(exact(item) ? 'block16.locations.exact' : 'block16.locations.noPoint') }}
              </p>
            }

            <div class="mt-3 flex flex-wrap gap-2">
              <button type="button" class="ui-icon-button" [disabled]="isFirst($index)" [attr.aria-label]="i18n.t('block16.locations.up')" [attr.data-testid]="'location-up-' + $index" (click)="move.emit({ index: $index, direction: -1 })">
                <fa-icon [icon]="icons['chevronDown']" class="rotate-180" aria-hidden="true" />
              </button>
              <button type="button" class="ui-icon-button" [disabled]="isLast($index)" [attr.aria-label]="i18n.t('block16.locations.down')" [attr.data-testid]="'location-down-' + $index" (click)="move.emit({ index: $index, direction: 1 })">
                <fa-icon [icon]="icons['chevronDown']" aria-hidden="true" />
              </button>
              <button type="button" class="ui-btn-secondary px-3 text-xs" [disabled]="item.isPrimary" [attr.data-testid]="'location-set-primary-' + $index" (click)="setPrimary.emit($index)">
                {{ i18n.t('block16.locations.setPrimary') }}
              </button>
              <button type="button" class="ui-btn-secondary px-3 text-xs" [attr.aria-label]="i18n.t('block16.locations.edit')" [attr.data-testid]="'location-edit-' + $index" (click)="edit.emit($index)">
                <fa-icon [icon]="icons['pen']" aria-hidden="true" />
                {{ i18n.t('block16.locations.edit') }}
              </button>
              <button type="button" class="ui-btn-danger px-3 text-xs" [attr.aria-label]="i18n.t('block16.locations.removeConfirm')" [attr.data-testid]="'location-remove-' + $index" (click)="askRemove($index)">
                <fa-icon [icon]="icons['trash']" aria-hidden="true" />
                {{ i18n.t('common.remove') }}
              </button>
            </div>
          </article>
        }
      </div>

      <button type="button" class="ui-btn-secondary mt-3 w-full" [disabled]="!addable()" data-testid="location-add" (click)="add.emit()">
        <fa-icon [icon]="icons['plus']" aria-hidden="true" />
        {{ i18n.t('block16.locations.add') }}
      </button>
    </section>

    <app-confirm-dialog
      [open]="confirmIndex() !== null"
      [title]="i18n.t('block16.locations.removeConfirm')"
      [message]="confirmMessage()"
      [confirmLabel]="i18n.t('common.remove')"
      [cancelLabel]="i18n.t('common.cancel')"
      (confirmed)="confirmRemove()"
      (cancelled)="confirmIndex.set(null)"
    />
  `,
})
export class EventLocationsFieldComponent {
  readonly locations = input<EventLocationEntry[]>([]);
  readonly timezone = input('Africa/Luanda');

  readonly add = output<void>();
  readonly edit = output<number>();
  readonly move = output<{ index: number; direction: -1 | 1 }>();
  readonly setPrimary = output<number>();
  readonly remove = output<number>();

  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly confirmIndex = signal<number | null>(null);

  protected readonly addable = computed(() => canAddLocation(this.locations()));
  protected readonly confirmMessage = computed(() => {
    const index = this.confirmIndex();
    if (index === null) return '';
    const item = this.locations()[index];
    const base = this.i18n.t('block16.locations.removeBody');
    return item?.isPrimary && this.locations().length > 1
      ? `${base} ${this.i18n.t('block16.locations.promoteWarning')}`
      : base;
  });

  protected exact(item: EventLocationEntry): boolean {
    return hasExactLocation(item);
  }

  protected isFirst(index: number): boolean {
    return index === 0;
  }

  protected isLast(index: number): boolean {
    return index === this.locations().length - 1;
  }

  protected askRemove(index: number): void {
    this.confirmIndex.set(index);
  }

  protected confirmRemove(): void {
    const index = this.confirmIndex();
    if (index !== null) this.remove.emit(index);
    this.confirmIndex.set(null);
  }
}
