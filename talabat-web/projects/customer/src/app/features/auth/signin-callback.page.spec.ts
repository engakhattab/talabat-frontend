import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthError, AuthStore } from '@talabat/core-auth';

import { SigninCallbackPage } from './signin-callback.page';

describe('SigninCallbackPage', () => {
  let fixture: ComponentFixture<SigninCallbackPage>;
  const error = signal<AuthError | null>(null);
  const auth = {
    error: error.asReadonly(),
    completeSignInCallback: vi.fn<(url: string) => Promise<string>>(),
    signIn: vi.fn<(returnUrl: string) => Promise<void>>().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    error.set(null);
    vi.clearAllMocks();
    auth.completeSignInCallback.mockReturnValue(new Promise(() => undefined));
    await TestBed.configureTestingModule({
      imports: [SigninCallbackPage],
      providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
    }).compileComponents();
  });

  it('renders an accessible loading state and starts callback processing once', () => {
    fixture = TestBed.createComponent(SigninCallbackPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Completing sign-in');
    expect(auth.completeSignInCallback).toHaveBeenCalledOnce();
    fixture.detectChanges();
    expect(auth.completeSignInCallback).toHaveBeenCalledOnce();
  });

  it('navigates to the validated destination after successful completion', async () => {
    auth.completeSignInCallback.mockResolvedValue('/restaurants/12');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(SigninCallbackPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/restaurants/12', { replaceUrl: true });
  });

  it('renders a safe retry action without raw protocol details', async () => {
    auth.completeSignInCallback.mockRejectedValue(new Error('raw code and token detail'));
    error.set({ code: 'callback_failed', message: 'Sign-in could not be completed.' });
    fixture = TestBed.createComponent(SigninCallbackPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sign-in was not completed');
    expect(fixture.nativeElement.textContent).not.toContain('raw code');
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(auth.signIn).toHaveBeenCalledWith('/restaurants');
  });

  it('never interpolates hostile error, error_description, or state query values', async () => {
    auth.completeSignInCallback.mockRejectedValue(
      new Error('error=access_denied&error_description=You are banned&state=attacker-state'),
    );
    error.set({ code: 'callback_failed', message: 'Sign-in could not be completed.' });

    fixture = TestBed.createComponent(SigninCallbackPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Sign-in was not completed');
    expect(text).not.toContain('access_denied');
    expect(text).not.toContain('You are banned');
    expect(text).not.toContain('attacker-state');
  });

  it('shows only safe copy when the callback state is invalid or absent', async () => {
    auth.completeSignInCallback.mockRejectedValue(new Error('state mismatch — unexpected'));
    error.set({ code: 'callback_failed', message: 'Sign-in could not be completed.' });
    fixture = TestBed.createComponent(SigninCallbackPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sign-in was not completed');
    expect(fixture.nativeElement.textContent).not.toContain('state mismatch');
  });
});
