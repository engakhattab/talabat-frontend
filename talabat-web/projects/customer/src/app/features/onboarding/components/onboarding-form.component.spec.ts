import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CreateProfileRequest, CustomerApiService } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { OnboardingFormComponent } from './onboarding-form.component';

describe('OnboardingFormComponent', () => {
  let component: OnboardingFormComponent;
  let fixture: ComponentFixture<OnboardingFormComponent>;
  let emitted: CreateProfileRequest[];

  beforeEach(async () => {
    emitted = [];

    await TestBed.configureTestingModule({
      imports: [OnboardingFormComponent],
      providers: [{ provide: CustomerApiService, useValue: { createProfile: vi.fn() } }],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingFormComponent);
    component = fixture.componentInstance;
    component.onSubmitResult.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
  });

  it('renders all form fields', () => {
    expect(fixture.nativeElement.querySelector('#onboarding-fullName')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#onboarding-age')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#onboarding-phoneNumber')).toBeTruthy();
  });

  it('renders server error when error state is set', () => {
    fixture.componentRef.setInput('serverError', {
      status: 400,
      code: AppErrorCode.InvalidCustomerProfile,
      title: 'Invalid profile',
      detail: 'Check your input',
      isNetworkError: false,
    });
    fixture.detectChanges();

    const alerts = fixture.nativeElement.querySelectorAll('[role="alert"]');
    const messages = Array.from(alerts).map((el: unknown) => (el as HTMLElement).textContent);
    expect(messages.some((m) => m?.includes('Invalid profile'))).toBe(true);
  });

  it('associates invalid fields with their announced errors', () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();

    const fullName = fixture.nativeElement.querySelector('#onboarding-fullName') as HTMLInputElement;
    const age = fixture.nativeElement.querySelector('#onboarding-age') as HTMLInputElement;
    expect(fullName.getAttribute('aria-invalid')).toBe('true');
    expect(fullName.getAttribute('aria-describedby')).toBe('onboarding-fullName-error');
    expect(age.getAttribute('aria-invalid')).toBe('true');
    expect(age.getAttribute('aria-describedby')).toBe('onboarding-age-error');
    expect(fixture.nativeElement.querySelector('#onboarding-fullName-error')?.getAttribute('role')).toBe('alert');
  });
});
