import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CatalogApiService, MenuResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

import { RestaurantMenuPage } from './restaurant-menu.page';
import { CartStore } from '../../cart/cart.store';
import { CartEntryCoordinator } from '../../../core/cart-entry/cart-entry-coordinator.service';

describe('RestaurantMenuPage', () => {
  let component: RestaurantMenuPage;
  let fixture: ComponentFixture<RestaurantMenuPage>;
  let api: { getRestaurantMenu: ReturnType<typeof vi.fn> };
  let coordinator: { handle: ReturnType<typeof vi.fn> };
  let cartStore: {
    isMutating: import('@angular/core').Signal<boolean>;
    mutatingProductId: import('@angular/core').Signal<number | null>;
    totalItemCount: import('@angular/core').Signal<number>;
  };
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;
  let signInSpy: ReturnType<typeof vi.fn>;

  const menuResponse: MenuResponse = {
    restaurantId: 1,
    restaurantName: 'Test Restaurant',
    products: [
      {
        id: 1,
        name: 'Burger',
        description: 'A burger',
        price: { amount: 50, currency: 'EGP' },
        isAvailable: true,
      },
      {
        id: 2,
        name: 'Pizza',
        description: 'A pizza',
        price: { amount: 75, currency: 'EGP' },
        isAvailable: false,
      },
    ],
  };

  beforeEach(() => {
    api = { getRestaurantMenu: vi.fn() };
    coordinator = { handle: vi.fn().mockResolvedValue('added') };
    cartStore = {
      isMutating: signal(false).asReadonly(),
      mutatingProductId: signal(null).asReadonly(),
      totalItemCount: signal(0).asReadonly(),
    };
    isAuthenticatedSignal = signal(true);
    signInSpy = vi.fn().mockResolvedValue(undefined);
  });

  function createPage(restaurantId: string) {
    TestBed.configureTestingModule({
      imports: [RestaurantMenuPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
        { provide: CartEntryCoordinator, useValue: coordinator },
        { provide: CartStore, useValue: cartStore },
        {
          provide: AuthStore,
          useValue: {
            user: signal(null).asReadonly(),
            isAuthenticated: isAuthenticatedSignal.asReadonly(),
            busy: signal(false).asReadonly(),
            initialized: signal(true).asReadonly(),
            signIn: signInSpy,
            signOut: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(RestaurantMenuPage);
    fixture.componentRef.setInput('restaurantId', restaurantId);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows loading while menu is loading', () => {
    const subject = new Subject<MenuResponse>();
    api.getRestaurantMenu.mockReturnValue(subject);

    createPage('1');

    expect(fixture.nativeElement.textContent).toContain('Loading menu');
  });

  it('renders populated menu', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Test Restaurant');
    expect(fixture.nativeElement.textContent).toContain('Burger');
    expect(fixture.nativeElement.textContent).toContain('Unavailable');
  });

  it('shows not-found for invalid restaurant ID', async () => {
    createPage('invalid');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restaurant not found');
    expect(api.getRestaurantMenu).not.toHaveBeenCalled();
  });

  it('shows not-found for non-existent restaurant', async () => {
    const error: AppError = { status: 404, code: AppErrorCode.RestaurantNotFound, title: 'Not found', isNetworkError: false };
    api.getRestaurantMenu.mockReturnValue(throwError(() => error));

    createPage('999');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restaurant not found');
  });

  it('shows empty state when no products', async () => {
    api.getRestaurantMenu.mockReturnValue(of({ restaurantId: 1, restaurantName: 'Empty', products: [] }));

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No items available');
  });

  it('shows retryable error for network failure', async () => {
    const error: AppError = { status: 0, code: AppErrorCode.Unknown, title: 'Network error', isNetworkError: true };
    api.getRestaurantMenu.mockReturnValue(throwError(() => error));

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Try again');
  });

  it('delegates an add-to-cart click to the cart coordinator', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Add to cart')) as HTMLButtonElement;
    addButton.click();

    expect(coordinator.handle).toHaveBeenCalledWith({ restaurantId: 1, productId: 1 });
  });

  it('shows success feedback after a confirmed add', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));
    coordinator.handle.mockResolvedValue('added');

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Add to cart')) as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Added to your cart');
  });

  it('shows success feedback after a cross-restaurant clear-and-add resolution', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));
    coordinator.handle.mockResolvedValue('conflict-resolved');

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Add to cart')) as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Added to your cart');
  });

  it('does not show success feedback when the addition fails', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));
    coordinator.handle.mockResolvedValue('error');

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Add to cart')) as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Added to your cart');
  });

  it('starts authentication when an anonymous customer adds to cart', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));
    isAuthenticatedSignal.set(false);
    coordinator.handle.mockResolvedValue('authentication-started');

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    const addButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes('Add to cart')) as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();

    expect(signInSpy).toHaveBeenCalled();
  });

  it('disables the add control for unavailable products', async () => {
    api.getRestaurantMenu.mockReturnValue(of(menuResponse));

    createPage('1');
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const unavailable = Array.from(buttons).find((b) => b.textContent?.includes('Unavailable'));
    expect(unavailable?.disabled).toBe(true);
  });
});
