import { Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-cross-restaurant-dialog',
  imports: [ButtonComponent],
  template: `
    <div class="p-6">
      <h2 id="cross-restaurant-dialog-title" class="font-display text-xl font-semibold text-food-ink">
        Clear Cart &amp; Add New Item?
      </h2>
      <p id="cross-restaurant-dialog-desc" class="mt-3 text-sm text-food-muted">
        Your cart already contains items from another restaurant. You can clear the current cart and
        add this item, or keep your current cart.
      </p>
      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <tal-button variant="secondary" (pressed)="keepCurrent()">Keep Current Cart</tal-button>
        <tal-button variant="primary" (pressed)="clearAndAdd()">Clear Cart &amp; Add</tal-button>
      </div>
    </div>
  `,
})
export class CrossRestaurantDialogComponent {
  private readonly dialogRef = inject<DialogRef<'clear-and-add' | 'keep-current'>>(DialogRef);

  protected clearAndAdd(): void {
    this.dialogRef.close('clear-and-add');
  }

  protected keepCurrent(): void {
    this.dialogRef.close('keep-current');
  }
}
