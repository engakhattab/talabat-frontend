import { Component, computed, inject } from '@angular/core';

import { CheckoutStore } from '../checkout.store';

@Component({
  selector: 'tal-address-selector',
  template: `
    <section
      class="rounded-food border border-food-border bg-white p-4 shadow-food-sm"
      aria-label="Delivery address"
    >
      <h2 class="text-sm font-semibold text-food-ink">Delivery address</h2>

      <fieldset class="mt-3 space-y-2">
        <legend class="sr-only">Choose a delivery address</legend>
        @for (address of addresses(); track address.id) {
          <label
            class="flex min-h-[42px] cursor-pointer items-center gap-3 rounded-food border px-3 py-2 transition-colors"
            [class.border-food-primary]="isSelected(address.id)"
            [class.bg-food-tint]="isSelected(address.id)"
            [class.border-food-border]="!isSelected(address.id)"
          >
            <input
              class="size-[20px] shrink-0 accent-food-primary"
              type="radio"
              name="delivery-address"
              [value]="address.id"
              [checked]="isSelected(address.id)"
              [disabled]="isDisabled()"
              (change)="select(address)"
            />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate text-sm font-medium text-food-ink">
                  {{ address.street }}
                </span>
                @if (address.isDefault) {
                  <span
                    class="shrink-0 rounded-food bg-food-tint px-1.5 py-0.5 text-xs font-medium text-food-primary"
                  >
                    Default
                  </span>
                }
              </span>
              <span class="mt-0.5 block truncate text-xs text-food-muted">
                Building {{ address.buildingNumber }}
                @if (address.floor !== null) {
                  · Floor {{ address.floor }}
                }
                · {{ address.city }}
              </span>
            </span>
          </label>
        }
      </fieldset>
    </section>
  `,
})
export class AddressSelectorComponent {
  protected readonly store = inject(CheckoutStore);

  protected readonly addresses = computed(() => this.store.addresses());
  protected readonly selectedAddressId = computed(() => this.store.selectedAddressId());
  protected readonly isDisabled = computed(() => this.store.isSubmitting());

  protected isSelected(addressId: number): boolean {
    return this.selectedAddressId() === addressId;
  }

  protected select(address: { readonly id: number }): void {
    this.store.selectAddress(address.id);
  }
}
