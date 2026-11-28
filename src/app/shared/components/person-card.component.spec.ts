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
    document.querySelector<HTMLButtonElement>('[role="menuitem"]')?.click();
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

@Component({
  imports: [PersonCardComponent],
  template: `
    <app-person-card
      layout="linear"
      [prominent]="prominent()"
      [name]="'Ana Pereira'"
      [subtitle]="'ana@exemplo.ao'"
      [status]="'pending'"
      [meta]="meta()"
      [primaryAction]="primary()"
      [actions]="actions()"
    />
  `,
})
class LinearPersonCardHostComponent {
  readonly prominent = signal(false);
  readonly meta = signal([
    { icon: 'calendar', label: 'Casamento da Rita' },
    { icon: 'clock', label: 'há 2 dias' },
  ]);
  readonly primary = signal({ id: 'resend', label: 'Reenviar email', icon: ICONS['envelope'] });
  readonly actions = signal<ActionMenuItem[]>([{ id: 'edit', label: 'Editar', icon: ICONS['pen'] }]);
}

describe('PersonCardComponent — linha proeminente do painel', () => {
  let fixture: ComponentFixture<LinearPersonCardHostComponent>;
  let host: LinearPersonCardHostComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [LinearPersonCardHostComponent] });
    fixture = TestBed.createComponent(LinearPersonCardHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('mantém a linha discreta por omissão', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const badge = fixture.nativeElement.querySelector('app-status-badge') as HTMLElement;
    expect(button.className).toContain('hidden');
    expect(badge.className).toContain('hidden');
    expect((fixture.nativeElement.querySelector('article') as HTMLElement).className).toContain('p-1.5');
  });

  it('usa colunas com detalhes no topo e ações numa linha inferior', () => {
    host.prominent.set(true);
    fixture.detectChanges();

    const article = fixture.nativeElement.querySelector('article') as HTMLElement;
    expect(article.className).toContain('flex-col');
    expect(article.className).toContain('border-brand/25');
    expect(article.className).toContain('p-3');
    expect((fixture.nativeElement.querySelector('[data-testid="person-card-open"]') as HTMLElement).className).toContain('items-start');
    expect(fixture.nativeElement.querySelector('app-avatar span')?.className).toContain('size-14');
    expect(fixture.nativeElement.querySelector('app-status-badge')?.className).not.toContain('hidden');
    expect(article.textContent).toContain('ana@exemplo.ao');
    expect(article.textContent).toContain('Casamento da Rita');
    expect(article.textContent).not.toContain('+1');

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.parentElement?.className).toContain('border-t');
    expect(button.className).toContain('h-11');
    expect(button.className).not.toContain('hidden');
    expect(button.getAttribute('aria-label')).toBe('Reenviar email');
    expect(button.textContent).toContain('Reenviar email');
    expect(button.querySelector('span')?.className).not.toContain('sr-only');
    expect((fixture.nativeElement.querySelector('app-action-menu') as HTMLElement).className).toContain('ml-auto');
  });
});
