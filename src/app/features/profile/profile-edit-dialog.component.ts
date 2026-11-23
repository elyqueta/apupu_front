import { Component, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ApiError, toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ModalComponent } from '../../shared/components/modal.component';
import { PhoneMaskDirective } from '../../shared/directives/phone-mask.directive';

/**
 * Modal de edição dos dados pessoais do perfil.
 *
 * Reutiliza `PATCH /host/profile` e, para a foto, os endpoints de avatar
 * (`POST /host/profile/avatar` e `/avatar/upload`). Quando o upload está
 * indisponível (`503 avatar_upload_unavailable`) mantém o campo de URL.
 */
@Component({
  selector: 'app-profile-edit-dialog',
  imports: [ReactiveFormsModule, FaIconComponent, AvatarComponent, PhoneMaskDirective, ModalComponent],
  template: `
    <app-modal
      [open]="open()"
      size="lg"
      [title]="i18n.t('profile.editTitle')"
      (closed)="close()"
    >
      <div class="flex items-start gap-3">
        <span
          class="grid size-11 shrink-0 place-items-center rounded-2xl border border-brand/25 bg-brand/15 text-brand-strong"
        >
          <fa-icon [icon]="icons['pen']" aria-hidden="true" />
        </span>
        <p class="mt-2 text-xs leading-5 text-muted">{{ i18n.t('profile.editHint') }}</p>
      </div>

      <form id="app-profile-form" class="mt-6 flex flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
            <div class="overflow-hidden rounded-2xl border border-line bg-surface-raised/40">
              <div
                class="relative h-28 bg-gradient-to-r from-brand/50 via-aqua/30 to-secondary/50 sm:h-32"
              >
                @if (coverPreview()) {
                  <img
                    [src]="coverPreview()!"
                    alt=""
                    class="absolute inset-0 size-full object-cover"
                  />
                }
                <div
                  class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_55%)]"
                ></div>
                <div class="absolute right-3 top-3 flex items-center gap-2">
                  <label
                    class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-canvas/40 px-3 text-[11px] font-semibold text-white/90 backdrop-blur-md"
                    [class.pointer-events-none]="coverUploading()"
                    [class.opacity-60]="coverUploading()"
                  >
                    <fa-icon
                      [icon]="icons['camera']"
                      class="text-[11px]"
                      aria-hidden="true"
                    />
                    {{
                      coverUploading()
                        ? i18n.t('profile.coverUploading')
                        : i18n.t('profile.coverUpload')
                    }}
                    <input
                      type="file"
                      class="sr-only"
                      accept="image/jpeg,image/png,image/webp"
                      [disabled]="coverUploading()"
                      (change)="onCoverSelected($event)"
                    />
                  </label>
                  @if (coverPreview()) {
                    <button
                      type="button"
                      class="grid size-9 place-items-center rounded-xl border border-white/20 bg-canvas/40 text-white/90 backdrop-blur-md transition hover:border-coral/50 hover:text-coral disabled:opacity-50"
                      [disabled]="coverUploading()"
                      [attr.title]="i18n.t('profile.coverRemove')"
                      [attr.aria-label]="i18n.t('profile.coverRemove')"
                      (click)="removeCover()"
                    >
                      <fa-icon [icon]="icons['trash']" class="text-[11px]" aria-hidden="true" />
                    </button>
                  }
                </div>
              </div>
              <label class="block p-3">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('profile.coverUrl') }}
                </span>
                <input
                  type="url"
                  formControlName="coverUrl"
                  placeholder="https://"
                  (input)="coverPreview.set($any($event.target).value)"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                />
                <span class="mt-1 block text-[10px] leading-4 text-muted">
                  {{ i18n.t('profile.coverHint') }}
                </span>
                @if (form.controls.coverUrl.touched && form.controls.coverUrl.invalid) {
                  <span class="mt-1 block text-xs text-coral">{{
                    i18n.t('create.errors.invalidLink')
                  }}</span>
                }
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <app-avatar
                size="lg"
                [name]="form.controls.displayName.value"
                [imageUrl]="preview()"
              />
              <div class="min-w-0 flex-1">
                <label
                  class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface-raised px-3 text-xs font-semibold text-ink transition hover:border-brand/40"
                  [class.pointer-events-none]="uploading()"
                  [class.opacity-60]="uploading()"
                >
                  <fa-icon
                    [icon]="icons['camera']"
                    class="text-[11px] text-muted"
                    aria-hidden="true"
                  />
                  {{
                    uploading() ? i18n.t('profile.photoUploading') : i18n.t('profile.photoUpload')
                  }}
                  <input
                    type="file"
                    class="sr-only"
                    accept="image/jpeg,image/png,image/webp"
                    [disabled]="uploading()"
                    (change)="onFileSelected($event)"
                  />
                </label>
                <p class="mt-1.5 text-[10px] leading-4 text-muted">
                  {{ i18n.t('profile.photoHint') }}
                </p>
                @if (preview()) {
                  <button
                    type="button"
                    data-testid="profile-avatar-remove"
                    class="ui-btn-secondary mt-2"
                    [disabled]="uploading()"
                    [attr.aria-label]="i18n.t('profile.avatarRemove')"
                    (click)="removeAvatar()"
                  >
                    <fa-icon [icon]="icons['trash']" aria-hidden="true" />
                    {{ i18n.t('profile.avatarRemove') }}
                  </button>
                }
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('profile.personal.name') }} *
                </span>
                <input
                  type="text"
                  formControlName="displayName"
                  autocomplete="name"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
                />
                @if (form.controls.displayName.touched && form.controls.displayName.invalid) {
                  <span class="mt-1 block text-xs text-coral">{{
                    i18n.t('create.errors.required')
                  }}</span>
                }
              </label>

              <label class="block">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('profile.personal.phone') }}
                  <span class="font-normal normal-case tracking-normal text-muted/70">
                    ({{ i18n.t('common.optional') }})
                  </span>
                </span>
                <input
                  type="tel"
                  formControlName="phone"
                  appPhoneMask
                  autocomplete="tel"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
                />
                <span class="mt-1 block text-xs text-muted">{{
                  i18n.t('common.phoneHint')
                }}</span>
              </label>

              <label class="block">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('profile.personal.birthDate') }}
                </span>
                <input
                  type="date"
                  formControlName="birthDate"
                  [max]="maxBirthDate"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
                />
                @if (form.controls.birthDate.touched && form.controls.birthDate.invalid) {
                  <span class="mt-1 block text-xs text-coral">{{
                    i18n.t('profile.personal.birthDateMin')
                  }}</span>
                }
              </label>

              <label class="block">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('profile.personal.timezone') }} *
                </span>
                <input
                  type="text"
                  formControlName="timezone"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition focus:border-brand/50"
                />
                @if (form.controls.timezone.touched && form.controls.timezone.invalid) {
                  <span class="mt-1 block text-xs text-coral">{{
                    i18n.t('create.errors.required')
                  }}</span>
                }
              </label>

              <label class="block sm:col-span-2">
                <span
                  class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  {{ i18n.t('profile.personal.avatarUrl') }}
                </span>
                <input
                  type="url"
                  formControlName="avatarUrl"
                  placeholder="https://"
                  (input)="preview.set($any($event.target).value)"
                  class="h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/50"
                />
                @if (form.controls.avatarUrl.touched && form.controls.avatarUrl.invalid) {
                  <span class="mt-1 block text-xs text-coral">{{
                    i18n.t('create.errors.invalidLink')
                  }}</span>
                }
              </label>
            </div>

            @if (error()) {
              <p
                class="flex items-start gap-2 rounded-xl border border-coral/30 bg-coral/10 p-3 text-xs leading-5 text-coral"
                role="alert"
              >
                <fa-icon [icon]="icons['warning']" class="mt-0.5" aria-hidden="true" />
                {{ error() }}
              </p>
            }

      </form>

      <div modal-footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="ui-btn-secondary" (click)="close()">
          {{ i18n.t('common.cancel') }}
        </button>
        <button type="submit" form="app-profile-form" class="ui-btn" [disabled]="saving()">
          <fa-icon [icon]="icons['check']" class="text-xs" aria-hidden="true" />
          {{ saving() ? i18n.t('common.saving') : i18n.t('common.save') }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ProfileEditDialogComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly store = inject(WorkspaceStore);
  private readonly toasts = inject(ToastService);
  protected readonly i18n = inject(I18nService);

  protected readonly icons = ICONS;
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly coverUploading = signal(false);
  protected readonly preview = signal<string | null>(null);
  protected readonly coverPreview = signal<string | null>(null);
  /** Data máxima permitida: hoje menos 5 anos (idade mínima). */
  protected readonly maxBirthDate = maxBirthDateFor(5);

  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly form = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: [''],
    birthDate: ['', [minimumAge(5)]],
    timezone: ['Africa/Luanda', Validators.required],
    avatarUrl: ['', Validators.pattern(/^https:\/\/.+/)],
    coverUrl: ['', Validators.pattern(/^https:\/\/.+/)],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const profile = this.store.profile();
      this.form.reset(
        {
          displayName: profile.name,
          phone: profile.phone ?? '',
          birthDate: profile.birthDate ?? '',
          timezone: profile.timezone,
          avatarUrl: profile.avatarUrl ?? '',
          coverUrl: profile.coverUrl ?? '',
        },
        { emitEvent: false },
      );
      this.preview.set(profile.avatarUrl);
      this.coverPreview.set(profile.coverUrl);
      this.error.set('');
    });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading()) {
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    try {
      const profile = await this.store.uploadAvatar(file);
      this.form.controls.avatarUrl.setValue(profile.avatarUrl ?? '');
      this.preview.set(profile.avatarUrl);
      this.toasts.success(this.i18n.t('profile.avatarSaved'));
    } catch (caught: unknown) {
      const apiError = caught instanceof ApiError ? caught : toApiError(caught);
      this.error.set(
        apiError.code === 'avatar_upload_unavailable'
          ? this.i18n.t('profile.uploadUnavailable')
          : apiError.message,
      );
    } finally {
      this.uploading.set(false);
    }
  }

  protected async removeAvatar(): Promise<void> {
    if (this.uploading()) {
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    try {
      await this.store.removeAvatar();
      this.form.controls.avatarUrl.setValue('');
      this.preview.set(null);
      this.toasts.success(this.i18n.t('profile.avatarRemoved'));
    } catch (caught: unknown) {
      this.error.set(toApiError(caught).message || this.i18n.t('profile.avatarRemoveError'));
    } finally {
      this.uploading.set(false);
    }
  }

  protected async onCoverSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.coverUploading()) {
      return;
    }
    this.coverUploading.set(true);
    this.error.set('');
    try {
      const profile = await this.store.uploadCover(file);
      this.form.controls.coverUrl.setValue(profile.coverUrl ?? '');
      this.coverPreview.set(profile.coverUrl);
      this.toasts.success(this.i18n.t('profile.coverSaved'));
    } catch (caught: unknown) {
      const apiError = caught instanceof ApiError ? caught : toApiError(caught);
      this.error.set(
        apiError.code === 'profile_cover_upload_unavailable'
          ? this.i18n.t('profile.coverUploadUnavailable')
          : apiError.message,
      );
    } finally {
      this.coverUploading.set(false);
    }
  }

  protected async removeCover(): Promise<void> {
    if (this.coverUploading()) {
      return;
    }
    this.coverUploading.set(true);
    this.error.set('');
    try {
      await this.store.removeCover();
      this.form.controls.coverUrl.setValue('');
      this.coverPreview.set(null);
      this.toasts.success(this.i18n.t('profile.coverRemoved'));
    } catch (caught: unknown) {
      this.error.set(toApiError(caught).message);
    } finally {
      this.coverUploading.set(false);
    }
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    try {
      await this.store.saveProfile({
        display_name: value.displayName.trim(),
        phone: value.phone.trim() || null,
        birth_date: value.birthDate || null,
        locale: this.i18n.locale(),
        timezone: value.timezone,
        avatar_url: value.avatarUrl || null,
      });

      const coverUrl = value.coverUrl.trim();
      if (coverUrl !== (this.store.profile().coverUrl ?? '')) {
        if (coverUrl) {
          await this.store.setCoverUrl(coverUrl);
        } else {
          await this.store.removeCover();
        }
      }

      this.toasts.success(this.i18n.t('profile.saved'));
      this.saved.emit();
      this.closed.emit();
    } catch (caught: unknown) {
      this.error.set(toApiError(caught).message);
    } finally {
      this.saving.set(false);
    }
  }
}

/** Valida a idade mínima (em anos completos) para a data de nascimento. */
function minimumAge(years: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) {
      return null;
    }
    const birth = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birth.getTime())) {
      return { invalidDate: true };
    }
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - years);
    return birth.getTime() <= limit.getTime() ? null : { minimumAge: { years } };
  };
}

function maxBirthDateFor(years: number): string {
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - years);
  return limit.toISOString().slice(0, 10);
}
