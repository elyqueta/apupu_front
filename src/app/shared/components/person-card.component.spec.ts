import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionMenuItem } from './action-menu.component';
import { PersonCardComponent } from './person-card.component';
import { ICONS } from '../../core/ui/icons';

@Component({
  imports: [PersonCardComponent],
  template: `
    <app-person-card
      [name]="name()"
      [subtitle]="subtitle()"
      [status]="status()"
      [meta]="meta()"
      [actions]="actions()"
      [primaryAction]="primaryAction()"
      [compact]="compact()"
      [clickable]="clickable()"
      (actionSelected)="selected.set($event)"
      (primaryTriggered)="primary.set($event)"
      (cardClicked)="clicked.set(true)"
    />
  `,
})
class PersonCardHostComponent {
  readonly name = signal('Ana Pereira');
  readonly subtitle = signal('ana@exemplo.ao');
  readonly status = signal<string | null>('confirmed');
  readonly meta = signal([{ icon: 'calendar', label: 'Casamento da Rita' }]);
  readonly actions = signal<ActionMenuItem[]>([
    { id: 'edit', label: 'Editar', icon: ICONS['pen'] },
  ]);
  readonly primaryAction = signal({ id: 'whatsapp', label: 'WhatsApp', icon: ICONS['phone'] });
  readonly compact = signal(false);
  readonly clickable = signal(false);
  readonly selected = signal('');
  readonly primary = signal('');
  readonly clicked = signal(false);
}

describe('PersonCardComponent', () => {
  let fixture: ComponentFixture<PersonCardHostComponent>;
  let host: PersonCardHostComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [PersonCardHostComponent] });
    fixture = TestBed.createComponent(PersonCardHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  }

  it('shows the person details, status and meta rows', () => {
    expect(query('article')?.textContent).toContain('Ana Pereira');
    expect(query('article')?.textContent).toContain('ana@exemplo.ao');
    expect(query('app-status-badge')?.textContent).toContain('Confirmado');
    expect(query('article')?.textContent).toContain('Casamento da Rita');
  });

  it('emits the primary action id', () => {
    query('button')?.click();
    expect(host.primary()).toBe('whatsapp');
  });

  it('emits the selected action id', () => {
    query('app-action-menu button')?.click();
    fixture.detectChanges();
    query('[role="menuitem"]')?.click();
    expect(host.selected()).toBe('edit');
  });

  it('hides meta and the primary action in compact mode', () => {
    host.compact.set(true);
    fixture.detectChanges();
    expect(query('ul')).toBeNull();
    expect(query('button')?.textContent?.trim()).not.toContain('WhatsApp');
    expect(query('app-action-menu')).not.toBeNull();
  });

  it('emits cardClicked only when clickable', () => {
    query('article')?.click();
    expect(host.clicked()).toBe(false);
    host.clickable.set(true);
    fixture.detectChanges();
    query('article')?.click();
    expect(host.clicked()).toBe(true);
  });
});
