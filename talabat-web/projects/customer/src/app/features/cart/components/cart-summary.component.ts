import { Component, inject } from '@angular/core';
import { MoneyPipe } from '@talabat/shared-util';
import { CartStore } from '../cart.store';

@Component({
  selector: 'tal-cart-summary',
  imports: [MoneyPipe],
  template: `
    <section
      class="rounded-food border border-food-border bg-white p-4 shadow-food-sm"
      aria-label="Cart summary"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-food-ink">Order total</h2>
        <p class="text-base font-bold text-food-ink" aria-live="polite">
          <span class="tal-visually-hidden">Grand total:</span>
          {{ store.total() | talMoney }}
        </p>
      </div>
      @if (currency()) {
        <p class="mt-1 text-xs text-food-muted">All prices in {{ currency() }}</p>
      }
    </section>
  `,
})
export class CartSummaryComponent {
  protected readonly store = inject(CartStore);

  protected readonly currency = () => this.store.total()?.currency ?? null;
}
