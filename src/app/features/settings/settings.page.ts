import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
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
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { SupportDialogComponent } from '../landing/support-dialog.component';

interface ThemeOption {
  mode: ThemeMode;
  labelKey: TranslationKey;
  hintKey: TranslationKey;
  icon: string;
}

interface SettingsSection {
  id: string;
  labelKey: TranslationKey;
  icon: string;
}

/**
 * Definições da aplicação em cinco secções: conta, aparência, idioma,
 * segurança/privacidade e ajuda. Os dados pessoais do anfitrião vivem em `/perfil`.
 */
@Component({
  selector: 'app-settings-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FaIconComponent,
    AvatarComponent,
    SupportDialogComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './settings.page.html',
})
export class SettingsPage implements AfterViewInit, OnDestroy {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly theme = inject(ThemeService);
  protected readonly fontSize = inject(FontSizeService);
  private readonly toasts = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  protected readonly icons = ICONS;
  protected readonly locales = LOCALES;
  protected readonly changingPassword = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly logoutOpen = signal(false);
  protected readonly passwordError = signal('');
  protected readonly supportOpen = signal(false);

  protected readonly sections: SettingsSection[] = [
    { id: 'conta', labelKey: 'settings.account', icon: 'user' },
    { id: 'aparencia', labelKey: 'settings.appearance', icon: 'palette' },
    { id: 'idioma', labelKey: 'settings.language', icon: 'globe' },
    { id: 'seguranca', labelKey: 'settings.securityPrivacy', icon: 'shield' },
    { id: 'ajuda', labelKey: 'settings.help', icon: 'help' },
  ];
  protected readonly activeSection = signal(this.sections[0].id);

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

  private observer?: IntersectionObserver;
  private readonly visibleSections = new Set<string>();

  constructor() {
    this.store.load({ profile: true });
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      if (fragment && this.sections.some((section) => section.id === fragment)) {
        this.activeSection.set(fragment);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const cards = this.sections
      .map((section) => this.document.getElementById(section.id))
      .filter((card): card is HTMLElement => card !== null);
    if (cards.length === 0) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const entered = new Set<string>();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.visibleSections.add(entry.target.id);
            entered.add(entry.target.id);
          } else {
            this.visibleSections.delete(entry.target.id);
          }
        }
        const current = this.sections.find((section) =>
          entered.size > 0
            ? entered.has(section.id)
            : this.visibleSections.has(section.id),
        );
        if (current) {
          this.activeSection.set(current.id);
        }
      },
      { rootMargin: '-15% 0px -60% 0px', threshold: 0 },
    );
    for (const card of cards) {
      this.observer.observe(card);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = undefined;
    this.visibleSections.clear();
  }

  /** Realça a secção activa e leva o leitor directamente ao cartão correspondente. */
  protected goToSection(id: string, event: Event): void {
    event.preventDefault();
    this.activeSection.set(id);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    requestAnimationFrame(() => {
      this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
    this.logoutOpen.set(false);
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
