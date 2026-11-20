import { Component } from '@angular/core';
import { MessagesInboxComponent } from './messages-inbox.component';

/** Página global da caixa de entrada, com seletor de evento. */
@Component({
  selector: 'app-messages-page',
  imports: [MessagesInboxComponent],
  template: `
    <div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <app-messages-inbox />
    </div>
  `,
})
export class MessagesPage {}
