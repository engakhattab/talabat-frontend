import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorStateComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-not-found-page',
  imports: [ErrorStateComponent, RouterLink],
  template: `
    <div class="mx-auto max-w-2xl py-8 text-center">
      <tal-error-state
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
      />
      <div class="mt-6">
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
export class NotFoundPage {}
