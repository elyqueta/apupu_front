import { Component, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

@Component({
  selector: 'app-management-event-page',
  imports: [RouterLink, FaIconComponent, BrandComponent, PreferenceControlsComponent],
  templateUrl: './management-event.page.html',
})
export class ManagementEventPage {
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly event = computed(() => this.store.managementEvent());

  constructor() {
    effect(() => {
      const event = this.event();
      if (event && this.browser) {
        void this.router.navigate(['/eventos', event.id], { replaceUrl: true });
      }
    });
  }

  protected continueToEvent(): void {
    const event = this.event();
    if (event) {
      void this.router.navigate(['/eventos', event.id], { replaceUrl: true });
    }
  }

  protected openDemo(): void {
    const event =
      this.store.events().find((item) => item.managementToken === 'mgmt-aurora-2027') ??
      this.store.events()[0];
    if (!event) {
      return;
    }
    this.store.setActiveManagement(event.id);
    this.continueToEvent();
  }
}
