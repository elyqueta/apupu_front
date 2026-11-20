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

function mediaQuery(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  } as MediaQueryList;
}

describe('ActionMenuComponent', () => {
  let fixture: ComponentFixture<ActionMenuHostComponent>;
  let host: ActionMenuHostComponent;
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockReturnValue(mediaQuery(false));
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    });
    TestBed.configureTestingModule({ imports: [ActionMenuHostComponent] });
    fixture = TestBed.createComponent(ActionMenuHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector) as HTMLElement | null;
  }

  function queryAll(selector: string): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)) as HTMLElement[];
  }

  function trigger(): HTMLButtonElement {
    return query('button[aria-haspopup="menu"]') as HTMLButtonElement;
  }

  async function openMenu(): Promise<void> {
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('exposes menu semantics and closes after choosing an item', async () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await openMenu();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(query('[role="menu"]')).not.toBeNull();
    query('[role="menuitem"]')?.click();
    fixture.detectChanges();
    expect(host.selected()).toBe('edit');
    expect(query('[role="menu"]')).toBeNull();
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

    expect(query('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('closes when the outside overlay is clicked', async () => {
    await openMenu();
    const overlay = queryAll('button').find(
      (button) => button.getAttribute('aria-haspopup') === null,
    );
    expect(overlay).toBeDefined();
    overlay?.click();
    fixture.detectChanges();

    expect(query('[role="menu"]')).toBeNull();
  });

  it('opens as a bottom sheet on small screens', async () => {
    matchMediaMock.mockReturnValue(mediaQuery(true));
    fixture = TestBed.createComponent(ActionMenuHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();

    await openMenu();

    expect(query('app-modal [data-testid="app-modal"] [role="dialog"]')).not.toBeNull();
    expect(query('app-modal [role="menu"]')).not.toBeNull();
  });
});
