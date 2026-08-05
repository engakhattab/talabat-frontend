import { Component, input, output } from '@angular/core';

import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'tal-empty-state',
  imports: [ButtonComponent],
  template: `
    <section class="tal-state tal-state--empty">
      <h2>{{ title() }}</h2>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      @if (actionLabel()) {
        <tal-button variant="secondary" (pressed)="action.emit()">{{ actionLabel() }}</tal-button>
      }
    </section>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);

  readonly action = output<void>();
}
