import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartLineItemDto } from '@talabat/api-customer';

import { CartItemRowComponent } from './cart-item-row.component';

describe('CartItemRowComponent', () => {
  let fixture: ComponentFixture<CartItemRowComponent>;

  const item: CartLineItemDto = {
    productId: 101,
    productName: 'Super Chicken Burger',
    unitPrice: { amount: 150, currency: 'EGP' },
    quantity: 2,
    lineTotal: { amount: 300, currency: 'EGP' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartItemRowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CartItemRowComponent);
    fixture.componentRef.setInput('item', item);
    fixture.detectChanges();
  });

  it('renders product name, unit price, quantity, and line total', () => {
    expect(fixture.nativeElement.textContent).toContain('Super Chicken Burger');
    expect(fixture.nativeElement.textContent).toContain('150.00');
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.textContent).toContain('300.00');
  });

  it('gives quantity and remove controls accessible names', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );

    expect(buttons).toHaveLength(3);
    expect(buttons[0]!.getAttribute('aria-label')).toContain('Decrease quantity of');
    expect(buttons[1]!.getAttribute('aria-label')).toContain('Increase quantity of');
    expect(buttons[2]!.getAttribute('aria-label')).toContain('Remove');
  });

  it('keeps quantity controls in a labelled group', () => {
    const group = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;
    expect(group).toBeTruthy();
    expect(group.getAttribute('aria-label')).toContain('Super Chicken Burger');
  });

  it('emits increment, decrement, and remove with the item', () => {
    const increment = vi.fn();
    const decrement = vi.fn();
    const remove = vi.fn();
    fixture.componentInstance.increment.subscribe(increment);
    fixture.componentInstance.decrement.subscribe(decrement);
    fixture.componentInstance.remove.subscribe(remove);

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0]!.click();
    buttons[1]!.click();
    buttons[2]!.click();

    expect(decrement).toHaveBeenCalledWith(item);
    expect(increment).toHaveBeenCalledWith(item);
    expect(remove).toHaveBeenCalledWith(item);
  });

  it('disables all controls while busy', () => {
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    for (const button of Array.from(buttons)) {
      expect(button.disabled).toBe(true);
    }
  });
});
