import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
