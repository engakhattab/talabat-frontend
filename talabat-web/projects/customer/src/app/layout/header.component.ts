import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { ButtonComponent } from '@talabat/shared-ui';
import { ProfileStore } from '../core/profile/profile.store';

@Component({
  selector: 'tal-header',
  imports: [ButtonComponent, RouterLink, RouterLinkActive],
  template: `
    <header class="border-b border-food-border bg-white">
      <div
        class="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:px-9"
      >
        <a
          class="shrink-0 font-display text-xl font-bold text-food-ink no-underline transition-colors hover:text-food-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2"
          routerLink="/restaurants"
        >
          Talabat
        </a>
        <nav class="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2" aria-label="Main navigation" aria-live="polite">
          <a
            class="inline-flex min-h-[42px] items-center rounded-food-md px-2 text-sm font-medium text-food-ink no-underline transition-colors hover:text-food-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 sm:px-3"
            routerLink="/restaurants"
            routerLinkActive="text-food-secondary font-semibold"
          >
            Restaurants
          </a>
          @if (auth.initialized() && auth.isAuthenticated()) {
            <a
              class="inline-flex min-h-[42px] items-center rounded-food-md px-2 text-sm font-medium text-food-ink no-underline transition-colors hover:text-food-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 sm:px-3"
              routerLink="/profile"
              routerLinkActive="text-food-secondary font-semibold"
            >
              Profile
            </a>
            <a
              class="inline-flex min-h-[42px] items-center rounded-food-md px-2 text-sm font-medium text-food-ink no-underline transition-colors hover:text-food-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-food-primary focus-visible:ring-offset-2 sm:px-3"
              routerLink="/orders"
              routerLinkActive="text-food-secondary font-semibold"
            >
              Orders
            </a>
            <span
              class="hidden min-w-0 max-w-44 truncate ps-1 text-sm text-food-muted md:inline"
              [title]="greeting()"
            >
              {{ greeting() }}
            </span>
            <tal-button variant="ghost" [busy]="auth.busy()" (click)="signOut()">
              Sign out
            </tal-button>
          } @else {
            <span class="hidden ps-1 text-sm text-food-muted sm:inline">Browsing as guest</span>
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

  protected readonly greeting = computed(() => {
    const profile = this.profileStore.profile();
    if (profile?.fullName) return profile.fullName;
    const user = this.auth.user();
    if (user?.displayName) return user.displayName;
    return 'Signed in';
  });

  protected signIn(): void {
    void this.auth.signIn(this.router.url).catch(() => undefined);
  }

  protected signOut(): void {
    void this.auth.signOut().catch(() => undefined);
  }
}
