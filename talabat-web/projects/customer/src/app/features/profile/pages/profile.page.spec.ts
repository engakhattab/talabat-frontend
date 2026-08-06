import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProfileStore } from '../../../core/profile/profile.store';

import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        {
          provide: ProfileStore,
          useValue: {
            profile: signal({
              id: 1,
              fullName: 'Jane Doe',
              age: 30,
              phoneNumber: '+20 100 123 4567',
              addresses: [],
            }).asReadonly(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();
  });

  it('renders profile values as labelled description terms', () => {
    const terms = Array.from(
      fixture.nativeElement.querySelectorAll('dt') as NodeListOf<HTMLElement>,
    ).map((dt) => dt.textContent?.trim());
    const values = Array.from(
      fixture.nativeElement.querySelectorAll('dd') as NodeListOf<HTMLElement>,
    ).map((dd) => dd.textContent?.trim());

    expect(terms).toContain('Full Name');
    expect(terms).toContain('Age');
    expect(terms).toContain('Phone Number');
    expect(values).toContain('Jane Doe');
    expect(values).toContain('30');
    expect(values).toContain('+20 100 123 4567');
  });

  it('shows a muted Not provided value when the phone number is missing', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        {
          provide: ProfileStore,
          useValue: {
            profile: signal({
              id: 2,
              fullName: 'Jane Doe',
              age: 30,
              phoneNumber: null,
              addresses: [],
            }).asReadonly(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Not provided');
  });

  it('renders a Browse restaurants action and omits a redundant sign-out action', () => {
    expect(fixture.nativeElement.textContent).toContain('Browse restaurants');
    expect(fixture.nativeElement.textContent).not.toContain('Sign out');
  });
});
