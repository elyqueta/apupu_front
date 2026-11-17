import { inject, Injectable, signal } from '@angular/core';
import { TemplateId } from '../models/models';
import { Resettable, SessionCache } from '../services/session-cache';

/**
 * Estado de interface partilhado entre a página de modelos e o assistente de
 * criação de evento: qual o modelo atualmente escolhido. É limpo quando a
 * sessão muda (não é dado do servidor, mas depende do anfitrião).
 */
@Injectable({ providedIn: 'root' })
export class TemplateSelectionStore implements Resettable {
  private readonly sessions = inject(SessionCache);

  readonly selected = signal<TemplateId | null>(null);

  constructor() {
    this.sessions.register(this);
  }

  select(id: TemplateId | null): void {
    this.selected.set(id);
  }

  reset(): void {
    this.selected.set(null);
  }
}
