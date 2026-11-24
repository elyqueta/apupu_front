import { TestBed } from '@angular/core/testing';
import { DeleteEventDialogComponent } from './delete-event-dialog.component';
import { ageRangeError, parseAge } from './event-visibility-fields.component';

describe('DeleteEventDialogComponent', () => {
  afterEach(() => TestBed.resetTestingModule());

  function render(acceptedCount: number) {
    TestBed.configureTestingModule({ imports: [DeleteEventDialogComponent] });
    const fixture = TestBed.createComponent(DeleteEventDialogComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('eventTitle', 'Festa da Ana');
    fixture.componentRef.setInput('acceptedCount', acceptedCount);
    fixture.detectChanges();
    return fixture;
  }

  it('com confirmados só ativa o botão quando o nome coincide exatamente', () => {
    const fixture = render(2);
    const root = document.body;
    const confirm = () => root.querySelector('[data-testid="delete-event-confirm"]') as HTMLButtonElement;
    const name = root.querySelector('[data-testid="delete-event-name"]') as HTMLInputElement;
    expect(confirm().disabled).toBe(true);

    name.value = 'festa da ana';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirm().disabled).toBe(true);

    name.value = '  Festa da Ana ';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirm().disabled).toBe(false);

    const emitted: (string | undefined)[] = [];
    fixture.componentInstance.confirmed.subscribe((value) => emitted.push(value));
    confirm().click();
    expect(emitted).toEqual(['  Festa da Ana ']);
  });

  it('sem confirmados não pede o nome', () => {
    render(0);
    expect(document.body.querySelector('[data-testid="delete-event-name"]')).toBeNull();
    expect((document.body.querySelector('[data-testid="delete-event-confirm"]') as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('limites de idade do evento', () => {
  it('aceita vazio e 0–120, recusa o resto e mín > máx', () => {
    expect(parseAge('')).toBeNull();
    expect(parseAge('18')).toBe(18);
    expect(Number.isNaN(parseAge('121'))).toBe(true);
    expect(ageRangeError('18', '')).toBe('');
    expect(ageRangeError('30', '18')).toBe('range');
    expect(ageRangeError('abc', '')).toBe('value');
  });
});
