import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { LOCALES, TranslationKey } from '../../core/i18n/translations';
import { ThemeMode } from '../../core/models/models';
import { AuthService } from '../../core/api/auth.service';
import { toApiError } from '../../core/api/api-error';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { FontSize, FontSizeService } from '../../core/theme/font-size.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';

interface ThemeOption {
  mode: ThemeMode;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  icon: string;
}

interface SettingsSection {
  id: string;
  labelKey: TranslationKey;
}

/**
 * Definições da aplicação (aparência, texto, idioma, segurança, privacidade,
 * ajuda e sessão de gestão). Os dados pessoais do anfitrião vivem em `/perfil`.
 */
@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, ReactiveFormsModule, FaIconComponent, AvatarComponent],
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly fontSize = inject(FontSizeService);
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly icons = ICONS;
  protected readonly locales = LOCALES;
  protected readonly changingPassword = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly passwordError = signal('');

  protected readonly sections: SettingsSection[] = [
    { id: 'perfil', labelKey: 'settings.profile' },
    { id: 'aparencia', labelKey: 'settings.appearance' },
    { id: 'texto', labelKey: 'settings.fontSize' },
    { id: 'idioma', labelKey: 'settings.language' },
    { id: 'seguranca', labelKey: 'settings.security' },
    { id: 'privacidade', labelKey: 'settings.privacy' },
    { id: 'ajuda', labelKey: 'settings.support' },
    { id: 'sessao', labelKey: 'settings.danger' },
  ];

  protected readonly themeOptions: ThemeOption[] = [
    {
      mode: 'dark',
      labelKey: 'settings.themeDark',
      hintKey: 'settings.themeDarkHint',
      icon: 'moon',
    },
    {
      mode: 'light',
      labelKey: 'settings.themeLight',
      hintKey: 'settings.themeLightHint',
      icon: 'sun',
    },
    {
      mode: 'system',
      labelKey: 'settings.themeSystem',
      hintKey: 'settings.themeSystemHint',
      icon: 'display',
    },
  ];

  protected readonly fontSizeOptions: Array<{ size: FontSize; labelKey: TranslationKey }> = [
    { size: 'normal', labelKey: 'settings.fontSizeNormal' },
    { size: 'large', labelKey: 'settings.fontSizeLarge' },
    { size: 'largest', labelKey: 'settings.fontSizeLargest' },
  ];

  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  });

  constructor() {
    this.store.load({ profile: true });
  }

  protected setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  protected setFontSize(size: FontSize): void {
    this.fontSize.setSize(size);
    this.toasts.success(this.i18n.t('settings.saved'));
  }

  protected async changePassword(): Promise<void> {
    if (this.passwordForm.invalid || this.changingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.changingPassword.set(true);
    this.passwordError.set('');
    try {
      await this.auth.changePassword(
        this.passwordForm.controls.currentPassword.value,
        this.passwordForm.controls.newPassword.value,
      );
      this.passwordForm.reset();
      this.toasts.success(this.i18n.t('settings.saved'));
    } catch (error: unknown) {
      this.passwordError.set(toApiError(error).message);
    } finally {
      this.changingPassword.set(false);
    }
  }

  protected async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    try {
      await this.auth.logout();
      await this.router.navigate(['/entrar']);
    } catch (error: unknown) {
      this.toasts.error(toApiError(error).message);
    } finally {
      this.loggingOut.set(false);
    }
  }
}
