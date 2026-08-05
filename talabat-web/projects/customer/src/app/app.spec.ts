import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthStore } from '@talabat/core-auth';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            initialized: signal(true).asReadonly(),
            isAuthenticated: signal(false).asReadonly(),
            busy: signal(false).asReadonly(),
            user: signal(null).asReadonly(),
            error: signal(null).asReadonly(),
            signIn: vi.fn(),
            signOut: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
