import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { AuthService } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

type AuthMode = 'login' | 'register';
type RegisterStep = 'email' | 'code' | 'details';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BrandComponent, PreferenceControlsComponent],
  template: `
    <div class="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:py-8">
      <header class="flex items-center justify-between gap-4">
        <app-brand />
        <app-preference-controls />
      </header>

      <main class="flex flex-1 items-center justify-center py-10">
        <section class="w-full max-w-md rounded-4xl border border-line bg-surface p-6 shadow-card sm:p-8">
          <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-strong">
            {{ mode() === 'login' ? 'Espaço do anfitrião' : 'Criar conta' }}
          </p>
          <h1 class="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">
            {{ mode() === 'login' ? 'Bem-vindo de volta' : title() }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            @if (mode() === 'login') {
              Entra para gerir os teus eventos e convidados.
            } @else if (step() === 'email') {
              Vamos enviar um código de seis dígitos para verificar o teu email.
            } @else if (step() === 'code') {
              Introduz o código enviado para {{ email() }}.
            } @else {
              Define o teu nome e uma senha para concluir o registo.
            }
          </p>

          @if (error()) {
            <p role="alert" class="mt-5 rounded-2xl border border-coral/25 bg-coral/10 p-3 text-sm text-coral">
              {{ error() }}
            </p>
          }

          @if (mode() === 'login') {
            <form class="mt-6 space-y-4" [formGroup]="loginForm" (ngSubmit)="login()">
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-ink">Email</span>
                <input formControlName="email" type="email" autocomplete="email" required
                  class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
                  [attr.aria-invalid]="loginForm.controls.email.invalid && loginForm.controls.email.touched" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-ink">Senha</span>
                <input formControlName="password" type="password" autocomplete="current-password" required
                  class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
              </label>
              <div class="flex justify-end">
                <a routerLink="/recuperar-senha" class="text-xs font-medium text-brand-strong hover:underline">
                  Esqueceste a senha?
                </a>
              </div>
              <button type="submit" [disabled]="busy()"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-wait disabled:opacity-60">
                {{ busy() ? 'A entrar…' : 'Entrar' }}
              </button>
            </form>
          } @else if (step() === 'email') {
            <form class="mt-6 space-y-4" [formGroup]="emailForm" (ngSubmit)="requestCode()">
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-ink">Email</span>
                <input formControlName="email" type="email" autocomplete="email" required
                  class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50"
                  [attr.aria-invalid]="emailForm.controls.email.invalid && emailForm.controls.email.touched" />
              </label>
              <button type="submit" [disabled]="busy()"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-wait disabled:opacity-60">
                {{ busy() ? 'A enviar…' : 'Enviar código' }}
              </button>
            </form>
          } @else if (step() === 'code') {
            <form class="mt-6 space-y-4" [formGroup]="codeForm" (ngSubmit)="verifyCode()">
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-ink">Código de verificação</span>
                <input formControlName="code" type="text" inputmode="numeric" autocomplete="one-time-code"
                  maxlength="6" pattern="[0-9]{6}" required
                  class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-center font-mono text-lg tracking-[0.4em] text-ink outline-none focus:border-brand/50" />
              </label>
              <button type="submit" [disabled]="busy()"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-wait disabled:opacity-60">
                {{ busy() ? 'A verificar…' : 'Verificar email' }}
              </button>
              <button type="button" class="w-full py-2 text-xs font-medium text-brand-strong disabled:text-muted"
                [disabled]="busy() || resendSeconds() > 0" (click)="requestCode()">
                @if (resendSeconds() > 0) {
                  Pedir novo código em {{ resendSeconds() }} s
                } @else {
                  Enviar novo código
                }
              </button>
            </form>
          } @else {
            <form class="mt-6 space-y-4" [formGroup]="detailsForm" (ngSubmit)="register()">
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-ink">Nome</span>
                <input formControlName="displayName" autocomplete="name"
                  class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-medium text-ink">Senha</span>
                <input formControlName="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128"
                  class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
              </label>
              <button type="submit" [disabled]="busy()"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-wait disabled:opacity-60">
                {{ busy() ? 'A criar conta…' : 'Criar conta' }}
              </button>
            </form>
          }

          <p class="mt-6 text-center text-sm text-muted">
            @if (mode() === 'login') {
              Ainda não tens conta?
              <a routerLink="/registar" class="font-semibold text-brand-strong hover:underline">Criar conta</a>
            } @else {
              Já tens conta?
              <a routerLink="/entrar" class="font-semibold text-brand-strong hover:underline">Entrar</a>
            }
          </p>
        </section>
      </main>
    </div>
  `,
})
export class AuthPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = signal<AuthMode>(
    this.route.snapshot.data['mode'] === 'register' ? 'register' : 'login',
  );
  readonly step = signal<RegisterStep>('email');
  readonly title = signal('Verifica o teu email');
  readonly email = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly resendSeconds = signal(0);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    password: ['', Validators.required],
  });
  readonly emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
  });
  readonly codeForm = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });
  readonly detailsForm = this.fb.group({
    displayName: ['', Validators.maxLength(120)],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resendSeconds.update((seconds) => Math.max(0, seconds - 1));
      });
  }

  async login(): Promise<void> {
    if (this.loginForm.invalid || this.busy()) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(
        this.loginForm.controls.email.value.trim(),
        this.loginForm.controls.password.value,
      );
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
        ? returnUrl
        : '/painel';
      await this.router.navigateByUrl(destination);
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async requestCode(): Promise<void> {
    if (this.emailForm.invalid || this.busy() || this.resendSeconds() > 0) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const email = this.emailForm.controls.email.value.trim();
      const result = await this.auth.requestRegistrationCode(email);
      this.email.set(email);
      this.step.set('code');
      this.resendSeconds.set(
        Math.max(0, Math.ceil((new Date(result.resend_available_at).getTime() - Date.now()) / 1000)),
      );
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async verifyCode(): Promise<void> {
    if (this.codeForm.invalid || this.busy()) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.verifyRegistrationCode(
        this.email(),
        this.codeForm.controls.code.value,
      );
      this.step.set('details');
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }

  async register(): Promise<void> {
    if (this.detailsForm.invalid || this.busy()) {
      this.detailsForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.register(
        this.email(),
        this.detailsForm.controls.password.value,
        this.detailsForm.controls.displayName.value.trim(),
      );
      await this.router.navigate(['/entrar'], { queryParams: { registered: '1' } });
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
