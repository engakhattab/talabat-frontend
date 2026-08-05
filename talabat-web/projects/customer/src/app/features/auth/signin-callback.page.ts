import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { ButtonComponent, SpinnerComponent } from '@talabat/shared-ui';

@Component({
  selector: 'tal-signin-callback-page',
  imports: [ButtonComponent, SpinnerComponent],
  template: `
    <main class="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-3 py-8">
      <section class="text-center" aria-live="polite">
        @if (failed()) {
          <h1 class="font-display text-xl font-semibold text-food-ink">Sign-in was not completed</h1>
          <p class="mt-2 text-sm text-food-muted">
            The response could not be verified. Start sign-in again safely.
          </p>
          <div class="mt-4"><tal-button (pressed)="retry()">Try sign-in again</tal-button></div>
        } @else {
          <tal-spinner label="Completing sign-in" />
          <h1 class="mt-3 font-display text-xl font-semibold text-food-ink">Completing sign-in</h1>
        }
      </section>
    </main>
  `,
})
export class SigninCallbackPage implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly failed = () => this.auth.error()?.code === 'callback_failed';

  ngOnInit(): void {
    void this.processCallback();
  }

  protected retry(): void {
    void this.auth.signIn('/restaurants').catch(() => undefined);
  }

  private async processCallback(): Promise<void> {
    try {
      const destination = await this.auth.completeSignInCallback(window.location.href);
      this.clearCallbackParameters();
      await this.router.navigateByUrl(destination, { replaceUrl: true });
    } catch {
      this.clearCallbackParameters();
    }
  }

  private clearCallbackParameters(): void {
    window.history.replaceState(null, '', '/signin-callback');
  }
}
