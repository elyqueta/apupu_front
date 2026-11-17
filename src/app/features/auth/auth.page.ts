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
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { interval } from 'rxjs';
import { AuthService, SocialProvider } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { ICONS } from '../../core/ui/icons';
import { AuthLayoutComponent } from '../../shared/components/auth-layout.component';

type AuthMode = 'login' | 'register';
type RegisterStep = 'email' | 'code' | 'details';

function secondsUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
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

          @if (error()) {
            <p role="alert" class="text-sm text-danger">{{ error() }}</p>
          }

          <div class="flex items-center justify-between gap-3 text-sm">
            <label class="flex items-center gap-2 font-medium text-ink">
              <input type="checkbox" formControlName="remember" class="size-[18px] accent-brand" />
              Lembrar-me
            </label>
            <a routerLink="/recuperar-senha" class="font-semibold text-ink underline">
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
          <button type="button" [disabled]="busy()" [class]="socialClass" (click)="social('google')">
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

        <p class="mt-5 text-center text-[15px] text-muted">
          Ainda não tens conta?
          <a routerLink="/criar-conta" class="font-semibold text-ink underline">Criar conta</a>
        </p>
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

            @if (error()) {
              <p role="alert" class="text-sm text-danger">{{ error() }}</p>
            }

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

          <p class="mt-5 text-center text-[15px] text-muted">
            Já tens conta?
            <a routerLink="/entrar" class="font-semibold text-ink underline">Entrar</a>
          </p>
        } @else if (step() === 'code') {
          <h1 [class]="titleClass">Confirma o teu email</h1>
          <p [class]="leadClass">
            Enviámos um código de 6 dígitos para <b class="font-semibold text-ink">{{ email() }}</b
            >.
          </p>

          <form class="space-y-4" [formGroup]="otpForm" (ngSubmit)="verifyCode()" novalidate>
            <div class="flex gap-2.5" role="group" aria-label="Código de 6 dígitos">
              @for (i of otpIndexes; track i) {
                <input
                  #otpBox
                  [value]="otp()[i]"
                  (input)="onOtpInput($event, i)"
                  (keydown)="onOtpKeydown($event, i)"
                  (paste)="onOtpPaste($event)"
                  inputmode="numeric"
                  maxlength="1"
                  [attr.autocomplete]="i === 0 ? 'one-time-code' : 'off'"
                  [attr.aria-label]="'Dígito ' + (i + 1)"
                  [class]="otpClass"
                />
              }
            </div>

            @if (error()) {
              <p role="alert" class="text-sm text-danger">{{ error() }}</p>
            }

            <button type="submit" [disabled]="busy()" [class]="submitClass">
              {{ busy() ? 'A confirmar…' : 'Confirmar código' }}
            </button>
          </form>

          <p class="mt-5 text-center text-sm text-muted">
            <button
              type="button"
              [class]="linkClass"
              [disabled]="busy() || resendSeconds() > 0"
              (click)="resendCode()"
            >
              {{ resendSeconds() > 0 ? 'Reenviar código (' + resendSeconds() + 's)' : 'Reenviar código' }}
            </button>
            <span aria-hidden="true"> · </span>
            <button type="button" [class]="linkClass" (click)="changeEmail()">Mudar email</button>
          </p>
        } @else {
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

            @if (error()) {
              <p role="alert" class="text-sm text-danger">{{ error() }}</p>
            }

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
  protected readonly socialClass =
    'inline-flex h-12 items-center justify-center gap-2.5 rounded-[14px] border border-line bg-transparent text-[15px] font-semibold text-ink transition hover:border-brand/40 disabled:cursor-progress disabled:opacity-60';
  protected readonly linkClass =
    'bg-transparent p-0 text-sm font-semibold text-ink underline disabled:cursor-default disabled:text-muted disabled:no-underline';

  protected readonly otpIndexes = [0, 1, 2, 3, 4, 5];

  readonly mode = signal<AuthMode>(
    this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login',
  );
  readonly step = signal<RegisterStep>('email');
  readonly email = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly resendSeconds = signal(0);
  readonly showLoginPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly otp = signal<string[]>(['', '', '', '', '', '']);

  protected readonly progress = computed(() => {
    switch (this.step()) {
      case 'email':
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
  readonly detailsForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resendSeconds.update((seconds) => Math.max(0, seconds - 1));
      });
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
      this.error.set('Indica um email válido.');
      return;
    }
    if (!password) {
      this.loginForm.controls.password.markAsTouched();
      this.error.set('Indica a tua senha.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(email, password, this.loginForm.controls.remember.value);
      await this.router.navigateByUrl(this.resolveDestination());
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
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
      this.error.set('Este email não parece válido. Verifica se está bem escrito.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.requestRegistrationCode(email);
      this.email.set(email);
      this.step.set('code');
      this.otp.set(['', '', '', '', '', '']);
      this.resendSeconds.set(secondsUntil(result.resend_available_at));
      queueMicrotask(() => this.otpBoxes()[0]?.nativeElement.focus());
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async resendCode(): Promise<void> {
    if (this.busy() || this.resendSeconds() > 0) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await this.auth.requestRegistrationCode(this.email());
      this.resendSeconds.set(secondsUntil(result.resend_available_at));
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async verifyCode(): Promise<void> {
    if (this.busy()) {
      return;
    }
    const code = this.otp().join('');
    if (code.length < 6) {
      this.error.set('Escreve os 6 dígitos do código.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.verifyRegistrationCode(this.email(), code);
      this.step.set('details');
      this.error.set('');
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
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
      this.error.set('Indica o teu nome.');
      return;
    }
    if (password.length < 8) {
      this.detailsForm.controls.password.markAsTouched();
      this.error.set('A senha precisa de pelo menos 8 caracteres.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.register(this.email(), password, displayName);
      // TODO: contrato não confirmado — entrar automaticamente após o registo?
      await this.router.navigate(['/entrar']);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async social(provider: SocialProvider): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.loginWithProvider(provider);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected changeEmail(): void {
    this.resendSeconds.set(0);
    this.otp.set(['', '', '', '', '', '']);
    this.error.set('');
    this.step.set('email');
  }

  protected onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
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
    const text = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!text) {
      return;
    }
    const digits = this.otp().map((_, i) => text[i] ?? '');
    this.otp.set(digits);
    const focusIndex = Math.min(text.length, this.otpIndexes.length - 1);
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
