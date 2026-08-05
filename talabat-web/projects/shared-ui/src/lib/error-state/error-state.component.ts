import { Component, input, output } from '@angular/core';

import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'tal-error-state',
  imports: [ButtonComponent],
  template: `
    <section class="tal-state tal-state--error" role="alert">
      <h2>{{ title() }}</h2>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      @if (retryLabel()) {
        <tal-button variant="secondary" (pressed)="retry.emit()">{{ retryLabel() }}</tal-button>
      }
    </section>
  `,
})
export class ErrorStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly retryLabel = input<string | null>('Try again');

  readonly retry = output<void>();
}
