import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AuthService } from '../../core/api/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from '../../shared/components/logo.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { LandingAboutComponent } from './landing-about.component';
import { LandingAudienceComponent } from './landing-audience.component';
import { LandingBenefitsComponent } from './landing-benefits.component';
import { LandingFooterComponent } from './landing-footer.component';
import { LandingHeroComponent } from './landing-hero.component';
import { LandingNs2Component } from './landing-ns2.component';
import { LandingStepsComponent } from './landing-steps.component';

/**
 * Landing pública. Não depende da API para renderizar; só verifica a sessão
 * para redirecionar quem já entrou. As secções são componentes independentes.
 */
@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    FaIconComponent,
    LogoComponent,
    PreferenceControlsComponent,
    LandingHeroComponent,
    LandingBenefitsComponent,
    LandingStepsComponent,
    LandingAudienceComponent,
    LandingAboutComponent,
    LandingNs2Component,
    LandingFooterComponent,
  ],
  templateUrl: './landing.page.html',
})
export class LandingPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  protected readonly menuOpen = signal(false);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    // Os metadados dependem do idioma: o effect volta a correr sempre que o
    // utilizador troca PT/EN na própria landing.
    effect(() => this.applySeo());

    // Bloco 12: a landing vive em `/sobre` e abre também com sessão iniciada
    // (o redirect para `/painel` do Bloco 6 foi removido; `/` é o feed).
    if (isPlatformBrowser(this.platformId)) {
      void this.auth.restoreSession();
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  private applySeo(): void {
    const title = this.i18n.t('landing.seo.title');
    const description = this.i18n.t('landing.seo.description');
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:image', content: '/og-image.png' });
    this.meta.updateTag({ property: 'og:url', content: this.document.location.href });
  }
}
