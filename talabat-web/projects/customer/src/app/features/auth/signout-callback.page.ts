import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { SpinnerComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-signout-callback-page',
  imports: [SpinnerComponent],
  template: `
    <main class="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-3 py-8">
      <section class="text-center" aria-live="polite">
        <tal-spinner label="Completing sign-out" />
        <h1 class="mt-3 font-display text-xl font-semibold text-food-ink">Signing you out</h1>
        @if (safeWarning()) {
          <p class="mt-2 text-sm text-food-muted">Local authentication data has been cleared.</p>
        }
      </section>
    </main>
  `,
})
export class SignoutCallbackPage implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly safeWarning = signal(false);

  ngOnInit(): void {
    void this.processCallback();
  }

  private async processCallback(): Promise<void> {
    await this.auth.completeSignOutCallback(window.location.href);
    this.safeWarning.set(this.auth.error()?.code === 'signout_failed');
    window.history.replaceState(null, '', '/signout-callback');
    await this.router.navigateByUrl('/restaurants', { replaceUrl: true });
  }
}
