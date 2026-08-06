import { TestBed } from '@angular/core/testing';

import { CartEntryCoordinator } from './cart-entry-coordinator.service';

describe('CartEntryCoordinator', () => {
  let coordinator: CartEntryCoordinator;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CartEntryCoordinator],
    });
    coordinator = TestBed.inject(CartEntryCoordinator);
  });

  it('returns deferred for authenticated users', () => {
    const result = coordinator.handle({ restaurantId: 1, productId: 1 }, true);
    expect(result).toBe('deferred');
    expect(coordinator.outcome()).toBe('deferred');
  });

  it('returns authentication-started for anonymous users', () => {
    const result = coordinator.handle({ restaurantId: 1, productId: 1 }, false);
    expect(result).toBe('authentication-started');
    expect(coordinator.outcome()).toBe('authentication-started');
  });

  it('resets outcome', () => {
    coordinator.handle({ restaurantId: 1, productId: 1 }, true);
    coordinator.reset();
    expect(coordinator.outcome()).toBeNull();
  });
});
