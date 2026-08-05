import { Component, computed, inject, resource } from '@angular/core';
import { CatalogApiService, RestaurantListResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { EmptyStateComponent, ErrorStateComponent, SpinnerComponent } from '@talabat/shared-ui';
import { firstValueFrom } from 'rxjs';

import { RestaurantCardComponent } from '../components/restaurant-card.component';

@Component({
  selector: 'tal-restaurant-list-page',
  imports: [EmptyStateComponent, ErrorStateComponent, RestaurantCardComponent, SpinnerComponent],
  template: `
    <main class="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-9 lg:px-9">
      <header class="mb-6 max-w-2xl sm:mb-9">
        <p class="mb-1 text-sm font-semibold tracking-wide text-food-secondary">Food delivery</p>
        <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
          Restaurants
        </h1>
        <p class="mt-2 text-sm leading-6 text-food-muted">
          Choose a restaurant and explore what is available today.
        </p>
      </header>

      @if (restaurants.isLoading()) {
        <div class="grid min-h-56 place-items-center rounded-food-md bg-white shadow-food-sm">
          <tal-spinner label="Loading restaurants" />
        </div>
      } @else if (restaurantError(); as error) {
        <tal-error-state
          [description]="error.detail ?? 'Check your connection and try again.'"
          [title]="error.title"
          (retry)="retryRestaurants()"
        />
      } @else if (restaurants.value(); as response) {
        @if (response.items.length === 0) {
          <tal-empty-state
            description="There are no restaurants available right now. Please check again shortly."
            title="No restaurants available"
          />
        } @else {
          <ul
            class="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
            role="list"
          >
            @for (restaurant of response.items; track restaurant.id) {
              <li><tal-restaurant-card [restaurant]="restaurant" /></li>
            }
          </ul>
        }
      } @else {
        <tal-empty-state
          description="There are no restaurants available right now. Please check again shortly."
          title="No restaurants available"
        />
      }
    </main>
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

  protected retryRestaurants(): void {
    this.restaurants.reload();
  }

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
