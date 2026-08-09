import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { OrdersApiService, OrderDetailResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { OrderConfirmationPage } from './order-confirmation.page';

describe('OrderConfirmationPage', () => {
  let fixture: ComponentFixture<OrderConfirmationPage>;
  let component: OrderConfirmationPage;
  let api: { getOrderDetails: ReturnType<typeof vi.fn> };

  const money = (amount: number) => ({ amount, currency: 'EGP' });

  const order: OrderDetailResponse = {
    id: 1042,
    customerId: 12,
    restaurantId: 5,
    placedAt: '2026-08-06T14:30:00Z',
    deliveryAddress: {
      street: '10 Talaat Harb',
      buildingNumber: '12',
      floor: '3',
      city: 'Cairo',
    },
    items: [
      { productName: 'Super Chicken Burger', unitPrice: money(150), quantity: 2, lineTotal: money(300) },
      { productName: 'Fries', unitPrice: money(50), quantity: 1, lineTotal: money(50) },
    ],
    total: money(350),
  };

  beforeEach(async () => {
    api = { getOrderDetails: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [OrderConfirmationPage],
      providers: [{ provide: OrdersApiService, useValue: api }, provideRouter([])],
    }).compileComponents();
  });

  const createFixture = (orderId: string): ComponentFixture<OrderConfirmationPage> => {
    const created = TestBed.createComponent(OrderConfirmationPage);
    created.componentRef.setInput('orderId', orderId);
    created.detectChanges();
    component = created.componentInstance;
    fixture = created;
    return created;
  };

  it('binds route parameter orderId when navigated via router', async () => {
    const { RouterTestingHarness } = await import('@angular/router/testing');
    const { provideRouter, withComponentInputBinding } = await import('@angular/router');
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [OrderConfirmationPage],
      providers: [
        { provide: OrdersApiService, useValue: api },
        provideRouter([{ path: 'orders/:orderId', component: OrderConfirmationPage }], withComponentInputBinding()),
      ],
    }).compileComponents();

    api.getOrderDetails.mockReturnValue(of(order));
    const harness = await RouterTestingHarness.create();
    const instance = await harness.navigateByUrl('/orders/7', OrderConfirmationPage);
    harness.detectChanges();

    expect(api.getOrderDetails).toHaveBeenCalledWith({ orderId: 7 });
    expect(instance.viewState()).toBe('loaded');
  });

  it('extracts the order id from the route param and fetches order details', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');

    await Promise.resolve();
    fixture.detectChanges();

    expect(api.getOrderDetails).toHaveBeenCalledWith({ orderId: 1042 });
    expect(component.viewState()).toBe('loaded');
  });

  it('shows a loading skeleton while fetching', async () => {
    const pending = new Subject<OrderDetailResponse>();
    api.getOrderDetails.mockReturnValue(pending);

    fixture = createFixture('1042');

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Loading your order');

    pending.next(order);
    pending.complete();
    await Promise.resolve();
    fixture.detectChanges();
  });

  it('renders the order id, placement timestamp, and COD payment method', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('h1').textContent?.trim()).toBe('Order Details');
    expect(text).toContain('Order #1042');
    expect(text).toContain('Cash on Delivery');
    expect(text).toContain('2026');
  });

  it('renders Back to orders and Back to restaurants navigation links', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    const anchors = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    const backToOrders = anchors.find((a) => a.textContent?.includes('Back to orders'));
    const backToRestaurants = anchors.find((a) => a.textContent?.includes('Back to restaurants'));

    expect(backToOrders).toBeDefined();
    expect(backToOrders?.getAttribute('href')).toBe('/orders');
    expect(backToRestaurants).toBeDefined();
    expect(backToRestaurants?.getAttribute('href')).toBe('/restaurants');
  });

  it('renders the delivery address snapshot', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('10 Talaat Harb');
    expect(text).toContain('Building 12');
    expect(text).toContain('Floor 3');
    expect(text).toContain('Cairo');
  });

  it('renders line items with quantity, unit price, and line totals', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Super Chicken Burger');
    expect(text).toContain('2 × EGP\u00A0150.00');
    expect(text).toContain('Fries');
    expect(text).toContain('1 × EGP\u00A050.00');
  });

  it('renders the grand total from the server', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('EGP\u00A0350.00');
  });

  it('handles HTTP 404 by showing an order-not-found error without a retry', async () => {
    const notFound: AppError = {
      status: 404,
      code: AppErrorCode.Unknown,
      title: 'Order not found',
      isNetworkError: false,
    };
    api.getOrderDetails.mockReturnValue(throwError(() => notFound));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('We could not find this order for your account.');
    expect(component.canRetry()).toBe(false);
  });

  it('shows an invalid-order error for a non-numeric order id', async () => {
    fixture = createFixture('not-a-number');
    await Promise.resolve();
    fixture.detectChanges();

    expect(api.getOrderDetails).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Order not found');
  });

  it('offers a retry for transient errors', async () => {
    const network: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
    api.getOrderDetails.mockReturnValueOnce(throwError(() => network));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    expect(component.canRetry()).toBe(true);

    api.getOrderDetails.mockReturnValueOnce(of(order));
    const retryButton = fixture.nativeElement.querySelector('tal-button button') as HTMLElement;
    retryButton.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(api.getOrderDetails).toHaveBeenCalledTimes(2);
    expect(component.viewState()).toBe('loaded');
  });

  it('reload safety: re-rendering the page re-issues only the GET request', async () => {
    api.getOrderDetails.mockReturnValue(of(order));

    fixture = createFixture('1042');
    await Promise.resolve();
    fixture.detectChanges();

    fixture.destroy();

    const reloaded = createFixture('1042');
    await Promise.resolve();
    reloaded.detectChanges();

    expect(api.getOrderDetails).toHaveBeenCalledTimes(2);
    expect(api.getOrderDetails).toHaveBeenNthCalledWith(2, { orderId: 1042 });
  });
});
