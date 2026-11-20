import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { SupportDialogComponent } from './support-dialog.component';

const BASE = 'http://localhost:3000/api/v1';

async function settle(fixture: ComponentFixture<SupportDialogComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('SupportDialogComponent · Bloco 7', () => {
  let fixture: ComponentFixture<SupportDialogComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupportDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    fixture = TestBed.createComponent(SupportDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  function query(testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  }

  function fill(testId: string, value: string): void {
    const field = query(testId) as HTMLInputElement | HTMLTextAreaElement | null;
    expect(field).toBeTruthy();
    field!.value = value;
    field!.dispatchEvent(new Event('input'));
  }

  it('valida o formulário antes de permitir o envio', () => {
    expect(query('support-dialog')).toBeTruthy();
    expect(query('support-form')).toBeTruthy();
    expect((query('support-submit') as HTMLButtonElement | null)?.disabled).toBe(true);
  });

  it('envia a mensagem para o backend e mostra confirmação', async () => {
    fill('support-name', 'Ana Costa');
    fill('support-email', 'ana@exemplo.pt');
    fill('support-message', 'Preciso de ajuda com o convite.');
    fixture.detectChanges();

    const submit = query('support-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    submit.click();

    const request = http.expectOne(`${BASE}/public/support`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Ana Costa',
      email: 'ana@exemplo.pt',
      message: 'Preciso de ajuda com o convite.',
    });
    request.flush({ data: { id: 'message-1', created_at: '2026-01-01T00:00:00Z' } });
    await settle(fixture);

    expect(query('support-success')?.textContent).toContain('Mensagem enviada');
  });

  it('mostra erro genérico quando a API falha', async () => {
    fill('support-name', 'Ana Costa');
    fill('support-email', 'ana@exemplo.pt');
    fill('support-message', 'Preciso de ajuda com o convite.');
    fixture.detectChanges();
    (query('support-submit') as HTMLButtonElement).click();

    http
      .expectOne(`${BASE}/public/support`)
      .flush(
        { error: { code: 'rate_limited', message: 'Demasiados pedidos.', request_id: 'r1' } },
        { status: 429, statusText: 'Too Many Requests' },
      );
    await settle(fixture);

    expect(query('support-error')?.textContent).toContain('Não foi possível enviar a mensagem');
  });
});
