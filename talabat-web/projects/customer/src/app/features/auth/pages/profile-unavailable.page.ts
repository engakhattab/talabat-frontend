import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProfileStore } from '../../../core/profile/profile.store';
import { ButtonComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-profile-unavailable-page',
  imports: [ButtonComponent, RouterLink],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Profile unavailable
      </h1>
      <p class="mt-2 text-sm leading-6 text-food-muted">
        We couldn't load your profile. Please try again.
      </p>
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <tal-button size="lg" (click)="retry()">Try again</tal-button>
        <tal-button size="lg" variant="ghost" routerLink="/restaurants">Browse restaurants</tal-button>
      </div>
    </div>
  `,
})
export class ProfileUnavailablePage {
  private readonly store = inject(ProfileStore);

  protected retry(): void {
    void this.store.retry();
  }
}
