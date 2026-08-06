import { Component, computed, inject, resource } from '@angular/core';
import { CustomerApiService } from '@talabat/api-customer';
import { AppError } from '@talabat/core-http';
import { ErrorStateComponent, SpinnerComponent } from '@talabat/shared-ui';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'tal-auth-check-page',
  imports: [ErrorStateComponent, SpinnerComponent],
  template: `
    <div class="mx-auto w-full max-w-2xl">
      <h1 class="font-display text-[1.75rem] leading-[2.125rem] font-bold text-food-ink">
        Authentication check
      </h1>
      @if (verification.isLoading()) {
        <div class="mt-6"><tal-spinner label="Verifying protected API access" /></div>
      } @else if (verificationError(); as error) {
        <div class="mt-6">
          <tal-error-state
            [description]="error.detail ?? 'Protected API access could not be verified.'"
            [title]="error.title"
            (retry)="verification.reload()"
          />
        </div>
      } @else {
        <p class="mt-3 text-sm leading-6 text-food-muted" role="status">
          Your identity and protected Customer API access were verified.
        </p>
      }
    </div>
  `,
})
export class AuthCheckPage {
  private readonly customerApi = inject(CustomerApiService);
  protected readonly verification = resource({ loader: () => this.verifyProtectedAccess() });
  protected readonly verificationError = computed(() => this.verification.error() as AppError | undefined);

  private async verifyProtectedAccess(): Promise<void> {
    try {
      await firstValueFrom(this.customerApi.getProfile());
    } catch (error: unknown) {
      if (this.isMissingProfile(error)) return;
      throw error;
    }
  }

  private isMissingProfile(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
  }
}
