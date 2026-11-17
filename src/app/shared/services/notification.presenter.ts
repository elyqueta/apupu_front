import { Injectable } from '@angular/core';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { HostNotification, NotificationKind } from '../../core/models/models';
import { ICONS } from '../../core/ui/icons';

/** Ícone e tom visual para cada tipo de notificação in-app. */
@Injectable({ providedIn: 'root' })
export class NotificationPresenter {
  icon(kind: NotificationKind | string): IconDefinition {
    switch (kind) {
      case 'rsvp_accepted':
        return ICONS['success'];
      case 'rsvp_declined':
        return ICONS['error'];
      case 'guest_added':
        return ICONS['userPlus'];
      case 'reminder_sent':
        return ICONS['paperPlane'];
      case 'event_created':
        return ICONS['sparkles'];
      case 'event_upcoming':
        return ICONS['calendar'];
      case 'rsvp_deadline':
        return ICONS['hourglass'];
      case 'task_assigned':
        return ICONS['checklist'];
      case 'task_completed':
        return ICONS['checkDouble'];
      default:
        return ICONS['bell'];
    }
  }

  tone(kind: NotificationKind | string): string {
    switch (kind) {
      case 'rsvp_accepted':
      case 'task_completed':
        return 'border-mint/30 bg-mint/15 text-mint';
      case 'rsvp_declined':
        return 'border-coral/30 bg-coral/10 text-coral';
      case 'guest_added':
      case 'event_created':
        return 'border-brand/30 bg-brand/15 text-brand-strong';
      case 'reminder_sent':
        return 'border-aqua/30 bg-aqua/15 text-aqua';
      case 'event_upcoming':
        return 'border-iris/30 bg-iris/15 text-iris';
      case 'rsvp_deadline':
        return 'border-amber/30 bg-amber/15 text-amber';
      case 'task_assigned':
        return 'border-aqua/30 bg-aqua/15 text-aqua';
      default:
        return 'border-line bg-surface-raised text-muted';
    }
  }

  /** Link de destino da notificação (evento, tarefas ou notificações). */
  route(notification: HostNotification): string[] {
    if (notification.kind === 'task_assigned' || notification.kind === 'task_completed') {
      return ['/tarefas'];
    }
    if (notification.eventId) {
      return ['/eventos', notification.eventId];
    }
    return ['/notificacoes'];
  }
}
