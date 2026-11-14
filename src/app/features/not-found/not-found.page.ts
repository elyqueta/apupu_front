import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { I18nService } from '../../core/i18n/i18n.service';
import { ICONS } from '../../core/ui/icons';
import { BrandComponent } from '../../shared/components/brand.component';
import { PreferenceControlsComponent } from '../../shared/components/preference-controls.component';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, FaIconComponent, BrandComponent, PreferenceControlsComponent],
  templateUrl: './not-found.page.html',
})
export class NotFoundPage {
  protected readonly i18n = inject(I18nService);
  protected readonly icons = ICONS;
}
