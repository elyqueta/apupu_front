import { Component } from '@angular/core';
import { MessagesInboxComponent } from './messages-inbox.component';

/** Página global da caixa de entrada, com seletor de evento. */
@Component({
  selector: 'app-messages-page',
  imports: [MessagesInboxComponent],
  template: `<app-messages-inbox />`,
})
export class MessagesPage {}
