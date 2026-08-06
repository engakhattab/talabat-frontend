import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { ButtonComponent } from '@talabat/shared-ui';
import { ProfileStore } from '../core/profile/profile.store';

@Component({
  selector: 'tal-header',
  imports: [ButtonComponent, RouterLink, RouterLinkActive],
  template: `
    <header class="border-b border-food-border bg-white">
      <div class="mx-auto flex min-h-12 w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-9">
        <a class="font-display text-lg font-bold text-food-ink no-underline" routerLink="/restaurants">Talabat</a>
        <nav class="flex items-center gap-3 sm:gap-4" aria-label="Main navigation" aria-live="polite">
          <a
            class="text-sm font-medium text-food-ink no-underline hover:text-food-secondary"
            routerLink="/restaurants"
            routerLinkActive="text-food-secondary font-semibold"
          >
            Restaurants
          </a>
          @if (auth.initialized() && auth.isAuthenticated()) {
            <a
              class="text-sm font-medium text-food-ink no-underline hover:text-food-secondary"
              routerLink="/profile"
              routerLinkActive="text-food-secondary font-semibold"
            >
              Profile
            </a>
            <a
              class="text-sm font-medium text-food-ink no-underline hover:text-food-secondary"
              routerLink="/orders"
              routerLinkActive="text-food-secondary font-semibold"
            >
              Orders
            </a>
            <span class="hidden text-sm text-food-muted sm:inline">
              {{ greeting() }}
            </span>
            <tal-button variant="ghost" [busy]="auth.busy()" (click)="signOut()">
              Sign out
            </tal-button>
          } @else {
            <span class="hidden text-sm text-food-muted sm:inline">Browsing as guest</span>
            <tal-button [busy]="auth.busy()" (click)="signIn()">Sign in</tal-button>
          }
        </nav>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly greeting = () => {
    const profile = this.profileStore.profile();
    if (profile?.fullName) return profile.fullName;
    const user = this.auth.user();
    if (user?.displayName) return user.displayName;
    return 'Signed in';
  };

  protected signIn(): void {
    void this.auth.signIn(this.router.url).catch(() => undefined);
  }

  protected signOut(): void {
    void this.auth.signOut().catch(() => undefined);
  }
}
