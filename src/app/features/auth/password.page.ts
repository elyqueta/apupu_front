import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { AuthLayoutComponent } from '../../shared/components/auth-layout.component';

type PasswordMode = 'forgot' | 'reset';
type PasswordStep = 'form' | 'done';

@Component({
  selector: 'app-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FaIconComponent, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      @if (mode() === 'forgot') {
        @if (step() === 'form') {
          <div class="animate-screen">
            <h1 [class]="titleClass">{{ i18n.t('password.forgotTitle') }}</h1>
            <p [class]="leadClass">{{ i18n.t('password.forgotLead') }}</p>

            <form class="space-y-4" [formGroup]="forgotForm" (ngSubmit)="submit()" novalidate>
              <div class="grid gap-1.5">
                <label for="forgot-email" class="text-sm font-semibold text-ink">
                  {{ i18n.t('auth.email') }}
                </label>
                <input
                  id="forgot-email"
                  formControlName="email"
                  type="email"
                  autocomplete="email"
                  inputmode="email"
                  required
                  [class]="inputClass"
                  [attr.aria-invalid]="isInvalid(forgotForm.controls.email)"
                />
              </div>

              <button type="submit" [disabled]="busy()" [class]="submitClass">
                {{ busy() ? i18n.t('password.sendingLink') : i18n.t('password.sendLink') }}
              </button>
            </form>

            <div class="mt-6">
              <a routerLink="/entrar" [class]="secondaryButtonClass">
                <fa-icon [icon]="icons['arrowLeft']" class="text-sm" aria-hidden="true" />
                {{ i18n.t('password.backToLogin') }}
              </a>
            </div>
          </div>
        } @else {
          <div class="animate-screen">
            <div
              class="mb-4 grid size-14 place-items-center rounded-[18px] bg-[#FFB627] text-[#0F3D3E]"
              aria-hidden="true"
            >
              <fa-icon [icon]="icons['envelope']" class="text-xl" />
            </div>
            <h1 [class]="titleClass">{{ i18n.t('password.checkEmail') }}</h1>
            <p [class]="leadClass">
              {{ i18n.t('password.checkEmailLead', { email: email() }) }}
              <!-- TODO: contrato não confirmado — indicar a validade do link quando o backend a definir. -->
            </p>

            <button type="button" [disabled]="busy()" [class]="submitClass" (click)="resend()">
              {{ busy() ? i18n.t('password.sendingLink') : i18n.t('password.resendLink') }}
            </button>

            <div class="mt-6">
              <a routerLink="/entrar" [class]="secondaryButtonClass">
                <fa-icon [icon]="icons['arrowLeft']" class="text-sm" aria-hidden="true" />
                {{ i18n.t('password.backToLogin') }}
              </a>
            </div>
          </div>
        }
      } @else {
        @if (step() === 'form') {
          <div class="animate-screen">
            <h1 [class]="titleClass">{{ i18n.t('password.resetTitle') }}</h1>
            <p [class]="leadClass">{{ i18n.t('password.resetLead') }}</p>

            <form class="space-y-4" [formGroup]="resetForm" (ngSubmit)="submit()" novalidate>
              <div class="grid gap-1.5">
                <label for="reset-password" class="text-sm font-semibold text-ink"
                  >{{ i18n.t('password.newPassword') }}</label
                >
                <div class="relative">
                  <input
                    id="reset-password"
                    formControlName="password"
                    [type]="showNewPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    minlength="8"
                    required
                    [class]="passwordInputClass"
                    [attr.aria-invalid]="isInvalid(resetForm.controls.password)"
                  />
                  <button
                    type="button"
                    class="absolute right-1 top-1 grid size-11 place-items-center rounded-xl text-muted transition hover:text-ink"
                    [attr.aria-label]="
                      showNewPassword() ? i18n.t('auth.hidePassword') : i18n.t('auth.showPassword')
                    "
                    [attr.aria-pressed]="showNewPassword()"
                    (click)="togglePassword('new')"
                  >
                    <fa-icon
                      [icon]="showNewPassword() ? icons['eyeSlash'] : icons['eye']"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <span class="text-[13px] text-muted">{{ i18n.t('password.minPassword') }}</span>
              </div>

              <div class="grid gap-1.5">
                <label for="reset-confirm" class="text-sm font-semibold text-ink">
                  {{ i18n.t('password.confirmPassword') }}
                </label>
                <div class="relative">
                  <input
                    id="reset-confirm"
                    formControlName="confirm"
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    required
                    [class]="passwordInputClass"
                    [attr.aria-invalid]="isInvalid(resetForm.controls.confirm)"
                  />
                  <button
                    type="button"
                    class="absolute right-1 top-1 grid size-11 place-items-center rounded-xl text-muted transition hover:text-ink"
                    [attr.aria-label]="
                      showConfirmPassword()
                        ? i18n.t('auth.hidePassword')
                        : i18n.t('auth.showPassword')
                    "
                    [attr.aria-pressed]="showConfirmPassword()"
                    (click)="togglePassword('confirm')"
                  >
                    <fa-icon
                      [icon]="showConfirmPassword() ? icons['eyeSlash'] : icons['eye']"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <button type="submit" [disabled]="busy()" [class]="submitClass">
                {{ busy() ? i18n.t('password.saving') : i18n.t('password.saveNewPassword') }}
              </button>
            </form>
          </div>
        } @else {
          <div class="animate-screen">
            <h1 [class]="titleClass">{{ i18n.t('password.updatedTitle') }}</h1>
            <p [class]="leadClass">{{ i18n.t('password.updatedLead') }}</p>

            <a
              routerLink="/entrar"
              class="inline-flex h-[52px] w-full items-center justify-center rounded-[14px] bg-brand text-base font-semibold text-on-secondary no-underline transition hover:bg-secondary-hover"
            >
              {{ i18n.t('auth.signIn') }}
            </a>
          </div>
        }
      }
    </app-auth-layout>
  `,
})
export class PasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly i18n = inject(I18nService);

  protected readonly icons = ICONS;

  protected readonly titleClass =
    'mb-2 mt-1.5 font-display text-[30px] font-semibold leading-tight tracking-tight text-ink min-[860px]:text-[34px]';
  protected readonly leadClass = 'mb-6 text-muted';

  private readonly fieldBase =
    'h-[52px] w-full rounded-[14px] border border-line bg-surface-raised px-4 text-[15px] text-ink outline-none transition placeholder:text-muted aria-[invalid=true]:border-danger';
  protected readonly inputClass = this.fieldBase;
  protected readonly passwordInputClass = `${this.fieldBase} pr-[52px]`;
  protected readonly submitClass =
    'inline-flex h-[52px] w-full items-center justify-center rounded-[14px] bg-brand text-base font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-progress disabled:opacity-60';
  protected readonly secondaryButtonClass =
    'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-line bg-surface-raised text-[15px] font-semibold text-ink no-underline transition hover:border-brand/50 hover:bg-brand/5 disabled:cursor-progress disabled:opacity-60';

  readonly mode = signal<PasswordMode>(
    this.route.snapshot.data['mode'] === 'reset' ? 'reset' : 'forgot',
  );
  readonly step = signal<PasswordStep>('form');
  readonly busy = signal(false);
  readonly email = signal('');
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly token = signal('');

  readonly forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
  });
  readonly resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirm: ['', Validators.required],
  });

  constructor() {
    // O link do email traz o token como parâmetro do URL.
    // TODO: contrato não confirmado — confirmar o nome do parâmetro com o backend.
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.token.set(token);
    }
  }

  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected togglePassword(field: 'new' | 'confirm'): void {
    if (field === 'new') {
      this.showNewPassword.update((value) => !value);
    } else {
      this.showConfirmPassword.update((value) => !value);
    }
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    if (this.mode() === 'forgot') {
      await this.submitForgot();
    } else {
      await this.submitReset();
    }
  }

  async resend(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.requestPasswordReset(this.email());
      this.toasts.success(this.i18n.t('password.error.linkResent', { email: this.email() }));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async submitForgot(): Promise<void> {
    const email = this.forgotForm.controls.email.value.trim();
    if (!this.forgotForm.controls.email.valid || !email) {
      this.forgotForm.controls.email.markAsTouched();
      this.toasts.error(this.i18n.t('auth.error.invalidEmail'));
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.requestPasswordReset(email);
      // A mensagem de sucesso é sempre a mesma, exista ou não conta.
      this.email.set(email);
      this.step.set('done');
      this.toasts.success(this.i18n.t('password.error.conditionalLink'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async submitReset(): Promise<void> {
    const password = this.resetForm.controls.password.value;
    const confirm = this.resetForm.controls.confirm.value;
    if (password.length < 8) {
      this.resetForm.controls.password.markAsTouched();
      this.toasts.error(this.i18n.t('auth.error.passwordMin'));
      return;
    }
    if (password !== confirm) {
      this.resetForm.controls.confirm.markAsTouched();
      this.toasts.error(this.i18n.t('auth.passwordsMismatch'));
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.resetPassword(this.token(), password);
      this.step.set('done');
      this.toasts.success(this.i18n.t('password.error.updated'));
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
