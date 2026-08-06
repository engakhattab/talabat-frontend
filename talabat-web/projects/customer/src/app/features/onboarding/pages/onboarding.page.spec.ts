import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CreateProfileRequest, CustomerApiService, ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

import { OnboardingPage } from './onboarding.page';
import { ProfileStore } from '../../../core/profile/profile.store';

describe('OnboardingPage', () => {
  let component: OnboardingPage;
  let fixture: ComponentFixture<OnboardingPage>;
  let router: Router;
  let customerApi: { createProfile: ReturnType<typeof vi.fn>; getProfile: ReturnType<typeof vi.fn> };

  const profile: ProfileResponse = {
    id: 1,
    fullName: 'Jane Doe',
    age: 28,
    phoneNumber: null,
    addresses: [],
  };

  const createRequest: CreateProfileRequest = {
    fullName: 'Jane Doe',
    age: 28,
    phoneNumber: null,
  };

  beforeEach(async () => {
    customerApi = {
      createProfile: vi.fn().mockReturnValue(of(profile)),
      getProfile: vi.fn().mockReturnValue(of(profile)),
    };

    await TestBed.configureTestingModule({
      imports: [OnboardingPage],
      providers: [
        provideRouter([]),
        { provide: CustomerApiService, useValue: customerApi },
        {
          provide: AuthStore,
          useValue: {
            user: signal({ subject: 'auth0|123', displayName: 'Jane', roles: [] as string[] }).asReadonly(),
            isAuthenticated: signal(true).asReadonly(),
          },
        },
        ProfileStore,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingPage);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('renders the onboarding heading', () => {
    expect(fixture.nativeElement.textContent).toContain('Create your profile');
  });

  it('renders loading while checking profile', () => {
    expect(fixture.nativeElement.textContent).toContain('Checking your profile');
  });

  it('submits form data and navigates on success', async () => {
    const store = TestBed.inject(ProfileStore);
    vi.spyOn(store, 'refreshAfterCreation').mockResolvedValue({ kind: 'loaded', profile });

    (component as unknown as { handleSubmit: (r: CreateProfileRequest) => void }).handleSubmit(createRequest);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApi.createProfile).toHaveBeenCalledWith({ createProfileRequest: createRequest });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/restaurants', { replaceUrl: true });
  });

  it('shows error on creation failure', async () => {
    const error: AppError = { status: 400, code: AppErrorCode.InvalidCustomerProfile, title: 'Invalid', isNetworkError: false };
    customerApi.createProfile.mockReturnValue(throwError(() => error));

    (component as unknown as { handleSubmit: (r: CreateProfileRequest) => void }).handleSubmit(createRequest);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((component as unknown as { submitError: () => AppError | null }).submitError()).toEqual(error);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
