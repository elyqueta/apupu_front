import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { ActivityPresenter } from '../../shared/services/activity.presenter';
import { AvatarComponent } from '../../shared/components/avatar.component';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';
import { SkeletonComponent, SkeletonVariant } from '../../shared/components/skeleton.component';

interface NavItem {
  path: string;
  labelKey: TranslationKey;
  icon: IconDefinition;
  exact: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FaIconComponent,
    BrandComponent,
    AvatarComponent,
    PreferenceControlsComponent,
    SkeletonComponent,
  ],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
  private readonly router = inject(Router);
  private readonly activityPresenter = inject(ActivityPresenter);

  protected readonly mobileOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly pageTitle = signal<TranslationKey>('nav.dashboard');
  protected readonly skeletonVariant = signal<SkeletonVariant>('dashboard');

  protected readonly navItems: NavItem[] = [
    { path: '/painel', labelKey: 'nav.dashboard', icon: ICONS['dashboard'], exact: true },
    { path: '/eventos', labelKey: 'nav.events', icon: ICONS['events'], exact: false },
    { path: '/convidados', labelKey: 'nav.guests', icon: ICONS['guests'], exact: false },
    { path: '/templates', labelKey: 'nav.templates', icon: ICONS['templates'], exact: false },
    { path: '/relatorios', labelKey: 'nav.reports', icon: ICONS['reports'], exact: false },
    { path: '/definicoes', labelKey: 'nav.settings', icon: ICONS['settings'], exact: false },
  ];

  protected readonly notifications = computed(() => this.store.activityFeed().slice(0, 4));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.updatePageTitle();
        this.mobileOpen.set(false);
        this.notificationsOpen.set(false);
      });
    this.updatePageTitle();
  }

  protected search(): void {
    const term = this.searchTerm().trim();
    if (!term) {
      return;
    }
    void this.router.navigate(['/convidados'], { queryParams: { q: term } });
    this.searchTerm.set('');
  }

  protected activityText(eventId: string, item: Parameters<ActivityPresenter['text']>[0]): string {
    const event = this.store.eventById(eventId);
    return this.activityPresenter.text(item, event?.title ?? '');
  }

  protected activityIcon(kind: Parameters<ActivityPresenter['icon']>[0]): IconDefinition {
    return this.activityPresenter.icon(kind);
  }

  protected activityTone(kind: Parameters<ActivityPresenter['tone']>[0]): string {
    return this.activityPresenter.tone(kind);
  }

  protected closeMenus(): void {
    this.mobileOpen.set(false);
    this.notificationsOpen.set(false);
  }

  protected async retry(): Promise<void> {
    await this.store.reload();
  }

  private updatePageTitle(): void {
    const url = this.router.url.split('?')[0].split('#')[0];
    if (url.startsWith('/eventos')) {
      this.pageTitle.set('nav.events');
      this.skeletonVariant.set(url.split('/').filter(Boolean).length > 1 ? 'detail' : 'cards');
    } else if (url.startsWith('/convidados')) {
      this.pageTitle.set('nav.guests');
      this.skeletonVariant.set('table');
    } else if (url.startsWith('/templates')) {
      this.pageTitle.set('nav.templates');
      this.skeletonVariant.set('cards');
    } else if (url.startsWith('/relatorios')) {
      this.pageTitle.set('nav.reports');
      this.skeletonVariant.set('chart');
    } else if (url.startsWith('/definicoes')) {
      this.pageTitle.set('nav.settings');
      this.skeletonVariant.set('profile');
    } else if (url.startsWith('/gestao')) {
      this.pageTitle.set('nav.management');
      this.skeletonVariant.set('detail');
    } else if (url.startsWith('/criar-evento')) {
      this.pageTitle.set('create.eyebrow');
      this.skeletonVariant.set('detail');
    } else {
      this.pageTitle.set('nav.dashboard');
      this.skeletonVariant.set('dashboard');
    }
  }
}
