import { Component, booleanAttribute, computed, input, output } from '@angular/core';

export type TextInputType = 'email' | 'number' | 'search' | 'tel' | 'text';

@Component({
  selector: 'tal-input',
  template: `
    <label [attr.for]="inputId()" class="tal-input-field">
      <span class="tal-input-field__label">{{ label() }}</span>
      <input
        [attr.aria-describedby]="describedBy()"
        [attr.aria-invalid]="hasError() ? 'true' : null"
        [attr.autocomplete]="autocomplete()"
        [disabled]="disabled()"
        [id]="inputId()"
        [name]="name()"
        [placeholder]="placeholder()"
        [required]="required()"
        [type]="type()"
        [value]="value()"
        class="tal-input"
        (blur)="blurred.emit()"
        (input)="onValueChange($event)"
      />
      @if (error()) {
        <span [id]="errorId()" class="tal-input-field__error">{{ error() }}</span>
      } @else if (hint()) {
        <span [id]="hintId()" class="tal-input-field__hint">{{ hint() }}</span>
      }
    </label>
  `,
})
export class InputComponent {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input('');
  readonly type = input<TextInputType>('text');
  readonly name = input<string | null>(null);
  readonly placeholder = input('');
  readonly autocomplete = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });

  readonly valueChange = output<string>();
  readonly blurred = output<void>();

  protected readonly hasError = computed(() => this.error() !== null);
  protected readonly hintId = computed(() => `${this.inputId()}-hint`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);
  protected readonly describedBy = computed(() => {
    if (this.error()) return this.errorId();
    return this.hint() ? this.hintId() : null;
  });

  protected onValueChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
