import { Component, input, output, signal } from '@angular/core';
import { form, required, validate, FormField, FieldTree } from '@angular/forms/signals';
import { CreateProfileRequest } from '@talabat/api-customer';
import { AppError } from '@talabat/core-http';
import { ButtonComponent, SpinnerComponent } from '@talabat/shared-ui';

interface OnboardingModel {
  fullName: string;
  age: number | null;
  phoneNumber: string;
}

@Component({
  selector: 'tal-onboarding-form',
  imports: [ButtonComponent, SpinnerComponent, FormField],
  template: `
    <form (ngSubmit)="handleSubmit()" novalidate>
      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="onboarding-fullName">
          Full name
        </label>
        <input
          id="onboarding-fullName"
          type="text"
          autocomplete="name"
          class="w-full rounded-food border border-food-border px-3 py-2 text-food-ink"
          [class.border-food-error]="form.fullName().invalid()"
          [formField]="form.fullName"
          [attr.aria-invalid]="form.fullName().invalid()"
          [attr.aria-describedby]="form.fullName().invalid() ? 'onboarding-fullName-error' : undefined"
        />
        @if (form.fullName().invalid()) {
          <p id="onboarding-fullName-error" class="mt-1 text-sm text-food-error" role="alert">
            {{ form.fullName().errors()[0]?.message }}
          </p>
        }
      </div>

      <div class="mb-4">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="onboarding-age">
          Age
        </label>
        <input
          id="onboarding-age"
          type="number"
          inputmode="numeric"
          class="w-full rounded-food border border-food-border px-3 py-2 text-food-ink"
          [class.border-food-error]="form.age().invalid()"
          [formField]="form.age"
          [attr.aria-invalid]="form.age().invalid()"
          [attr.aria-describedby]="form.age().invalid() ? 'onboarding-age-error' : undefined"
        />
        @if (form.age().invalid()) {
          <p id="onboarding-age-error" class="mt-1 text-sm text-food-error" role="alert">
            {{ form.age().errors()[0]?.message }}
          </p>
        }
      </div>

      <div class="mb-6">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="onboarding-phoneNumber">
          Phone number (optional)
        </label>
        <input
          id="onboarding-phoneNumber"
          type="tel"
          autocomplete="tel"
          inputmode="tel"
          class="w-full rounded-food border border-food-border px-3 py-2 text-food-ink"
          [formField]="form.phoneNumber"
        />
      </div>

      @if (serverError()) {
        <div class="mb-4 rounded-food border border-food-error bg-food-tint px-3 py-2" role="alert">
          <p class="text-sm font-medium text-food-error">{{ serverError()?.title }}</p>
          @if (serverError()?.detail) {
            <p class="mt-1 text-sm text-food-error">{{ serverError()?.detail }}</p>
          }
        </div>
      }

      <div class="flex items-center gap-3">
        <tal-button type="submit" [busy]="busy()" [disabled]="busy()">
          @if (busy()) {
            Creating profile...
          } @else {
            Create profile
          }
        </tal-button>
        @if (busy()) {
          <tal-spinner label="Creating your profile" />
        }
      </div>
    </form>
  `,
})
export class OnboardingFormComponent {
  busy = input<boolean>(false);
  serverError = input<AppError | null>(null);

  onSubmitResult = output<CreateProfileRequest>();

  private readonly model = signal<OnboardingModel>({
    fullName: '',
    age: null,
    phoneNumber: '',
  });

  protected readonly form: FieldTree<OnboardingModel> = form(
    this.model,
    (f) => {
      required(f.fullName, { message: 'Full name is required.' });
      required(f.age, { message: 'Age is required.' });
      validate(f.age, ({ value }) => {
        const v = value();
        if (v === null) return { kind: 'age-required', message: 'Age is required.' };
        if (!Number.isInteger(v) || v <= 0) return { kind: 'age-invalid', message: 'Enter a whole number greater than zero.' };
        if (!Number.isSafeInteger(v)) return { kind: 'age-unsafe', message: 'Enter a valid age.' };
        return undefined;
      });
    },
  );

  protected handleSubmit(): void {
    if (this.busy()) return;

    this.form().markAsTouched();

    if (this.form().invalid()) return;

    const current = this.model();
    const request: CreateProfileRequest = {
      fullName: current.fullName.trim(),
      age: current.age!,
      phoneNumber: current.phoneNumber.trim() === '' ? null : current.phoneNumber.trim(),
    };

    this.onSubmitResult.emit(request);
  }
}
