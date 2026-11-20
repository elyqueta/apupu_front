import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { ICONS } from '../../core/ui/icons';
import { LogoComponent } from '../../shared/components/logo.component';

interface AdminNavItem {
  path: string;
  labelKey: TranslationKey;
  icon: IconDefinition;
}

/** Shell do painel Super Admin: voltar, menu das abas e router-outlet. */
@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FaIconComponent, LogoComponent],
  templateUrl: './admin.page.html',
})
export class AdminPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly navItems: AdminNavItem[] = [
    {
      path: '/admin/visao-geral',
      labelKey: 'admin.nav.overview',
      icon: ICONS['dashboard'],
    },
    { path: '/admin/eventos', labelKey: 'admin.nav.events', icon: ICONS['events'] },
    { path: '/admin/utilizadores', labelKey: 'admin.nav.users', icon: ICONS['guests'] },
    { path: '/admin/auditoria', labelKey: 'admin.nav.audit', icon: ICONS['history'] },
    { path: '/admin/apoio', labelKey: 'admin.nav.support', icon: ICONS['envelope'] },
    { path: '/admin/novidades', labelKey: 'admin.nav.newsletter', icon: ICONS['paperPlane'] },
  ];
}
