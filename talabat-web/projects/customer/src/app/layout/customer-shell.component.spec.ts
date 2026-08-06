import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';
import { CartStore } from '../features/cart/cart.store';
import { ProfileStore } from '../core/profile/profile.store';

import { CustomerShellComponent } from './customer-shell.component';

describe('CustomerShellComponent', () => {
  let fixture: ComponentFixture<CustomerShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            user: signal(null).asReadonly(),
            isAuthenticated: signal(false).asReadonly(),
            busy: signal(false).asReadonly(),
            initialized: signal(true).asReadonly(),
            signIn: vi.fn().mockResolvedValue(undefined),
            signOut: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CartStore,
          useValue: { totalItemCount: signal(0).asReadonly() },
        },
        ProfileStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerShellComponent);
    fixture.detectChanges();
  });

  it('renders a single main landmark with the skip link target', () => {
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(main).toBeTruthy();
    expect(main.getAttribute('id')).toBe('main-content');
  });

  it('renders a skip link pointing at the main landmark', () => {
    const skipLink = fixture.nativeElement.querySelector('a[href="#main-content"]') as HTMLAnchorElement;
    expect(skipLink).toBeTruthy();
  });

  it('includes the header and persistent cart entry', () => {
    expect(fixture.nativeElement.querySelector('tal-header')).toBeTruthy();
    const cartLink = fixture.nativeElement.querySelector('tal-cart-entry-bar a') as HTMLAnchorElement;
    expect(cartLink).toBeTruthy();
    expect(cartLink.getAttribute('href')).toBe('/cart');
  });
});
