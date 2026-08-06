import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent, EmptyStateComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-orders-page',
  imports: [ButtonComponent, EmptyStateComponent, RouterLink],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Your Orders
      </h1>
      <div class="mt-6">
        <tal-empty-state
          title="No orders yet"
          description="You have not placed any orders yet. Browse restaurants to get started."
        />
      </div>
      <div class="mt-6 flex justify-center">
        <tal-button size="lg" variant="primary" routerLink="/restaurants">
          Browse restaurants
        </tal-button>
      </div>
    </div>
  `,
})
export class OrdersPage {}
