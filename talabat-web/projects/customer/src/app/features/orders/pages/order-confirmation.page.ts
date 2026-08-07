import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { OrdersApiService, OrderDetailResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { ErrorStateComponent, SpinnerComponent, StatusChipComponent } from '@talabat/shared-ui';
import { formatDateTime, MoneyPipe } from '@talabat/shared-util';

type OrderViewState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'tal-order-confirmation-page',
  imports: [ErrorStateComponent, SpinnerComponent, StatusChipComponent, RouterLink, MoneyPipe],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Order Confirmation
      </h1>

      @switch (viewState()) {
        @case ('loading') {
          <div class="mt-6 grid min-h-56 place-items-center rounded-food-md bg-white shadow-food-sm">
            <tal-spinner label="Loading your order" />
          </div>
        }
        @case ('error') {
          <div class="mt-6">
            <tal-error-state
              [title]="errorTitle()"
              [description]="errorDetail()"
              [retryLabel]="canRetry() ? 'Try again' : null"
              (retry)="retry()"
            />
          </div>
        }
        @case ('loaded') {
          @if (order(); as order) {
            <section
              class="mt-6 rounded-food border border-food-border bg-white p-4 shadow-food-sm"
              aria-label="Order details"
            >
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold text-food-ink">
                    Order <span class="font-mono text-base font-semibold">#{{ order.id }}</span>
                  </h2>
                  <p class="mt-0.5 text-sm text-food-muted">
                    Placed {{ placedAt() }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <tal-status-chip label="Order confirmed" tone="success" />
                  <span class="rounded-food bg-food-tint px-2 py-1 text-xs font-medium text-food-primary">
                    Cash on Delivery
                  </span>
                </div>
              </div>

              <div class="mt-4 border-t border-food-border pt-3">
                <h3 class="text-base font-semibold text-food-ink">Delivery address</h3>
                <p class="mt-1 text-sm text-food-ink">
                  {{ order.deliveryAddress.street }}
                </p>
                <p class="text-xs text-food-muted">
                  Building {{ order.deliveryAddress.buildingNumber }}
                  @if (order.deliveryAddress.floor !== null) {
                    · Floor {{ order.deliveryAddress.floor }}
                  }
                  · {{ order.deliveryAddress.city }}
                </p>
              </div>

              <ul class="mt-4 list-none space-y-3 border-t border-food-border p-0 pt-3" role="list">
                @for (item of order.items; track item.productName) {
                  <li class="flex items-baseline justify-between gap-3">
                    <div class="min-w-0">
                      <p class="break-words text-sm font-medium text-food-ink">{{ item.productName }}</p>
                      <p class="text-xs text-food-muted">
                        {{ item.quantity }} × {{ item.unitPrice | talMoney }}
                      </p>
                    </div>
                    <p class="shrink-0 text-sm font-semibold text-food-ink">
                      {{ item.lineTotal | talMoney }}
                    </p>
                  </li>
                }
              </ul>

              <dl class="mt-4 border-t border-food-border pt-3">
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-sm font-semibold text-food-ink">Total</dt>
                  <dd class="text-[1.125rem] leading-6 font-bold text-food-ink">
                    <span class="tal-visually-hidden">Total:</span>
                    {{ order.total | talMoney }}
                  </dd>
                </div>
              </dl>
            </section>

            <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <a
                routerLink="/restaurants"
                class="tal-button tal-button--secondary no-underline"
              >
                Back to restaurants
              </a>
            </div>
          }
        }
      }
    </div>
  `,
})
export class OrderConfirmationPage {
  readonly orderIdParam = input.required<string>({ alias: 'orderId' });

  private readonly ordersApi = inject(OrdersApiService);

  private readonly viewStateState = signal<OrderViewState>('loading');
  private readonly orderState = signal<OrderDetailResponse | null>(null);
  private readonly errorState = signal<AppError | null>(null);
  private generation = 0;

  readonly viewState = this.viewStateState.asReadonly();
  readonly order = this.orderState.asReadonly();

  readonly orderId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const raw = this.orderIdParam();
      const parsed = Number(raw);
      const id = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      this.orderId.set(id);
      void this.load(id);
    });
  }

  readonly placedAt = (): string =>
    formatDateTime(this.orderState()?.placedAt ?? null);

  canRetry(): boolean {
    const error = this.errorState();
    return error === null || error.status !== 404;
  }

  protected readonly errorTitle = (): string => {
    if (this.orderId() === null) return 'Order not found';
    return this.errorState()?.title ?? 'Something went wrong';
  };

  protected readonly errorDetail = (): string => {
    if (this.orderId() === null) {
      return 'The order link is invalid. Check the address and try again.';
    }
    if (this.errorState()?.status === 404) {
      return 'We could not find this order for your account.';
    }
    return this.errorState()?.detail ?? 'Check your connection and try again.';
  };

  protected retry(): void {
    void this.load(this.orderId());
  }

  private async load(orderId: number | null): Promise<void> {
    if (orderId === null) {
      this.generation += 1;
      this.viewStateState.set('error');
      this.errorState.set(null);
      return;
    }

    const generation = ++this.generation;
    this.viewStateState.set('loading');
    this.errorState.set(null);

    try {
      const order = await firstValueFrom(this.ordersApi.getOrderDetails({ orderId }));
      if (generation !== this.generation) return;
      this.orderState.set(order);
      this.viewStateState.set('loaded');
    } catch (error) {
      if (generation !== this.generation) return;
      const appError = error as AppError;
      this.errorState.set(appError);
      this.viewStateState.set('error');
      if (appError.status === 404 || appError.code === AppErrorCode.ProfileNotCreated) {
        this.orderState.set(null);
      }
    }
  }
}
