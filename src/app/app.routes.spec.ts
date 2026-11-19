import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';

describe('configuração de rotas', () => {
  it('aceita a configuração real de rotas', () => {
    // O Router valida a configuração no construtor: uma rota com
    // `canMatch` e `redirectTo` em conjunto lança NG04014 aqui.
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    expect(router.config.length).toBeGreaterThan(0);
  });

  it('regista o detalhe de equipa e os aliases do checkpoint B', () => {
    const paths = routes.flatMap((route) => [
      ...(route.path ? [route.path] : []),
      ...(route.children ?? []).map((child) => child.path ?? ''),
    ]);

    expect(paths).toContain('equipas/:teamId');
    expect(paths).toContain('eventos/:eventId/equipas');
    expect(paths).toContain('eventos/:eventId/tarefas');
  });
});
