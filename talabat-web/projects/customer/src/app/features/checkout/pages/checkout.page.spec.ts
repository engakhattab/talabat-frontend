import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AddressDto, CartLineItemDto } from '@talabat/api-customer';
import { DialogService } from '@talabat/shared-ui';

import { CartStore } from '../../cart/cart.store';
import { CheckoutStore } from '../checkout.store';
import { CheckoutPage } from './checkout.page';

describe('CheckoutPage', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let submitOrder: ReturnType<typeof vi.fn>;
  let dialog: { openModal: ReturnType<typeof vi.fn> };

  const money = (amount: number) => ({ amount, currency: 'EGP' });

  const addresses: AddressDto[] = [
    { id: 1, street: '10 Talaat Harb', buildingNumber: '12', floor: '3', city: 'Cairo', isDefault: true },
  ];

  const items: CartLineItemDto[] = [
    { productId: 101, productName: 'Super Chicken Burger', unitPrice: money(150), quantity: 2, lineTotal: money(300) },
  ];

  const createFixture = (overrides: {
    isSubmitting?: boolean;
    canSubmit?: boolean;
    hasSavedAddresses?: boolean;
    noticeTitle?: string | null;
  } = {}): ComponentFixture<CheckoutPage> => {
    submitOrder = vi.fn();
    dialog = { openModal: vi.fn() };

    const isSubmitting = signal(overrides.isSubmitting ?? false);
    const canSubmit = signal(overrides.canSubmit ?? true);
    const hasSavedAddresses = signal(overrides.hasSavedAddresses ?? true);
    const notice = signal(
      overrides.noticeTitle ? { kind: 'general', title: overrides.noticeTitle } : null,
    );

    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        {
          provide: CheckoutStore,
          useValue: {
            hasSavedAddresses: hasSavedAddresses.asReadonly(),
            isSubmitting: isSubmitting.asReadonly(),
            canSubmit: canSubmit.asReadonly(),
            notice: notice.asReadonly(),
            addresses: signal(addresses).asReadonly(),
            selectedAddressId: signal(1).asReadonly(),
            submitOrder,
            selectAddress: vi.fn(),
          },
        },
        {
          provide: CartStore,
          useValue: {
            items: signal(items).asReadonly(),
            total: signal(money(350)).asReadonly(),
            isEmpty: signal(false).asReadonly(),
          },
        },
        { provide: DialogService, useValue: dialog },
      ],
    });

    const created = TestBed.createComponent(CheckoutPage);
    created.detectChanges();
    return created;
  };

  it('renders the checkout heading, address selector, and summary', () => {
    fixture = createFixture();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Checkout');
    expect(text).toContain('10 Talaat Harb');
    expect(text).toContain('Super Chicken Burger');
    expect(text).toContain('Place Order');
  });

  it('shows an address prompt when no saved addresses exist', () => {
    fixture = createFixture({ hasSavedAddresses: false });

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('You need a saved delivery address to place an order.');
  });

  const placeOrderButton = (): HTMLButtonElement => {
    const buttons = fixture.nativeElement.querySelectorAll('tal-button');
    const place = [...buttons].find((b: HTMLElement) =>
      b.textContent?.includes('Place Order') || b.textContent?.includes('Placing order'),
    ) as HTMLElement;
    return place.querySelector('button') as HTMLButtonElement;
  };

  it('disables the Place Order button when submission is not possible', () => {
    fixture = createFixture({ canSubmit: false });

    expect(placeOrderButton().disabled).toBe(true);
  });

  it('sets aria-busy on the Place Order button while submitting', () => {
    fixture = createFixture({ isSubmitting: true });

    const button = placeOrderButton();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Placing order...');
  });

  it('submits the order when Place Order is pressed', () => {
    fixture = createFixture();

    placeOrderButton().click();
    fixture.detectChanges();

    expect(submitOrder).toHaveBeenCalledTimes(1);
  });

  it('announces submission through an ARIA live region', () => {
    fixture = createFixture({ isSubmitting: true });

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.textContent).toContain('Placing your order');
  });

  it('renders the order notice as an alert when present', () => {
    fixture = createFixture({ noticeTitle: 'Some items are no longer available' });

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('Some items are no longer available');
  });

  it('opens the address form dialog from the Add Delivery Address button', () => {
    fixture = createFixture();

    const buttons = fixture.nativeElement.querySelectorAll('tal-button');
    const addButton = [...buttons].find((b: HTMLElement) =>
      b.textContent?.includes('Add Delivery Address'),
    ) as HTMLElement;
    (addButton.querySelector('button') as HTMLButtonElement).click();

    expect(dialog.openModal).toHaveBeenCalledTimes(1);
  });

  it('is responsive with a single-column layout', () => {
    fixture = createFixture();

    const root = fixture.nativeElement.firstElementChild as HTMLElement;
    expect(root.classList.contains('mx-auto')).toBe(true);
    expect(root.classList.contains('max-w-2xl')).toBe(true);
  });
});
