import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@angular/cdk/dialog';
import { signal } from '@angular/core';
import { throwError } from 'rxjs';

import { AddressResponse, ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { ProfileStore } from '../core/profile/profile.store';
import { AddressFormModalComponent } from './address-form-modal.component';

describe('AddressFormModalComponent', () => {
  let fixture: ComponentFixture<AddressFormModalComponent>;
  let component: AddressFormModalComponent;
  let profileStore: {
    addAddress: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  const profile: ProfileResponse = {
    id: 12,
    fullName: 'Test User',
    age: 25,
    phoneNumber: null,
    addresses: [],
  };

  beforeEach(async () => {
    profileStore = { addAddress: vi.fn() };
    dialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [AddressFormModalComponent],
      providers: [
        { provide: DialogRef, useValue: dialogRef },
        {
          provide: ProfileStore,
          useValue: {
            profile: signal(profile).asReadonly(),
            addAddress: profileStore.addAddress,
          },
        },
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
    expect(profileStore.addAddress).not.toHaveBeenCalled();
  });

  it('submits an AddAddressRequest with trimmed values and a null floor when blank', () => {
    profileStore.addAddress.mockResolvedValue({
      id: 5,
      street: '10 Talaat Harb',
      city: 'Cairo',
      buildingNumber: '12',
      floor: null,
      isDefault: false,
    });

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Cairo');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(profileStore.addAddress).toHaveBeenCalledWith({
      street: '10 Talaat Harb',
      city: 'Cairo',
      buildingNumber: '12',
      floor: null,
      makeDefault: false,
    });
  });

  it('sends the floor and makeDefault when provided', () => {
    profileStore.addAddress.mockResolvedValue({
      id: 5,
      street: '5 Nile',
      city: 'Giza',
      buildingNumber: '8',
      floor: '2',
      isDefault: true,
    });

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

    expect(profileStore.addAddress).toHaveBeenCalledWith({
      street: '5 Nile',
      city: 'Giza',
      buildingNumber: '8',
      floor: '2',
      makeDefault: true,
    });
  });

  it('closes the dialog with the created AddressResponse on success', async () => {
    const created: AddressResponse = {
      id: 7,
      street: '10 Talaat Harb',
      city: 'Cairo',
      buildingNumber: '12',
      floor: null,
      isDefault: true,
    };
    profileStore.addAddress.mockResolvedValue(created);

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Cairo');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    await Promise.resolve();
    await Promise.resolve();

    expect(profileStore.addAddress).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith(created);
  });

  it('closes with undefined on cancel', () => {
    const buttons = fixture.nativeElement.querySelectorAll('tal-button');
    const cancelButton = [...buttons].find((b: HTMLElement) =>
      b.textContent?.includes('Cancel'),
    ) as HTMLElement;
    (cancelButton.querySelector('button') as HTMLButtonElement).click();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('preserves and renders a server error without closing', async () => {
    const error: AppError = {
      status: 400,
      code: AppErrorCode.Unknown,
      title: 'Invalid address',
      detail: 'City is not supported.',
      isNetworkError: false,
    };
    profileStore.addAddress.mockRejectedValue(error);

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
    profileStore.addAddress.mockReturnValue(
      new Promise(() => {
        /* never resolves */
      }),
    );

    fill('street', '10 Talaat Harb');
    fill('buildingNumber', '12');
    fill('city', 'Cairo');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    expect(profileStore.addAddress).toHaveBeenCalledTimes(1);
  });
});
