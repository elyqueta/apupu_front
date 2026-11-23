import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuItem } from './action-menu.component';
import { EventSectionItem, EventSectionShellComponent } from './event-section-shell.component';

const SECTIONS: EventSectionItem[] = [
  { id: 'resumo', label: 'Resumo', icon: ICONS['dashboardAlt'] },
  { id: 'convidados', label: 'Convidados', icon: ICONS['guests'], count: 7 },
];

const ACTIONS: ActionMenuItem[] = [
  { id: 'edit', label: 'Editar', icon: ICONS['pen'] },
  { id: 'publish', label: 'Publicar', icon: ICONS['paperPlane'], disabled: true },
];

@Component({
  imports: [EventSectionShellComponent],
  template: `
    <app-event-section-shell
      backLink="/eventos"
      backLabel="Voltar aos eventos"
      backLabelShort="Voltar"
      contextLabel="Evento"
      title="Casamento da Ana"
      location="Luanda"
      [sections]="sections"
      activeSection="resumo"
      [actions]="actions"
      [primaryAction]="primary"
      menuLabel="Menu do evento"
      (sectionChange)="changed.set($event)"
      (action)="selected.set($event)"
    >
      <p>Conteúdo da secção</p>
    </app-event-section-shell>
  `,
})
class ShellHostComponent {
  readonly sections = SECTIONS;
  readonly actions = ACTIONS;
  readonly primary: ActionMenuItem = {
    id: 'addGuest',
    label: 'Convidar',
    icon: ICONS['userPlus'],
  };
  readonly changed = signal('');
  readonly selected = signal('');
}

describe('EventSectionShellComponent', () => {
  let fixture: ComponentFixture<ShellHostComponent>;
  let host: ShellHostComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ShellHostComponent],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ShellHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function native(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('mostra o cabeçalho só com voltar, contexto e título', () => {
    const root = native();
    expect(root.querySelector('header')?.textContent).toContain('Voltar aos eventos');
    expect(root.querySelector('header')?.textContent).toContain('Casamento da Ana');
    expect(root.querySelector('header')?.textContent).not.toContain('Editar');
    expect(root.querySelector('header')?.textContent).not.toContain('Publicar');
  });

  it('mostra rótulo curto, título completo e ação principal no cabeçalho', () => {
    const header = native().querySelector('header');
    expect(header?.textContent).toContain('Voltar');
    expect(native().querySelector('h1')?.getAttribute('title')).toBe('Casamento da Ana');

    const primary = native().querySelector(
      '[data-testid="event-section-primary-action"]',
    ) as HTMLButtonElement;
    expect(primary?.textContent).toContain('Convidar');
    primary.click();
    expect(host.selected()).toBe('addGuest');
  });

  it('recolhe o rail direito e mantém só os ícones', () => {
    const toggle = native().querySelector(
      '[data-testid="event-rail-toggle"]',
    ) as HTMLButtonElement;
    const grid = native().querySelector('main')?.parentElement;
    expect(grid?.classList.contains('lg:grid-cols-[minmax(0,1fr)_16rem]')).toBe(true);

    toggle.click();
    fixture.detectChanges();

    expect(grid?.classList.contains('lg:grid-cols-[minmax(0,1fr)_4.5rem]')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(native().querySelector('aside')?.textContent).not.toContain('Resumo');
  });

  it('coloca as secções e ações no rail direito', () => {
    const aside = native().querySelector('aside');
    expect(aside).not.toBeNull();
    expect(aside?.textContent).toContain('Resumo');
    expect(aside?.textContent).toContain('Convidados');
    expect(aside?.textContent).toContain('Editar');
  });

  it('abre o menu móvel e emite a secção escolhida', async () => {
    const trigger = native().querySelector(
      '[data-testid="event-section-menu-trigger"]',
    ) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(native().querySelector('[role="dialog"]')).not.toBeNull();
    const tabs = native().querySelectorAll('[role="dialog"] [role="tab"]');
    const guests = Array.from(tabs).find((tab) => tab.textContent?.includes('Convidados')) as HTMLButtonElement;
    guests.click();
    await settle();

    expect(host.changed()).toBe('convidados');
    expect(native().querySelector('[role="dialog"]')).toBeNull();
  });

  it('ignora ações desativadas', () => {
    const buttons = Array.from(native().querySelectorAll('aside button'));
    const publish = buttons.find((button) => button.textContent?.includes('Publicar')) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    publish.click();
    expect(host.selected()).toBe('');
  });

  it('expõe openMenu() para a barra superior abrir o menu do evento', async () => {
    const shell = fixture.debugElement.children[0].componentInstance as EventSectionShellComponent;
    shell.openMenu();
    await settle();
    expect(native().querySelector('[role="dialog"]')).not.toBeNull();
  });
});
