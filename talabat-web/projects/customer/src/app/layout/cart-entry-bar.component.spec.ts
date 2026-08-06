import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartStore } from '../features/cart/cart.store';

import { CartEntryBarComponent } from './cart-entry-bar.component';

describe('CartEntryBarComponent', () => {
  let fixture: ComponentFixture<CartEntryBarComponent>;
  let itemCountSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    itemCountSignal = signal(0);

    await TestBed.configureTestingModule({
      imports: [CartEntryBarComponent],
      providers: [
        provideRouter([]),
        {
          provide: CartStore,
          useValue: { totalItemCount: itemCountSignal.asReadonly() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartEntryBarComponent);
    fixture.detectChanges();
  });

  it('renders an absolute link to the cart page', () => {
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/cart');
  });

  it('hides the badge when the cart is empty', () => {
    expect(fixture.nativeElement.textContent).not.toMatch(/\d/);
  });

  it('shows the item count reactively', () => {
    itemCountSignal.set(3);
    fixture.detectChanges();

    const badge = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('span'),
    ).find((el: Element) => el.textContent?.trim() === '3');
    expect(badge).toBeTruthy();
  });
});
