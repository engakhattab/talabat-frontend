import { TestBed } from '@angular/core/testing';
import {
  CatalogApiService,
  RestaurantListResponse,
  RestaurantSummaryDto,
} from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { of, Subject, throwError } from 'rxjs';

import { provideRouter } from '@angular/router';

import { RestaurantListPage } from './restaurant-list.page';

describe('RestaurantListPage', () => {
  const api = {
    getRestaurants: vi.fn(),
  };

  beforeEach(async () => {
    api.getRestaurants.mockReset();

    await TestBed.configureTestingModule({
      imports: [RestaurantListPage],
      providers: [provideRouter([]), { provide: CatalogApiService, useValue: api }],
    }).compileComponents();
  });

  it('shows loading while the generated client request is pending', async () => {
    const response = new Subject<RestaurantListResponse>();
    api.getRestaurants.mockReturnValue(response);

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();

    await vi.waitFor(() => expect(api.getRestaurants).toHaveBeenCalledOnce());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading restaurants');

    response.next(emptyResponse);
    response.complete();
    await fixture.whenStable();
  });

  it('shows the typed, user-safe network error', async () => {
    const networkError: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    };
    api.getRestaurants.mockReturnValue(throwError(() => networkError));

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.restaurantError()).toMatchObject(networkError);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Cannot reach the server',
    );
    expect(fixture.nativeElement.querySelector('button')?.textContent).toContain('Try again');

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    await vi.waitFor(() => expect(api.getRestaurants).toHaveBeenCalledTimes(2));
  });

  it('renders feature-owned copy for an unknown backend error without raw text', async () => {
    const backendError: AppError = {
      status: 502,
      code: AppErrorCode.Unknown,
      title: 'Inventory burst buffer overflowed correlation 7b2f…',
      detail: 'backend token alice',
      isNetworkError: false,
    };
    api.getRestaurants.mockReturnValue(throwError(() => backendError));

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Restaurants could not be loaded');
    expect(alert.textContent).toContain('Please try again in a moment.');
    expect(alert.textContent).not.toContain('Inventory burst');
    expect(alert.textContent).not.toContain('7b2f');
    expect(alert.textContent).not.toContain('token alice');
  });

  it('shows the empty state when the API returns no restaurants', async () => {
    api.getRestaurants.mockReturnValue(of(emptyResponse));

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No restaurants available');
  });

  it('renders restaurant data returned by the generated client', async () => {
    const restaurant: RestaurantSummaryDto = {
      id: 1,
      name: 'Test Restaurant',
      description: 'Test Description',
      imageUrl: null,
      isActive: true,
    };
    api.getRestaurants.mockReturnValue(
      of({ ...emptyResponse, items: [restaurant], totalCount: 1 }),
    );

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const listItem = fixture.nativeElement.querySelector('li') as HTMLLIElement | null;
    expect(listItem?.textContent).toContain(restaurant.name);
    expect(listItem?.textContent).toContain(restaurant.description);
    expect(fixture.nativeElement.querySelector('[role="img"]')).toBeTruthy();
  });
});

const emptyResponse: RestaurantListResponse = {
  items: [],
  page: 1,
  pageSize: 20,
  totalCount: 0,
};
