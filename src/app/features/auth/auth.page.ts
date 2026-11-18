import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { interval } from 'rxjs';
import { AuthService, SocialProvider } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { ICONS } from '../../core/ui/icons';
import { distributeOtpDigits } from '../../core/utils/otp.util';
import { AuthLayoutComponent } from '../../shared/components/auth-layout.component';

type AuthMode = 'login' | 'register';
type RegisterStep = 'email' | 'sent' | 'code' | 'details';

function secondsUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

/** Valida que a confirmação coincide com a senha definida. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, FaIconComponent, AuthLayoutComponent],
  template: `
    <app-auth-layout
      [reverse]="mode() === 'register'"
      [heroImage]="heroImage()"
      [heroAlt]="heroAlt()"
    >
      @if (mode() === 'login') {
        <div class="animate-screen">
          <p class="text-sm text-muted">Espaço do anfitrião</p>
          <h1 [class]="titleClass">Bem-vindo de volta</h1>
          <p [class]="leadClass">Entra para gerir os teus eventos e convidados.</p>

          <form class="space-y-4" [formGroup]="loginForm" (ngSubmit)="login()" novalidate>
            <div class="grid gap-1.5">
              <label for="login-email" class="text-sm font-semibold text-ink">Email</label>
              <input
                id="login-email"
                formControlName="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                required
                [class]="inputClass"
                [attr.aria-invalid]="isInvalid(loginForm.controls.email)"
              />
            </div>

            <div class="grid gap-1.5">
              <label for="login-password" class="text-sm font-semibold text-ink">Senha</label>
              <div class="relative">
                <input
                  id="login-password"
                  formControlName="password"
                  [type]="showLoginPassword() ? 'text' : 'password'"
                  autocomplete="current-password"
                  required
                  [class]="passwordInputClass"
                  [attr.aria-invalid]="isInvalid(loginForm.controls.password)"
                />
                <button
                  type="button"
                  class="absolute right-1 top-1 grid size-11 place-items-center rounded-xl text-muted transition hover:text-ink"
                  [attr.aria-label]="showLoginPassword() ? 'Esconder senha' : 'Mostrar senha'"
                  [attr.aria-pressed]="showLoginPassword()"
                  (click)="togglePassword('login')"
                >
                  <fa-icon
                    [icon]="showLoginPassword() ? icons['eyeSlash'] : icons['eye']"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between gap-3 text-sm">
              <label class="flex items-center gap-2 font-medium text-ink">
                <input
                  type="checkbox"
                  formControlName="remember"
                  class="size-[18px] accent-brand"
                />
                Lembrar-me
              </label>
              <a
                routerLink="/recuperar-senha"
                class="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-semibold text-ink transition hover:bg-brand/10 hover:text-brand"
              >
                Esqueceste a senha?
              </a>
            </div>

            <button type="submit" [disabled]="busy()" [class]="submitClass">
              {{ busy() ? 'A entrar…' : 'Entrar' }}
            </button>
          </form>

          <div class="my-5 flex items-center gap-3 text-sm text-muted">
            <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
            <span>ou entra com</span>
            <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              [disabled]="busy()"
              [class]="socialClass"
              (click)="social('google')"
            >
              <fa-icon [icon]="icons['google']" class="text-[20px]" aria-hidden="true" />
              Google
            </button>
            <button
              type="button"
              [disabled]="busy()"
              [class]="socialClass"
              (click)="social('facebook')"
            >
              <fa-icon [icon]="icons['facebook']" class="text-[20px]" aria-hidden="true" />
              Facebook
            </button>
          </div>

          <div class="mt-6">
            <a routerLink="/criar-conta" [class]="secondaryButtonClass">
              Criar conta
              <fa-icon [icon]="icons['arrowRight']" class="text-sm" aria-hidden="true" />
            </a>
            <p class="mt-2 text-center text-[13px] text-muted">Leva menos de um minuto.</p>
          </div>
        </div>
      } @else {
        <div class="mb-5 flex gap-1.5" aria-hidden="true">
          @for (i of [1, 2, 3]; track i) {
            <i
              [class]="
                i <= progress() ? 'h-1 flex-1 rounded bg-[#FFB627]' : 'h-1 flex-1 rounded bg-line'
              "
            ></i>
          }
        </div>

        @if (step() === 'email') {
          <div class="animate-screen">
            <h1 [class]="titleClass">Cria a tua conta</h1>
            <p [class]="leadClass">
              Começa pelo teu email. Enviamos-te um código para confirmar que é teu.
            </p>

            <form class="space-y-4" [formGroup]="emailForm" (ngSubmit)="requestCode()" novalidate>
              <div class="grid gap-1.5">
                <label for="register-email" class="text-sm font-semibold text-ink">Email</label>
                <input
                  id="register-email"
                  formControlName="email"
                  type="email"
                  autocomplete="email"
                  inputmode="email"
                  required
                  [class]="inputClass"
                  [attr.aria-invalid]="isInvalid(emailForm.controls.email)"
                />
              </div>

              <button type="submit" [disabled]="busy()" [class]="submitClass">
                {{ busy() ? 'A enviar…' : 'Enviar código' }}
              </button>
            </form>

            <div class="my-5 flex items-center gap-3 text-sm text-muted">
              <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
              <span>ou cria com</span>
              <span class="h-px flex-1 bg-line" aria-hidden="true"></span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                [disabled]="busy()"
                [class]="socialClass"
                (click)="social('google')"
              >
                <fa-icon [icon]="icons['google']" class="text-[20px]" aria-hidden="true" />
                Google
              </button>
              <button
                type="button"
                [disabled]="busy()"
                [class]="socialClass"
                (click)="social('facebook')"
              >
                <fa-icon [icon]="icons['facebook']" class="text-[20px]" aria-hidden="true" />
                Facebook
              </button>
            </div>

            <div class="mt-6">
              <a routerLink="/entrar" [class]="secondaryButtonClass"> Já tens conta? Entrar </a>
            </div>
          </div>
        } @else if (step() === 'sent') {
          <div class="animate-screen">
            <div
              class="mb-5 grid size-14 place-items-center rounded-[18px] bg-brand/10 text-brand"
              aria-hidden="true"
            >
              <fa-icon [icon]="icons['envelopeOpen']" class="text-2xl" />
            </div>
            <h1 [class]="titleClass">Código enviado</h1>
            <p [class]="leadClass">
              Enviámos um código de 6 dígitos para
              <b class="font-semibold text-ink">{{ email() }}</b>. Abre a caixa de entrada e
              confirma o teu email.
            </p>

            <div class="space-y-3">
              <button type="button" [class]="submitClass" (click)="openCodeStep()">
                Introduzir código
                <fa-icon [icon]="icons['arrowRight']" class="ml-1 text-sm" aria-hidden="true" />
              </button>
              <button
                type="button"
                [class]="secondaryButtonClass"
                [disabled]="busy() || resendSeconds() > 0"
                (click)="resendCode()"
              >
                {{
                  resendSeconds() > 0
                    ? 'Reenviar código (' + resendSeconds() + 's)'
                    : 'Reenviar código'
                }}
              </button>
            </div>

            <div class="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
              <span>Email errado?</span>
              <button type="button" [class]="ghostButtonClass" (click)="changeEmail()">
                Mudar email
              </button>
            </div>
          </div>
        } @else if (step() === 'code') {
          <div class="animate-screen">
            <h1 [class]="titleClass">Confirma o teu email</h1>
            <p [class]="leadClass">
              Enviámos um código de 6 dígitos para
              <b class="font-semibold text-ink">{{ email() }}</b>.
            </p>

            @if (codeFromEmail()) {
              <p
                class="mb-4 rounded-[14px] border border-mint/25 bg-mint/10 p-3 text-[13px] leading-5 text-mint"
              >
                Preenchemos o código do email. Confirma os dígitos e continua.
              </p>
            }

            <form class="space-y-4" [formGroup]="otpForm" (ngSubmit)="verifyCode()" novalidate>
              <div class="flex gap-2.5" role="group" aria-label="Código de 6 dígitos">
                @for (i of otpIndexes; track i) {
                  <input
                    #otpBox
                    [value]="otp()[i]"
                    (input)="onOtpInput($event, i)"
                    (keydown)="onOtpKeydown($event, i)"
                    (paste)="onOtpPaste($event)"
                    (beforeinput)="onOtpBeforeInput($event, i)"
                    inputmode="numeric"
                    maxlength="6"
                    [attr.autocomplete]="i === 0 ? 'one-time-code' : 'off'"
                    [attr.aria-label]="'Dígito ' + (i + 1)"
                    [class]="otpClass"
                  />
                }
              </div>

              <button type="submit" [disabled]="busy()" [class]="submitClass">
                {{ busy() ? 'A confirmar…' : 'Confirmar código' }}
              </button>
            </form>

            <div class="mt-4 flex flex-wrap items-center justify-center gap-1">
              <button
                type="button"
                [class]="ghostButtonClass"
                [disabled]="busy() || resendSeconds() > 0"
                (click)="resendCode()"
              >
                {{
                  resendSeconds() > 0
                    ? 'Reenviar código (' + resendSeconds() + 's)'
                    : 'Reenviar código'
                }}
              </button>
              <button type="button" [class]="ghostButtonClass" (click)="changeEmail()">
                Mudar email
              </button>
            </div>
          </div>
        } @else {
          <div class="animate-screen">
            <h1 [class]="titleClass">Quase lá</h1>
            <p [class]="leadClass">Diz-nos o teu nome e define a tua senha.</p>

            <form class="space-y-4" [formGroup]="detailsForm" (ngSubmit)="register()" novalidate>
              <div class="grid gap-1.5">
                <label for="register-name" class="text-sm font-semibold text-ink">Nome</label>
                <input
                  id="register-name"
                  formControlName="displayName"
                  autocomplete="name"
                  required
                  [class]="inputClass"
                  [attr.aria-invalid]="isInvalid(detailsForm.controls.displayName)"
                />
              </div>

              <div class="grid gap-1.5">
                <label for="register-password" class="text-sm font-semibold text-ink">Senha</label>
                <div class="relative">
                  <input
                    id="register-password"
                    formControlName="password"
                    [type]="showRegisterPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    minlength="8"
                    required
                    [class]="passwordInputClass"
                    [attr.aria-invalid]="isInvalid(detailsForm.controls.password)"
                  />
                  <button
                    type="button"
                    class="absolute right-1 top-1 grid size-11 place-items-center rounded-xl text-muted transition hover:text-ink"
                    [attr.aria-label]="showRegisterPassword() ? 'Esconder senha' : 'Mostrar senha'"
                    [attr.aria-pressed]="showRegisterPassword()"
                    (click)="togglePassword('register')"
                  >
                    <fa-icon
                      [icon]="showRegisterPassword() ? icons['eyeSlash'] : icons['eye']"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <span class="text-[13px] text-muted">Mínimo de 8 caracteres.</span>
              </div>

              <div class="grid gap-1.5">
                <label for="register-confirm-password" class="text-sm font-semibold text-ink">
                  Confirmar senha
                </label>
                <input
                  id="register-confirm-password"
                  formControlName="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  [class]="inputClass"
                  [attr.aria-invalid]="
                    isInvalid(detailsForm.controls.confirmPassword) ||
                    (detailsForm.hasError('passwordMismatch') &&
                      detailsForm.controls.confirmPassword.touched)
                  "
                />
                @if (
                  detailsForm.hasError('passwordMismatch') &&
                  detailsForm.controls.confirmPassword.touched
                ) {
                  <span class="text-[13px] text-coral">As senhas não coincidem.</span>
                }
              </div>

              <button type="submit" [disabled]="busy()" [class]="submitClass">
                {{ busy() ? 'A criar conta…' : 'Criar conta' }}
              </button>

              <p class="text-center text-[13px] text-muted">
                Ao criar conta aceitas os
                <!-- TODO: contrato não confirmado — URL dos Termos. -->
                <a routerLink="/termos" class="font-semibold text-ink underline">Termos</a>
                e a
                <!-- TODO: contrato não confirmado — URL da Política de privacidade. -->
                <a routerLink="/privacidade" class="font-semibold text-ink underline">
                  Política de privacidade
                </a>
                .
              </p>
            </form>
          </div>
        }
      }
    </app-auth-layout>
  `,
})
export class AuthPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;

  protected readonly titleClass =
    'mb-2 mt-1.5 font-display text-[30px] font-semibold leading-tight tracking-tight text-ink min-[860px]:text-[34px]';
  protected readonly leadClass = 'mb-6 text-muted';

  private readonly fieldBase =
    'h-[52px] w-full rounded-[14px] border border-line bg-surface-raised px-4 text-[15px] text-ink outline-none transition placeholder:text-muted aria-[invalid=true]:border-danger';
  protected readonly inputClass = this.fieldBase;
  protected readonly passwordInputClass = `${this.fieldBase} pr-[52px]`;
  protected readonly otpClass =
    'h-[58px] w-full rounded-[14px] border border-line bg-surface-raised p-0 text-center font-display text-2xl font-semibold text-ink outline-none';
  protected readonly submitClass =
    'inline-flex h-[52px] w-full items-center justify-center rounded-[14px] bg-brand text-base font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-progress disabled:opacity-60';
  protected readonly secondaryButtonClass =
    'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-line bg-surface-raised text-[15px] font-semibold text-ink no-underline transition hover:border-brand/50 hover:bg-brand/5 disabled:cursor-progress disabled:opacity-60';
  protected readonly ghostButtonClass =
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-transparent px-3 text-sm font-semibold text-ink transition hover:bg-brand/10 disabled:cursor-default disabled:opacity-60';
  protected readonly socialClass =
    'inline-flex h-12 items-center justify-center gap-2.5 rounded-[14px] border border-line bg-transparent text-[15px] font-semibold text-ink transition hover:border-brand/40 disabled:cursor-progress disabled:opacity-60';

  protected readonly otpIndexes = [0, 1, 2, 3, 4, 5];

  readonly mode = signal<AuthMode>(
    this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login',
  );
  readonly step = signal<RegisterStep>('email');
  readonly email = signal('');
  readonly codeFromEmail = signal(false);
  readonly busy = signal(false);
  readonly resendSeconds = signal(0);
  readonly showLoginPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly otp = signal<string[]>(['', '', '', '', '', '']);

  protected readonly progress = computed(() => {
    switch (this.step()) {
      case 'email':
      case 'sent':
        return 1;
      case 'code':
        return 2;
      default:
        return 3;
    }
  });

  protected readonly heroImage = computed(() =>
    this.mode() === 'register' ? '/auth-criar-conta.webp' : '/auth-login.webp',
  );
  protected readonly heroAlt = computed(() =>
    this.mode() === 'register'
      ? 'Amigos a fazer um brinde numa mesa ao pôr do sol'
      : 'Amigos de costas a celebrar ao pôr do sol na baía de Luanda',
  );

  private readonly otpBoxes = viewChildren<ElementRef<HTMLInputElement>>('otpBox');

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    password: ['', Validators.required],
    remember: [false],
  });
  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
  });
  /**
   * Grupo vazio: só serve para que o formulário do OTP tenha um `FormGroupDirective`
   * e o `(ngSubmit)` funcione (sem ele o browser faria um submit nativo).
   */
  readonly otpForm = this.fb.group({});
  readonly detailsForm = this.fb.group(
    {
      displayName: ['', [Validators.required, Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.prefillFromLink();
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resendSeconds.update((seconds) => Math.max(0, seconds - 1));
      });
  }

  /**
   * Abre o passo do código já preenchido quando o utilizador chega pelo link
   * enviado no email (`/criar-conta?email=…&codigo=…`). O código nunca é
   * devolvido pela API: só viaja no email.
   */
  private prefillFromLink(): void {
    if (this.mode() !== 'register') {
      return;
    }
    const query = this.route.snapshot.queryParamMap;
    const email = query.get('email')?.trim() ?? '';
    const code = (query.get('codigo') ?? query.get('code') ?? '').replace(/\D/g, '').slice(0, 6);
    const autoSend = query.get('enviar') === '1' || query.get('send') === '1';
    if (email) {
      this.email.set(email);
      this.emailForm.controls.email.setValue(email);
    }
    if (email && code.length === 6) {
      this.otp.set(this.otpIndexes.map((index) => code[index] ?? ''));
      this.codeFromEmail.set(true);
      this.step.set('code');
    } else if (email && autoSend) {
      // Chegou de um convite ou link de gestão sem conta: envia já o OTP
      // para o email sugerido, mantendo o registo pré-preenchido.
      queueMicrotask(() => void this.requestCode());
    }
  }

  protected isInvalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  protected togglePassword(field: 'login' | 'register'): void {
    if (field === 'login') {
      this.showLoginPassword.update((value) => !value);
    } else {
      this.showRegisterPassword.update((value) => !value);
    }
  }

  async login(): Promise<void> {
    if (this.busy()) {
      return;
    }
    const email = this.loginForm.controls.email.value.trim();
    const password = this.loginForm.controls.password.value;
    if (!this.loginForm.controls.email.valid || !email) {
      this.loginForm.controls.email.markAsTouched();
      this.toasts.error('Indica um email válido.');
      return;
    }
    if (!password) {
      this.loginForm.controls.password.markAsTouched();
      this.toasts.error('Indica a tua senha.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.login(email, password, this.loginForm.controls.remember.value);
      this.toasts.success('Sessão iniciada. Bem-vindo de volta!');
      await this.router.navigateByUrl(this.resolveDestination());
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async requestCode(): Promise<void> {
    if (this.busy()) {
      return;
    }
    const email = this.emailForm.controls.email.value.trim();
    if (!this.emailForm.controls.email.valid || !email) {
      this.emailForm.controls.email.markAsTouched();
      this.toasts.error('Este email não parece válido. Verifica se está bem escrito.');
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.auth.requestRegistrationCode(email);
      this.email.set(email);
      this.resendSeconds.set(secondsUntil(result.resend_available_at));
      this.step.set('sent');
      this.toasts.success(`Enviámos um código de 6 dígitos para ${email}.`);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async resendCode(): Promise<void> {
    if (this.busy() || this.resendSeconds() > 0) {
      return;
    }
    this.busy.set(true);
    try {
      const result = await this.auth.requestRegistrationCode(this.email());
      this.resendSeconds.set(secondsUntil(result.resend_available_at));
      this.otp.set(['', '', '', '', '', '']);
      this.codeFromEmail.set(false);
      this.toasts.success(`Enviámos um novo código para ${this.email()}.`);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  /** Abre o ecrã do OTP e foca o primeiro dígito em falta. */
  protected openCodeStep(): void {
    this.step.set('code');
    this.codeFromEmail.set(this.otp().join('').length === 6);
    const firstEmpty = this.otp().findIndex((digit) => !digit);
    const focusIndex = firstEmpty === -1 ? 0 : firstEmpty;
    queueMicrotask(() => this.otpBoxes()[focusIndex]?.nativeElement.focus());
  }

  async verifyCode(): Promise<void> {
    if (this.busy()) {
      return;
    }
    const code = this.otp().join('');
    if (code.length < 6) {
      this.toasts.error('Escreve os 6 dígitos do código.');
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.verifyRegistrationCode(this.email(), code);
      this.step.set('details');
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async register(): Promise<void> {
    if (this.busy()) {
      return;
    }
    const displayName = this.detailsForm.controls.displayName.value.trim();
    const password = this.detailsForm.controls.password.value;
    if (!displayName) {
      this.detailsForm.controls.displayName.markAsTouched();
      this.toasts.error('Indica o teu nome.');
      return;
    }
    if (password.length < 8) {
      this.detailsForm.controls.password.markAsTouched();
      this.toasts.error('A senha precisa de pelo menos 8 caracteres.');
      return;
    }
    if (this.detailsForm.hasError('passwordMismatch')) {
      this.detailsForm.controls.confirmPassword.markAsTouched();
      this.toasts.error('As senhas não coincidem.');
      return;
    }
    this.busy.set(true);
    try {
      // O contrato atual inicia a sessão no próprio registo: não há login separado.
      await this.auth.register(this.email(), password, displayName);
      this.toasts.success('Conta criada com sucesso. Bem-vindo!');
      await this.router.navigateByUrl(this.resolveDestination());
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async social(provider: SocialProvider): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    try {
      await this.auth.loginWithProvider(provider);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected changeEmail(): void {
    this.resendSeconds.set(0);
    this.codeFromEmail.set(false);
    this.otp.set(['', '', '', '', '', '']);
    this.step.set('email');
  }

  protected onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');

    // Alguns teclados móveis e o preenchimento automático do sistema
    // inserem o código inteiro sem disparar `paste`. Nesse caso o `input`
    // recebe vários dígitos e distribuímo-los pelas caixas.
    if (digits.length > 1) {
      this.fillOtp(digits, index);
      input.value = this.otp()[index] ?? '';
      return;
    }

    const digit = digits;
    input.value = digit;
    this.otp.update((values) => values.map((value, i) => (i === index ? digit : value)));
    if (digit && index < this.otpIndexes.length - 1) {
      this.otpBoxes()[index + 1]?.nativeElement.focus();
    }
  }

  protected onOtpKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      this.otpBoxes()[index - 1]?.nativeElement.focus();
    }
  }

  protected onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    this.fillOtp(event.clipboardData?.getData('text') ?? '');
  }

  /**
   * Captura a colagem/preenchimento automático antes de o browser a
   * truncar pela largura da caixa. Mantém o input segmentado intacto.
   */
  protected onOtpBeforeInput(event: Event, index: number): void {
    const inputEvent = event as InputEvent;
    if (!(inputEvent.inputType ?? '').startsWith('insert')) {
      return;
    }

    const digits = (inputEvent.data ?? '').replace(/\D/g, '');
    if (digits.length <= 1) {
      return;
    }

    event.preventDefault();
    this.fillOtp(digits, index);
  }

  /** Distribui os dígitos pelas caixas e foca a próxima por preencher. */
  private fillOtp(text: string, startIndex = 0): void {
    const digits = text.replace(/\D/g, '');
    if (!digits) {
      return;
    }

    this.otp.update((values) => distributeOtpDigits(values, digits, startIndex));

    const offset = digits.length >= this.otpIndexes.length ? 0 : startIndex;
    const focusIndex = Math.min(offset + digits.length, this.otpIndexes.length - 1);
    queueMicrotask(() => this.otpBoxes()[focusIndex]?.nativeElement.focus());
  }

  /**
   * Preserva `returnUrl` (ex.: `/entrar?returnUrl=%2Fpainel`).
   * TODO: confirmar destino por defeito com o backend.
   */
  private resolveDestination(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/painel';
  }
}
