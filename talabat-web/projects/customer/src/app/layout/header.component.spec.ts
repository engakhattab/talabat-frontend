import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@talabat/core-auth';

import { HeaderComponent } from './header.component';
import { ProfileStore } from '../core/profile/profile.store';
import { CartStore } from '../features/cart/cart.store';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let userSignal: ReturnType<typeof signal<{ subject: string; displayName: string | null; readonly roles: readonly string[] } | null>>;
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;
  let cartItemCountSignal: ReturnType<typeof signal<number>>;

  beforeEach(async () => {
    userSignal = signal(null);
    isAuthenticatedSignal = signal(false);
    cartItemCountSignal = signal(0);

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            user: userSignal.asReadonly(),
            isAuthenticated: isAuthenticatedSignal.asReadonly(),
            busy: signal(false).asReadonly(),
            initialized: signal(true).asReadonly(),
            signIn: vi.fn().mockResolvedValue(undefined),
            signOut: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: CartStore,
          useValue: {
            totalItemCount: cartItemCountSignal.asReadonly(),
          },
        },
        ProfileStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('renders brand and sign-in when anonymous', () => {
    expect(fixture.nativeElement.textContent).toContain('Talabat');
    expect(fixture.nativeElement.textContent).toContain('Sign in');
    expect(fixture.nativeElement.textContent).not.toContain('Sign out');
  });

  it('renders greeting and sign-out when authenticated', () => {
    userSignal.set({ subject: 'auth0|123', displayName: 'Jane Doe', roles: [] as string[] });
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sign out');
  });

  it('hides the cart badge when the item count is zero', () => {
    userSignal.set({ subject: 'auth0|123', displayName: 'Jane Doe', roles: [] as string[] });
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cart');
    expect(fixture.nativeElement.textContent).not.toContain('0');
  });

  it('renders the cart badge item count reactively', () => {
    userSignal.set({ subject: 'auth0|123', displayName: 'Jane Doe', roles: [] as string[] });
    isAuthenticatedSignal.set(true);
    cartItemCountSignal.set(3);
    fixture.detectChanges();

    const badge = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('span'),
    ).find((el: Element) => el.textContent?.trim() === '3');
    expect(badge).toBeTruthy();
  });
});
