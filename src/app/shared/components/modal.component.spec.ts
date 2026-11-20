import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

@Component({
  imports: [ModalComponent],
  template: `
    <button #trigger type="button" (click)="open.set(true)">Abrir</button>
    <app-modal
      [open]="open()"
      [title]="title()"
      [dismissible]="dismissible()"
      (closed)="open.set(false)"
    >
      <p>Conteúdo do modal</p>
      <button type="button" class="first">Primeiro</button>
      <button modal-footer type="button" class="last">Guardar</button>
    </app-modal>
  `,
})
class ModalHostComponent {
  readonly open = signal(false);
  readonly title = signal('Título do modal');
  readonly dismissible = signal(true);
}

describe('ModalComponent', () => {
  let fixture: ComponentFixture<ModalHostComponent>;
  let host: ModalHostComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [ModalHostComponent] });
    fixture = TestBed.createComponent(ModalHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function open(): Promise<void> {
    host.open.set(true);
    await settle();
  }

  function dialog(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[role="dialog"]');
  }

  it('abre com título, aria-modal e foco no primeiro controlo', async () => {
    await open();
    const panel = dialog();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(panel?.getAttribute('aria-labelledby')).toMatch(/^app-modal-title-/);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fechar');
  });

  it('fecha com Escape e devolve o foco ao botão que abriu', async () => {
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    trigger.focus();
    await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(host.open()).toBe(false);
    expect(dialog()).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.activeElement).toBe(trigger);
  });

  it('fecha ao clicar no backdrop', async () => {
    await open();
    const backdrop: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="app-modal"] > button',
    );
    backdrop.click();
    await settle();
    expect(host.open()).toBe(false);
    expect(dialog()).toBeNull();
  });

  it('não fecha com Escape nem backdrop quando dismissible é false', async () => {
    host.dismissible.set(false);
    await open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const backdrop: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="app-modal"] > button',
    );
    backdrop.click();
    await settle();
    expect(host.open()).toBe(true);
    expect(dialog()).not.toBeNull();
  });

  it('circula o foco com Tab dentro do modal', async () => {
    await open();
    const last: HTMLButtonElement = fixture.nativeElement.querySelector('button.last');
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await settle();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Fechar');
  });
});
