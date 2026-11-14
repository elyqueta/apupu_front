import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

@Component({
  selector: 'app-management-entry-page',
  imports: [RouterLink, FaIconComponent, BrandComponent, PreferenceControlsComponent],
  templateUrl: './management-entry.page.html',
})
export class ManagementEntryPage {
  private readonly router = inject(Router);

  protected readonly store = inject(WorkspaceStore);
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;

  protected readonly link = signal('');
  protected readonly error = signal(false);
  protected readonly managementEvent = computed(() => this.store.managementEvent());

  protected readonly security = [
    {
      titleKey: 'management.sec1' as const,
      textKey: 'management.sec1Text' as const,
      icon: 'key',
      tone: 'text-aqua border-aqua/25 bg-aqua/10',
    },
    {
      titleKey: 'management.sec2' as const,
      textKey: 'management.sec2Text' as const,
      icon: 'lock',
      tone: 'text-brand-strong border-brand/25 bg-brand/10',
    },
    {
      titleKey: 'management.sec3' as const,
      textKey: 'management.sec3Text' as const,
      icon: 'shield',
      tone: 'text-mint border-mint/25 bg-mint/10',
    },
  ];

  protected updateLink(value: string): void {
    this.link.set(value);
    if (this.error()) {
      this.error.set(false);
    }
  }

  protected submit(): void {
    const event = this.store.findEventByManagementInput(this.link());
    if (!event) {
      this.error.set(true);
      return;
    }
    this.error.set(false);
    this.open(event.id);
  }

  protected openDemo(): void {
    const event =
      this.store.events().find((item) => item.managementToken === 'mgmt-aurora-2027') ??
      this.store.events()[0];
    if (!event) {
      return;
    }
    this.open(event.id);
  }

  protected continueExisting(): void {
    if (this.managementEvent()) {
      void this.router.navigate(['/gestao/evento']);
    }
  }

  private open(eventId: string): void {
    this.store.setActiveManagement(eventId);
    void this.router.navigate(['/gestao/evento']);
  }
}
