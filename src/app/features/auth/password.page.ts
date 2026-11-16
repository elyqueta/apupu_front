import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

type PasswordMode = 'forgot' | 'reset';

@Component({
  selector: 'app-password-page',
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
          <h1 class="font-display text-3xl font-semibold tracking-tight text-ink">
            {{ mode() === 'forgot' ? 'Recuperar senha' : 'Definir nova senha' }}
          </h1>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ success() ? success() : mode() === 'forgot'
              ? 'Indica o email da conta. Se existir, receberás instruções para repor a senha.'
              : 'Escolhe uma senha com pelo menos oito caracteres.' }}
          </p>
          @if (error()) {
            <p role="alert" class="mt-5 rounded-2xl border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{{ error() }}</p>
          }
          @if (!success()) {
            <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()">
              @if (mode() === 'forgot') {
                <label class="block">
                  <span class="mb-1.5 block text-xs font-medium text-ink">Email</span>
                  <input formControlName="email" type="email" autocomplete="email" required
                    class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
                </label>
              } @else {
                <label class="block">
                  <span class="mb-1.5 block text-xs font-medium text-ink">Token recebido no email</span>
                  <input formControlName="token" autocomplete="off" required
                    class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
                </label>
                <label class="block">
                  <span class="mb-1.5 block text-xs font-medium text-ink">Nova senha</span>
                  <input formControlName="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128"
                    class="h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink outline-none focus:border-brand/50" />
                </label>
              }
              <button type="submit" [disabled]="busy()"
                class="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-secondary transition hover:bg-secondary-hover disabled:cursor-wait disabled:opacity-60">
                {{ busy() ? 'A processar…' : mode() === 'forgot' ? 'Enviar instruções' : 'Guardar nova senha' }}
              </button>
            </form>
          }
          <p class="mt-6 text-center text-sm text-muted">
            <a routerLink="/entrar" class="font-semibold text-brand-strong hover:underline">Voltar ao login</a>
          </p>
        </section>
      </main>
    </div>
  `,
})
export class PasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly mode = signal<PasswordMode>(
    this.route.snapshot.data['mode'] === 'reset' ? 'reset' : 'forgot',
  );
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    token: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.form.controls.token.setValue(token);
      void this.router.navigate([], { queryParams: { token: null }, replaceUrl: true });
    }
  }

  async submit(): Promise<void> {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.mode() === 'forgot') {
        await this.auth.requestPasswordReset(this.form.controls.email.value.trim());
        this.success.set('Se a conta existir, serão enviadas instruções para repor a senha.');
      } else {
        await this.auth.resetPassword(
          this.form.controls.token.value,
          this.form.controls.password.value,
        );
        this.success.set('Senha alterada. Já podes entrar com a nova senha.');
      }
    } catch (error: unknown) {
      this.error.set(toApiError(error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
