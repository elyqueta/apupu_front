import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_MANIFEST, normalizeManifest } from '../../core/models/template-manifest';
import { InvitationWelcomeComponent } from './parts/invitation-welcome.component';

/** Documento do Bloco 16: a capa do Gratitude é a arte do template, sem cartão da plataforma. */
describe('Bloco 16 — capa do Gratitude', () => {
  let fixture: ComponentFixture<InvitationWelcomeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InvitationWelcomeComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    fixture = TestBed.createComponent(InvitationWelcomeComponent);
    const manifest = normalizeManifest({
      ...DEFAULT_MANIFEST,
      ornaments: { ...DEFAULT_MANIFEST.ornaments, frame: 'gratitude' },
      open_style: 'fade',
    });
    fixture.componentRef.setInput('manifest', manifest);
    fixture.componentRef.setInput('guestName', 'João');
    fixture.componentRef.setInput('eventTitle', 'Casamento da Ana');
    fixture.componentRef.setInput(
      'templateData',
      {
        title: 'Casamento da Ana',
        subtitle: 'CELEBRAÇÃO DE CASAMENTO',
        hostName: 'Ana',
        startsAt: '2027-08-15T17:00:00.000Z',
        templateSlug: 'gratitude',
      },
    );
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('mostra as fitas e o título com padrão, e esconde o resto do cartaz', () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('[data-testid="invitation-welcome-art"]')).not.toBeNull();
    expect(native.querySelectorAll('svg.deco > path[fill="url(#rib)"]').length).toBe(2);
    expect(native.querySelector('pattern#afro polyline')).not.toBeNull();
    expect(
      native.querySelector('[data-testid="gratitude-title"] text')?.textContent?.toUpperCase(),
    ).toContain('CASAMENTO DA ANA');
    expect(native.querySelector('[data-testid="gratitude-subtitle"]')?.textContent).toContain(
      'CELEBRAÇÃO DE CASAMENTO',
    );
    expect(native.querySelector('[data-testid="gratitude-info"]')).toBeNull();
    expect(native.querySelector('[data-testid="gratitude-qr"]')).toBeNull();
    expect(native.querySelector('[data-testid="gratitude-dresscode"]')).toBeNull();
    expect(native.querySelector('app-brand')).toBeNull();
    expect(native.querySelector('app-preference-controls')).toBeNull();
  });

  it('mantém a saudação e o botão "Ver convite" disponíveis', () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.textContent).toContain('João');
    expect(native.querySelector('[data-testid="invitation-welcome-continue"]')).not.toBeNull();
  });
});
