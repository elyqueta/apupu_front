import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventManager, EventPermissions } from '../../../core/models/models';
import { EventManagersSectionComponent } from './event-managers-section.component';

const MANAGER: EventManager = {
  id: 'm1',
  eventId: 'e1',
  teamId: 't1',
  email: 'gestor@example.com',
  phone: null,
  displayName: 'Gestor',
  linkExpiresAt: null,
  linkRevokedAt: null,
  hasAccount: true,
  lastUsedAt: null,
  createdAt: '2026-11-24T00:00:00.000Z',
};

const PERMISSIONS: EventPermissions = {
  canEditEvent: true,
  canManageGuests: true,
  canManageTeams: true,
  canManageManagers: true,
  canExport: true,
  canCancelEvent: true,
  canChangeEventStatus: true,
  canEditExistingGuests: true,
  canDeleteActivity: true,
  canManageTasks: true,
  canResendManageLink: true,
};

describe('EventManagersSectionComponent', () => {
  let fixture: ComponentFixture<EventManagersSectionComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [EventManagersSectionComponent] });
    fixture = TestBed.createComponent(EventManagersSectionComponent);
    fixture.componentRef.setInput('managers', [MANAGER]);
    fixture.componentRef.setInput('teams', []);
    fixture.componentRef.setInput('permissions', PERMISSIONS);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('mantém o cartão sem filtro que prenda o modal e usa o overlay do viewport', async () => {
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('section')?.className).not.toContain('backdrop-blur');

    (native.querySelector('[data-testid="person-card-open"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const container = document.querySelector('[data-testid="app-modal"]') as HTMLElement;
    expect(container.className).toContain('fixed');
    expect(container.className).toContain('inset-0');
    expect(container.className).toContain('z-[120]');
  });

  it('mostra as ações do detalhe do gestor a toda a largura com alvo de toque de 44 px', async () => {
    const native = fixture.nativeElement as HTMLElement;
    (native.querySelector('[data-testid="person-card-open"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const footer = document.querySelector('[data-testid="app-modal-footer"]') as HTMLElement;
    const buttons = Array.from(footer.querySelectorAll('button'));
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      expect(button.className).toContain('w-full');
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('text-sm');
    }
  });
});
