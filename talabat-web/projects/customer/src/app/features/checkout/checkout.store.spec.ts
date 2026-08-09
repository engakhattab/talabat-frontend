import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AddressDto, CheckoutApiService, ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { ProfileStore } from '../../core/profile/profile.store';
import { CartStore } from '../cart/cart.store';
import { CheckoutStore, isCheckoutUnavailableResponse } from './checkout.store';

describe('CheckoutStore', () => {
  let store: CheckoutStore;
  let checkoutApi: { checkout: ReturnType<typeof vi.fn> };
  let cartStore: {
    isEmpty: ReturnType<typeof signal<boolean>>;
    applyEmptyCart: ReturnType<typeof vi.fn>;
    loadCart: ReturnType<typeof vi.fn>;
  };
  let profileSignal: ReturnType<typeof signal<ProfileResponse | null>>;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  const address = (overrides: Partial<AddressDto>): AddressDto => ({
    id: 1,
    street: '10 Talaat Harb',
    city: 'Cairo',
    buildingNumber: '12',
    floor: '3',
    isDefault: false,
    ...overrides,
  });

  const profile = (addresses: AddressDto[]): ProfileResponse => ({
    id: 12,
    fullName: 'Test User',
    age: 25,
    phoneNumber: null,
    addresses,
  });

  beforeEach(() => {
    checkoutApi = { checkout: vi.fn() };
    cartStore = {
      isEmpty: signal(false),
      applyEmptyCart: vi.fn(),
      loadCart: vi.fn(),
    };
    profileSignal = signal(profile([address({ id: 1 }), address({ id: 2, isDefault: true })]));
    router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        CheckoutStore,
        { provide: CheckoutApiService, useValue: checkoutApi },
        {
          provide: CartStore,
          useValue: {
            isEmpty: cartStore.isEmpty.asReadonly(),
            applyEmptyCart: cartStore.applyEmptyCart,
            loadCart: cartStore.loadCart,
          },
        },
        {
          provide: ProfileStore,
          useValue: {
            profile: profileSignal.asReadonly(),
          },
        },
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(CheckoutStore);
  });

  it('pre-selects the default saved address', () => {
    expect(store.selectedAddressId()).toBe(2);
    expect(store.selectedAddress()?.id).toBe(2);
    expect(store.hasSavedAddresses()).toBe(true);
  });

  it('falls back to the first saved address when none is default', () => {
    profileSignal.set(profile([address({ id: 1 })]));
    expect(store.selectedAddressId()).toBe(1);
  });

  it('exposes no selected address when there are no saved addresses', () => {
    profileSignal.set(profile([]));
    expect(store.selectedAddressId()).toBeNull();
    expect(store.hasSavedAddresses()).toBe(false);
    expect(store.canSubmit()).toBe(false);
  });

  it('selects an address explicitly', () => {
    store.selectAddress(1);
    expect(store.selectedAddressId()).toBe(1);
  });

  it('falls back to the default address when the selected override is removed', () => {
    store.selectAddress(1);
    expect(store.selectedAddressId()).toBe(1);

    profileSignal.set(profile([address({ id: 2, isDefault: true })]));

    expect(store.selectedAddressId()).toBe(2);
    expect(store.selectedAddress()?.id).toBe(2);
  });

  it('retains a valid override that still exists in the profile', () => {
    store.selectAddress(1);
    expect(store.selectedAddressId()).toBe(1);

    profileSignal.set(profile([address({ id: 1 }), address({ id: 3, isDefault: true })]));

    expect(store.selectedAddressId()).toBe(1);
    expect(store.selectedAddress()?.id).toBe(1);
  });

  it('rejects selection while a submission is in flight', async () => {
    const pending = new Subject<{ orderId: number }>();
    checkoutApi.checkout.mockReturnValue(pending);

    const promise = store.submitOrder();
    await Promise.resolve();
    expect(store.isSubmitting()).toBe(true);

    store.selectAddress(1);
    expect(store.selectedAddressId()).toBe(2);

    pending.next({ orderId: 42 });
    pending.complete();
    await promise;
  });

  it('does nothing on submit without a selected address', async () => {
    profileSignal.set(profile([]));

    await store.submitOrder();

    expect(checkoutApi.checkout).not.toHaveBeenCalled();
    expect(store.isSubmitting()).toBe(false);
  });

  it('does nothing on submit while the cart is empty', async () => {
    cartStore.isEmpty.set(true);

    await store.submitOrder();

    expect(checkoutApi.checkout).not.toHaveBeenCalled();
  });

  it('submits with the selected delivery address and locks the trigger', async () => {
    store.selectAddress(1);
    const pending = new Subject<{ orderId: number }>();
    checkoutApi.checkout.mockReturnValue(pending);

    const promise = store.submitOrder();
    await Promise.resolve();

    expect(store.isSubmitting()).toBe(true);
    expect(checkoutApi.checkout).toHaveBeenCalledWith({
      checkoutRequest: { deliveryAddressId: 1 },
    });

    pending.next({ orderId: 1042 });
    pending.complete();
    await promise;
  });

  it('on HTTP 201 resets the cart, records orderId, and navigates to the order', async () => {
    checkoutApi.checkout.mockReturnValue(of({ orderId: 1042 }));

    await store.submitOrder();

    expect(store.orderId()).toBe(1042);
    expect(cartStore.applyEmptyCart).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/orders/1042');
    expect(store.isSubmitting()).toBe(false);
  });

  it('ignores a second submit while the first is in flight', async () => {
    const pending = new Subject<{ orderId: number }>();
    checkoutApi.checkout.mockReturnValue(pending);

    const first = store.submitOrder();
    await Promise.resolve();
    const second = store.submitOrder();
    await Promise.resolve();

    expect(checkoutApi.checkout).toHaveBeenCalledTimes(1);

    pending.next({ orderId: 1 });
    pending.complete();
    await Promise.all([first, second]);
  });

  it('extracts unavailableItems from a typed HTTP 422 and recovers to the cart', async () => {
    const unavailable: AppError = {
      status: 422,
      code: AppErrorCode.Unknown,
      title: 'Something went wrong',
      isNetworkError: false,
      rawError: {
        status: 'unavailable',
        unavailableItems: [
          { productId: 12, productName: 'Chicken Shawarma Deluxe', reason: 'Out of stock' },
        ],
      },
    };
    checkoutApi.checkout.mockReturnValue(throwError(() => unavailable));

    await store.submitOrder();

    expect(store.unavailableItems()).toHaveLength(1);
    expect(store.unavailableItems()[0]!.productName).toBe('Chicken Shawarma Deluxe');
    expect(store.notice()?.kind).toBe('unavailable-items');
    expect(cartStore.loadCart).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/cart');
    expect(store.isSubmitting()).toBe(false);
  });

  it('keeps a malformed HTTP 422 body safe and falls back to the ambiguous-error path', async () => {
    const unavailable: AppError = {
      status: 422,
      code: AppErrorCode.Unknown,
      title: 'Something went wrong',
      isNetworkError: false,
      rawError: { unexpected: 'shape' },
    };
    checkoutApi.checkout.mockReturnValue(throwError(() => unavailable));

    await store.submitOrder();

    expect(store.unavailableItems()).toEqual([]);
    expect(store.notice()?.kind).toBe('network');
    expect(cartStore.loadCart).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(store.isSubmitting()).toBe(false);
  });

  it('shows an ambiguous-order notice on network failure without navigating', async () => {
    const network: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
    checkoutApi.checkout.mockReturnValue(throwError(() => network));

    await store.submitOrder();

    expect(store.notice()?.kind).toBe('network');
    expect(store.notice()?.title).toContain('could not confirm');
    expect(cartStore.applyEmptyCart).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(store.isSubmitting()).toBe(false);
  });

  it('surfaces a domain Problem Details error as a general notice', async () => {
    const cartExpired: AppError = {
      status: 409,
      code: AppErrorCode.CartExpired,
      title: 'Your cart has expired',
      detail: 'Your cart has expired. Add items and try again.',
      isNetworkError: false,
    };
    checkoutApi.checkout.mockReturnValue(throwError(() => cartExpired));

    await store.submitOrder();

    expect(store.notice()?.kind).toBe('general');
    expect(store.notice()?.title).toBe('Your cart has expired');
    expect(cartStore.applyEmptyCart).not.toHaveBeenCalled();
  });

  it('clears submission state', () => {
    store.selectAddress(1);
    checkoutApi.checkout.mockReturnValue(of({ orderId: 1 }));
    void store.submitOrder();

    store.clearSubmission();

    expect(store.selectedAddressId()).toBe(2);
    expect(store.unavailableItems()).toEqual([]);
    expect(store.notice()).toBeNull();
    expect(store.orderId()).toBeNull();
  });

  describe('isCheckoutUnavailableResponse type guard', () => {
    it('accepts a valid checkout unavailable payload', () => {
      expect(
        isCheckoutUnavailableResponse({
          status: 'unavailable',
          unavailableItems: [{ productId: 1, productName: 'X', reason: 'Out of stock' }],
        }),
      ).toBe(true);
    });

    it('accepts an empty unavailableItems array', () => {
      expect(isCheckoutUnavailableResponse({ status: 'unavailable', unavailableItems: [] })).toBe(
        true,
      );
    });

    it('rejects null and primitive values', () => {
      expect(isCheckoutUnavailableResponse(null)).toBe(false);
      expect(isCheckoutUnavailableResponse('string')).toBe(false);
      expect(isCheckoutUnavailableResponse(42)).toBe(false);
    });

    it('rejects payloads missing the unavailableItems collection', () => {
      expect(isCheckoutUnavailableResponse({ status: 'unavailable' })).toBe(false);
    });

    it('rejects a non-array unavailableItems', () => {
      expect(isCheckoutUnavailableResponse({ unavailableItems: 'nope' })).toBe(false);
    });

    it('rejects items with invalid consumed fields', () => {
      expect(
        isCheckoutUnavailableResponse({
          unavailableItems: [{ productId: 'x', productName: 'X', reason: 'r' }],
        }),
      ).toBe(false);
      expect(
        isCheckoutUnavailableResponse({
          unavailableItems: [{ productId: 1, productName: 2, reason: 'r' }],
        }),
      ).toBe(false);
      expect(
        isCheckoutUnavailableResponse({
          unavailableItems: [{ productId: 1, productName: 'X', reason: null }],
        }),
      ).toBe(false);
    });
  });
});
