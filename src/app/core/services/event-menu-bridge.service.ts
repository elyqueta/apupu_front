import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type EventMenuAction = 'addGuest' | 'moreActions';

/**
 * Ponte entre o botão do evento na barra superior e a página do evento.
 *
 * O drawer vive no shell (rota `/eventos/:id`) ou na própria página de gestão,
 * mas quem sabe abrir o diálogo de convidado e o menu de ações é a página.
 * Não guarda estado: só encamina o pedido enquanto a página está montada.
 */
@Injectable({ providedIn: 'root' })
export class EventMenuBridgeService {
  private readonly requests = new Subject<EventMenuAction>();

  readonly actions = this.requests.asObservable();

  request(action: EventMenuAction): void {
    this.requests.next(action);
  }
}
