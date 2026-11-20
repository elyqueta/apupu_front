import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_BASE_URL } from '../../core/api/api-config';
import { LandingFooterComponent } from './landing-footer.component';

const BASE = 'http://localhost:3000/api/v1';

async function settle(fixture: ComponentFixture<LandingFooterComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('LandingFooterComponent · novidades do Bloco 7', () => {
  let fixture: ComponentFixture<LandingFooterComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LandingFooterComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: BASE },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    fixture = TestBed.createComponent(LandingFooterComponent);
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

  it('mostra o formulário e mantém o botão desactivado sem email válido', () => {
    expect(query('newsletter-form')).toBeTruthy();
    expect(query('newsletter-email')).toBeTruthy();
    expect((query('newsletter-submit') as HTMLButtonElement | null)?.disabled).toBe(true);
  });

  it('subscreve o email directamente e limpa o campo', async () => {
    const input = query('newsletter-email') as HTMLInputElement;
    input.value = 'ana@exemplo.pt';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (query('newsletter-submit') as HTMLButtonElement).click();
    const request = http.expectOne(`${BASE}/public/newsletter`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@exemplo.pt' });
    request.flush({ data: { subscribed: true } });
    await settle(fixture);

    expect((query('newsletter-email') as HTMLInputElement).value).toBe('');
  });
});
