import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { GuestMessage, MessagesQuery, MessagesRepository } from '../../core/data/messages.repository';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from '../../shared/components/modal.component';

type ReadFilter = NonNullable<MessagesQuery['read']>;
type AnsweredFilter = NonNullable<MessagesQuery['answered']>;

/**
 * Caixa de entrada de mensagens dos convites. Funciona com um evento fixo
 * (secção do evento) ou com seletor de evento (rota global `/mensagens`).
 */
@Component({
  selector: 'app-messages-inbox',
  imports: [ReactiveFormsModule, FaIconComponent, ModalComponent],
  template: `
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="font-display text-xl font-semibold text-ink">{{ i18n.t('messages.title') }}</h2>
        <p class="mt-1 text-xs leading-5 text-muted">{{ i18n.t('messages.subtitle') }}</p>
      </div>

      @if (!fixedEventId()) {
        <label class="block">
          <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {{ i18n.t('messages.selectEvent') }}
          </span>
          <select
            class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
            [value]="selectedEventId()"
            (change)="onEventChange($event)"
          >
            <option value="">{{ i18n.t('messages.selectEvent') }}</option>
            @for (event of events(); track event.id) {
              <option [value]="event.id">{{ event.title }}</option>
            }
          </select>
        </label>
      }

      <form class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" [formGroup]="filters" (ngSubmit)="applyFilters()">
        <label class="sm:col-span-2 lg:col-span-1">
          <span class="sr-only">{{ i18n.t('messages.searchPlaceholder') }}</span>
          <input
            type="search"
            formControlName="q"
            class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
            [placeholder]="i18n.t('messages.searchPlaceholder')"
          />
        </label>
        <select formControlName="read" class="h-11 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink" [attr.aria-label]="i18n.t('messages.readAll')">
          <option value="all">{{ i18n.t('messages.readAll') }}</option>
          <option value="unread">{{ i18n.t('messages.readUnread') }}</option>
          <option value="read">{{ i18n.t('messages.readRead') }}</option>
        </select>
        <select formControlName="answered" class="h-11 rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink" [attr.aria-label]="i18n.t('messages.answeredAll')">
          <option value="all">{{ i18n.t('messages.answeredAll') }}</option>
          <option value="unanswered">{{ i18n.t('messages.answeredNo') }}</option>
          <option value="answered">{{ i18n.t('messages.answeredYes') }}</option>
        </select>
        <label>
          <span class="sr-only">{{ i18n.t('messages.from') }}</span>
          <input type="date" formControlName="from" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink" />
        </label>
        <label>
          <span class="sr-only">{{ i18n.t('messages.to') }}</span>
          <input type="date" formControlName="to" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink" />
        </label>
        <button type="submit" class="ui-btn-secondary sm:col-span-2 lg:col-span-5">
          <fa-icon [icon]="icons['search']" aria-hidden="true" />
          {{ i18n.t('common.search') }}
        </button>
      </form>

      @if (loading()) {
        <p role="status" class="rounded-2xl border border-line bg-surface p-6 text-center text-xs text-muted">{{ i18n.t('common.loading') }}</p>
      } @else if (error()) {
        <p role="alert" class="rounded-2xl border border-coral/25 bg-coral/5 p-4 text-xs leading-6 text-coral">{{ error() }}</p>
      } @else if (items().length === 0) {
        <p class="rounded-2xl border border-line bg-surface p-6 text-center text-xs text-muted">{{ i18n.t('messages.empty') }}</p>
      } @else {
        <ul class="flex flex-col gap-3">
          @for (item of items(); track item.invitationId) {
            <li
              class="rounded-2xl border p-4 transition"
              [class]="item.read ? 'border-line bg-surface' : 'border-brand/30 bg-brand/5'"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-ink">{{ item.guestName }}</p>
                  <p class="text-xs text-muted">{{ item.guestEmail || '—' }}</p>
                  @if (item.eventTitle && !fixedEventId()) {
                    <p class="text-xs text-muted">{{ item.eventTitle }}</p>
                  }
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="ui-btn-secondary" (click)="toggleRead(item)">
                    <fa-icon [icon]="item.read ? icons['envelopeOpen'] : icons['envelope']" aria-hidden="true" />
                    {{ item.read ? i18n.t('messages.markUnread') : i18n.t('messages.markRead') }}
                  </button>
                  <button type="button" class="ui-btn" (click)="openAnswer(item)">
                    <fa-icon [icon]="icons['paperPlane']" aria-hidden="true" />
                    {{ i18n.t('messages.answer') }}
                  </button>
                </div>
              </div>
              @if (item.sentAt) {
                <p class="mt-3 text-[11px] uppercase tracking-wider text-muted">
                  {{ i18n.t('messages.sentAt') }} {{ formatDate(item.sentAt) }}
                </p>
              }
              <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{{ item.guestMessage }}</p>
              @if (item.answer) {
                <div class="mt-3 rounded-xl border border-mint/25 bg-mint/5 p-3">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-mint">{{ i18n.t('messages.replyFromHost') }}</p>
                  <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{{ item.answer }}</p>
                  @if (item.answeredAt) {
                    <p class="mt-1 text-[11px] text-muted">{{ i18n.t('messages.answeredAt') }} {{ formatDate(item.answeredAt) }}</p>
                  }
                </div>
              }
            </li>
          }
        </ul>

        @if (pagination() && pagination()!.total_pages > 1) {
          <nav class="flex items-center justify-center gap-3 text-xs text-muted" aria-label="Paginação">
            <button type="button" class="ui-btn-secondary" [disabled]="page() <= 1" (click)="goToPage(page() - 1)">
              <fa-icon [icon]="icons['chevronLeft']" aria-hidden="true" />
            </button>
            <span>{{ i18n.t('messages.page') }} {{ page() }} / {{ pagination()!.total_pages }}</span>
            <button type="button" class="ui-btn-secondary" [disabled]="page() >= pagination()!.total_pages" (click)="goToPage(page() + 1)">
              <fa-icon [icon]="icons['chevronRight']" aria-hidden="true" />
            </button>
          </nav>
        }
      }
    </section>

    @if (answering(); as target) {
      <app-modal
        [open]="true"
        [title]="i18n.t('messages.answerTitle')"
        [dismissible]="!saving()"
        (closed)="answering.set(null)"
      >
        <p class="text-xs leading-5 text-muted">{{ i18n.t('messages.answerHint') }}</p>
        <div class="mt-3 rounded-xl border border-line bg-surface-raised p-3">
          <p class="text-xs font-semibold text-ink">{{ target.guestName }}</p>
          <p class="mt-1 whitespace-pre-wrap text-xs leading-5 text-muted">{{ target.guestMessage }}</p>
        </div>
        <form id="app-message-answer-form" class="mt-4" [formGroup]="answerForm" (ngSubmit)="submitAnswer()">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-ink">{{ i18n.t('messages.answerLabel') }}</span>
            <textarea
              formControlName="answer"
              data-testid="message-answer-input"
              class="min-h-32 w-full resize-y rounded-xl border border-line bg-surface-raised p-3 text-sm text-ink outline-none focus:border-brand/50"
              maxlength="1000"
            ></textarea>
          </label>
        </form>
        @if (answerError()) {
          <p role="alert" class="mt-3 rounded-xl border border-coral/25 bg-coral/5 p-3 text-xs text-coral">{{ answerError() }}</p>
        }
        <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="ui-btn-secondary" [disabled]="saving()" (click)="answering.set(null)">
            {{ i18n.t('common.cancel') }}
          </button>
          <button type="submit" form="app-message-answer-form" class="ui-btn" [disabled]="saving() || answerForm.invalid">
            <fa-icon [icon]="icons['paperPlane']" aria-hidden="true" />
            {{ i18n.t('messages.answerSubmit') }}
          </button>
        </div>
      </app-modal>
    }
  `,
})
export class MessagesInboxComponent {
  private readonly fb = inject(FormBuilder);
  private readonly repo = inject(MessagesRepository);
  private readonly store = inject(WorkspaceStore);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  readonly fixedEventId = input<string>('');

