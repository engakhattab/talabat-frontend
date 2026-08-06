import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { ButtonComponent } from '@talabat/shared-ui';
import { ProfileStore } from '../../../core/profile/profile.store';

@Component({
  selector: 'tal-profile-page',
  imports: [ButtonComponent, RouterLink],
  template: `
    <div class="mx-auto max-w-xl py-8">
      <h1 class="font-display text-2xl font-bold text-food-ink">Your Profile</h1>
      @if (profile(); as p) {
        <div class="mt-6 rounded-food-md border border-food-border bg-white p-6 shadow-food-sm">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wider text-food-muted">Full Name</dt>
              <dd class="mt-1 text-sm font-medium text-food-ink">{{ p.fullName }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wider text-food-muted">Age</dt>
              <dd class="mt-1 text-sm font-medium text-food-ink">{{ p.age }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wider text-food-muted">Phone Number</dt>
              <dd class="mt-1 text-sm font-medium text-food-ink">{{ p.phoneNumber ?? 'Not provided' }}</dd>
            </div>
          </dl>
        </div>
      }
      <div class="mt-6 flex items-center justify-between">
        <a
          routerLink="/restaurants"
          class="inline-flex items-center rounded-food-md bg-food-primary px-4 py-2 text-sm font-medium text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
        >
          Explore restaurants
        </a>
        <tal-button variant="ghost" (click)="signOut()">Sign out</tal-button>
      </div>
    </div>
  `,
})
export class ProfilePage {
  private readonly profileStore = inject(ProfileStore);
  private readonly auth = inject(AuthStore);

  protected readonly profile = this.profileStore.profile;

  protected signOut(): void {
    void this.auth.signOut().catch(() => undefined);
  }
}
