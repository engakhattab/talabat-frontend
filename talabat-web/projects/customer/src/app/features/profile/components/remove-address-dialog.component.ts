import { Component, inject } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-remove-address-dialog',
  imports: [ButtonComponent],
  template: `
    <div class="tal-dialog-card">
      <h2 id="remove-address-dialog-title" class="font-display text-xl font-semibold text-food-ink">
        Remove this address?
      </h2>
      <p id="remove-address-dialog-desc" class="mt-3 text-sm text-food-muted">
        Are you sure you want to remove this delivery address? This action cannot be undone.
      </p>
      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <tal-button variant="secondary" (pressed)="cancel()">Cancel</tal-button>
        <tal-button variant="destructive" (pressed)="confirm()">Remove address</tal-button>
      </div>
    </div>
  `,
})
export class RemoveAddressDialogComponent {
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }
}