  protected readonly events = computed(() => this.store.events());
  protected readonly selectedEventId = signal('');
  protected readonly items = signal<GuestMessage[]>([]);
  protected readonly pagination = signal<{ page: number; page_size: number; total: number; total_pages: number } | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly page = signal(1);
  protected readonly answering = signal<GuestMessage | null>(null);
  protected readonly saving = signal(false);
  protected readonly answerError = signal('');

  protected readonly filters = this.fb.nonNullable.group({
    q: '',
    read: 'all',
    answered: 'all',
    from: '',
    to: '',
  });

  protected readonly answerForm = this.fb.nonNullable.group({
    answer: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const fixed = this.fixedEventId();
      if (fixed) this.selectedEventId.set(fixed);
    });

    effect(() => {
      const eventId = this.fixedEventId() || this.selectedEventId();
      const q = this.filters.controls.q.value;
      const read = this.filters.controls.read.value;
      const answered = this.filters.controls.answered.value;
      const from = this.filters.controls.from.value;
      const to = this.filters.controls.to.value;
      const page = this.page();
      // A leitura das signals acima regista a dependência do efeito.
      void [eventId, q, read, answered, from, to, page];
      void this.reload();
    });
  }

  protected onEventChange(event: Event): void {
    this.selectedEventId.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
  }

  protected applyFilters(): void {
    this.page.set(1);
    void this.reload();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
  }

  protected formatDate(value: string): string {
    return this.i18n.formatDate(value, 'Africa/Luanda', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected async toggleRead(item: GuestMessage): Promise<void> {
    try {
      await this.repo.setRead(item.invitationId, !item.read);
      this.patchItem(item.invitationId, {
        read: !item.read,
      });
      this.toasts.success(this.i18n.t('messages.saved'));
    } catch (error) {
      this.toasts.error(toApiError(error).message || this.i18n.t('messages.error'));
    }
  }

  protected openAnswer(item: GuestMessage): void {
    this.answerError.set('');
    this.answerForm.reset({ answer: item.answer ?? '' });
    this.answering.set(item);
  }

  protected async submitAnswer(): Promise<void> {
    const target = this.answering();
    if (!target || this.answerForm.invalid) return;
    this.saving.set(true);
    this.answerError.set('');
    try {
      const answer = this.answerForm.controls.answer.value.trim();
      await this.repo.answer(target.invitationId, answer);
      this.patchItem(target.invitationId, {
        answer,
        answered: true,
        answeredAt: new Date().toISOString(),
      });
      this.answering.set(null);
      this.toasts.success(this.i18n.t('messages.saved'));
    } catch (error) {
      this.answerError.set(toApiError(error).message || this.i18n.t('messages.error'));
    } finally {
      this.saving.set(false);
    }
  }

  private patchItem(id: string, patch: Partial<GuestMessage>): void {
    this.items.update((items) => items.map((item) => (item.invitationId === id ? { ...item, ...patch } : item)));
  }

  private async reload(): Promise<void> {
    const eventId = this.fixedEventId() || this.selectedEventId();
    if (!eventId) {
      this.items.set([]);
      this.pagination.set(null);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const value = this.filters.getRawValue();
      const page = await this.repo.list({
        event_id: eventId,
        q: value.q || undefined,
        read: value.read as ReadFilter,
        answered: value.answered as AnsweredFilter,
        from: value.from || undefined,
        to: value.to || undefined,
        page: this.page(),
        page_size: 10,
      });
      // A API devolve mensagens de todos os eventos da conta; quando a secção
      // fixa um evento, filtramos localmente sem perder os restantes filtros.
      const visible = eventId ? page.items.filter((item) => item.eventId === eventId) : page.items;
      this.items.set(visible);
      this.pagination.set(page.pagination);
    } catch {
      this.error.set(this.i18n.t('messages.error'));
      this.items.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}

