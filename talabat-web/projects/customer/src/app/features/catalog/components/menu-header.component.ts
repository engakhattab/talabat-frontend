import { Component, input } from '@angular/core';

@Component({
  selector: 'tal-menu-header',
  template: `
    <header class="mb-6 max-w-2xl">
      <p class="mb-1 text-sm font-semibold tracking-wide text-food-secondary">Restaurant menu</p>
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        {{ restaurantName() }}
      </h1>
    </header>
  `,
})
export class MenuHeaderComponent {
  readonly restaurantName = input.required<string>();
}
