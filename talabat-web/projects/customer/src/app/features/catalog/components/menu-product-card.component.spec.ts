import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuProductDto } from '@talabat/api-customer';

import { CartEntryRequest, MenuProductCardComponent } from './menu-product-card.component';

describe('MenuProductCardComponent', () => {
  let component: MenuProductCardComponent;
  let fixture: ComponentFixture<MenuProductCardComponent>;
  let emitted: CartEntryRequest[];

  const product: MenuProductDto = {
    id: 1,
    name: 'Test Burger',
    description: 'A delicious burger',
    price: { amount: 25.5, currency: 'EGP' },
    isAvailable: true,
  };

  beforeEach(async () => {
    emitted = [];

    await TestBed.configureTestingModule({
      imports: [MenuProductCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MenuProductCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', product);
    fixture.componentRef.setInput('restaurantId', 42);
    component.cartEntry.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
  });

  it('renders product name, description, and price', () => {
    expect(fixture.nativeElement.textContent).toContain('Test Burger');
    expect(fixture.nativeElement.textContent).toContain('A delicious burger');
    expect(fixture.nativeElement.textContent).toContain('25.50');
  });

  it('emits cart entry request when available product is clicked', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual([{ restaurantId: 42, productId: 1 }]);
  });

  it('disables button for unavailable products', () => {
    fixture.componentRef.setInput('product', { ...product, isAvailable: false });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Unavailable');
  });

  it('does not emit for unavailable products', () => {
    fixture.componentRef.setInput('product', { ...product, isAvailable: false });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emitted).toHaveLength(0);
  });
});
