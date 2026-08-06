import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { CartLineItemDto } from '@talabat/api-customer';
import {
  ButtonComponent,
  DialogService,
  EmptyStateComponent,
  ErrorStateComponent,
  SpinnerComponent,
} from '@talabat/shared-ui';

import { CartStore } from '../cart.store';
import { CartItemRowComponent } from '../components/cart-item-row.component';
import { CartSummaryComponent } from '../components/cart-summary.component';
import { ClearCartDialogComponent } from '../components/clear-cart-dialog.component';

@Component({
  selector: 'tal-cart-page',
  imports: [
    ButtonComponent,
    CartItemRowComponent,
    CartSummaryComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SpinnerComponent,
  ],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-2xl font-bold text-food-ink">Your Cart</h1>

      @if (store.notice(); as notice) {
        <div
          class="mt-3 flex items-center justify-between gap-3 rounded-food border border-food-warning bg-food-subtle px-3 py-2"
          role="alert"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-food-ink">{{ notice.title }}</p>
            @if (notice.detail) {
              <p class="text-xs text-food-muted">{{ notice.detail }}</p>
            }
          </div>
          @if (notice.kind === 'network') {
            <tal-button variant="secondary" (pressed)="store.reload()">Try again</tal-button>
          }
        </div>
      }

      @if (store.status() === 'loading') {
        <div class="mt-6 grid min-h-56 place-items-center rounded-food-md bg-white shadow-food-sm">
          <tal-spinner label="Loading your cart" />
        </div>
      } @else if (store.status() === 'error') {
        <div class="mt-6">
          <tal-error-state
            [description]="errorDetail()"
            [title]="errorTitle()"
            (retry)="store.reload()"
          />
        </div>
      } @else if (store.status() === 'loaded' && store.isEmpty()) {
        <div class="mt-6">
          <tal-empty-state
            description="Your cart is empty. Browse restaurants to start building your order."
            title="Your cart is empty"
            actionLabel="Browse restaurants"
            (action)="goToRestaurants()"
          />
        </div>
      } @else if (store.status() === 'loaded' && !store.isEmpty()) {
        <ul class="mt-6 list-none space-y-3 p-0" role="list">
          @for (item of store.items(); track item.productId) {
            <li>
              <tal-cart-item-row
                [busy]="isItemBusy(item.productId)"
                [item]="item"
                (increment)="increment($event)"
                (decrement)="decrement($event)"
                (remove)="remove($event)"
              />
            </li>
          }
        </ul>

        <div class="mt-4">
          <tal-cart-summary />
        </div>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <tal-button variant="secondary" [busy]="store.isMutating()" (pressed)="confirmClearCart()">
            Clear Cart
          </tal-button>
          <tal-button variant="primary" disabled title="Checkout arrives in Phase 9">
            Proceed to Checkout
          </tal-button>
        </div>
      }
    </div>
  `,
})
export class CartPage {
  protected readonly store = inject(CartStore);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);

  constructor() {
    if (this.store.status() === 'uninitialized') {
      void this.store.loadCart();
    }
  }

  protected errorTitle(): string {
    return this.store.error()?.title ?? 'Something went wrong';
  }

  protected errorDetail(): string {
    return this.store.error()?.detail ?? 'Check your connection and try again.';
  }

  protected isItemBusy(productId: number): boolean {
    return this.store.isMutating() && this.store.mutatingProductId() === productId;
  }

  protected increment(item: CartLineItemDto): void {
    void this.store.updateQuantity(item.productId, item.quantity + 1);
  }

  protected decrement(item: CartLineItemDto): void {
    void this.store.updateQuantity(item.productId, item.quantity - 1);
  }

  protected remove(item: CartLineItemDto): void {
    void this.store.removeItem(item.productId);
  }

  protected async confirmClearCart(): Promise<void> {
    const ref = this.dialog.openSheet<boolean, void, ClearCartDialogComponent>(ClearCartDialogComponent, {
      ariaLabel: 'Clear cart confirmation',
    });
    const confirmed = await firstValueFrom(ref.closed.pipe(take(1)));
    if (confirmed) {
      void this.store.clearCart();
    }
  }

  protected goToRestaurants(): void {
    void this.router.navigateByUrl('/restaurants');
  }
}
