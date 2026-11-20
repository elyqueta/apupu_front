import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api-config';
import { WorkspaceStore } from '../../core/services/workspace.store';
import { MessagesInboxComponent } from './messages-inbox.component';

const BASE = 'http://localhost:3000/api/v1';
const EVENT_ID = 'event-1';

const MESSAGE_ROW = {
  id: 'inv-1',
  event_id: EVENT_ID,
  event: { id: EVENT_ID, title: 'Casamento da Ana' },
  guest_name: 'João',
  guest_email: 'joao@example.com',
  guest_message: 'Posso levar um amigo?',
  rsvp_responded_at: '2026-11-20T10:00:00.000Z',
  message_read_at: null,
  message_answered_at: null,
  message_answer: null,
};

function page(rows: unknown[] = [MESSAGE_ROW]) {
  return {
    data: rows,
    pagination: { page: 1, page_size: 10, total: rows.length, total_pages: 1 },
  };
}

describe('MessagesInboxComponent', () => {
  let fixture: ComponentFixture<MessagesInboxComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessagesInboxComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: PLATFORM_ID, useValue: 'server' },
        {
          provide: WorkspaceStore,
          useValue: { events: signal([]) } as unknown as WorkspaceStore,
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MessagesInboxComponent);
    fixture.componentRef.setInput('fixedEventId', EVENT_ID);
    fixture.detectChanges();
  });

  async function settle(): Promise<void> {
    for (let pass = 0; pass < 2; pass += 1) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  }

  function path(): string {
    return `${BASE}/host/inbox`;
  }

  it('carrega mensagens com os filtros por defeito', async () => {
    await settle();
    const request = http.expectOne((req) => req.url === path());
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('read')).toBeNull();
    expect(request.request.params.get('answered')).toBeNull();
    request.flush(page());
    await settle();

    const native = fixture.nativeElement as HTMLElement;
    expect(native.textContent).toContain('João');
    expect(native.textContent).toContain('Posso levar um amigo?');
  });

  it('aplica os filtros de leitura e resposta na pesquisa', async () => {
    await settle();
    http.expectOne((req) => req.url === path()).flush(page());
    await settle();

    const native = fixture.nativeElement as HTMLElement;
    const read = native.querySelector('[formcontrolname="read"]') as HTMLSelectElement;
    read.value = 'unread';
    read.dispatchEvent(new Event('change'));
    const answered = native.querySelector('[formcontrolname="answered"]') as HTMLSelectElement;
    answered.value = 'answered';
    answered.dispatchEvent(new Event('change'));
    const search = native.querySelector('[formcontrolname="q"]') as HTMLInputElement;
    search.value = 'João';
    search.dispatchEvent(new Event('input'));
    (native.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();

    const request = http.expectOne((req) => req.url === path());
    expect(request.request.params.get('read')).toBe('unread');
    expect(request.request.params.get('answered')).toBe('answered');
    expect(request.request.params.get('q')).toBe('João');
    request.flush(page([]));
    await settle();

    expect(native.textContent).toContain('Ainda não há mensagens com estes filtros.');
  });

  it('marca como lida e envia a resposta guardada', async () => {
    await settle();
    http.expectOne((req) => req.url === path()).flush(page());
    await settle();

    const native = fixture.nativeElement as HTMLElement;
    const mark = Array.from(native.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Marcar como lida'),
    ) as HTMLButtonElement;
    mark.click();
    const readRequest = http.expectOne(`${BASE}/host/inbox/inv-1/read`);
    expect(readRequest.request.method).toBe('POST');
    expect(readRequest.request.body).toEqual({ read: true });
    readRequest.flush({});
    await settle();

    const answer = Array.from(native.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Responder'),
    ) as HTMLButtonElement;
    answer.click();
    await settle();
    const input = native.querySelector('[data-testid="message-answer-input"]') as HTMLTextAreaElement;
    input.value = 'Sim, é bem-vindo!';
    input.dispatchEvent(new Event('input'));
    await settle();
    const submit = Array.from(native.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Enviar resposta'),
    ) as HTMLButtonElement;
    submit.click();
    const answerRequest = http.expectOne(`${BASE}/host/inbox/inv-1/answer`);
    expect(answerRequest.request.method).toBe('POST');
    expect(answerRequest.request.body).toEqual({ answer: 'Sim, é bem-vindo!' });
    answerRequest.flush({});
    await settle();

    expect(native.textContent).toContain('Sim, é bem-vindo!');
  });

  afterEach(() => http.verify());
});
