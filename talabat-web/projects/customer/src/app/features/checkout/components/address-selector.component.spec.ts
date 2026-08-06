import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AddressDto } from '@talabat/api-customer';

import { CheckoutStore } from '../checkout.store';
import { AddressSelectorComponent } from './address-selector.component';

describe('AddressSelectorComponent', () => {
  let fixture: ComponentFixture<AddressSelectorComponent>;
  let selectAddress: ReturnType<typeof vi.fn>;

  const addresses: AddressDto[] = [
    {
      id: 1,
      street: '10 Talaat Harb',
      buildingNumber: '12',
      city: 'Cairo',
      floor: '3',
      isDefault: false,
    },
    {
      id: 2,
      street: '5 Nile Corniche',
      buildingNumber: '8',
      city: 'Giza',
      floor: null,
      isDefault: true,
    },
  ];

  const createFixture = (overrides: {
    addresses?: AddressDto[];
    selectedAddressId?: number | null;
    isSubmitting?: boolean;
  } = {}): ComponentFixture<AddressSelectorComponent> => {
    selectAddress = vi.fn();
    const addressesSignal = signal(overrides.addresses ?? addresses);
    const selectedAddressIdSignal = signal<number | null>(
      overrides.selectedAddressId !== undefined ? overrides.selectedAddressId : 2,
    );
    const isSubmittingSignal = signal(overrides.isSubmitting ?? false);

    TestBed.configureTestingModule({
      imports: [AddressSelectorComponent],
      providers: [
        {
          provide: CheckoutStore,
          useValue: {
            addresses: addressesSignal.asReadonly(),
            selectedAddressId: selectedAddressIdSignal.asReadonly(),
            isSubmitting: isSubmittingSignal.asReadonly(),
            selectAddress,
          },
        },
      ],
    });

    const created = TestBed.createComponent(AddressSelectorComponent);
    created.detectChanges();
    return created;
  };

  it('renders an address card for every saved address', () => {
    fixture = createFixture();

    const labels = fixture.nativeElement.querySelectorAll('label');
    expect(labels.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('10 Talaat Harb');
    expect(fixture.nativeElement.textContent).toContain('Building 12');
    expect(fixture.nativeElement.textContent).toContain('Floor 3');
    expect(fixture.nativeElement.textContent).toContain('Cairo');
  });

  it('renders addresses without a floor value', () => {
    fixture = createFixture();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('5 Nile Corniche');
    expect(text).toContain('Building 8');
    expect(text).toContain('Giza');
  });

  it('highlights the default address with a Default badge', () => {
    fixture = createFixture();

    const defaultLabel = [...fixture.nativeElement.querySelectorAll('label')].find((label: HTMLElement) =>
      label.textContent?.includes('5 Nile Corniche'),
    );
    expect(defaultLabel?.textContent).toContain('Default');
  });

  it('pre-selects the selected address radio', () => {
    fixture = createFixture();

    const radios = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="radio"]'),
    ) as HTMLInputElement[];
    expect(radios[1]!.checked).toBe(true);
    expect(radios[0]!.checked).toBe(false);
  });

  it('selects an address when its radio is changed', () => {
    fixture = createFixture();

    const radios = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="radio"]'),
    ) as HTMLInputElement[];
    radios[0]!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(selectAddress).toHaveBeenCalledWith(addresses[0]!.id);
  });

  it('disables the radios while a submission is in flight', () => {
    fixture = createFixture({ isSubmitting: true });

    const radios = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="radio"]'),
    ) as HTMLInputElement[];
    expect(radios[0]!.disabled).toBe(true);
    expect(radios[1]!.disabled).toBe(true);
  });

  it('provides a minimum 42px touch target on each address card', () => {
    fixture = createFixture();

    const labels = fixture.nativeElement.querySelectorAll('label') as NodeListOf<HTMLElement>;
    labels.forEach((label) => {
      expect(label.classList.contains('min-h-[42px]')).toBe(true);
    });
  });
});
