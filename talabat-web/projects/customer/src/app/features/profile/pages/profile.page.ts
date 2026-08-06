import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@talabat/shared-ui';
import { ProfileStore } from '../../../core/profile/profile.store';

@Component({
  selector: 'tal-profile-page',
  imports: [ButtonComponent, RouterLink],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Your Profile
      </h1>
      @if (profile(); as p) {
        <section
          class="mt-6 rounded-food-md border border-food-border bg-white p-6 shadow-food-sm"
          aria-label="Account details"
        >
          <dl class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt class="text-sm font-medium text-food-muted">Full Name</dt>
              <dd class="mt-1 text-base font-semibold text-food-ink">{{ p.fullName }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-food-muted">Age</dt>
              <dd class="mt-1 text-base font-semibold text-food-ink">{{ p.age }}</dd>
            </div>
            <div>
              <dt class="text-sm font-medium text-food-muted">Phone Number</dt>
              @if (p.phoneNumber) {
                <dd class="mt-1 text-base font-semibold text-food-ink">{{ p.phoneNumber }}</dd>
              } @else {
                <dd class="mt-1 text-base font-normal text-food-muted">Not provided</dd>
              }
            </div>
          </dl>
        </section>
      }
      <div class="mt-6">
        <tal-button size="lg" variant="primary" routerLink="/restaurants">
          Browse restaurants
        </tal-button>
      </div>
    </div>
  `,
})
export class ProfilePage {
  private readonly profileStore = inject(ProfileStore);

  protected readonly profile = this.profileStore.profile;
}
