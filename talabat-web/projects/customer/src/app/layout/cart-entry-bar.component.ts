import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../features/cart/cart.store';

@Component({
  selector: 'tal-cart-entry-bar',
  imports: [RouterLink],
  template: `
    <div
      class="fixed inset-x-0 bottom-0 z-40 border-t border-food-border bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-food-sm"
      role="region"
      aria-label="Order actions"
    >
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-food-ink">Ordering cart</span>
          @if (cart.totalItemCount() > 0) {
            <span
              class="inline-flex min-h-7 min-w-7 items-center justify-center rounded-full bg-food-primary px-2 text-xs font-semibold text-white"
              aria-label="{{ cart.totalItemCount() }} item{{ cart.totalItemCount() === 1 ? '' : 's' }} in cart"
            >
              {{ cart.totalItemCount() }}
            </span>
          } @else {
            <span class="text-xs text-food-muted">Your cart is empty</span>
          }
        </div>
        <a
          routerLink="/cart"
          class="inline-flex min-h-[42px] items-center rounded-food-md bg-food-primary px-4 text-sm font-medium text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
        >
          View cart
        </a>
      </div>
    </div>
  `,
})
export class CartEntryBarComponent {
  protected readonly cart = inject(CartStore);
}
