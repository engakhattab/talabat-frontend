import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AddressesApiService, ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { ProfileStore } from '../../../core/profile/profile.store';
import { CheckoutStore } from '../checkout.store';
import { AddressFormModalComponent } from './address-form-modal.component';

describe('AddressFormModalComponent', () => {
  let fixture: ComponentFixture<AddressFormModalComponent>;
  let component: AddressFormModalComponent;
  let api: { addAddress: ReturnType<typeof vi.fn> };
  let profileStore: {
    profile: ReturnType<typeof signal<ProfileResponse | null>>;
    refreshAfterCreation: ReturnType<typeof vi.fn>;
  };
  let checkoutStore: { selectAddress: ReturnType<typeof vi.fn> };
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  const profile: ProfileResponse = {
    id: 12,
    fullName: 'Test User',
    age: 25,
    phoneNumber: null,
    addresses: [],
  };

  beforeEach(async () => {
    api = { addAddress: vi.fn() };
    profileStore = {
      profile: signal(profile),
      refreshAfterCreation: vi.fn(),
    };
    checkoutStore = { selectAddress: vi.fn() };
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddressFormModalComponent],
      providers: [
        { provide: DialogRef, useValue: dialogRef },
        { provide: AddressesApiService, useValue: api },
        {
          provide: ProfileStore,
          useValue: {
            profile: profileStore.profile.asReadonly(),
            refreshAfterCreation: profileStore.refreshAfterCreation,
          },
        },
        { provide: CheckoutStore, useValue: checkoutStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddressFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const fill = (key: string, value: string): void => {
    const input = fixture.nativeElement.querySelector(`#address-${key}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('renders the required address form controls', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Street');
    expect(text).toContain('Building number');
    expect(text).toContain('Floor (optional)');
    expect(text).toContain('City');
    expect(text).toContain('Make this my default address');
  });

  it('shows validation errors for blank required fields', () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Street is required.');
    expect(text).toContain('Building number is required.');
    expect(text).toContain('City is required.');
    expect(api.addAddress).not.toHaveBeenCalled();
  });

  it('submits an AddAddressRequest with trimmed values and a null floor when blank', () => {
    api.addAddress.mockReturnValue(of({ id: 5, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: false }));
    profileStore.refreshAfterCreation.mockResolvedValue({ kind: 'loaded', profile });

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Cairo');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(api.addAddress).toHaveBeenCalledWith({
      addAddressRequest: {
        street: '10 Talaat Harb',
        city: 'Cairo',
        buildingNumber: '12',
        floor: null,
        makeDefault: false,
      },
    });
  });

  it('sends the floor and makeDefault when provided', () => {
    api.addAddress.mockReturnValue(of({ id: 5, street: '5 Nile', city: 'Giza', buildingNumber: '8', floor: '2', isDefault: true }));

    fill('street', '5 Nile');
    fill('buildingNumber', '8');
    fill('floor', '2');
    fill('city', 'Giza');

    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(api.addAddress).toHaveBeenCalledWith({
      addAddressRequest: {
        street: '5 Nile',
        city: 'Giza',
        buildingNumber: '8',
        floor: '2',
        makeDefault: true,
      },
    });
  });

  it('refreshes the profile, auto-selects the new address, and closes on success', async () => {
    const created = { id: 7, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: true };
    api.addAddress.mockReturnValue(of(created));
    profileStore.refreshAfterCreation.mockResolvedValue({ kind: 'loaded', profile });

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Cairo');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    await Promise.resolve();
    await Promise.resolve();

    expect(profileStore.refreshAfterCreation).toHaveBeenCalledTimes(1);
    expect(checkoutStore.selectAddress).toHaveBeenCalledWith(7);
    expect(dialogRef.close).toHaveBeenCalledTimes(1);
  });

  it('preserves and renders a server error without closing', async () => {
    const error: AppError = {
      status: 400,
      code: AppErrorCode.Unknown,
      title: 'Invalid address',
      detail: 'City is not supported.',
      isNetworkError: false,
    };
    api.addAddress.mockReturnValue(throwError(() => error));

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Nowhere');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Invalid address');
    expect(fixture.nativeElement.textContent).toContain('City is not supported.');
  });

  it('ignores submission while busy', async () => {
    api.addAddress.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );
    profileStore.refreshAfterCreation.mockResolvedValue({ kind: 'loaded', profile });

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Cairo');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(api.addAddress).toHaveBeenCalledTimes(1);
  });
});
