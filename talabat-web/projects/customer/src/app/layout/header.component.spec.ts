import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AddressesApiService, CustomerApiService } from '@talabat/api-customer';
import { AuthStore } from '@talabat/core-auth';

import { HeaderComponent } from './header.component';
import { ProfileStore } from '../core/profile/profile.store';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let userSignal: ReturnType<typeof signal<{ subject: string; displayName: string | null; readonly roles: readonly string[] } | null>>;
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    userSignal = signal(null);
    isAuthenticatedSignal = signal(false);

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
          provide: CustomerApiService,
          useValue: {
            getProfile: vi.fn().mockReturnValue(of({ id: 1, fullName: 'Jane Doe', age: 30, phoneNumber: '+20 100 123 4567', addresses: [] })),
            updateProfile: vi.fn().mockReturnValue(of({ id: 1, fullName: 'Jane Roe', age: 30, phoneNumber: '+20 100 123 4567', addresses: [] })),
          },
        },
        {
          provide: AddressesApiService,
          useValue: {},
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

  it('links to Restaurants, Profile, and Orders when authenticated', () => {
    userSignal.set({ subject: 'auth0|123', displayName: 'Jane Doe', roles: [] as string[] });
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    ).map((a) => a.getAttribute('href'));
    expect(links).toContain('/restaurants');
    expect(links).toContain('/profile');
    expect(links).toContain('/orders');
  });

  it('greeting reactively updates to the authenticated profile name', async () => {
    userSignal.set({ subject: 'auth0|123', displayName: 'IDP Display Name', roles: [] as string[] });
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Jane Doe');
    expect(fixture.nativeElement.textContent).not.toContain('IDP Display Name');
  });

  it('greeting reactively updates when the profile signal changes', async () => {
    userSignal.set({ subject: 'auth0|123', displayName: null, roles: [] as string[] });
    isAuthenticatedSignal.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const profileStore = TestBed.inject(ProfileStore);
    await profileStore.updateProfile({ fullName: 'Jane Roe', age: 30, phoneNumber: '+20 100 123 4567' });

    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Jane Roe');
    expect(fixture.nativeElement.textContent).not.toContain('Jane Doe');
  });
});
