import { Component, booleanAttribute, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

@Component({
  selector: 'tal-button',
  template: `
    <button
      [attr.aria-busy]="busy() ? 'true' : null"
      [attr.aria-label]="ariaLabel()"
      [class]="buttonClass()"
      [disabled]="isDisabled()"
      [type]="type()"
      (click)="onPressed($event)"
    >
      @if (busy()) {
        <span aria-hidden="true" class="tal-button__spinner"></span>
      }
      <span [class.tal-button__content--busy]="busy()"><ng-content /></span>
    </button>
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);

  readonly pressed = output<MouseEvent>();

  protected readonly isDisabled = computed(() => this.disabled() || this.busy());
  protected readonly buttonClass = computed(
    () => `tal-button tal-button--${this.variant()}${this.busy() ? ' tal-button--busy' : ''}`,
  );

  protected onPressed(event: MouseEvent): void {
    this.pressed.emit(event);
  }
}
