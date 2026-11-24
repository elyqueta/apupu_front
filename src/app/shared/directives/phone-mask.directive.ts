import {
  AfterViewInit,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  Injector,
  forwardRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NG_VALIDATORS, NgControl, ValidationErrors, Validator } from '@angular/forms';
import { formatPhoneMask, isValidPhone } from '../../core/utils/phone.util';

/**
 * Campo de telefone angolano: apenas dígitos, a começar por 9, no máximo
 * 9 dígitos, com máscara a cada três (`923 456 789`).
 *
 * - bloqueia letras e símbolos ao escrever e ao colar;
 * - formata também valores definidos por código (ex.: `+244 923…`);
 * - acrescenta o validador `phone` a qualquer controlo onde é aplicada.
 */
@Directive({
  selector: 'input[appPhoneMask]',
  standalone: true,
  host: {
    inputmode: 'numeric',
    autocomplete: 'tel-national',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[class.!border-coral]': 'showInvalid()',
  },
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneMaskDirective),
      multi: true,
    },
  ],
})
export class PhoneMaskDirective implements AfterViewInit, Validator {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  /**
   * Resolvido depois da criação: a diretiva também fornece
   * `NG_VALIDATORS`, por isso injectar `NgControl` no construtor criaria
   * uma dependência circular.
   */
  private control: NgControl | null = null;

  ngAfterViewInit(): void {
    this.control = this.injector.get(NgControl, null, { self: true, optional: true });
    this.syncFromControl();
    this.control?.valueChanges
      ?.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFromControl());
  }

  /** Erro visível só depois de o campo ser tocado ou alterado. */
  protected showInvalid(): boolean {
    const control = this.control;
    if (control) {
      return Boolean(control.invalid && control.errors?.['phone'] && (control.touched || control.dirty));
    }
    return !isValidPhone(this.input.nativeElement.value);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const value = typeof control.value === 'string' ? control.value : '';
    return isValidPhone(value) ? null : { phone: true };
  }

  /** Recusa teclas que não sejam dígitos antes de chegarem ao campo. */
  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (event.data && /\D/.test(event.data.replace(/\s/g, '')) && event.inputType !== 'insertFromPaste') {
      event.preventDefault();
    }
  }

  @HostListener('input')
  onInput(): void {
    this.apply(this.input.nativeElement.value);
  }

  private syncFromControl(): void {
    const value = this.control?.value;
    if (typeof value === 'string' && value !== formatPhoneMask(value)) {
      this.apply(value);
    }
  }

  private apply(raw: string): void {
    const element = this.input.nativeElement;
    const formatted = formatPhoneMask(raw);
    if (element.value !== formatted) {
      element.value = formatted;
    }
    const control = this.control?.control;
    if (control && control.value !== formatted) {
      control.setValue(formatted, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
    }
  }
}
