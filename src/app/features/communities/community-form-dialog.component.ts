import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { toApiError } from '../../core/api/api-error';
import {
  ApiCommunity,
  CommunitiesRepository,
  CommunityInput,
  CommunityVisibility,
} from '../../core/data/communities.repository';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { ModalComponent } from '../../shared/components/modal.component';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Criar ou editar uma comunidade (ações no fim do formulário, nunca fixas). */
@Component({
  selector: 'app-community-form-dialog',
  imports: [ModalComponent, ReactiveFormsModule, FaIconComponent],
  template: `
    <app-modal
      [open]="open()"
      [title]="community() ? i18n.t('block11.form.editTitle') : i18n.t('block11.form.createTitle')"
      size="lg"
      (closed)="closed.emit()"
    >
      <form class="flex flex-col gap-5 sm:gap-6" [formGroup]="form" novalidate (ngSubmit)="submit()">
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
                class="group relative flex min-h-14 cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border p-3 transition hover:border-brand/40 focus-within:ring-2 focus-within:ring-brand/60"
                [class]="form.controls.visibility.value === option.value ? 'border-brand/50 bg-brand/10' : 'border-line bg-surface-raised hover:bg-surface'"
              >
                <input type="radio" class="sr-only" formControlName="visibility" [value]="option.value" />
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-xl border transition"
                  [class]="form.controls.visibility.value === option.value ? 'border-brand/30 bg-brand text-on-secondary shadow-card' : 'border-line bg-surface text-muted'"
                >
                  <fa-icon [icon]="icons[option.icon]" class="text-sm" aria-hidden="true" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center justify-between gap-2">
                    <span class="block text-sm font-semibold text-ink">{{ i18n.t(option.label) }}</span>
                    <fa-icon
                      [icon]="icons['check']"
                      class="shrink-0 text-xs text-brand-strong transition"
                      [class.opacity-0]="form.controls.visibility.value !== option.value"
                      [class.opacity-100]="form.controls.visibility.value === option.value"
                      aria-hidden="true"
                    />
                  </span>
                  <span class="mt-1 block text-xs leading-5 text-muted">{{ i18n.t(option.hint) }}</span>
                </span>
              </label>
            }
          </div>
        </fieldset>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="relative h-44 overflow-hidden rounded-3xl border border-line bg-brand sm:h-48">
            @if (coverPreview()) {
              <img [src]="coverPreview()!" alt="" class="size-full object-cover" />
            } @else {
              <div class="absolute inset-0 bg-gradient-to-br from-brand via-brand/85 to-amber/25"></div>
              <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_55%)]"></div>
              <div class="absolute -bottom-12 -right-8 size-40 rounded-full border border-white/20"></div>
              <div class="absolute -bottom-6 right-10 size-28 rounded-full border border-white/10"></div>
              <fa-icon [icon]="icons['image']" class="absolute right-5 top-5 text-2xl text-white/25" aria-hidden="true" />
            }
            <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a2b2c]/75 via-[#0a2b2c]/10 to-transparent"></div>
            <span class="absolute left-3 top-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-[#0a2b2c]/25 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur-md">
              <fa-icon [icon]="icons['image']" class="text-xs" aria-hidden="true" />
              {{ i18n.t('block11.form.coverUpload') }}
            </span>
            <div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-3.5 sm:p-4">
              <span class="min-w-0 flex-1 truncate text-xs text-white/80" [attr.title]="i18n.t('block11.form.imageHint')">{{ i18n.t('block11.form.imageHint') }}</span>
              <div class="flex shrink-0 items-center gap-1.5">
                <label
                  class="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-brand/30 bg-brand px-2.5 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/60"
                  [class.pointer-events-none]="uploadingCover() || saving()"
                  [class.opacity-60]="uploadingCover() || saving()"
                >
                  <fa-icon [icon]="icons['camera']" class="shrink-0 text-xs" aria-hidden="true" />
                  <span class="whitespace-nowrap">{{ uploadingCover() ? i18n.t('block11.form.coverUploading') : i18n.t('block11.form.coverUpload') }}</span>
                  <input
                    type="file"
                    class="sr-only"
                    accept="image/jpeg,image/png,image/webp"
                    [disabled]="uploadingCover() || saving()"
                    (change)="onCoverFile($event)"
                  />
                </label>
                @if (community() && (coverPreview() || form.controls.coverUrl.value)) {
                  <button
                    type="button"
                    class="grid size-9 shrink-0 place-items-center rounded-xl border border-coral/30 bg-surface text-coral transition hover:bg-coral/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60 disabled:opacity-60"
                    [disabled]="uploadingCover() || saving()"
                    [attr.aria-label]="i18n.t('block11.form.coverRemove')"
                    (click)="removeCover()"
                  >
                    <fa-icon [icon]="icons['trash']" class="text-xs" aria-hidden="true" />
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="relative flex min-w-0 items-center gap-3 overflow-hidden rounded-3xl border border-line bg-surface-raised/60 p-3.5 sm:p-4">
            <div class="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-brand/10 blur-2xl"></div>
            <span class="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-surface bg-canvas text-lg font-semibold text-brand-strong shadow-card ring-1 ring-brand/20">
              @if (avatarPreview()) {
                <img [src]="avatarPreview()!" alt="" class="size-full object-cover" />
              } @else {
                {{ (form.controls.name.value || '?').slice(0, 1).toUpperCase() }}
              }
            </span>
            <div class="relative flex min-w-0 flex-1 items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-ink">{{ i18n.t('block11.form.avatarUpload') }}</p>
                <p class="mt-0.5 truncate text-xs text-muted" [attr.title]="i18n.t('block11.form.imageHint')">{{ i18n.t('block11.form.imageHint') }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
                <label
                  class="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-brand/30 bg-brand px-3 text-xs font-semibold text-on-secondary transition hover:bg-secondary-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-brand/60"
                  [class.pointer-events-none]="uploadingAvatar() || saving()"
                  [class.opacity-60]="uploadingAvatar() || saving()"
                >
                  <fa-icon [icon]="icons['camera']" class="shrink-0 text-xs" aria-hidden="true" />
                  <span class="whitespace-nowrap">{{ uploadingAvatar() ? i18n.t('block11.form.avatarUploading') : i18n.t('block11.form.avatarUpload') }}</span>
                  <input
                    type="file"
                    class="sr-only"
                    accept="image/jpeg,image/png,image/webp"
                    [disabled]="uploadingAvatar() || saving()"
                    (change)="onAvatarFile($event)"
                  />
                </label>
                @if (community() && (avatarPreview() || form.controls.avatarUrl.value)) {
                  <button
                    type="button"
                    class="grid size-9 shrink-0 place-items-center rounded-xl border border-coral/30 bg-surface text-coral transition hover:bg-coral/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/60 disabled:opacity-60"
                    [disabled]="uploadingAvatar() || saving()"
                    [attr.aria-label]="i18n.t('block11.form.avatarRemove')"
                    (click)="removeAvatar()"
                  >
                    <fa-icon [icon]="icons['trash']" class="text-xs" aria-hidden="true" />
                  </button>
                }
              </div>
            </div>
          </div>
        </div>

        @if (community()) {
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block11.form.coverUrl') }}</span>
            <input
              type="url"
              formControlName="coverUrl"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
              (input)="onCoverUrlInput($event)"
            />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">{{ i18n.t('block11.form.avatarUrl') }}</span>
            <input
              type="url"
              formControlName="avatarUrl"
              class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
              (input)="onAvatarUrlInput($event)"
            />
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
  protected readonly uploadingAvatar = signal(false);
  protected readonly uploadingCover = signal(false);
  protected readonly avatarFile = signal<File | null>(null);
  protected readonly coverFile = signal<File | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);
  protected readonly coverPreview = signal<string | null>(null);

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
      this.uploadingAvatar.set(false);
      this.uploadingCover.set(false);
      this.avatarFile.set(null);
      this.coverFile.set(null);
      this.avatarPreview.set(current?.avatar_url ?? null);
      this.coverPreview.set(current?.cover_url ?? null);
      this.form.reset({
        name: current?.name ?? '',
        description: current?.description ?? '',
        visibility: current?.visibility ?? 'private',
        coverUrl: current?.cover_url ?? '',
        avatarUrl: current?.avatar_url ?? '',
      });
    });
  }

  protected onAvatarUrlInput(event: Event): void {
    this.avatarFile.set(null);
    this.avatarPreview.set(this.inputValue(event) || null);
  }

  protected onCoverUrlInput(event: Event): void {
    this.coverFile.set(null);
    this.coverPreview.set(this.inputValue(event) || null);
  }

  protected async onAvatarFile(event: Event): Promise<void> {
    const file = this.pickFile(event);
    if (!file || this.uploadingAvatar() || this.saving()) return;
    if (!this.isValidImage(file)) {
      this.error.set(this.i18n.t('block11.form.imageHint'));
      return;
    }
    this.error.set('');
    this.avatarFile.set(file);
    this.avatarPreview.set(await this.readPreview(file));
  }

  protected async onCoverFile(event: Event): Promise<void> {
    const file = this.pickFile(event);
    if (!file || this.uploadingCover() || this.saving()) return;
    if (!this.isValidImage(file)) {
      this.error.set(this.i18n.t('block11.form.imageHint'));
      return;
    }
    this.error.set('');
    this.coverFile.set(file);
    this.coverPreview.set(await this.readPreview(file));
  }

  protected async removeAvatar(): Promise<void> {
    const current = this.community();
    if (!current || this.uploadingAvatar() || this.saving()) return;
    this.uploadingAvatar.set(true);
    this.error.set('');
    try {
      const updated = await this.repo.removeAvatar(current.id);
      this.avatarFile.set(null);
      this.avatarPreview.set(null);
      this.form.controls.avatarUrl.setValue('');
      this.toasts.success(this.i18n.t('block11.form.saved'));
      this.saved.emit(updated);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.uploadingAvatar.set(false);
    }
  }

  protected async removeCover(): Promise<void> {
    const current = this.community();
    if (!current || this.uploadingCover() || this.saving()) return;
    this.uploadingCover.set(true);
    this.error.set('');
    try {
      const updated = await this.repo.removeCover(current.id);
      this.coverFile.set(null);
      this.coverPreview.set(null);
      this.form.controls.coverUrl.setValue('');
      this.toasts.success(this.i18n.t('block11.form.saved'));
      this.saved.emit(updated);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.uploadingCover.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const urls = [
      this.avatarFile() ? '' : value.avatarUrl.trim(),
      this.coverFile() ? '' : value.coverUrl.trim(),
    ].filter(Boolean);
    if (urls.some((url) => !/^https:\/\/\S+$/.test(url))) {
      this.urlError.set(true);
      return;
    }
    this.urlError.set(false);
    this.saving.set(true);
    this.error.set('');
    try {
      const current = this.community();
      const base: CommunityInput = {
        name: value.name.trim(),
        description: value.description.trim() || null,
        visibility: value.visibility,
      };

      let result: ApiCommunity;
      if (current) {
        const changes: Partial<CommunityInput> = { ...base };
        if (!this.avatarFile()) changes.avatar_url = value.avatarUrl.trim() || null;
        if (!this.coverFile()) changes.cover_url = value.coverUrl.trim() || null;
        result = await this.repo.update(current.id, changes);
        result = await this.uploadPendingImages(result.id, result);
      } else {
        result = await this.repo.create(base);
        result = await this.uploadPendingImages(result.id, result);
      }

      this.toasts.success(this.i18n.t(current ? 'block11.form.saved' : 'block11.form.created'));
      this.saved.emit(result);
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.error.set(apiError.status === 403 ? this.i18n.t('block11.common.forbidden') : this.i18n.t('block11.common.error'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Guarda os ficheiros escolhidos depois de a comunidade existir. */
  private async uploadPendingImages(id: string, current: ApiCommunity): Promise<ApiCommunity> {
    let result = current;
    try {
      const avatar = this.avatarFile();
      if (avatar) result = await this.repo.uploadAvatar(id, avatar);
      const cover = this.coverFile();
      if (cover) result = await this.repo.uploadCover(id, cover);
    } catch (error: unknown) {
      const apiError = toApiError(error);
      this.toasts.error(
        apiError.code === 'community_image_upload_unavailable'
          ? this.i18n.t('block11.form.uploadUnavailable')
          : this.i18n.t('block11.form.imageUploadFailed')
      );
    }
    return result;
  }

  private pickFile(event: Event): File | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    return file;
  }

  private inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private isValidImage(file: File): boolean {
    return IMAGE_TYPES.includes(file.type) && file.size <= MAX_IMAGE_BYTES;
  }

  private readPreview(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  }
}
