import { Component, inject, signal } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { form, required, validate, FormField, FieldTree } from '@angular/forms/signals';

import { AddressResponse } from '@talabat/api-customer';
import { AppError } from '@talabat/core-http';
import { ButtonComponent } from '@talabat/shared-ui';

import { ProfileStore } from '../core/profile/profile.store';

interface AddressFormModel {
  street: string;
  city: string;
  buildingNumber: string;
  floor: string;
  makeDefault: boolean;
}

@Component({
  selector: 'tal-address-form-modal',
  imports: [ButtonComponent, FormField],
  template: `
    <form class="tal-dialog-card" (submit)="handleSubmit($event)" novalidate>
      <h2 id="address-form-modal-title" class="font-display text-xl font-semibold text-food-ink">
        Add Delivery Address
      </h2>

      <div class="mt-4">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="address-street">
          Street
        </label>
        <input
          id="address-street"
          type="text"
          autocomplete="street-address"
          class="tal-input w-full"
          [class.border-food-error]="form.street().invalid()"
          [formField]="form.street"
          [attr.aria-invalid]="form.street().invalid() ? 'true' : null"
          [attr.aria-describedby]="form.street().invalid() ? 'address-street-error' : undefined"
        />
        @if (form.street().invalid()) {
          <p id="address-street-error" class="mt-1 text-sm text-food-error" role="alert">
            {{ form.street().errors()[0]?.message }}
          </p>
        }
      </div>

      <div class="mt-3">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="address-buildingNumber">
          Building number
        </label>
        <input
          id="address-buildingNumber"
          type="text"
          class="tal-input w-full"
          [class.border-food-error]="form.buildingNumber().invalid()"
          [formField]="form.buildingNumber"
          [attr.aria-invalid]="form.buildingNumber().invalid() ? 'true' : null"
          [attr.aria-describedby]="
            form.buildingNumber().invalid() ? 'address-buildingNumber-error' : undefined
          "
        />
        @if (form.buildingNumber().invalid()) {
          <p
            id="address-buildingNumber-error"
            class="mt-1 text-sm text-food-error"
            role="alert"
          >
            {{ form.buildingNumber().errors()[0]?.message }}
          </p>
        }
      </div>

      <div class="mt-3">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="address-floor">
          Floor (optional)
        </label>
        <input
          id="address-floor"
          type="text"
          class="tal-input w-full"
          [formField]="form.floor"
        />
      </div>

      <div class="mt-3">
        <label class="mb-1 block text-sm font-medium text-food-ink" for="address-city">
          City
        </label>
        <input
          id="address-city"
          type="text"
          autocomplete="address-level2"
          class="tal-input w-full"
          [class.border-food-error]="form.city().invalid()"
          [formField]="form.city"
          [attr.aria-invalid]="form.city().invalid() ? 'true' : null"
          [attr.aria-describedby]="form.city().invalid() ? 'address-city-error' : undefined"
        />
        @if (form.city().invalid()) {
          <p id="address-city-error" class="mt-1 text-sm text-food-error" role="alert">
            {{ form.city().errors()[0]?.message }}
          </p>
        }
      </div>

      <label class="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          class="size-[20px] accent-food-primary"
          [checked]="model().makeDefault"
          (change)="toggleDefault()"
        />
        <span class="text-sm text-food-ink">Make this my default address</span>
      </label>

      @if (serverError()) {
        <div class="mt-4 rounded-food border border-food-error bg-food-tint px-3 py-2" role="alert">
          <p class="text-sm font-medium text-food-error">{{ serverError()?.title }}</p>
          @if (serverError()?.detail) {
            <p class="mt-1 text-sm text-food-error">{{ serverError()?.detail }}</p>
          }
        </div>
      }

      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <tal-button variant="secondary" (pressed)="cancel()" [disabled]="busy()">
          Cancel
        </tal-button>
        <tal-button type="submit" [busy]="busy()">Save Address</tal-button>
      </div>
    </form>
  `,
})
export class AddressFormModalComponent {
  private readonly dialogRef = inject<DialogRef<AddressResponse>>(DialogRef);
  private readonly profileStore = inject(ProfileStore);

  protected readonly model = signal<AddressFormModel>({
    street: '',
    city: '',
    buildingNumber: '',
    floor: '',
    makeDefault: false,
  });
  private readonly busyState = signal(false);
  private readonly serverErrorState = signal<AppError | null>(null);

  protected readonly busy = this.busyState.asReadonly();
  protected readonly serverError = this.serverErrorState.asReadonly();

  protected readonly form: FieldTree<AddressFormModel> = form(
    this.model,
    (f) => {
      required(f.street, { message: 'Street is required.' });
      required(f.buildingNumber, { message: 'Building number is required.' });
      required(f.city, { message: 'City is required.' });
      validate(f.street, ({ value }) =>
        value().trim().length === 0
          ? { kind: 'street-blank', message: 'Enter a street address.' }
          : undefined,
      );
      validate(f.buildingNumber, ({ value }) =>
        value().trim().length === 0
          ? { kind: 'building-blank', message: 'Enter a building number.' }
          : undefined,
      );
      validate(f.city, ({ value }) =>
        value().trim().length === 0
          ? { kind: 'city-blank', message: 'Enter a city.' }
          : undefined,
      );
    },
  );

  protected toggleDefault(): void {
    this.model.update((current) => ({ ...current, makeDefault: !current.makeDefault }));
  }

  protected cancel(): void {
    if (this.busy()) return;
    this.dialogRef.close();
  }

  protected async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;

    this.form().markAsTouched();
    if (this.form().invalid()) return;

    const current = this.model();
    const floor = current.floor.trim();
    const request = {
      street: current.street.trim(),
      city: current.city.trim(),
      buildingNumber: current.buildingNumber.trim(),
      floor: floor === '' ? null : floor,
      makeDefault: current.makeDefault,
    };

    this.busyState.set(true);
    this.serverErrorState.set(null);
    try {
      const created = await this.profileStore.addAddress(request);
      this.dialogRef.close(created);
    } catch (error) {
      this.serverErrorState.set(error as AppError);
    } finally {
      this.busyState.set(false);
    }
  }
}
