import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MenuProductDto } from '@talabat/api-customer';

export interface CartEntryRequest {
  readonly restaurantId: number;
  readonly productId: number;
}

@Component({
  selector: 'tal-menu-product-card',
  imports: [DecimalPipe],
  template: `
    <article class="rounded-food border border-food-border bg-white p-3 shadow-food-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold text-food-ink">{{ product().name }}</h3>
          <p class="mt-0.5 text-xs text-food-muted">{{ product().description }}</p>
          <p class="mt-1 text-sm font-medium text-food-ink">
            {{ product().price.amount | number:'1.2-2' }}
            @if (product().price.currency) {
              <span class="text-xs text-food-muted">{{ product().price.currency }}</span>
            }
          </p>
        </div>
        <div
          class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-food bg-food-tint"
          role="img"
          [attr.aria-label]="product().name + ' image placeholder'"
        >
          <svg aria-hidden="true" class="h-6 w-6 text-food-muted" fill="none" viewBox="0 0 24 24">
            <path
              d="m4 16 4-5 3 3 3-4 6 6M5 20h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1v14a1 1 0 0 0 1 1Z"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
            />
          </svg>
        </div>
      </div>
      <div class="mt-2">
        @if (product().isAvailable) {
          <button
            type="button"
            class="w-full rounded-food bg-food-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            (click)="onAddToCart()"
          >
            Add to order
          </button>
        } @else {
          <button
            type="button"
            class="w-full rounded-food bg-food-subtle px-3 py-2 text-sm font-medium text-food-muted"
            disabled
            aria-disabled="true"
          >
            Unavailable
          </button>
        }
      </div>
    </article>
  `,
})
export class MenuProductCardComponent {
  readonly product = input.required<MenuProductDto>();
  readonly restaurantId = input.required<number>();

  readonly cartEntry = output<CartEntryRequest>();

  protected onAddToCart(): void {
    this.cartEntry.emit({
      restaurantId: this.restaurantId(),
      productId: this.product().id,
    });
  }
}
