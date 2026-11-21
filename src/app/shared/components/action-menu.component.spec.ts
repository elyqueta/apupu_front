import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICONS } from '../../core/ui/icons';
import { ActionMenuComponent, ActionMenuItem } from './action-menu.component';

@Component({
  imports: [ActionMenuComponent],
  template: `
    <app-action-menu [items]="items()" [triggerLabel]="'Opções'" (selected)="selected.set($event)" />
  `,
})
class ActionMenuHostComponent {
  readonly items = signal<ActionMenuItem[]>([
    { id: 'edit', label: 'Editar', icon: ICONS['pen'] },
    { id: 'disabled', label: 'Indisponível', icon: ICONS['eye'], disabled: true },
    { id: 'delete', label: 'Eliminar', icon: ICONS['trash'] },
  ]);
  readonly selected = signal('');
}

describe('ActionMenuComponent', () => {
  let fixture: ComponentFixture<ActionMenuHostComponent>;
  let host: ActionMenuHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ActionMenuHostComponent] });
    fixture = TestBed.createComponent(ActionMenuHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    document.querySelectorAll('app-action-menu-portal').forEach((node) => node.remove());
    vi.restoreAllMocks();
  });

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  }

  function queryAll(selector: string): HTMLElement[] {
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  function trigger(): HTMLButtonElement {
    return query('button[aria-haspopup="menu"]') as HTMLButtonElement;
  }

  function menu(): HTMLElement | null {
    return document.querySelector('[data-testid="action-menu-panel"]');
  }

  async function openMenu(): Promise<void> {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('exposes menu semantics and closes after choosing an item', async () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await openMenu();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(menu()).not.toBeNull();
    expect(menu()?.closest('app-action-menu-portal')).not.toBeNull();
    queryAll('[role="menuitem"]')[0].click();
    fixture.detectChanges();
    expect(host.selected()).toBe('edit');
    expect(menu()).toBeNull();
  });

  it('moves focus with arrow keys and skips disabled items', async () => {
    await openMenu();
    expect(document.activeElement).toBe(queryAll('[role="menuitem"]')[0]);

    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(queryAll('[role="menuitem"]')[2]);

    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(queryAll('[role="menuitem"]')[0]);
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    await openMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes when clicking outside the panel', async () => {
    await openMenu();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.click();
    fixture.detectChanges();

    expect(menu()).toBeNull();
    outside.remove();
  });

  it('opens above the button when there is no space below', async () => {
    vi.spyOn(trigger(), 'getBoundingClientRect').mockReturnValue({
      top: 340,
      bottom: 380,
      left: 50,
      right: 100,
      width: 50,
      height: 40,
      x: 50,
      y: 340,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    const innerHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(400);

    await openMenu();

    const panel = menu() as HTMLElement;
    expect(parseFloat(panel.style.top)).toBeLessThan(340);
    expect(parseFloat(panel.style.top)).toBeGreaterThanOrEqual(8);
    expect(parseFloat(panel.style.left)).toBeGreaterThanOrEqual(8);
    innerHeight.mockRestore();
  });

  it('keeps the panel inside the viewport when the button is near the right edge', async () => {
    vi.spyOn(trigger(), 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 140,
      left: window.innerWidth - 20,
      right: window.innerWidth - 10,
      width: 10,
      height: 40,
      x: window.innerWidth - 20,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(120);

    await openMenu();

    const panel = menu() as HTMLElement;
    expect(parseFloat(panel.style.left) + parseFloat(panel.style.width)).toBeLessThanOrEqual(
      window.innerWidth - 8,
    );
  });
});
