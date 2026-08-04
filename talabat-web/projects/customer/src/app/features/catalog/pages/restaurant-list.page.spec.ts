import { TestBed } from '@angular/core/testing';
import {
  CatalogApiService,
  RestaurantListResponse,
  RestaurantSummaryDto,
} from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { of, Subject, throwError } from 'rxjs';

import { RestaurantListPage } from './restaurant-list.page';

describe('RestaurantListPage', () => {
  const api = {
    getRestaurants: vi.fn(),
  };

  beforeEach(async () => {
    api.getRestaurants.mockReset();

    await TestBed.configureTestingModule({
      imports: [RestaurantListPage],
      providers: [{ provide: CatalogApiService, useValue: api }],
    }).compileComponents();
  });

  it('shows loading while the generated client request is pending', async () => {
    const response = new Subject<RestaurantListResponse>();
    api.getRestaurants.mockReturnValue(response);

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();

    await vi.waitFor(() => expect(api.getRestaurants).toHaveBeenCalledOnce());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading...');

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
  });

  it('shows the empty state when the API returns no restaurants', async () => {
    api.getRestaurants.mockReturnValue(of(emptyResponse));

    const fixture = TestBed.createComponent(RestaurantListPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No restaurants available.');
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
  });
});

const emptyResponse: RestaurantListResponse = {
  items: [],
  page: 1,
  pageSize: 20,
  totalCount: 0,
};
