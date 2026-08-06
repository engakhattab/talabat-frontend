import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthStore } from '@talabat/core-auth';
import { DialogService } from '@talabat/shared-ui';

import { CartEntryCoordinator } from './cart-entry-coordinator.service';
import { CartStore } from '../../features/cart/cart.store';
import { CrossRestaurantDialogComponent } from '../../features/cart/components/cross-restaurant-dialog.component';

describe('CartEntryCoordinator', () => {
  let coordinator: CartEntryCoordinator;
  let cartStore: {
    addItem: ReturnType<typeof vi.fn>;
    resolveConflict: ReturnType<typeof vi.fn>;
  };
  let dialog: { openModal: ReturnType<typeof vi.fn> };
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;

  const request = { restaurantId: 5, productId: 101 };

  beforeEach(() => {
    cartStore = {
      addItem: vi.fn(),
      resolveConflict: vi.fn().mockResolvedValue(undefined),
    };
    dialog = { openModal: vi.fn() };
    isAuthenticatedSignal = signal(true);

    TestBed.configureTestingModule({
      providers: [
        CartEntryCoordinator,
        { provide: CartStore, useValue: cartStore },
        {
          provide: AuthStore,
          useValue: {
            isAuthenticated: isAuthenticatedSignal.asReadonly(),
            user: signal(null).asReadonly(),
          },
        },
        { provide: DialogService, useValue: dialog },
      ],
    });

    coordinator = TestBed.inject(CartEntryCoordinator);
  });

  it('returns authentication-started for anonymous users', async () => {
    isAuthenticatedSignal.set(false);

    const result = await coordinator.handle(request);

    expect(result).toBe('authentication-started');
    expect(coordinator.outcome()).toBe('authentication-started');
    expect(cartStore.addItem).not.toHaveBeenCalled();
  });

  it('delegates authenticated additions to the cart store', async () => {
    cartStore.addItem.mockResolvedValue({ kind: 'added' });

    const result = await coordinator.handle(request);

    expect(result).toBe('added');
    expect(coordinator.outcome()).toBe('added');
    expect(cartStore.addItem).toHaveBeenCalledWith({
      restaurantId: 5,
      productId: 101,
      quantity: 1,
    });
  });

  it('keeps the current cart when the conflict dialog is dismissed with keep-current', async () => {
    cartStore.addItem.mockResolvedValue({ kind: 'conflict' });
    const closed = new Subject<'clear-and-add' | 'keep-current'>();
    dialog.openModal.mockReturnValue({ closed: closed.asObservable() });

    const resultPromise = coordinator.handle(request);
    await Promise.resolve();
    closed.next('keep-current');
    closed.complete();
    const result = await resultPromise;

    expect(dialog.openModal).toHaveBeenCalledWith(
      CrossRestaurantDialogComponent,
      expect.objectContaining({ ariaLabel: 'Cross-restaurant cart conflict' }),
    );
    expect(result).toBe('conflict-kept-current');
    expect(cartStore.resolveConflict).toHaveBeenCalledWith('keep-current');
  });

  it('clears and adds when the conflict dialog resolves with clear-and-add', async () => {
    cartStore.addItem.mockResolvedValue({ kind: 'conflict' });
    const closed = new Subject<'clear-and-add' | 'keep-current'>();
    dialog.openModal.mockReturnValue({ closed: closed.asObservable() });

    const resultPromise = coordinator.handle(request);
    await Promise.resolve();
    closed.next('clear-and-add');
    closed.complete();
    const result = await resultPromise;

    expect(result).toBe('conflict-resolved');
    expect(cartStore.resolveConflict).toHaveBeenCalledWith('clear-and-add');
  });

  it('surfaces an error outcome when the store reports an error', async () => {
    cartStore.addItem.mockResolvedValue({
      kind: 'error',
      error: {
        status: 422,
        code: 'ProductUnavailable',
        title: 'Item is no longer available',
        isNetworkError: false,
      },
    });

    const result = await coordinator.handle(request);

    expect(result).toBe('error');
    expect(coordinator.outcome()).toBe('error');
    expect(dialog.openModal).not.toHaveBeenCalled();
  });

  it('resets the outcome', async () => {
    cartStore.addItem.mockResolvedValue({ kind: 'added' });
    await coordinator.handle(request);
    coordinator.reset();
    expect(coordinator.outcome()).toBeNull();
  });
});
