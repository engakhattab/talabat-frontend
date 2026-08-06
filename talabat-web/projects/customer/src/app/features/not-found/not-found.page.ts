import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent, ErrorStateComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-not-found-page',
  imports: [ButtonComponent, ErrorStateComponent, RouterLink],
  template: `
    <div class="mx-auto w-full max-w-2xl text-center">
      <tal-error-state
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
      />
      <div class="mt-6">
        <tal-button size="lg" variant="primary" routerLink="/restaurants">
          Back to restaurants
        </tal-button>
      </div>
    </div>
  `,
})
export class NotFoundPage {}
