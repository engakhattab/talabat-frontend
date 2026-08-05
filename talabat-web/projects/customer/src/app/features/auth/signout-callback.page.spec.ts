import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthError, AuthStore } from '@talabat/core-auth';

import { SignoutCallbackPage } from './signout-callback.page';

describe('SignoutCallbackPage', () => {
  it('completes logout once and returns to the public catalog', async () => {
    const auth = {
      error: signal<AuthError | null>(null).asReadonly(),
      completeSignOutCallback: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [SignoutCallbackPage],
      providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
    }).compileComponents();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SignoutCallbackPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Signing you out');
    await fixture.whenStable();
    expect(auth.completeSignOutCallback).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/restaurants', { replaceUrl: true });
  });
});
