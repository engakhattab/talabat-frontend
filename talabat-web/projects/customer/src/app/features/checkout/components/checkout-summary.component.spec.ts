import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { CartLineItemDto } from '@talabat/api-customer';

import { CartStore } from '../../cart/cart.store';
import { CheckoutSummaryComponent } from './checkout-summary.component';

describe('CheckoutSummaryComponent', () => {
  let fixture: ComponentFixture<CheckoutSummaryComponent>;

  const money = (amount: number) => ({ amount, currency: 'EGP' });

  const items: CartLineItemDto[] = [
    { productId: 101, productName: 'Super Chicken Burger', unitPrice: money(150), quantity: 2, lineTotal: money(300) },
    { productId: 102, productName: 'Fries', unitPrice: money(50), quantity: 1, lineTotal: money(50) },
  ];

  const createFixture = (): ComponentFixture<CheckoutSummaryComponent> => {
    TestBed.configureTestingModule({
      imports: [CheckoutSummaryComponent],
      providers: [
        {
          provide: CartStore,
          useValue: {
            items: signal(items).asReadonly(),
            total: signal(money(350)).asReadonly(),
          },
        },
      ],
    });

    const created = TestBed.createComponent(CheckoutSummaryComponent);
    created.detectChanges();
    return created;
  };

  it('renders the server-authoritative line items with quantity and unit price', () => {
    fixture = createFixture();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Super Chicken Burger');
    expect(text).toContain('2 × EGP\u00A0150.00');
    expect(text).toContain('Fries');
    expect(text).toContain('1 × EGP\u00A050.00');
  });

  it('renders each line total from the cart', () => {
    fixture = createFixture();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('EGP\u00A0300.00');
    expect(text).toContain('EGP\u00A050.00');
  });

  it('renders the server grand total from the cart', () => {
    fixture = createFixture();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('EGP\u00A0350.00');
  });

  it('displays the Cash on Delivery payment method badge', () => {
    fixture = createFixture();

    expect(fixture.nativeElement.textContent).toContain('Cash on Delivery');
  });
});
