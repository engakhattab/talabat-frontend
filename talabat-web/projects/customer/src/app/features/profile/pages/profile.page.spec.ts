import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { DialogService } from '@talabat/shared-ui';
import { ProfileStore } from '../../../core/profile/profile.store';

import { AddressFormModalComponent } from '../../../ui/address-form-modal.component';
import { RemoveAddressDialogComponent } from '../components/remove-address-dialog.component';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let harness: ReturnType<typeof createProfileHarness>;
  let dialog: { openSheet: ReturnType<typeof vi.fn>; openModal: ReturnType<typeof vi.fn> };

  const defaultProfile: ProfileResponse = {
    id: 1,
    fullName: 'Jane Doe',
    age: 30,
    phoneNumber: '+20 100 123 4567',
    addresses: [],
  };

  beforeEach(() => {
    harness = createProfileHarness(defaultProfile);
    dialog = { openSheet: vi.fn(), openModal: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        { provide: ProfileStore, useValue: harness.store },
        { provide: DialogService, useValue: dialog },
      ],
    });
  });

  function createPage(): void {
    fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
  }

  function buttonWithText(label: string): HTMLButtonElement {
    const button = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((el: Element) => el.textContent?.includes(label)) as HTMLButtonElement;
    expect(button).toBeTruthy();
    return button;
  }

  function fill(key: string, value: string): void {
    const input = fixture.nativeElement.querySelector(`#profile-${key}`) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function submitForm(): void {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();
  }

  async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('renders profile values as labelled description terms', () => {
    createPage();

    const terms = Array.from(
      fixture.nativeElement.querySelectorAll('dt') as NodeListOf<HTMLElement>,
    ).map((dt) => dt.textContent?.trim());
    const values = Array.from(
      fixture.nativeElement.querySelectorAll('dd') as NodeListOf<HTMLElement>,
    ).map((dd) => dd.textContent?.trim());

    expect(terms).toContain('Full Name');
    expect(terms).toContain('Age');
    expect(terms).toContain('Phone Number');
    expect(values).toContain('Jane Doe');
    expect(values).toContain('30');
    expect(values).toContain('+20 100 123 4567');
  });

  it('shows a muted Not provided value when the phone number is missing', () => {
    harness.setProfile({ ...defaultProfile, phoneNumber: null });
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Not provided');
  });

  it('renders a Browse restaurants action', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('Browse restaurants');
  });

  it('pre-populates the edit form with the current profile values', async () => {
    createPage();

    buttonWithText('Edit profile').click();
    fixture.detectChanges();
    await fixture.whenStable();

    const fullName = fixture.nativeElement.querySelector('#profile-fullName') as HTMLInputElement;
    const age = fixture.nativeElement.querySelector('#profile-age') as HTMLInputElement;
    const phoneNumber = fixture.nativeElement.querySelector(
      '#profile-phoneNumber',
    ) as HTMLInputElement;

    expect(fullName.value).toBe('Jane Doe');
    expect(age.value).toBe('30');
    expect(phoneNumber.value).toBe('+20 100 123 4567');
  });

  it('returns to view mode without saving when edit is cancelled', () => {
    createPage();

    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Save changes');

    buttonWithText('Cancel').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Save changes');
    expect(harness.store.updateProfile).not.toHaveBeenCalled();
  });

  it('shows a required error for a cleared full name without submitting', () => {
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', '');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('Full name is required.');
    expect(harness.store.updateProfile).not.toHaveBeenCalled();
  });

  it('associates invalid profile fields with their announced errors', () => {
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();
    fill('fullName', '');
    fill('age', '');
    submitForm();

    const fullName = fixture.nativeElement.querySelector('#profile-fullName') as HTMLInputElement;
    const age = fixture.nativeElement.querySelector('#profile-age') as HTMLInputElement;
    expect(fullName.getAttribute('aria-invalid')).toBe('true');
    expect(fullName.getAttribute('aria-describedby')).toBe('profile-fullName-error');
    expect(age.getAttribute('aria-invalid')).toBe('true');
    expect(age.getAttribute('aria-describedby')).toBe('profile-age-error');
    expect(fixture.nativeElement.querySelector('#profile-fullName-error')?.getAttribute('role')).toBe('alert');
  });

  it('rejects a whitespace-only full name', () => {
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', '   ');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain('Enter your full name.');
    expect(harness.store.updateProfile).not.toHaveBeenCalled();
  });

  it('rejects a non-positive age and preserves entered values', () => {
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', 'Jane Smith');
    fill('age', '0');
    fill('phoneNumber', '+20 100 555 0000');
    submitForm();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter a whole number greater than zero.',
    );
    expect(harness.store.updateProfile).not.toHaveBeenCalled();

    const fullName = fixture.nativeElement.querySelector('#profile-fullName') as HTMLInputElement;
    expect(fullName.value).toBe('Jane Smith');
  });

  it('submits an update request and returns to view mode with a success indication', async () => {
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', '  Jane Smith  ');
    fill('age', '31');
    fill('phoneNumber', '+20 100 555 0000');
    submitForm();
    await flush();

    expect(harness.store.updateProfile).toHaveBeenCalledWith({
      fullName: 'Jane Smith',
      age: 31,
      phoneNumber: '+20 100 555 0000',
    });
    expect(fixture.nativeElement.textContent).not.toContain('Save changes');
    expect(fixture.nativeElement.textContent).toContain('Your profile has been updated.');
  });

  it('reflects the updated server profile in view mode after saving', async () => {
    const updated: ProfileResponse = {
      ...defaultProfile,
      fullName: 'Jane Smith',
      age: 31,
      phoneNumber: '+20 100 555 0000',
    };
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', 'Jane Smith');
    fill('age', '31');
    fill('phoneNumber', '+20 100 555 0000');
    submitForm();

    harness.setProfile(updated);
    await flush();

    expect(fixture.nativeElement.textContent).toContain('Jane Smith');
    expect(fixture.nativeElement.textContent).toContain('31');
  });

  it('stays in edit mode and shows feature-owned error copy when the update fails', async () => {
    const error: AppError = {
      status: 400,
      code: AppErrorCode.InvalidCustomerProfile,
      title: 'Invalid profile data',
      detail: 'Age is not supported.',
      isNetworkError: false,
    };
    harness.store.updateProfile.mockRejectedValue(error);
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', 'Jane Smith');
    fill('age', '31');
    submitForm();
    await flush();

    expect(fixture.nativeElement.textContent).toContain('Save changes');
    expect(fixture.nativeElement.textContent).toContain(
      'Some profile details are invalid. Please review them and try again.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('Invalid profile data');
    expect(fixture.nativeElement.textContent).not.toContain('Age is not supported.');

    const fullName = fixture.nativeElement.querySelector('#profile-fullName') as HTMLInputElement;
    expect(fullName.value).toBe('Jane Smith');
  });

  it('shows a network save error without leaking backend detail', async () => {
    const error: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      detail: 'backend trace xyz-987',
      isNetworkError: true,
    };
    harness.store.updateProfile.mockRejectedValue(error);
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', 'Jane Smith');
    fill('age', '31');
    submitForm();
    await flush();

    expect(fixture.nativeElement.textContent).toContain(
      'Cannot reach the server. Check your connection and try again.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('backend trace xyz-987');
  });

  it('renders generic T017 copy for an unknown ProblemDetails save error without raw text', async () => {
    const error: AppError = {
      status: 502,
      code: AppErrorCode.Unknown,
      title: 'Gateway blew up correlation 8a1f',
      detail: 'token super-secret',
      isNetworkError: false,
    };
    harness.store.updateProfile.mockRejectedValue(error);
    createPage();
    buttonWithText('Edit profile').click();
    fixture.detectChanges();

    fill('fullName', 'Jane Smith');
    fill('age', '31');
    submitForm();
    await flush();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong. Please try again.');
    expect(fixture.nativeElement.textContent).not.toContain('Gateway blew up');
    expect(fixture.nativeElement.textContent).not.toContain('8a1f');
    expect(fixture.nativeElement.textContent).not.toContain('token super-secret');
  });


  it('renders a network banner for address operations without leaking details', async () => {
    const error: AppError = {
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      detail: 'backend trace abc-123',
      isNetworkError: true,
    };
    harness.setProfile({
      ...defaultProfile,
      addresses: [{ id: 2, street: '5 Nile', city: 'Giza', buildingNumber: '8', floor: null, isDefault: false }],
    });
    harness.store.setDefaultAddress.mockRejectedValue(error);
    createPage();

    buttonWithText('Set as default').click();
    await flush();

    expect(fixture.nativeElement.textContent).toContain(
      'Cannot reach the server. Check your connection and try again.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('backend trace abc-123');
  });

  it('renders the saved address list with details and a Default badge', () => {
    harness.setProfile({
      ...defaultProfile,
      addresses: [
        { id: 1, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: true },
        { id: 2, street: '5 Nile', city: 'Giza', buildingNumber: '8', floor: '2', isDefault: false },
      ],
    });
    createPage();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('10 Talaat Harb');
    expect(text).toContain('Building 12');
    expect(text).toContain('5 Nile');
    expect(text).toContain('Floor 2');
    expect(text).toContain('Giza');
    expect(text).toContain('Default');
  });

  it('shows an empty state with an add action when there are no addresses', () => {
    createPage();

    expect(fixture.nativeElement.textContent).toContain('No saved addresses');
    expect(buttonWithText('Add address')).toBeTruthy();
  });

  it('opens the shared address form modal for the add address action', () => {
    createPage();

    buttonWithText('Add address').click();

    expect(dialog.openModal).toHaveBeenCalledWith(
      AddressFormModalComponent,
      expect.objectContaining({ ariaLabel: 'Add delivery address' }),
    );
  });

  it('sets an address as default via the store', () => {
    harness.setProfile({
      ...defaultProfile,
      addresses: [
        { id: 1, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: true },
        { id: 2, street: '5 Nile', city: 'Giza', buildingNumber: '8', floor: '2', isDefault: false },
      ],
    });
    createPage();

    buttonWithText('Set as default').click();

    expect(harness.store.setDefaultAddress).toHaveBeenCalledWith(2);
  });

  it('removes an address only after confirmation', async () => {
    harness.setProfile({
      ...defaultProfile,
      addresses: [{ id: 2, street: '5 Nile', city: 'Giza', buildingNumber: '8', floor: null, isDefault: false }],
    });
    createPage();

    const closed = new Subject<boolean>();
    dialog.openSheet.mockReturnValue({ closed: closed.asObservable() });

    buttonWithText('Remove').click();
    expect(dialog.openSheet).toHaveBeenCalledWith(
      RemoveAddressDialogComponent,
      expect.objectContaining({ ariaLabel: 'Remove address confirmation' }),
    );

    closed.next(true);
    closed.complete();
    await fixture.whenStable();

    expect(harness.store.removeAddress).toHaveBeenCalledWith(2);
  });

  it('keeps the address when removal is dismissed', async () => {
    harness.setProfile({
      ...defaultProfile,
      addresses: [{ id: 2, street: '5 Nile', city: 'Giza', buildingNumber: '8', floor: null, isDefault: false }],
    });
    createPage();

    const closed = new Subject<boolean>();
    dialog.openSheet.mockReturnValue({ closed: closed.asObservable() });

    buttonWithText('Remove').click();

    closed.next(false);
    closed.complete();
    await fixture.whenStable();

    expect(harness.store.removeAddress).not.toHaveBeenCalled();
  });
});

function createProfileHarness(initial: ProfileResponse) {
  const profile = signal<ProfileResponse>(initial);

  const store = {
    profile: profile.asReadonly(),
    updateProfile: vi.fn().mockResolvedValue(initial),
    setDefaultAddress: vi.fn().mockResolvedValue(undefined),
    removeAddress: vi.fn().mockResolvedValue(undefined),
  };

  return {
    store,
    setProfile: (value: ProfileResponse) => profile.set(value),
  };
}
