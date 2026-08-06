import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { CartResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { DialogService } from '@talabat/shared-ui';

import { CartPage } from './cart.page';
import { CartNotice, CartStore } from '../cart.store';

describe('CartPage', () => {
  let fixture: ComponentFixture<CartPage>;
  let dialog: { openSheet: ReturnType<typeof vi.fn>; openModal: ReturnType<typeof vi.fn> };
  let harness: ReturnType<typeof createStoreHarness>;

  const emptyCart: CartResponse = {
    id: null,
    customerId: 12,
    restaurantId: null,
    status: 'Empty',
    items: [],
    total: { amount: 0, currency: 'EGP' },
  };

  const populatedCart: CartResponse = {
    id: 1,
    customerId: 12,
    restaurantId: 5,
    status: 'Active',
    items: [
      {
        productId: 101,
        productName: 'Super Chicken Burger',
        unitPrice: { amount: 150, currency: 'EGP' },
        quantity: 2,
        lineTotal: { amount: 300, currency: 'EGP' },
      },
    ],
    total: { amount: 300, currency: 'EGP' },
  };

  beforeEach(() => {
    dialog = { openSheet: vi.fn(), openModal: vi.fn() };
    harness = createStoreHarness();

    TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        { provide: CartStore, useValue: harness.store },
        { provide: DialogService, useValue: dialog },
      ],
    });
  });

  function createPage(): void {
    fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
  }

  it('renders the loading state', () => {
    harness.setStatus('loading');
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Loading your cart');
  });

  it('renders the error state with a retry action', async () => {
    harness.setStatus('error');
    harness.setError({
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    });
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Cannot reach the server');

    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Try again')) as HTMLButtonElement;
    button.click();

    expect(harness.store.reload).toHaveBeenCalled();
  });

  it('renders the empty state with a browse action', () => {
    harness.setStatus('loaded');
    harness.setCart(emptyCart);
    createPage();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    expect(fixture.nativeElement.textContent).toContain('Your cart is empty');

    const browseButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Browse restaurants')) as HTMLButtonElement;
    browseButton.click();

    expect(navigateSpy).toHaveBeenCalledWith('/restaurants');
  });

  it('renders the populated state with authoritative line and grand totals', () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Super Chicken Burger');
    expect(fixture.nativeElement.textContent).toContain('Order total');
    expect(fixture.nativeElement.textContent).toContain('300');
    expect(fixture.nativeElement.textContent).toContain('Proceed to Checkout');
  });

  it('increments quantity via the store', () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    createPage();

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Increase quantity of Super Chicken Burger"]',
    ) as HTMLButtonElement;
    button.click();

    expect(harness.store.updateQuantity).toHaveBeenCalledWith(101, 3);
  });

  it('decrements quantity via the store', () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    createPage();

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Decrease quantity of Super Chicken Burger"]',
    ) as HTMLButtonElement;
    button.click();

    expect(harness.store.updateQuantity).toHaveBeenCalledWith(101, 1);
  });

  it('removes a line item via the store', () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    createPage();

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Remove Super Chicken Burger from cart"]',
    ) as HTMLButtonElement;
    button.click();

    expect(harness.store.removeItem).toHaveBeenCalledWith(101);
  });

  it('clears the cart only after dialog confirmation', async () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    createPage();

    const closed = new Subject<boolean>();
    dialog.openSheet.mockReturnValue({ closed: closed.asObservable() });

    const clearButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Clear Cart')) as HTMLButtonElement;
    clearButton.click();

    expect(dialog.openSheet).toHaveBeenCalled();

    closed.next(true);
    closed.complete();
    await fixture.whenStable();

    expect(harness.store.clearCart).toHaveBeenCalled();
  });

  it('keeps the cart when the clear confirmation is dismissed', async () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    createPage();

    const closed = new Subject<boolean>();
    dialog.openSheet.mockReturnValue({ closed: closed.asObservable() });

    const clearButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Clear Cart')) as HTMLButtonElement;
    clearButton.click();

    closed.next(false);
    closed.complete();
    await fixture.whenStable();

    expect(harness.store.clearCart).not.toHaveBeenCalled();
  });

  it('renders an informational notice banner for recoverable domain errors', () => {
    harness.setStatus('loaded');
    harness.setCart(populatedCart);
    harness.setNotice({
      kind: 'product-unavailable',
      title: 'Item is no longer available',
    } satisfies CartNotice);
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Item is no longer available');
  });

  it('triggers an initial cart load when uninitialized', () => {
    harness.setStatus('uninitialized');
    createPage();

    expect(harness.store.loadCart).toHaveBeenCalled();
  });
});

function createStoreHarness() {
  const status = signal<'uninitialized' | 'loading' | 'loaded' | 'error'>('loaded');
  const cart = signal<CartResponse | null>(null);
  const error = signal<AppError | null>(null);
  const notice = signal<CartNotice | null>(null);
  const isMutating = signal(false);
  const mutatingProductId = signal<number | null>(null);

  const store = {
    status: status.asReadonly(),
    cart: cart.asReadonly(),
    items: computed(() => cart()?.items ?? []),
    isEmpty: computed(() => (cart()?.items.length ?? 0) === 0),
    total: computed(() => cart()?.total ?? null),
    totalItemCount: computed(
      () => cart()?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    ),
    error: error.asReadonly(),
    notice: notice.asReadonly(),
    isMutating: isMutating.asReadonly(),
    mutatingProductId: mutatingProductId.asReadonly(),
    loadCart: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    updateQuantity: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    clearCart: vi.fn().mockResolvedValue(undefined),
  };

  return {
    store,
    setStatus: (value: 'uninitialized' | 'loading' | 'loaded' | 'error') => status.set(value),
    setCart: (value: CartResponse | null) => cart.set(value),
    setError: (value: AppError | null) => error.set(value),
    setNotice: (value: CartNotice | null) => notice.set(value),
    setIsMutating: (value: boolean) => isMutating.set(value),
    setMutatingProductId: (value: number | null) => mutatingProductId.set(value),
  };
}
