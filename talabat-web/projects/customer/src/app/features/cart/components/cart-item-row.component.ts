import { Component, booleanAttribute, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CartLineItemDto } from '@talabat/api-customer';

@Component({
  selector: 'tal-cart-item-row',
  imports: [DecimalPipe],
  template: `
    <article class="flex items-center justify-between gap-3 rounded-food border border-food-border bg-white p-3 shadow-food-sm">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-semibold text-food-ink">{{ item().productName }}</h3>
        <p class="mt-0.5 text-xs text-food-muted">
          {{ item().unitPrice.amount | number:'1.2-2' }}
          @if (item().unitPrice.currency) {
            <span>{{ item().unitPrice.currency }}</span>
          }
          &middot; qty {{ item().quantity }}
        </p>
        <p class="mt-1 text-sm font-semibold text-food-ink">
          {{ item().lineTotal.amount | number:'1.2-2' }}
          @if (item().lineTotal.currency) {
            <span class="text-xs text-food-muted">{{ item().lineTotal.currency }}</span>
          }
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-food bg-food-subtle px-2 text-food-ink disabled:cursor-not-allowed disabled:opacity-40"
          [attr.aria-label]="'Decrease quantity of ' + item().productName"
          [disabled]="busy()"
          (click)="decrement.emit(item())"
        >
          &minus;
        </button>
        <span class="min-w-7 text-center text-sm font-semibold text-food-ink" aria-live="polite">
          {{ item().quantity }}
        </span>
        <button
          type="button"
          class="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-food bg-food-subtle px-2 text-food-ink disabled:cursor-not-allowed disabled:opacity-40"
          [attr.aria-label]="'Increase quantity of ' + item().productName"
          [disabled]="busy()"
          (click)="increment.emit(item())"
        >
          +
        </button>
        <button
          type="button"
          class="ms-1 inline-flex min-h-[42px] items-center rounded-food bg-food-tint px-2 text-sm font-medium text-food-primary disabled:cursor-not-allowed disabled:opacity-40"
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
