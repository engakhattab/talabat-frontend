import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, required, validate, FormField, FieldTree } from '@angular/forms/signals';
import { AddressDto, AddressResponse, UpdateProfileRequest } from '@talabat/api-customer';
import { AppError } from '@talabat/core-http';
import {
  ButtonComponent,
  DialogService,
  EmptyStateComponent,
  StatusChipComponent,
} from '@talabat/shared-ui';
import { firstValueFrom, take } from 'rxjs';

import { ProfileStore } from '../../../core/profile/profile.store';
import { AddressFormModalComponent } from '../../../ui/address-form-modal.component';
import { RemoveAddressDialogComponent } from '../components/remove-address-dialog.component';

interface ProfileFormModel {
  fullName: string;
  age: number | null;
  phoneNumber: string;
}

@Component({
  selector: 'tal-profile-page',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    FormField,
    RouterLink,
    StatusChipComponent,
  ],
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
          @if (isEditing()) {
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-food-ink">Edit profile</h2>
              <tal-button variant="ghost" (pressed)="cancelEditing()" [disabled]="isSaving()">
                Cancel
              </tal-button>
            </div>

            @if (saveError(); as error) {
              <div
                class="mt-4 rounded-food border border-food-error bg-food-tint px-3 py-2"
                role="alert"
              >
                <p class="text-sm font-medium text-food-error">{{ error.title }}</p>
                @if (error.detail) {
                  <p class="mt-1 text-sm text-food-error">{{ error.detail }}</p>
                }
              </div>
            }

            <form class="mt-4" (submit)="saveProfile($event)" novalidate>
              <div>
                <label class="mb-1 block text-sm font-medium text-food-ink" for="profile-fullName">
                  Full name
                </label>
                <input
                  id="profile-fullName"
                  type="text"
                  autocomplete="name"
                  class="tal-input w-full"
                  [class.border-food-error]="profileForm.fullName().invalid()"
                  [formField]="profileForm.fullName"
                  [attr.aria-invalid]="profileForm.fullName().invalid() ? 'true' : null"
                  [attr.aria-describedby]="
                    profileForm.fullName().invalid() ? 'profile-fullName-error' : undefined
                  "
                />
                @if (profileForm.fullName().invalid()) {
                  <p id="profile-fullName-error" class="mt-1 text-sm text-food-error" role="alert">
                    {{ profileForm.fullName().errors()[0]?.message }}
                  </p>
                }
              </div>

              <div class="mt-4">
                <label class="mb-1 block text-sm font-medium text-food-ink" for="profile-age">
                  Age
                </label>
                <input
                  id="profile-age"
                  type="number"
                  inputmode="numeric"
                  class="tal-input w-full"
                  [class.border-food-error]="profileForm.age().invalid()"
                  [formField]="profileForm.age"
                  [attr.aria-invalid]="profileForm.age().invalid() ? 'true' : null"
                  [attr.aria-describedby]="
                    profileForm.age().invalid() ? 'profile-age-error' : undefined
                  "
                />
                @if (profileForm.age().invalid()) {
                  <p id="profile-age-error" class="mt-1 text-sm text-food-error" role="alert">
                    {{ profileForm.age().errors()[0]?.message }}
                  </p>
                }
              </div>

              <div class="mt-4">
                <label class="mb-1 block text-sm font-medium text-food-ink" for="profile-phoneNumber">
                  Phone number (optional)
                </label>
                <input
                  id="profile-phoneNumber"
                  type="tel"
                  autocomplete="tel"
                  inputmode="tel"
                  class="tal-input w-full"
                  [formField]="profileForm.phoneNumber"
                />
              </div>

              <div class="mt-6 flex items-center gap-3">
                <tal-button type="submit" size="lg" [busy]="isSaving()">
                  @if (isSaving()) {
                    Saving...
                  } @else {
                    Save changes
                  }
                </tal-button>
              </div>
            </form>
          } @else {
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-base font-semibold text-food-ink">Account details</h2>
              <tal-button variant="secondary" (pressed)="startEditing()">Edit profile</tal-button>
            </div>

            @if (saveSuccess()) {
              <p
                class="mt-4 rounded-food border border-food-success bg-food-subtle px-3 py-2 text-sm font-medium text-food-success"
                role="status"
              >
                Your profile has been updated.
              </p>
            }

            <dl class="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
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
          }
        </section>

        <section
          class="mt-6 rounded-food-md border border-food-border bg-white p-6 shadow-food-sm"
          aria-label="Saved delivery addresses"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-food-ink">Delivery addresses</h2>
            <tal-button variant="secondary" (pressed)="addAddress()">Add address</tal-button>
          </div>

          @if (addressError(); as error) {
            <div
              class="mt-4 rounded-food border border-food-error bg-food-tint px-3 py-2"
              role="alert"
            >
              <p class="text-sm font-medium text-food-error">{{ error.title }}</p>
              @if (error.detail) {
                <p class="mt-1 text-sm text-food-error">{{ error.detail }}</p>
              }
            </div>
          }

          @if (p.addresses.length === 0) {
            <div class="mt-4">
              <tal-empty-state
                title="No saved addresses"
                description="Add a delivery address so you can place orders."
                actionLabel="Add address"
                (action)="addAddress()"
              />
            </div>
          } @else {
            <ul class="mt-4 list-none space-y-3 p-0" role="list">
              @for (address of p.addresses; track address.id) {
                <li>
                  <div class="rounded-food border border-food-border bg-white p-4 shadow-food-sm">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium text-food-ink">
                          {{ address.street }}
                        </p>
                        <p class="mt-0.5 truncate text-xs text-food-muted">
                          Building {{ address.buildingNumber }}
                          @if (address.floor !== null) {
                            · Floor {{ address.floor }}
                          }
                          · {{ address.city }}
                        </p>
                      </div>
                      @if (address.isDefault) {
                        <tal-status-chip label="Default" tone="success" />
                      }
                    </div>
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      @if (!address.isDefault) {
                        <tal-button
                          variant="secondary"
                          size="md"
                          [busy]="isAddressBusy(address.id)"
                          (pressed)="setDefault(address.id)"
                        >
                          Set as default
                        </tal-button>
                      }
                      <tal-button
                        variant="ghost"
                        size="md"
                        [busy]="isAddressBusy(address.id)"
                        (pressed)="confirmRemove(address)"
                      >
                        Remove
                      </tal-button>
                    </div>
                  </div>
                </li>
              }
            </ul>
          }
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
  private readonly dialog = inject(DialogService);

  protected readonly profile = this.profileStore.profile;

  private readonly model = signal<ProfileFormModel>({
    fullName: '',
    age: null,
    phoneNumber: '',
  });

  protected readonly isEditing = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<AppError | null>(null);
  protected readonly saveSuccess = signal(false);
  protected readonly addressBusy = signal<number | null>(null);
  protected readonly addressError = signal<AppError | null>(null);

  protected readonly profileForm: FieldTree<ProfileFormModel> = form(
    this.model,
    (f) => {
      required(f.fullName, { message: 'Full name is required.' });
      required(f.age, { message: 'Age is required.' });
      validate(f.fullName, ({ value }) =>
        value().trim().length === 0
          ? { kind: 'fullName-blank', message: 'Enter your full name.' }
          : undefined,
      );
      validate(f.age, ({ value }) => {
        const v = value();
        if (v === null) return { kind: 'age-required', message: 'Age is required.' };
        if (!Number.isInteger(v) || v <= 0) {
          return { kind: 'age-invalid', message: 'Enter a whole number greater than zero.' };
        }
        if (!Number.isSafeInteger(v)) return { kind: 'age-unsafe', message: 'Enter a valid age.' };
        return undefined;
      });
    },
  );

  protected startEditing(): void {
    if (this.isSaving()) return;
    const current = this.profile();
    if (!current) return;

    this.model.set({
      fullName: current.fullName,
      age: current.age,
      phoneNumber: current.phoneNumber ?? '',
    });
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    if (this.isSaving()) return;
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.isEditing.set(false);
  }

  protected async saveProfile(event: Event): Promise<void> {
    event.preventDefault();
    if (this.isSaving()) return;

    this.profileForm().markAsTouched();
    if (this.profileForm().invalid()) return;

    const current = this.model();
    const request: UpdateProfileRequest = {
      fullName: current.fullName.trim(),
      age: current.age!,
      phoneNumber: current.phoneNumber.trim() === '' ? null : current.phoneNumber.trim(),
    };

    this.isSaving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.profileStore.updateProfile(request);
      this.isEditing.set(false);
      this.saveSuccess.set(true);
    } catch (error) {
      this.saveError.set(error as AppError);
    } finally {
      this.isSaving.set(false);
    }
  }

  protected isAddressBusy(addressId: number): boolean {
    return this.addressBusy() === addressId;
  }

  protected addAddress(): void {
    this.addressError.set(null);
    this.dialog.openModal<AddressResponse, void, AddressFormModalComponent>(
      AddressFormModalComponent,
      {
        ariaLabel: 'Add delivery address',
        maxWidth: '32rem',
      },
    );
  }

  protected async setDefault(addressId: number): Promise<void> {
    if (this.addressBusy() !== null) return;
    this.addressError.set(null);
    this.addressBusy.set(addressId);
    try {
      await this.profileStore.setDefaultAddress(addressId);
    } catch (error) {
      this.addressError.set(error as AppError);
    } finally {
      this.addressBusy.set(null);
    }
  }

  protected async confirmRemove(address: AddressDto): Promise<void> {
    if (this.addressBusy() !== null) return;

    const ref = this.dialog.openSheet<boolean, void, RemoveAddressDialogComponent>(
      RemoveAddressDialogComponent,
      {
        ariaLabel: 'Remove address confirmation',
      },
    );
    const confirmed = await firstValueFrom(ref.closed.pipe(take(1)));
    if (!confirmed) return;

    this.addressError.set(null);
    this.addressBusy.set(address.id);
    try {
      await this.profileStore.removeAddress(address.id);
    } catch (error) {
      this.addressError.set(error as AppError);
    } finally {
      this.addressBusy.set(null);
    }
  }
}
