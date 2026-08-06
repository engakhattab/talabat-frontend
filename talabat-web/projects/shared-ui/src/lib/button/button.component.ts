import { Component, booleanAttribute, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'md' | 'lg';

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
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);

  readonly pressed = output<MouseEvent>();

  protected readonly isDisabled = computed(() => this.disabled() || this.busy());
  protected readonly buttonClass = computed(() => {
    const sizeClass = this.size() === 'md' ? '' : ` tal-button--size-${this.size()}`;
    return `tal-button tal-button--${this.variant()}${sizeClass}${
      this.busy() ? ' tal-button--busy' : ''
    }`;
  });

  protected onPressed(event: MouseEvent): void {
    this.pressed.emit(event);
  }
}
