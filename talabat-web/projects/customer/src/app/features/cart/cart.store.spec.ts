import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CartApiService, CartResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

import { CartStore } from './cart.store';

describe('CartStore', () => {
  let store: CartStore;
  let api: {
    getCart: ReturnType<typeof vi.fn>;
    addCartItem: ReturnType<typeof vi.fn>;
    updateCartItemQuantity: ReturnType<typeof vi.fn>;
    removeCartItem: ReturnType<typeof vi.fn>;
    clearCart: ReturnType<typeof vi.fn>;
  };
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;

  const money = (amount: number) => ({ amount, currency: 'EGP' });

  const populatedCart: CartResponse = {
    id: 1,
    customerId: 12,
    restaurantId: 5,
    status: 'Active',
    items: [
      {
        productId: 101,
        productName: 'Super Chicken Burger',
        unitPrice: money(150),
        quantity: 2,
        lineTotal: money(300),
      },
      {
        productId: 102,
        productName: 'Fries',
        unitPrice: money(50),
        quantity: 1,
        lineTotal: money(50),
      },
    ],
    total: money(350),
  };

  const emptyCart: CartResponse = {
    id: null,
    customerId: 12,
    restaurantId: null,
    status: 'Empty',
    items: [],
    total: money(0),
  };

  beforeEach(() => {
    api = {
      getCart: vi.fn(),
      addCartItem: vi.fn(),
      updateCartItemQuantity: vi.fn(),
      removeCartItem: vi.fn(),
      clearCart: vi.fn(),
    };
    isAuthenticatedSignal = signal(true);

    TestBed.configureTestingModule({
      providers: [
        CartStore,
        { provide: CartApiService, useValue: api },
        {
          provide: AuthStore,
          useValue: {
            user: signal(null).asReadonly(),
            isAuthenticated: isAuthenticatedSignal.asReadonly(),
          },
        },
      ],
    });

    store = TestBed.inject(CartStore);
  });

  it('starts uninitialized with empty derived signals', () => {
    expect(store.status()).toBe('uninitialized');
    expect(store.cart()).toBeNull();
    expect(store.items()).toEqual([]);
    expect(store.total()).toBeNull();
    expect(store.totalItemCount()).toBe(0);
    expect(store.isEmpty()).toBe(true);
    expect(store.isMutating()).toBe(false);
    expect(store.conflictAddRequest()).toBeNull();
  });

  it('does not load cart when unauthenticated', () => {
    isAuthenticatedSignal.set(false);
    TestBed.flushEffects();
    expect(api.getCart).not.toHaveBeenCalled();
  });

  it('loads cart into loaded state with derived badge count', async () => {
    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    api.getCart.mockReturnValue(of(populatedCart));

    await store.loadCart();

    expect(store.status()).toBe('loaded');
    expect(store.cart()).toEqual(populatedCart);
    expect(store.items()).toHaveLength(2);
    expect(store.totalItemCount()).toBe(3);
    expect(store.total()).toEqual(money(350));
    expect(store.isEmpty()).toBe(false);
    expect(api.getCart).toHaveBeenCalled();
  });

  it('treats an empty server cart as a loaded empty state', async () => {
    api.getCart.mockReturnValue(of(emptyCart));

    await store.loadCart();

    expect(store.status()).toBe('loaded');
    expect(store.isEmpty()).toBe(true);
    expect(store.totalItemCount()).toBe(0);
    expect(store.cart()).toEqual(emptyCart);
  });

  it('stores a retryable error state when load fails without a prior cart', async () => {
    const error: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
    api.getCart.mockReturnValue(throwError(() => error));

    await store.loadCart();

    expect(store.status()).toBe('error');
    expect(store.error()).toEqual(error);
    expect(store.cart()).toBeNull();
  });

  it('adds an item and applies the authoritative server cart', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const updated: CartResponse = {
      ...populatedCart,
      items: [
        ...populatedCart.items,
        {
          productId: 103,
          productName: 'Cola',
          unitPrice: money(25),
          quantity: 1,
          lineTotal: money(25),
        },
      ],
      total: money(375),
    };
    api.addCartItem.mockReturnValue(of(updated));

    const outcome = await store.addItem({ restaurantId: 5, productId: 103, quantity: 1 });

    expect(outcome).toEqual({ kind: 'added' });
    expect(api.addCartItem).toHaveBeenCalledWith({
      addCartItemRequest: { restaurantId: 5, productId: 103, quantity: 1 },
    });
    expect(store.cart()).toEqual(updated);
    expect(store.totalItemCount()).toBe(4);
    expect(store.isMutating()).toBe(false);
    expect(store.mutatingProductId()).toBeNull();
  });

  it('exposes a cross-restaurant conflict and keeps the prior cart intact', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const conflict: AppError = {
      status: 409,
      code: AppErrorCode.CrossRestaurantCart,
      title: 'Cross-restaurant cart conflict',
      detail: 'Cart contains items from another restaurant.',
      isNetworkError: false,
    };
    api.addCartItem.mockReturnValue(throwError(() => conflict));

    const outcome = await store.addItem({ restaurantId: 9, productId: 201, quantity: 1 });

    expect(outcome).toEqual({ kind: 'conflict' });
    expect(store.conflictAddRequest()).toEqual({ restaurantId: 9, productId: 201, quantity: 1 });
    expect(store.cart()).toEqual(populatedCart);
  });

  it('resolves a conflict with clear-and-add by clearing then adding', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const conflict: AppError = {
      status: 409,
      code: AppErrorCode.CrossRestaurantCart,
      title: 'Cross-restaurant cart conflict',
      isNetworkError: false,
    };
    api.addCartItem.mockReturnValueOnce(throwError(() => conflict));
    await store.addItem({ restaurantId: 9, productId: 201, quantity: 1 });

    const replaced: CartResponse = {
      id: 2,
      customerId: 12,
      restaurantId: 9,
      status: 'Active',
      items: [
        {
          productId: 201,
          productName: 'Shawarma',
          unitPrice: money(90),
          quantity: 1,
          lineTotal: money(90),
        },
      ],
      total: money(90),
    };
    api.clearCart.mockReturnValue(of(undefined));
    api.addCartItem.mockReturnValue(of(replaced));

    await store.resolveConflict('clear-and-add');

    expect(api.clearCart).toHaveBeenCalled();
    expect(api.addCartItem).toHaveBeenCalledWith({
      addCartItemRequest: { restaurantId: 9, productId: 201, quantity: 1 },
    });
    expect(store.cart()).toEqual(replaced);
    expect(store.conflictAddRequest()).toBeNull();
    expect(store.totalItemCount()).toBe(1);
  });

  it('keeps the current cart when conflict resolution keeps current', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const conflict: AppError = {
      status: 409,
      code: AppErrorCode.CrossRestaurantCart,
      title: 'Cross-restaurant cart conflict',
      isNetworkError: false,
    };
    api.addCartItem.mockReturnValue(throwError(() => conflict));
    await store.addItem({ restaurantId: 9, productId: 201, quantity: 1 });

    await store.resolveConflict('keep-current');

    expect(api.clearCart).not.toHaveBeenCalled();
    expect(api.addCartItem).toHaveBeenCalledTimes(1);
    expect(store.cart()).toEqual(populatedCart);
    expect(store.conflictAddRequest()).toBeNull();
  });

  it('updates quantity with the server response as authority', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const updated: CartResponse = {
      ...populatedCart,
      items: populatedCart.items.map((item) =>
        item.productId === 101 ? { ...item, quantity: 3, lineTotal: money(450) } : item,
      ),
      total: money(500),
    };
    api.updateCartItemQuantity.mockReturnValue(of(updated));

    await store.updateQuantity(101, 3);

    expect(api.updateCartItemQuantity).toHaveBeenCalledWith({
      productId: 101,
      updateCartItemRequest: { quantity: 3 },
    });
    expect(store.totalItemCount()).toBe(4);
    expect(store.total()).toEqual(money(500));
  });

  it('removes a line item through removeCartItem', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const updated: CartResponse = {
      ...populatedCart,
      items: populatedCart.items.filter((item) => item.productId !== 101),
      total: money(50),
    };
    api.removeCartItem.mockReturnValue(of(updated));

    await store.removeItem(101);

    expect(api.removeCartItem).toHaveBeenCalledWith({ productId: 101 });
    expect(store.items()).toHaveLength(1);
    expect(store.totalItemCount()).toBe(1);
  });

  it('decrements below 1 by removing the item instead', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const updated: CartResponse = {
      ...populatedCart,
      items: populatedCart.items.filter((item) => item.productId !== 101),
      total: money(50),
    };
    api.removeCartItem.mockReturnValue(of(updated));

    await store.updateQuantity(101, 0);

    expect(api.updateCartItemQuantity).not.toHaveBeenCalled();
    expect(api.removeCartItem).toHaveBeenCalledWith({ productId: 101 });
    expect(store.items()).toHaveLength(1);
  });

  it('handles a 204 clear cart by transitioning to the empty state', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    api.clearCart.mockReturnValue(of(undefined));

    await store.clearCart();

    expect(api.clearCart).toHaveBeenCalled();
    expect(store.status()).toBe('loaded');
    expect(store.isEmpty()).toBe(true);
    expect(store.totalItemCount()).toBe(0);
    expect(store.cart()?.status).toBe('Empty');
    expect(store.cart()?.restaurantId).toBeNull();
  });

  it('surfaces a product-unavailable error and refetches the cart', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const unavailable: AppError = {
      status: 422,
      code: AppErrorCode.ProductUnavailable,
      title: 'Item is no longer available',
      detail: 'Product has been removed from the menu.',
      isNetworkError: false,
    };
    api.addCartItem.mockReturnValue(throwError(() => unavailable));

    const outcome = await store.addItem({ restaurantId: 5, productId: 999, quantity: 1 });

    expect(outcome.kind).toBe('error');
    expect(store.notice()?.kind).toBe('product-unavailable');
    expect(api.getCart).toHaveBeenCalledTimes(2);
  });

  it('clears the cart on an expired-cart domain error', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const expired: AppError = {
      status: 409,
      code: AppErrorCode.CartExpired,
      title: 'Cart expired',
      isNetworkError: false,
    };
    api.addCartItem.mockReturnValue(throwError(() => expired));

    await store.addItem({ restaurantId: 5, productId: 103, quantity: 1 });

    expect(store.isEmpty()).toBe(true);
    expect(store.notice()?.kind).toBe('cart-expired');
  });

  it('serializes mutations so a stale earlier response cannot overwrite a newer one', async () => {
    api.getCart.mockReturnValue(of(populatedCart));
    await store.loadCart();

    const slow = new Subject<CartResponse>();
    const newer: CartResponse = {
      ...populatedCart,
      items: populatedCart.items.map((item) =>
        item.productId === 102 ? { ...item, quantity: 2, lineTotal: money(100) } : item,
      ),
      total: money(400),
    };

    api.updateCartItemQuantity.mockReturnValueOnce(slow).mockReturnValueOnce(of(newer));

    const first = store.updateQuantity(101, 3);
    await Promise.resolve();
    expect(api.updateCartItemQuantity).toHaveBeenCalledTimes(1);

    const second = store.updateQuantity(102, 2);
    await Promise.resolve();
    expect(api.updateCartItemQuantity).toHaveBeenCalledTimes(1);

    const stale: CartResponse = {
      ...populatedCart,
      items: populatedCart.items.map((item) =>
        item.productId === 101 ? { ...item, quantity: 3, lineTotal: money(450) } : item,
      ),
      total: money(500),
    };
    slow.next(stale);
    slow.complete();

    await Promise.all([first, second]);

    expect(api.updateCartItemQuantity).toHaveBeenCalledTimes(2);
    expect(store.cart()).toEqual(newer);
    expect(store.total()).toEqual(money(400));
  });

  it('resets all in-memory state on sign-out', async () => {
    api.getCart.mockReturnValue(of(populatedCart));

    isAuthenticatedSignal.set(true);
    TestBed.flushEffects();

    await vi.waitFor(() => {
      expect(store.cart()).toEqual(populatedCart);
    });

    isAuthenticatedSignal.set(false);
    TestBed.flushEffects();

    expect(store.cart()).toBeNull();
    expect(store.items()).toEqual([]);
    expect(store.totalItemCount()).toBe(0);
    expect(store.status()).toBe('uninitialized');
    expect(store.error()).toBeNull();
    expect(store.notice()).toBeNull();
  });
});
