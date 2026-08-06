import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CustomerApiService, ProfileResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

import { ProfileStore } from './profile.store';

describe('ProfileStore', () => {
  let store: ProfileStore;
  let api: { getProfile: ReturnType<typeof vi.fn>; createProfile: ReturnType<typeof vi.fn> };
  let userSignal: ReturnType<typeof signal<{ subject: string; displayName: string | null; readonly roles: readonly string[] } | null>>;
  let isAuthenticatedSignal: ReturnType<typeof signal<boolean>>;

  const profile: ProfileResponse = {
    id: 1,
    fullName: 'Jane Doe',
    age: 28,
    phoneNumber: null,
    addresses: [],
  };

  const subject = 'auth0|123';

  beforeEach(() => {
    api = {
      getProfile: vi.fn(),
      createProfile: vi.fn(),
    };
    userSignal = signal({ subject, displayName: 'Jane', roles: [] as string[] });
    isAuthenticatedSignal = signal(true);

    TestBed.configureTestingModule({
      providers: [
        ProfileStore,
        { provide: CustomerApiService, useValue: api },
        {
          provide: AuthStore,
          useValue: {
            user: userSignal.asReadonly(),
            isAuthenticated: isAuthenticatedSignal.asReadonly(),
          },
        },
      ],
    });

    store = TestBed.inject(ProfileStore);
  });

  it('starts in idle state', () => {
    expect(store.state()).toBe('idle');
    expect(store.profile()).toBeNull();
    expect(store.error()).toBeNull();
    expect(store.hasProfile()).toBe(false);
    expect(store.isMissing()).toBe(false);
    expect(store.canRetry()).toBe(false);
  });

  it('resolves loaded state on 200 response', async () => {
    api.getProfile.mockReturnValue(of(profile));

    const result = await store.ensureLoaded();

    expect(result.kind).toBe('loaded');
    if (result.kind === 'loaded') {
      expect(result.profile).toEqual(profile);
    }
    expect(store.state()).toBe('loaded');
    expect(store.profile()).toEqual(profile);
    expect(store.hasProfile()).toBe(true);
    expect(api.getProfile).toHaveBeenCalledOnce();
  });

  it('resolves missing state on 404 ProfileNotCreated', async () => {
    const error: AppError = { status: 404, code: AppErrorCode.ProfileNotCreated, title: 'Not found', isNetworkError: false };
    api.getProfile.mockReturnValue(throwError(() => error));

    const result = await store.ensureLoaded();

    expect(result.kind).toBe('missing');
    expect(store.state()).toBe('missing');
    expect(store.isMissing()).toBe(true);
    expect(store.profile()).toBeNull();
  });

  it('resolves error on network failure', async () => {
    const error: AppError = { status: 0, code: AppErrorCode.Unknown, title: 'Cannot reach the server', isNetworkError: true };
    api.getProfile.mockReturnValue(throwError(() => error));

    const result = await store.ensureLoaded();

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error).toEqual(error);
    }
    expect(store.state()).toBe('error');
    expect(store.canRetry()).toBe(true);
  });

  it('resolves error on 401', async () => {
    const error: AppError = { status: 401, code: AppErrorCode.Unknown, title: 'Unauthorized', isNetworkError: false };
    api.getProfile.mockReturnValue(throwError(() => error));

    const result = await store.ensureLoaded();

    expect(result.kind).toBe('error');
    expect(store.state()).toBe('error');
    expect(store.isMissing()).toBe(false);
  });

  it('resolves error on unrelated 404', async () => {
    const error: AppError = { status: 404, code: AppErrorCode.Unknown, title: 'Not found', isNetworkError: false };
    api.getProfile.mockReturnValue(throwError(() => error));

    const result = await store.ensureLoaded();

    expect(result.kind).toBe('error');
    expect(store.state()).toBe('error');
  });

  it('does not issue second GET for same subject when loaded', async () => {
    api.getProfile.mockReturnValue(of(profile));

    await store.ensureLoaded();
    await store.ensureLoaded();

    expect(api.getProfile).toHaveBeenCalledOnce();
  });

  it('does not issue second GET for same subject when missing', async () => {
    const error: AppError = { status: 404, code: AppErrorCode.ProfileNotCreated, title: 'Not found', isNetworkError: false };
    api.getProfile.mockReturnValue(throwError(() => error));

    await store.ensureLoaded();
    await store.ensureLoaded();

    expect(api.getProfile).toHaveBeenCalledOnce();
  });

  it('shares one in-flight request across concurrent callers', async () => {
    const subject = new Subject<ProfileResponse>();
    api.getProfile.mockReturnValue(subject);

    const p1 = store.ensureLoaded();
    const p2 = store.ensureLoaded();
    const p3 = store.ensureLoaded();

    subject.next(profile);
    subject.complete();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    expect(api.getProfile).toHaveBeenCalledOnce();
    expect(r1.kind).toBe('loaded');
    expect(r2.kind).toBe('loaded');
    expect(r3.kind).toBe('loaded');
  });

  it('issues new GET after explicit retry', async () => {
    const networkError: AppError = { status: 0, code: AppErrorCode.Unknown, title: 'Cannot reach the server', isNetworkError: true };
    api.getProfile.mockReturnValueOnce(throwError(() => networkError));

    await store.ensureLoaded();
    expect(store.state()).toBe('error');

    api.getProfile.mockReturnValueOnce(of(profile));
    const result = await store.retry();

    expect(result.kind).toBe('loaded');
    expect(api.getProfile).toHaveBeenCalledTimes(2);
  });

  it('issues new GET when subject changes', async () => {
    api.getProfile.mockReturnValue(of(profile));
    await store.ensureLoaded();
    expect(store.state()).toBe('loaded');

    userSignal.set({ subject: 'auth0|456', displayName: 'Other', roles: [] });

    const result = await store.ensureLoaded();

    expect(api.getProfile).toHaveBeenCalledTimes(2);
    expect(result.kind).toBe('loaded');
  });

  it('refetches canonical profile after creation', async () => {
    api.getProfile.mockReturnValue(of(profile));

    const result = await store.refreshAfterCreation();

    expect(result.kind).toBe('loaded');
    expect(store.state()).toBe('loaded');
    expect(store.profile()).toEqual(profile);
    expect(api.getProfile).toHaveBeenCalledOnce();
  });

  it('leaves retryable error when create refetch fails', async () => {
    const error: AppError = { status: 0, code: AppErrorCode.Unknown, title: 'Cannot reach the server', isNetworkError: true };
    api.getProfile.mockReturnValue(throwError(() => error));

    const result = await store.refreshAfterCreation();

    expect(result.kind).toBe('error');
    expect(store.state()).toBe('error');
    expect(store.canRetry()).toBe(true);
    expect(store.hasProfile()).toBe(false);
  });
});
