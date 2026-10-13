import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { OrdersApiService, OrderListResponse, OrderSummaryDto } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { OrdersPage } from './orders.page';

describe('OrdersPage', () => {
  let fixture: ComponentFixture<OrdersPage>;
  let component: OrdersPage;
  const api = {
    getOrders: vi.fn(),
  };

  const money = (amount: number) => ({ amount, currency: 'EGP' });

  const order7: OrderSummaryDto = {
    id: 7,
    restaurantId: 5,
    placedAt: '2026-08-06T14:30:00Z',
    itemCount: 2,
    total: money(350),
  };
  const order8: OrderSummaryDto = {
    id: 8,
    restaurantId: 5,
    placedAt: '2026-08-05T12:00:00Z',
    itemCount: 0,
    total: money(50),
  };

  const pageOneResponse: OrderListResponse = {
    items: [order7, order8],
    page: 1,
    pageSize: 10,
    totalCount: 13,
  };
  const pageTwoResponse: OrderListResponse = {
    items: [order8],
    page: 2,
    pageSize: 10,
    totalCount: 13,
  };
  const emptyResponse: OrderListResponse = {
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
  };

  const waitForLoadedPage = async (page: number): Promise<void> => {
    await vi.waitFor(() => expect(component.orders.value()?.page).toBe(page));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    api.getOrders.mockReset();

    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideRouter([]), { provide: OrdersApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersPage);
    component = fixture.componentInstance;
  });

  it('shows a loading spinner while the order list request is pending', async () => {
    const pending = new Subject<OrderListResponse>();
    api.getOrders.mockReturnValue(pending);

    fixture.detectChanges();
    await vi.waitFor(() => expect(api.getOrders).toHaveBeenCalledOnce());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading your orders');
    expect(api.getOrders).toHaveBeenCalledWith({ page: 1, pageSize: 10 });

    pending.next(pageOneResponse);
    pending.complete();
    await fixture.whenStable();
  });

  it('renders order summary cards with id, date, item count, and total', async () => {
    api.getOrders.mockReturnValue(of(pageOneResponse));

    fixture.detectChanges();
    await waitForLoadedPage(1);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Order #7');
    expect(text).toContain('Order #8');
    expect(text).toContain('2026');
    expect(text).toContain('2 items');
    expect(text).toContain('0 items');
    expect(text).toContain('EGP\u00A0350.00');
    expect(text).toContain('EGP\u00A050.00');
  });

  it('shows the empty state with a browse action when there are no orders', async () => {
    api.getOrders.mockReturnValue(of(emptyResponse));

    fixture.detectChanges();
    await waitForLoadedPage(1);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('No orders yet');
    expect(text).toContain('You have not placed any orders yet. Browse restaurants to get started.');
    expect(text).toContain('Browse restaurants');
  });

  it('shows the typed, user-safe error and retries the request', async () => {
    const networkError: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
    api.getOrders.mockReturnValueOnce(throwError(() => networkError));
    api.getOrders.mockReturnValueOnce(of(pageOneResponse));

    fixture.detectChanges();
    await vi.waitFor(() => expect(component.ordersError()).toBeDefined());
    fixture.detectChanges();

    expect(component.ordersError()).toMatchObject(networkError);

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Cannot reach the server');
    expect(alert.textContent).toContain('Check your connection and try again.');

    (alert.querySelector('button') as HTMLButtonElement).click();
    await waitForLoadedPage(1);

    expect(api.getOrders).toHaveBeenCalledTimes(2);
    expect(api.getOrders).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 });
    expect(fixture.nativeElement.textContent).toContain('Order #7');
  });

  it('renders feature-owned copy for a known domain error without raw text', async () => {
    const domainError: AppError = {
      status: 409,
      code: AppErrorCode.RestaurantInactive,
      title: 'Suspension',
      detail: 'chain suspended correlation 9f31',
      isNetworkError: false,
    };
    api.getOrders.mockReturnValueOnce(throwError(() => domainError));

    fixture.detectChanges();
    await vi.waitFor(() => expect(component.ordersError()).toBeDefined());
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Your orders could not be loaded');
    expect(alert.textContent).toContain('Please try again in a moment.');
    expect(alert.textContent).not.toContain('Suspension');
    expect(alert.textContent).not.toContain('chain suspended');
    expect(alert.textContent).not.toContain('9f31');
  });

  it('paginates: shows page context, disables boundaries, and refetches on navigation', async () => {
    api.getOrders.mockReturnValueOnce(of(pageOneResponse));
    api.getOrders.mockReturnValueOnce(of(pageTwoResponse));
    api.getOrders.mockReturnValueOnce(of(pageOneResponse));

    fixture.detectChanges();
    await waitForLoadedPage(1);

    expect(fixture.nativeElement.textContent).toContain('Page 1 of 2');

    const previous = fixture.nativeElement.querySelector(
      'button[aria-label="Previous page"]',
    ) as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector(
      'button[aria-label="Next page"]',
    ) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    next.click();
    await waitForLoadedPage(2);

    expect(component.currentPage()).toBe(2);
    expect(api.getOrders).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 });
    expect(fixture.nativeElement.textContent).toContain('Page 2 of 2');

    const previousAfter = fixture.nativeElement.querySelector(
      'button[aria-label="Previous page"]',
    ) as HTMLButtonElement;
    const nextAfter = fixture.nativeElement.querySelector(
      'button[aria-label="Next page"]',
    ) as HTMLButtonElement;
    expect(previousAfter.disabled).toBe(false);
    expect(nextAfter.disabled).toBe(true);

    previousAfter.click();
    await waitForLoadedPage(1);

    expect(component.currentPage()).toBe(1);
    expect(api.getOrders).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 });
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 2');
  });

  it('resets to page 1 when a later page comes back empty', async () => {
    api.getOrders.mockReturnValueOnce(of(pageOneResponse));
    api.getOrders.mockReturnValueOnce(of({ ...emptyResponse, page: 2, totalCount: 3 }));
    api.getOrders.mockReturnValueOnce(of(pageOneResponse));

    fixture.detectChanges();
    await waitForLoadedPage(1);

    const next = fixture.nativeElement.querySelector(
      'button[aria-label="Next page"]',
    ) as HTMLButtonElement;
    next.click();

    await vi.waitFor(() => expect(component.currentPage()).toBe(1));
    await vi.waitFor(() => expect(api.getOrders).toHaveBeenCalledTimes(3));
    await waitForLoadedPage(1);

    expect(api.getOrders).toHaveBeenLastCalledWith({ page: 1, pageSize: 10 });
    expect(fixture.nativeElement.textContent).toContain('Order #7');
    expect(fixture.nativeElement.textContent).toContain('Page 1 of 2');
  });

  it('links each order card to its detail route', async () => {
    api.getOrders.mockReturnValue(of(pageOneResponse));

    fixture.detectChanges();
    await waitForLoadedPage(1);

    const anchors = fixture.nativeElement.querySelectorAll('li a');
    expect(anchors.length).toBe(2);
    expect((anchors[0] as HTMLAnchorElement).getAttribute('href')).toBe('/orders/7');
    expect((anchors[1] as HTMLAnchorElement).getAttribute('href')).toBe('/orders/8');
  });

  it('navigates to /restaurants when the empty-state action is pressed', async () => {
    const router = TestBed.inject(Router);
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    api.getOrders.mockReturnValue(of(emptyResponse));

    fixture.detectChanges();
    await waitForLoadedPage(1);

    expect(fixture.nativeElement.textContent).toContain('No orders yet');

    const browseButton = fixture.nativeElement.querySelector(
      'tal-empty-state button',
    ) as HTMLButtonElement;
    browseButton.click();

    expect(navigateByUrl).toHaveBeenCalledWith('/restaurants');
  });
});
