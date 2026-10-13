import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CustomerApiService, ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { AuthCheckPage } from './auth-check.page';

describe('AuthCheckPage', () => {
  const api = {
    getProfile: vi.fn(),
  };

  beforeEach(async () => {
    api.getProfile.mockReset();

    await TestBed.configureTestingModule({
      imports: [AuthCheckPage],
      providers: [{ provide: CustomerApiService, useValue: api }],
    }).compileComponents();
  });

  const profileResponse: ProfileResponse = {
    id: 1,
    fullName: 'Jane Doe',
    age: 30,
    phoneNumber: '+20 100 123 4567',
    addresses: [],
  };

  it('shows the verified success state when a profile loads', async () => {
    api.getProfile.mockReturnValue(of(profileResponse));

    const fixture = TestBed.createComponent(AuthCheckPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Your identity and protected Customer API access were verified.',
    );
  });

  it('treats a missing-profile domain code as a verified success state', async () => {
    const missing: AppError = {
      status: 409,
      code: AppErrorCode.ProfileNotCreated,
      title: 'No profile',
      detail: 'create a profile first',
      isNetworkError: false,
    };
    api.getProfile.mockReturnValue(throwError(() => missing));

    const fixture = TestBed.createComponent(AuthCheckPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Your identity and protected Customer API access were verified.',
    );
    expect(fixture.nativeElement.textContent).not.toContain('No profile');
  });

  it('renders feature-owned copy for an unknown backend error without raw text', async () => {
    const backendError: AppError = {
      status: 503,
      code: AppErrorCode.Unknown,
      title: 'Kafka partition exploded correlation 11aa',
      detail: 'backend token alice',
      isNetworkError: false,
    };
    api.getProfile.mockReturnValue(throwError(() => backendError));

    const fixture = TestBed.createComponent(AuthCheckPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Authentication check could not be completed');
    expect(alert.textContent).toContain('Please try again in a moment.');
    expect(alert.textContent).not.toContain('Kafka partition');
    expect(alert.textContent).not.toContain('11aa');
    expect(alert.textContent).not.toContain('token alice');
  });

  it('shows a pending spinner while the check is in flight', () => {
    const pending = new Subject<ProfileResponse>();
    api.getProfile.mockReturnValue(pending);

    const fixture = TestBed.createComponent(AuthCheckPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Verifying protected API access');

    pending.next(profileResponse);
    pending.complete();
  });
});
