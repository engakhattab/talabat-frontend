import { Component, computed, inject } from '@angular/core';

import { MoneyPipe } from '@talabat/shared-util';

import { CartStore } from '../../cart/cart.store';

@Component({
  selector: 'tal-checkout-summary',
  imports: [MoneyPipe],
  template: `
    <section
      class="rounded-food border border-food-border bg-white p-4 shadow-food-sm"
      aria-label="Order summary"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-base font-semibold text-food-ink">Order summary</h2>
        <span
          class="rounded-food bg-food-tint px-2 py-1 text-xs font-medium text-food-primary"
        >
          Cash on Delivery
        </span>
      </div>

      <ul class="mt-4 list-none space-y-3 p-0" role="list">
        @for (item of items(); track item.productId) {
          <li class="flex items-baseline justify-between gap-3">
            <div class="min-w-0">
              <p class="break-words text-sm font-medium text-food-ink">{{ item.productName }}</p>
              <p class="text-xs text-food-muted">
                {{ item.quantity }} × {{ item.unitPrice | talMoney }}
              </p>
            </div>
            <p class="shrink-0 text-sm font-semibold text-food-ink">
              {{ item.lineTotal | talMoney }}
            </p>
          </li>
        }
      </ul>

      <dl class="mt-4 border-t border-food-border pt-3">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-sm font-semibold text-food-ink">Grand total</dt>
          <dd class="text-[1.125rem] leading-6 font-bold text-food-ink" aria-live="polite">
            <span class="tal-visually-hidden">Grand total:</span>
            {{ store.total() | talMoney }}
          </dd>
        </div>
      </dl>
    </section>
  `,
})
export class CheckoutSummaryComponent {
  protected readonly store = inject(CartStore);

  protected readonly items = computed(() => this.store.items());
}
