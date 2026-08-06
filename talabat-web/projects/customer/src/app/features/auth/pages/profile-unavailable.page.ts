import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProfileStore } from '../../../core/profile/profile.store';
import { ButtonComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-profile-unavailable-page',
  imports: [ButtonComponent, RouterLink],
  template: `
    <main class="mx-auto w-full max-w-2xl px-3 py-8 sm:px-6">
      <h1 class="font-display text-2xl font-bold text-food-ink">Profile unavailable</h1>
      <p class="mt-2 text-sm text-food-muted">
        We couldn't load your profile. Please try again.
      </p>
      <div class="mt-4 flex gap-3">
        <tal-button (click)="retry()">Try again</tal-button>
        <tal-button variant="ghost" routerLink="/restaurants">Browse restaurants</tal-button>
      </div>
    </main>
  `,
})
export class ProfileUnavailablePage {
  private readonly store = inject(ProfileStore);

  protected retry(): void {
    void this.store.retry();
  }
}
