import { Injectable, signal } from '@angular/core';
import { CartEntryRequest } from '../../features/catalog/components/menu-product-card.component';

export type CartEntryOutcome = 'authentication-started' | 'deferred';

@Injectable({ providedIn: 'root' })
export class CartEntryCoordinator {
  private readonly lastOutcome = signal<CartEntryOutcome | null>(null);

  readonly outcome = this.lastOutcome.asReadonly();

  handle(request: CartEntryRequest, isAuthenticated: boolean): CartEntryOutcome {
    this.lastOutcome.set(null);

    if (!isAuthenticated) {
      this.lastOutcome.set('authentication-started');
      return 'authentication-started';
    }

    this.lastOutcome.set('deferred');
    return 'deferred';
  }

  reset(): void {
    this.lastOutcome.set(null);
  }
}
