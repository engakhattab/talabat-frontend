import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { OrdersApiService, OrderListResponse, OrderSummaryDto } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { ButtonComponent, EmptyStateComponent, ErrorStateComponent, SpinnerComponent } from '@talabat/shared-ui';
import { formatDateTime, MoneyPipe } from '@talabat/shared-util';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'tal-orders-page',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MoneyPipe,
    RouterLink,
    SpinnerComponent,
  ],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Your Orders
      </h1>

      @if (orders.isLoading()) {
        <div class="mt-6 grid min-h-56 place-items-center rounded-food-md bg-white shadow-food-sm">
          <tal-spinner label="Loading your orders" />
        </div>
      } @else if (ordersError(); as error) {
        <div class="mt-6">
          <tal-error-state
            [description]="error.detail ?? 'Check your connection and try again.'"
            [title]="error.title"
            (retry)="retryOrders()"
          />
        </div>
      } @else if (orders.value(); as response) {
        @if (response.items.length === 0) {
          <div class="mt-6">
            <tal-empty-state
              actionLabel="Browse restaurants"
              description="You have not placed any orders yet. Browse restaurants to get started."
              title="No orders yet"
              (action)="browseRestaurants()"
            />
          </div>
        } @else {
          <ul class="mt-6 flex list-none flex-col gap-3 p-0" role="list">
            @for (order of response.items; track order.id) {
              <li>
                <a
                  routerLink="/orders/{{ order.id }}"
                  class="block rounded-food border border-food-border bg-white p-4 shadow-food-sm no-underline transition-shadow hover:shadow-food-md"
                >
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-display text-[1.125rem] leading-6 font-semibold text-food-ink">
                      Order <span class="font-mono">#{{ order.id }}</span>
                    </span>
                    <span class="text-sm leading-5 text-food-muted">{{ formatDateTime(order.placedAt) }}</span>
                  </div>
                  <div class="mt-2 flex items-center justify-between gap-3">
                    <span class="text-sm leading-5 text-food-muted">{{ order.itemCount }} items</span>
                    <span class="text-base font-semibold text-food-ink">{{ order.total | talMoney }}</span>
                  </div>
                </a>
              </li>
            }
          </ul>

          <nav aria-label="Order history pagination" class="mt-6 flex items-center justify-between">
            <tal-button
              ariaLabel="Previous page"
              [disabled]="currentPage() === 1"
              size="lg"
              variant="secondary"
              (pressed)="previousPage()"
            >
              Previous
            </tal-button>
            <span class="text-sm leading-5 text-food-muted">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <tal-button
              ariaLabel="Next page"
              [disabled]="currentPage() >= totalPages()"
              size="lg"
              variant="secondary"
              (pressed)="nextPage()"
            >
              Next
            </tal-button>
          </nav>
        }
      } @else {
        <div class="mt-6">
          <tal-empty-state
            actionLabel="Browse restaurants"
            description="You have not placed any orders yet. Browse restaurants to get started."
            title="No orders yet"
            (action)="browseRestaurants()"
          />
        </div>
      }
    </div>
  `,
})
export class OrdersPage {
  private readonly api = inject(OrdersApiService);
  private readonly router = inject(Router);

  readonly pageSize = 10;
  readonly currentPage = signal(1);
  protected readonly formatDateTime = formatDateTime;

  readonly orders = resource({
    params: () => this.currentPage(),
    loader: () => this.loadOrders(),
  });

  readonly totalPages = computed(() => {
    const response = this.orders.value();
    if (!response) return 1;
    return Math.ceil(response.totalCount / this.pageSize);
  });

  readonly ordersError = computed<AppError | undefined>(() => {
    const error = this.orders.error();
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

  protected retryOrders(): void {
    this.orders.reload();
  }

  protected previousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPage() - 1));
  }

  protected nextPage(): void {
    this.currentPage.set(this.currentPage() + 1);
  }

  protected browseRestaurants(): void {
    void this.router.navigateByUrl('/restaurants');
  }

  private async loadOrders(): Promise<OrderListResponse> {
    try {
      const response = await firstValueFrom(
        this.api.getOrders({ page: this.currentPage(), pageSize: this.pageSize }),
      );
      if (this.currentPage() > 1 && response.items.length === 0) {
        this.currentPage.set(1);
      }
      return response;
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
