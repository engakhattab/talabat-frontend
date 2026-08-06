import { Component, inject } from '@angular/core';

import { ButtonComponent, DialogService } from '@talabat/shared-ui';

import { CheckoutStore } from '../checkout.store';
import { AddressSelectorComponent } from '../components/address-selector.component';
import { CheckoutSummaryComponent } from '../components/checkout-summary.component';
import { AddressFormModalComponent } from '../components/address-form-modal.component';

@Component({
  selector: 'tal-checkout-page',
  imports: [AddressSelectorComponent, ButtonComponent, CheckoutSummaryComponent],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Checkout
      </h1>

      @if (store.notice(); as notice) {
        <div
          class="mt-3 rounded-food border border-food-warning bg-food-subtle px-3 py-2"
          role="alert"
        >
          <p class="text-sm font-medium text-food-ink">{{ notice.title }}</p>
          @if (notice.detail) {
            <p class="mt-0.5 text-xs text-food-muted">{{ notice.detail }}</p>
          }
        </div>
      }

      @if (store.hasSavedAddresses()) {
        <div class="mt-6">
          <tal-address-selector />
        </div>
      } @else {
        <div class="mt-6">
          <section
            class="rounded-food border border-food-border bg-white p-4 shadow-food-sm"
            aria-label="No saved delivery address"
          >
            <h2 class="text-base font-semibold text-food-ink">Delivery address</h2>
            <p class="mt-2 text-sm text-food-muted">
              You need a saved delivery address to place an order.
            </p>
          </section>
        </div>
      }

      <div class="mt-3 flex justify-end">
        <tal-button variant="secondary" (pressed)="addAddress()">
          Add Delivery Address
        </tal-button>
      </div>

      <div class="mt-4">
        <tal-checkout-summary />
      </div>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-food-muted">Payment is collected when your order arrives.</p>
        <tal-button
          size="lg"
          variant="primary"
          [busy]="store.isSubmitting()"
          [disabled]="!store.canSubmit()"
          (pressed)="submit()"
        >
          @if (store.isSubmitting()) {
            Placing order...
          } @else {
            Place Order
          }
        </tal-button>
      </div>

      <div class="tal-visually-hidden" role="status" aria-live="polite">
        @if (store.isSubmitting()) {
          Placing your order. Do not close this page.
        }
      </div>
    </div>
  `,
})
export class CheckoutPage {
  protected readonly store = inject(CheckoutStore);
  private readonly dialog = inject(DialogService);

  protected submit(): void {
    void this.store.submitOrder();
  }

  protected addAddress(): void {
    this.dialog.openModal(AddressFormModalComponent, {
      ariaLabel: 'Add delivery address',
      maxWidth: '32rem',
    });
  }
}
