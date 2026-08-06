import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DialogService } from '@talabat/shared-ui';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'tal-cart-deferred-dialog',
  template: `
    <div class="p-6" role="document">
      <h2 class="font-display text-xl font-semibold text-food-ink" id="cart-dialog-title">
        Cart coming in Phase 8
      </h2>
      <p class="mt-3 text-sm text-food-muted" id="cart-dialog-desc">
        Cart creation and ordering is not available yet. No item has been added.
        Complete your profile and browse menus while we build the ordering experience.
      </p>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-food bg-food-primary px-4 py-2 text-sm font-medium text-white"
          (click)="close()"
        >
          Got it
        </button>
      </div>
    </div>
  `,
})
export class CartDeferredDialogComponent {
  private readonly dialogRef = inject(DialogRef);

  protected close(): void {
    this.dialogRef.close();
  }
}

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
          <span class="text-xs text-food-muted">Available in Phase 8</span>
        </div>
        <a
          routerLink="/cart"
          class="inline-flex items-center rounded-food-md bg-food-primary px-4 py-2 text-sm font-medium text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
        >
          View cart
        </a>
      </div>
    </div>
  `,
})
export class CartEntryBarComponent {
  private readonly dialog = inject(DialogService);

  protected onCartEntry(): void {
    this.dialog.openModal(CartDeferredDialogComponent, {
      ariaLabel: 'Ordering preview',
    });
  }
}
