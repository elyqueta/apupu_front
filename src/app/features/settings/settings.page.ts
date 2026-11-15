import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { LOCALES, TranslationKey } from '../../core/i18n/translations';
import { ThemeMode } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { FontSize, FontSizeService } from '../../core/theme/font-size.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ICONS } from '../../core/ui/icons';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';

interface ThemeOption {
  mode: ThemeMode;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  icon: string;
}

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, FaIconComponent, AvatarComponent, ConfirmDialogComponent],
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly fontSize = inject(FontSizeService);
  private readonly toasts = inject(ToastService);

  protected readonly icons = ICONS;
  protected readonly locales = LOCALES;
  protected readonly resetOpen = signal(false);

  protected readonly themeOptions: ThemeOption[] = [
    { mode: 'dark', labelKey: 'settings.themeDark', hintKey: 'settings.themeDarkHint', icon: 'moon' },
    { mode: 'light', labelKey: 'settings.themeLight', hintKey: 'settings.themeLightHint', icon: 'sun' },
    { mode: 'system', labelKey: 'settings.themeSystem', hintKey: 'settings.themeSystemHint', icon: 'display' },
  ];

  protected readonly fontSizeOptions: Array<{ size: FontSize; labelKey: TranslationKey }> = [
    { size: 'normal', labelKey: 'settings.fontSizeNormal' },
    { size: 'large', labelKey: 'settings.fontSizeLarge' },
    { size: 'largest', labelKey: 'settings.fontSizeLargest' },
  ];

  protected readonly preferences = signal([
    { key: 'reminders', labelKey: 'settings.prefReminders' as TranslationKey, hintKey: 'settings.prefRemindersHint' as TranslationKey, value: true },
    { key: 'digest', labelKey: 'settings.prefDigest' as TranslationKey, hintKey: 'settings.prefDigestHint' as TranslationKey, value: true },
    { key: 'motion', labelKey: 'settings.prefMotion' as TranslationKey, hintKey: 'settings.prefMotionHint' as TranslationKey, value: false },
    { key: 'sounds', labelKey: 'settings.prefSounds' as TranslationKey, hintKey: 'settings.prefSoundsHint' as TranslationKey, value: false },
  ]);

  protected readonly profile = signal({
    name: this.store.profile.name,
    email: this.store.profile.email,
    role: this.store.profile.role,
    location: this.store.profile.location,
  });

  protected setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  protected setFontSize(size: FontSize): void {
    this.fontSize.setSize(size);
    this.toasts.success(this.i18n.t('settings.saved'));
  }

  protected togglePreference(key: string): void {
    this.preferences.update((items) =>
      items.map((item) => (item.key === key ? { ...item, value: !item.value } : item)),
    );
    this.toasts.success(this.i18n.t('settings.saved'));
  }

  protected saveProfile(): void {
    this.toasts.success(this.i18n.t('settings.saved'));
  }

  protected endManagement(): void {
    this.store.setActiveManagement(null);
    this.toasts.info(this.i18n.t('settings.managementEnded'));
  }

  protected resetDemo(): void {
    this.store.resetDemo();
    this.resetOpen.set(false);
    this.toasts.success(this.i18n.t('settings.resetDone'));
  }

  protected updateProfile(field: 'name' | 'email' | 'role' | 'location', value: string): void {
    this.profile.update((profile) => ({ ...profile, [field]: value }));
  }
}
