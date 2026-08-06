import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateProfileRequest, CustomerApiService } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { SpinnerComponent } from '@talabat/shared-ui';
import { safeReturnUrl } from '@talabat/core-auth';
import { ProfileStore } from '../../../core/profile/profile.store';
import { OnboardingFormComponent } from '../components/onboarding-form.component';

@Component({
  selector: 'tal-onboarding-page',
  imports: [OnboardingFormComponent, SpinnerComponent],
  template: `
    <main class="mx-auto w-full max-w-lg px-3 py-8 sm:px-6">
      <h1 class="font-display text-2xl font-bold text-food-ink">Create your profile</h1>
      <p class="mt-2 text-sm text-food-muted">
        Tell us a little about yourself to get started ordering.
      </p>

      @if (loading()) {
        <div class="mt-6"><tal-spinner label="Checking your profile" /></div>
      } @else {
        <div class="mt-6">
          <tal-onboarding-form
            [busy]="submitting()"
            [serverError]="submitError()"
            (onSubmitResult)="handleSubmit($event)"
          />
        </div>
      }
    </main>
  `,
})
export class OnboardingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerApi = inject(CustomerApiService);
  private readonly profileStore = inject(ProfileStore);

  private readonly submittingState = signal(false);
  private readonly submitErrorState = signal<AppError | null>(null);

  private readonly returnUrl = computed(() => {
    const fromQuery = this.route.snapshot.queryParams['returnUrl'];
    return safeReturnUrl(fromQuery);
  });

  protected readonly loading = computed(() => this.profileStore.state() === 'loading');
  protected readonly submitting = this.submittingState.asReadonly();
  protected readonly submitError = this.submitErrorState.asReadonly();

  ngOnInit(): void {
    void this.profileStore.ensureLoaded();
  }

  protected handleSubmit(request: CreateProfileRequest): void {
    if (this.submittingState()) return;

    this.submittingState.set(true);
    this.submitErrorState.set(null);

    this.customerApi.createProfile({ createProfileRequest: request }).subscribe({
      next: () => void this.onCreationSuccess(),
      error: (error: AppError) => {
        this.submittingState.set(false);
        this.submitErrorState.set(error);
      },
    });
  }

  private async onCreationSuccess(): Promise<void> {
    const result = await this.profileStore.refreshAfterCreation();
    this.submittingState.set(false);

    if (result.kind !== 'loaded') return;

    await this.router.navigateByUrl(this.returnUrl(), { replaceUrl: true });
  }
}
