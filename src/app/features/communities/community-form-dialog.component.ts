import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import {
  ApiCommunity,
  CommunitiesRepository,
  CommunityVisibility,
} from '../../core/data/communities.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from '../../shared/components/modal.component';

/** Criar ou editar uma comunidade (ações no fim do formulário, nunca fixas). */
@Component({
  selector: 'app-community-form-dialog',
  imports: [ModalComponent, ReactiveFormsModule, FaIconComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="community() ? i18n.t('block11.form.editTitle') : i18n.t('block11.form.createTitle')"
      (closed)="closed.emit()"
    >
      <form class="flex flex-col gap-4" [formGroup]="form" novalidate (ngSubmit)="submit()">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block11.form.name') }}</span>
          <input
            type="text"
            formControlName="name"
            maxlength="120"
            data-testid="community-name"
            class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
            [placeholder]="i18n.t('block11.form.namePlaceholder')"
          />
          @if (form.controls.name.touched && form.controls.name.invalid) {
            <span class="mt-1 block text-xs text-coral" role="alert">{{ i18n.t('block11.form.nameError') }}</span>
          }
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block11.form.description') }}</span>
          <textarea
            formControlName="description"
            rows="3"
            maxlength="1000"
            class="w-full rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-sm leading-6 text-ink outline-none transition focus:border-brand/50"
          ></textarea>
        </label>

        <fieldset>
          <legend class="mb-2 text-xs font-semibold text-muted">{{ i18n.t('block11.form.visibility') }}</legend>
          <div class="grid gap-2 sm:grid-cols-2" role="radiogroup">
            @for (option of visibilities; track option.value) {
              <label
                class="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border p-3 transition focus-within:ring-2 focus-within:ring-brand/60"
                [class]="form.controls.visibility.value === option.value ? 'border-brand/50 bg-brand/10' : 'border-line bg-surface-raised'"
              >
                <input type="radio" class="sr-only" formControlName="visibility" [value]="option.value" />
                <fa-icon [icon]="icons[option.icon]" class="mt-0.5 text-brand" aria-hidden="true" />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-ink">{{ i18n.t(option.label) }}</span>
                  <span class="mt-0.5 block text-xs leading-5 text-muted">{{ i18n.t(option.hint) }}</span>
                </span>
              </label>
            }
          </div>
        </fieldset>

        @if (community()) {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block11.form.coverUrl') }}</span>
            <input type="url" formControlName="coverUrl" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block11.form.avatarUrl') }}</span>
            <input type="url" formControlName="avatarUrl" class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
          </label>
          @if (urlError()) {
            <p class="text-xs text-coral" role="alert">{{ i18n.t('block11.form.urlError') }}</p>
          }
        }

        @if (error()) {
          <p class="rounded-2xl border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">{{ error() }}</p>
        }

        <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" class="ui-btn-secondary" (click)="closed.emit()">{{ i18n.t('block11.form.cancel') }}</button>
          <button type="submit" class="ui-btn" data-testid="community-submit" [disabled]="saving()">
            <fa-icon [icon]="icons['check']" aria-hidden="true" />
            {{ community() ? i18n.t('block11.form.save') : i18n.t('block11.form.create') }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class CommunityFormDialogComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly repo = inject(CommunitiesRepository);
  private readonly toasts = inject(ToastService);

  readonly open = input(false);
  readonly community = input<ApiCommunity | null>(null);
  readonly saved = output<ApiCommunity>();
  readonly closed = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly urlError = signal(false);

  protected readonly visibilities = [
    { value: 'private' as const, icon: 'lock', label: 'block11.visibility.private' as const, hint: 'block11.visibility.privateHint' as const },
    { value: 'public' as const, icon: 'globe', label: 'block11.visibility.public' as const, hint: 'block11.visibility.publicHint' as const },
  ];

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(1000)]],
    visibility: this.fb.control<CommunityVisibility>('private'),
    coverUrl: [''],
    avatarUrl: [''],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const current = this.community();
      this.error.set('');
      this.urlError.set(false);
      this.form.reset({
        name: current?.name ?? '',
        description: current?.description ?? '',
        visibility: current?.visibility ?? 'private',
        coverUrl: current?.cover_url ?? '',
        avatarUrl: current?.avatar_url ?? '',
      });
    });
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const urls = [value.coverUrl.trim(), value.avatarUrl.trim()].filter(Boolean);
    if (urls.some((url) => !/^https:\/\/\S+$/.test(url))) {
      this.urlError.set(true);
      return;
    }
    this.urlError.set(false);
    this.saving.set(true);
    this.error.set('');
    try {
      const current = this.community();
      const result = current
        ? await this.repo.update(current.id, {
            name: value.name.trim(),
            description: value.description.trim() || null,
            visibility: value.visibility,
            cover_url: value.coverUrl.trim() || null,
            avatar_url: value.avatarUrl.trim() || null,
          })
        : await this.repo.create({
            name: value.name.trim(),
            description: value.description.trim() || null,
            visibility: value.visibility,
          });
      this.toasts.success(this.i18n.t(current ? 'block11.form.saved' : 'block11.form.created'));
      this.saved.emit(result);
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.error.set(apiError.status === 403 ? this.i18n.t('block11.common.forbidden') : this.i18n.t('block11.common.error'));
    } finally {
      this.saving.set(false);
    }
  }
}
