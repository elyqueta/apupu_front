import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/api/auth.service';
import { Host } from '../../core/api/api.models';
import { LoginSuccessComponent } from './login-success.page';

interface Setup {
  fixture: ComponentFixture<LoginSuccessComponent>;
  navigate: ReturnType<typeof vi.spyOn>;
  restore: ReturnType<typeof vi.spyOn>;
}

function setup(platform: string, sessionConfirmed = true): Setup {
  TestBed.configureTestingModule({
    imports: [LoginSuccessComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });

  const restore = vi
    .spyOn(TestBed.inject(AuthService), 'restoreSession')
    .mockResolvedValue(sessionConfirmed ? ({ id: 'host-1' } as unknown as Host) : null);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoginSuccessComponent);
  fixture.detectChanges();
  return { fixture, navigate, restore };
}

async function settle(fixture: ComponentFixture<LoginSuccessComponent>): Promise<void> {
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('LoginSuccessComponent', () => {
  it('confirma a sessão por cookie e abre o feed (Bloco 12)', async () => {
    const { fixture, navigate, restore } = setup('browser');
    await settle(fixture);

    expect(restore).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/', { replaceUrl: true });
  });

  it('volta ao login quando o backend não confirma a sessão', async () => {
    const { fixture, navigate } = setup('browser', false);
    await settle(fixture);

    expect(navigate).toHaveBeenCalledWith('/entrar', { replaceUrl: true });
  });

  it('não navega durante a renderização no servidor', async () => {
    const { fixture, navigate, restore } = setup('server');
    await settle(fixture);

    expect(restore).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
