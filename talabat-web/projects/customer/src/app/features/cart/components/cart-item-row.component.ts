import { Component, booleanAttribute, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CartLineItemDto } from '@talabat/api-customer';

@Component({
  selector: 'tal-cart-item-row',
  imports: [DecimalPipe],
  template: `
    <article class="rounded-food border border-food-border bg-white p-4 shadow-food-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-[1.125rem] leading-6 font-semibold text-food-ink">
            {{ item().productName }}
          </h3>
          <p class="mt-1 text-sm leading-5 text-food-muted">
            {{ item().unitPrice.amount | number:'1.2-2' }}
            @if (item().unitPrice.currency) {
              <span>{{ item().unitPrice.currency }}</span>
            }
            &middot; each
          </p>
        </div>
        <p class="shrink-0 text-base font-bold text-food-ink">
          {{ item().lineTotal.amount | number:'1.2-2' }}
          @if (item().lineTotal.currency) {
            <span class="ms-1 text-sm font-medium text-food-muted">{{ item().lineTotal.currency }}</span>
          }
        </p>
      </div>

      <div class="mt-3 flex items-center justify-between gap-3 border-t border-food-border pt-3">
        <div class="flex items-center gap-2" role="group" aria-label="Quantity of {{ item().productName }}">
          <button
            type="button"
            class="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-full bg-food-subtle text-lg text-food-ink transition-colors hover:bg-food-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            [attr.aria-label]="'Decrease quantity of ' + item().productName"
            [disabled]="busy()"
            (click)="decrement.emit(item())"
          >
            &minus;
          </button>
          <span
            class="min-w-9 text-center text-base font-semibold text-food-ink"
            aria-live="polite"
          >
            {{ item().quantity }}
          </span>
          <button
            type="button"
            class="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-full bg-food-subtle text-lg text-food-ink transition-colors hover:bg-food-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            [attr.aria-label]="'Increase quantity of ' + item().productName"
            [disabled]="busy()"
            (click)="increment.emit(item())"
          >
            +
          </button>
        </div>
        <button
          type="button"
          class="inline-flex min-h-[42px] items-center rounded-full px-3 text-sm font-semibold text-food-primary transition-colors hover:bg-food-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          [attr.aria-label]="'Remove ' + item().productName + ' from cart'"
          [disabled]="busy()"
          (click)="remove.emit(item())"
        >
          Remove
        </button>
      </div>
    </article>
  `,
})
export class CartItemRowComponent {
  readonly item = input.required<CartLineItemDto>();
  readonly busy = input(false, { transform: booleanAttribute });

  readonly increment = output<CartLineItemDto>();
  readonly decrement = output<CartLineItemDto>();
  readonly remove = output<CartLineItemDto>();
}
