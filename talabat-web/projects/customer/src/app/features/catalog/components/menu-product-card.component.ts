import { Component, booleanAttribute, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MenuProductDto } from '@talabat/api-customer';
import { ButtonComponent } from '@talabat/shared-ui';

export interface CartEntryRequest {
  readonly restaurantId: number;
  readonly productId: number;
}

@Component({
  selector: 'tal-menu-product-card',
  imports: [ButtonComponent, DecimalPipe],
  template: `
    <article class="flex flex-col rounded-food border border-food-border bg-white p-4 shadow-food-sm">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <h3 class="text-[1.125rem] leading-6 font-semibold text-food-ink">{{ product().name }}</h3>
          <p class="mt-1 line-clamp-2 text-sm leading-5 text-food-muted">{{ product().description }}</p>
          <p class="mt-2 text-base font-bold text-food-ink">
            {{ product().price.amount | number:'1.2-2' }}
            @if (product().price.currency) {
              <span class="ms-1 text-sm font-medium text-food-muted">{{ product().price.currency }}</span>
            }
          </p>
        </div>
        <div
          class="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-food-md bg-food-tint"
          role="img"
          [attr.aria-label]="product().name + ' image placeholder'"
        >
          <svg aria-hidden="true" class="h-8 w-8 text-food-muted" fill="none" viewBox="0 0 24 24">
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
      <div class="mt-4">
        @if (product().isAvailable) {
          <tal-button
            class="tal-button--fluid"
            size="lg"
            [busy]="busy()"
            (click)="onAddToCart()"
          >
            {{ busy() ? 'Adding to cart' : 'Add to cart' }}
          </tal-button>
          @if (justAdded()) {
            <p class="mt-2 text-center text-sm font-medium text-food-success" role="status">
              Added to your cart
            </p>
          }
        } @else {
          <tal-button class="tal-button--fluid" size="lg" variant="secondary" disabled>
            Unavailable
          </tal-button>
        }
      </div>
    </article>
  `,
})
export class MenuProductCardComponent {
  readonly product = input.required<MenuProductDto>();
  readonly restaurantId = input.required<number>();
  readonly busy = input(false, { transform: booleanAttribute });
  readonly justAdded = input(false, { transform: booleanAttribute });

  readonly cartEntry = output<CartEntryRequest>();

  protected onAddToCart(): void {
    this.cartEntry.emit({
      restaurantId: this.restaurantId(),
      productId: this.product().id,
    });
  }
}
