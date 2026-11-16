import { Injectable, inject } from '@angular/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/translations';
import { EventActivity } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';

@Injectable({ providedIn: 'root' })
export class ActivityPresenter {
  private readonly i18n = inject(I18nService);

  text(item: EventActivity, eventTitle: string): string {
    return this.i18n.t(`activity.${item.kind}` as TranslationKey, {
      guest: item.guestName ?? this.i18n.t('invitation.guestLabel'),
      event: eventTitle,
    });
  }

  icon(kind: EventActivity['kind']): IconDefinition {
    switch (kind) {
      case 'rsvp-confirmed':
        return ICONS['success'];
      case 'rsvp-declined':
        return ICONS['error'];
      case 'guest-added':
        return ICONS['userPlus'];
      case 'reminder-sent':
        return ICONS['paperPlane'];
      case 'event-created':
        return ICONS['sparkles'];
    }
  }

  tone(kind: EventActivity['kind']): string {
    switch (kind) {
      case 'rsvp-confirmed':
        return 'border-mint/30 bg-mint/15 text-mint';
      case 'rsvp-declined':
        return 'border-coral/30 bg-coral/10 text-coral';
      case 'guest-added':
        return 'border-brand/30 bg-brand/15 text-brand-strong';
      case 'reminder-sent':
        return 'border-aqua/30 bg-aqua/15 text-aqua';
      case 'event-created':
        return 'border-iris/30 bg-iris/15 text-iris';
    }
  }
}
