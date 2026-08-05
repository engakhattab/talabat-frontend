import { Component, input } from '@angular/core';

@Component({
  selector: 'tal-spinner',
  template: `
    <span [attr.aria-label]="label()" class="tal-spinner" role="status">
      <span aria-hidden="true" class="tal-spinner__indicator"></span>
      <span class="tal-visually-hidden">{{ label() }}</span>
    </span>
  `,
})
export class SpinnerComponent {
  readonly label = input('Loading');
}
