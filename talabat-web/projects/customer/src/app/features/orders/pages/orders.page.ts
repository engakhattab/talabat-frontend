import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-orders-page',
  imports: [EmptyStateComponent, RouterLink],
  template: `
    <div class="mx-auto max-w-2xl py-8">
      <h1 class="mb-6 font-display text-2xl font-bold text-food-ink">Your Orders</h1>
      <tal-empty-state
        title="No orders yet"
        description="Order tracking and history will be available when ordering goes live in Phase 8."
      />
      <div class="mt-6 text-center">
        <a
          routerLink="/restaurants"
          class="inline-flex items-center rounded-food-md bg-food-primary px-4 py-2 text-sm font-medium text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
        >
          Back to restaurants
        </a>
      </div>
    </div>
  `,
})
export class OrdersPage {}
