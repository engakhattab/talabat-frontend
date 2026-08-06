import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { CatalogApiService, MenuResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

import { RestaurantMenuPage } from './restaurant-menu.page';

describe('RestaurantMenuPage', () => {
  let component: RestaurantMenuPage;
  let fixture: ComponentFixture<RestaurantMenuPage>;
  let api: { getRestaurantMenu: ReturnType<typeof vi.fn> };

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
  });

  function createPage(restaurantId: string) {
    TestBed.configureTestingModule({
      imports: [RestaurantMenuPage],
      providers: [
        provideRouter([]),
        { provide: CatalogApiService, useValue: api },
        {
          provide: AuthStore,
          useValue: {
            user: signal(null).asReadonly(),
            isAuthenticated: signal(false).asReadonly(),
            busy: signal(false).asReadonly(),
            initialized: signal(true).asReadonly(),
            signIn: vi.fn().mockResolvedValue(undefined),
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
});
