import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { formatPhoneMask } from '../../core/utils/phone.util';

/**
 * Aplica a máscara de telefone (grupos de três) a um `input` com
 * `formControlName`. Mantém o valor do controlo sincronizado.
 */
@Directive({
  selector: 'input[appPhoneMask]',
  standalone: true,
})
export class PhoneMaskDirective {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly control = inject(NgControl, { optional: true, self: true });

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const formatted = formatPhoneMask(target.value);
    if (target.value !== formatted) {
      target.value = formatted;
      this.control?.control?.setValue(formatted, { emitEvent: false });
    }
  }
}
