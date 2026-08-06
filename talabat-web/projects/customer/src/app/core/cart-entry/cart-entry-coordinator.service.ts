import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, take } from 'rxjs';
import { DialogService } from '@talabat/shared-ui';
import { AuthStore } from '@talabat/core-auth';
import { CartEntryRequest } from '../../features/catalog/components/menu-product-card.component';
import { CartStore } from '../../features/cart/cart.store';
import { CrossRestaurantDialogComponent } from '../../features/cart/components/cross-restaurant-dialog.component';

export type CartEntryOutcome =
  | 'authentication-started'
  | 'added'
  | 'conflict-kept-current'
  | 'conflict-resolved'
  | 'error';

@Injectable({ providedIn: 'root' })
export class CartEntryCoordinator {
  private readonly cartStore = inject(CartStore);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(DialogService);

  private readonly lastOutcome = signal<CartEntryOutcome | null>(null);

  readonly outcome = this.lastOutcome.asReadonly();

  async handle(request: CartEntryRequest): Promise<CartEntryOutcome> {
    this.lastOutcome.set(null);

    if (!this.auth.isAuthenticated()) {
      this.lastOutcome.set('authentication-started');
      return 'authentication-started';
    }

    const result = await this.cartStore.addItem({
      restaurantId: request.restaurantId,
      productId: request.productId,
      quantity: 1,
    });

    if (result.kind === 'added') {
      this.lastOutcome.set('added');
      return 'added';
    }

    if (result.kind === 'conflict') {
      const choice = await this.openConflictDialog();
      await this.cartStore.resolveConflict(choice);
      const outcome =
        choice === 'clear-and-add' ? 'conflict-resolved' : 'conflict-kept-current';
      this.lastOutcome.set(outcome);
      return outcome;
    }

    this.lastOutcome.set('error');
    return 'error';
  }

  reset(): void {
    this.lastOutcome.set(null);
  }

  private async openConflictDialog(): Promise<'clear-and-add' | 'keep-current'> {
    const ref = this.dialog.openModal<'clear-and-add' | 'keep-current', void, CrossRestaurantDialogComponent>(
      CrossRestaurantDialogComponent,
      { ariaLabel: 'Cross-restaurant cart conflict' },
    );
    const choice = await firstValueFrom(ref.closed.pipe(take(1)));
    return choice ?? 'keep-current';
  }
}
