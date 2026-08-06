import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../features/cart/cart.store';

@Component({
  selector: 'tal-cart-entry-bar',
  imports: [RouterLink],
  template: `
    <a
      routerLink="/cart"
      class="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-[max(1rem,env(safe-area-inset-right))] z-40 inline-flex min-h-12 min-w-12 items-center justify-center rounded-full bg-food-primary px-5 shadow-food-lg no-underline transition-colors hover:bg-food-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
      aria-label="View cart{{ cart.totalItemCount() > 0 ? ', ' + cart.totalItemCount() + ' item' + (cart.totalItemCount() === 1 ? '' : 's') : '' }}"
    >
      @if (cart.totalItemCount() > 0) {
        <span
          class="absolute -top-1 -end-1 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-food-ink px-1.5 text-xs font-semibold text-white ring-2 ring-white"
          aria-hidden="true"
        >
          {{ cart.totalItemCount() }}
        </span>
      }
      <svg
        class="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span class="sr-only">Cart</span>
    </a>
  `,
})
export class CartEntryBarComponent {
  protected readonly cart = inject(CartStore);
}
