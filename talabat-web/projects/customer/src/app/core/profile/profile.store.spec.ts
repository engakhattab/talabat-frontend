import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  AddressesApiService,
  CustomerApiService,
  ProfileResponse,
} from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

import { ProfileStore } from './profile.store';

describe('ProfileStore', () => {
  let store: ProfileStore;
  let api: {
    getProfile: ReturnType<typeof vi.fn>;
    createProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
  };
  let addressesApi: {
    addAddress: ReturnType<typeof vi.fn>;
    setDefaultAddress: ReturnType<typeof vi.fn>;
    removeAddress: ReturnType<typeof vi.fn>;
  };
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
      updateProfile: vi.fn(),
    };
    addressesApi = {
      addAddress: vi.fn(),
      setDefaultAddress: vi.fn(),
      removeAddress: vi.fn(),
    };
    userSignal = signal({ subject, displayName: 'Jane', roles: [] as string[] });
    isAuthenticatedSignal = signal(true);

    TestBed.configureTestingModule({
      providers: [
        ProfileStore,
        { provide: CustomerApiService, useValue: api },
        { provide: AddressesApiService, useValue: addressesApi },
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

  describe('mutations', () => {
    const loaded = async (): Promise<void> => {
      api.getProfile.mockReturnValue(of(profile));
      await store.ensureLoaded();
      expect(store.state()).toBe('loaded');
    };

    it('updateProfile replaces state from the response on success', async () => {
      await loaded();
      const updated = { ...profile, fullName: 'Jane Updated' };
      api.updateProfile.mockReturnValue(of(updated));

      const result = await store.updateProfile({ fullName: 'Jane Updated', age: 28, phoneNumber: null });

      expect(result).toEqual(updated);
      expect(store.profile()).toEqual(updated);
      expect(store.state()).toBe('loaded');
      expect(store.error()).toBeNull();
    });

    it('updateProfile propagates a server error and keeps prior state', async () => {
      await loaded();
      const error: AppError = {
        status: 400,
        code: AppErrorCode.InvalidCustomerProfile,
        title: 'Invalid profile',
        detail: 'Age must be positive.',
        isNetworkError: false,
      };
      api.updateProfile.mockReturnValue(throwError(() => error));

      await expect(
        store.updateProfile({ fullName: '', age: -1, phoneNumber: null }),
      ).rejects.toEqual(error);
      expect(store.profile()).toEqual(profile);
      expect(store.state()).toBe('loaded');
    });

    it('addAddress reloads the authoritative profile after creation', async () => {
      await loaded();
      const created = { id: 7, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: true };
      addressesApi.addAddress.mockReturnValue(of(created));
      const withAddress = {
        ...profile,
        addresses: [{ id: 7, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: true }],
      };
      api.getProfile.mockReturnValue(of(withAddress));

      const result = await store.addAddress({
        street: '10 Talaat Harb',
        city: 'Cairo',
        buildingNumber: '12',
        floor: null,
        makeDefault: false,
      });

      expect(result).toEqual(created);
      expect(api.getProfile).toHaveBeenCalledTimes(2);
      expect(store.profile()?.addresses).toHaveLength(1);
      expect(store.state()).toBe('loaded');
    });

    it('addAddress propagates a server error without mutating state', async () => {
      await loaded();
      const error: AppError = {
        status: 400,
        code: AppErrorCode.Unknown,
        title: 'Invalid address',
        isNetworkError: false,
      };
      addressesApi.addAddress.mockReturnValue(throwError(() => error));

      await expect(
        store.addAddress({ street: 'X', city: 'Y', buildingNumber: '1', floor: null, makeDefault: false }),
      ).rejects.toEqual(error);
      expect(store.profile()).toEqual(profile);
      expect(store.state()).toBe('loaded');
    });

    it('setDefaultAddress replaces state directly from the response', async () => {
      await loaded();
      const withDefault = {
        ...profile,
        addresses: [
          { id: 1, street: 'A', city: 'Cairo', buildingNumber: '1', floor: null, isDefault: false },
          { id: 2, street: 'B', city: 'Giza', buildingNumber: '2', floor: null, isDefault: true },
        ],
      };
      addressesApi.setDefaultAddress.mockReturnValue(of(withDefault));

      await store.setDefaultAddress(2);

      expect(addressesApi.setDefaultAddress).toHaveBeenCalledWith({ addressId: 2 });
      expect(api.getProfile).toHaveBeenCalledTimes(1);
      expect(store.profile()).toEqual(withDefault);
      expect(store.profile()?.addresses.find((a) => a.isDefault)?.id).toBe(2);
      expect(store.state()).toBe('loaded');
    });

    it('setDefaultAddress propagates a server error', async () => {
      await loaded();
      const error: AppError = {
        status: 500,
        code: AppErrorCode.Unknown,
        title: 'Something went wrong',
        isNetworkError: false,
      };
      addressesApi.setDefaultAddress.mockReturnValue(throwError(() => error));

      await expect(store.setDefaultAddress(2)).rejects.toEqual(error);
      expect(store.profile()).toEqual(profile);
    });

    it('removeAddress reloads the authoritative profile after deletion', async () => {
      await loaded();
      const withAddress = {
        ...profile,
        addresses: [{ id: 7, street: '10 Talaat Harb', city: 'Cairo', buildingNumber: '12', floor: null, isDefault: true }],
      };
      const created = withAddress.addresses[0];
      addressesApi.addAddress.mockReturnValue(of(created));
      api.getProfile.mockReturnValue(of(withAddress));
      await store.addAddress({
        street: '10 Talaat Harb',
        city: 'Cairo',
        buildingNumber: '12',
        floor: null,
        makeDefault: false,
      });
      addressesApi.removeAddress.mockReturnValue(of(undefined));
      api.getProfile.mockReturnValue(of(profile));

      await store.removeAddress(7);

      expect(addressesApi.removeAddress).toHaveBeenCalledWith({ addressId: 7 });
      expect(api.getProfile).toHaveBeenCalledTimes(3);
      expect(store.profile()).toEqual(profile);
      expect(store.state()).toBe('loaded');
    });

    it('removeAddress propagates a server error without mutating state', async () => {
      await loaded();
      const error: AppError = {
        status: 404,
        code: AppErrorCode.Unknown,
        title: 'Address not found',
        isNetworkError: false,
      };
      addressesApi.removeAddress.mockReturnValue(throwError(() => error));

      await expect(store.removeAddress(7)).rejects.toEqual(error);
      expect(store.profile()).toEqual(profile);
      expect(store.state()).toBe('loaded');
    });

    it('rejects mutations when the profile is not loaded', async () => {
      await expect(store.updateProfile({ fullName: 'X', age: 1, phoneNumber: null })).rejects.toThrow(
        'require a loaded profile',
      );
      await expect(
        store.addAddress({ street: 'X', city: 'Y', buildingNumber: '1', floor: null, makeDefault: false }),
      ).rejects.toThrow('require a loaded profile');
      await expect(store.setDefaultAddress(1)).rejects.toThrow('require a loaded profile');
      await expect(store.removeAddress(1)).rejects.toThrow('require a loaded profile');
    });
  });
});
