import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent, DialogService } from '@talabat/shared-ui';
import { CartDeferredDialogComponent } from '../../../layout/cart-entry-bar.component';

@Component({
  selector: 'tal-cart-page',
  imports: [ButtonComponent, RouterLink],
  template: `
    <div class="mx-auto max-w-2xl py-8 text-center">
      <h1 class="font-display text-2xl font-bold text-food-ink">Your Cart</h1>
      <p class="mt-3 text-sm text-food-muted">
        Server-backed cart persistence and checkout will be available in Phase 8.
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <a
          routerLink="/restaurants"
          class="inline-flex items-center rounded-food-md bg-food-primary px-4 py-2 text-sm font-medium text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
        >
          Browse restaurants
        </a>
        <tal-button variant="secondary" (click)="openPreview()">
          View Phase 8 preview
        </tal-button>
      </div>
    </div>
  `,
})
export class CartPage {
  private readonly dialog = inject(DialogService);

  protected openPreview(): void {
    this.dialog.openModal(CartDeferredDialogComponent, {
      ariaLabel: 'Ordering preview',
    });
  }
}
