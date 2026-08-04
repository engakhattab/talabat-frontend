import { Component, computed, inject, resource } from '@angular/core';
import { CatalogApiService, RestaurantListResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'tal-restaurant-list-page',
  template: `
    <h1>Restaurants</h1>

    @if (restaurants.isLoading()) {
      <p>Loading...</p>
    } @else if (restaurantError(); as error) {
      <p role="alert">{{ error.title }}</p>
    } @else if (restaurants.value(); as response) {
      @if (response.items.length === 0) {
        <p>No restaurants available.</p>
      } @else {
        <ul>
          @for (restaurant of response.items; track restaurant.id) {
            <li>
              <strong>{{ restaurant.name }}</strong>
              <span>{{ restaurant.description }}</span>
            </li>
          }
        </ul>
      }
    } @else {
      <p>No restaurants available.</p>
    }
  `,
})
export class RestaurantListPage {
  private readonly api = inject(CatalogApiService);

  readonly restaurants = resource({
    loader: () => this.loadRestaurants(),
  });

  readonly restaurantError = computed<AppError | undefined>(() => {
    const error = this.restaurants.error();
    if (!error) return undefined;

    return isAppError(error)
      ? error
      : {
          status: 0,
          code: AppErrorCode.Unknown,
          title: 'Something went wrong',
          isNetworkError: false,
        };
  });

  private async loadRestaurants(): Promise<RestaurantListResponse> {
    try {
      return await firstValueFrom(this.api.getRestaurants());
    } catch (error: unknown) {
      throw toResourceError(error);
    }
  }
}

function toResourceError(error: unknown): Error {
  if (!isAppError(error)) return new Error('Something went wrong');

  return Object.assign(new Error(error.title), error);
}

function isAppError(error: unknown): error is AppError {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as Partial<AppError>;
  return (
    typeof candidate.status === 'number' &&
    typeof candidate.code === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.isNetworkError === 'boolean'
  );
}
