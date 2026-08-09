import { computed, Injectable, inject, signal } from '@angular/core';
import {
  AddAddressRequest,
  AddressResponse,
  AddressesApiService,
  CustomerApiService,
  ProfileResponse,
  UpdateProfileRequest,
} from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';
import { firstValueFrom } from 'rxjs';

export type ProfileLoadState = 'idle' | 'loading' | 'loaded' | 'missing' | 'error';

export type ProfileProbeResult =
  | { kind: 'loaded'; profile: ProfileResponse }
  | { kind: 'missing' }
  | { kind: 'error'; error: AppError };

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly customerApi = inject(CustomerApiService);
  private readonly addressesApi = inject(AddressesApiService);
  private readonly auth = inject(AuthStore);

  private readonly stateState = signal<ProfileLoadState>('idle');
  private readonly profileState = signal<ProfileResponse | null>(null);
  private readonly errorState = signal<AppError | null>(null);
  private readonly subjectState = signal<string | null>(null);

  private inFlight: Promise<ProfileProbeResult> | undefined;
  private generation = 0;

  readonly state = this.stateState.asReadonly();
  readonly profile = this.profileState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly hasProfile = computed(() => this.state() === 'loaded' && this.profile() !== null);
  readonly isMissing = computed(() => this.state() === 'missing');
  readonly canRetry = computed(() => this.state() === 'error');

  reset(): void {
    this.stateState.set('idle');
    this.profileState.set(null);
    this.errorState.set(null);
    this.subjectState.set(null);
    this.inFlight = undefined;
    this.generation += 1;
  }

  async ensureLoaded(): Promise<ProfileProbeResult> {
    const user = this.auth.user();
    if (!user) {
      return this.terminalError({
        status: 401,
        code: AppErrorCode.Unknown,
        title: 'Not authenticated',
        isNetworkError: false,
      });
    }

    if (this.subjectState() !== user.subject) {
      this.resetForSubjectChange(user.subject);
    }

    const currentState = this.state();
    if (currentState === 'loaded' || currentState === 'missing') {
      return currentState === 'loaded'
        ? { kind: 'loaded', profile: this.profile()! }
        : { kind: 'missing' };
    }

    if (currentState === 'loading' && this.inFlight) {
      return this.inFlight;
    }

    return this.runProbe();
  }

  async retry(): Promise<ProfileProbeResult> {
    if (!this.auth.user()) {
      return this.terminalError({
        status: 401,
        code: AppErrorCode.Unknown,
        title: 'Not authenticated',
        isNetworkError: false,
      });
    }

    if (this.state() !== 'error') {
      return this.ensureLoaded();
    }

    this.inFlight = undefined;
    return this.runProbe();
  }

  async refreshAfterCreation(): Promise<ProfileProbeResult> {
    this.inFlight = undefined;
    this.stateState.set('loading');
    this.errorState.set(null);
    return this.runProbe();
  }

  async updateProfile(request: UpdateProfileRequest): Promise<ProfileResponse> {
    this.ensureLoadedProfile();
    const profile = await firstValueFrom(
      this.customerApi.updateProfile({ updateProfileRequest: request }),
    );
    this.applyProfile(profile);
    return profile;
  }

  async addAddress(request: AddAddressRequest): Promise<AddressResponse> {
    this.ensureLoadedProfile();
    const created = await firstValueFrom(
      this.addressesApi.addAddress({ addAddressRequest: request }),
    );
    await this.reloadProfile();
    return created;
  }

  async setDefaultAddress(addressId: number): Promise<void> {
    this.ensureLoadedProfile();
    const profile = await firstValueFrom(
      this.addressesApi.setDefaultAddress({ addressId }),
    );
    this.applyProfile(profile);
  }

  async removeAddress(addressId: number): Promise<void> {
    this.ensureLoadedProfile();
    await firstValueFrom(this.addressesApi.removeAddress({ addressId }));
    await this.reloadProfile();
  }

  private resetForSubjectChange(subject: string): void {
    this.stateState.set('idle');
    this.profileState.set(null);
    this.errorState.set(null);
    this.subjectState.set(subject);
    this.inFlight = undefined;
    this.generation += 1;
  }

  private runProbe(): Promise<ProfileProbeResult> {
    const capturedGeneration = this.generation;
    this.stateState.set('loading');
    this.errorState.set(null);

    const probe = firstValueFrom(this.customerApi.getProfile()).then(
      (profile) => this.handleSuccess(profile, capturedGeneration),
      (error: unknown) => this.handleError(error as AppError, capturedGeneration),
    );

    this.inFlight = probe;
    return probe;
  }

  private handleSuccess(profile: ProfileResponse, capturedGeneration: number): ProfileProbeResult {
    if (capturedGeneration !== this.generation) {
      const current = this.state();
      if (current === 'loaded') return { kind: 'loaded', profile: this.profile()! };
      if (current === 'missing') return { kind: 'missing' };
      if (current === 'error') return { kind: 'error', error: this.error()! };
      return { kind: 'missing' };
    }

    this.inFlight = undefined;
    this.profileState.set(profile);
    this.stateState.set('loaded');
    return { kind: 'loaded', profile };
  }

  private handleError(error: AppError, capturedGeneration: number): ProfileProbeResult {
    if (capturedGeneration !== this.generation) {
      const current = this.state();
      if (current === 'loaded') return { kind: 'loaded', profile: this.profile()! };
      if (current === 'missing') return { kind: 'missing' };
      if (current === 'error') return { kind: 'error', error: this.error()! };
      return { kind: 'missing' };
    }

    this.inFlight = undefined;

    if (error.status === 404 && error.code === AppErrorCode.ProfileNotCreated) {
      this.stateState.set('missing');
      return { kind: 'missing' };
    }

    this.errorState.set(error);
    this.stateState.set('error');
    return { kind: 'error', error };
  }

  private terminalError(error: AppError): ProfileProbeResult {
    this.errorState.set(error);
    this.stateState.set('error');
    return { kind: 'error', error };
  }

  private ensureLoadedProfile(): void {
    if (this.state() !== 'loaded' || this.profileState() === null) {
      throw new Error('ProfileStore mutations require a loaded profile.');
    }
  }

  private applyProfile(profile: ProfileResponse): void {
    this.profileState.set(profile);
    this.stateState.set('loaded');
    this.errorState.set(null);
  }

  private async reloadProfile(): Promise<ProfileResponse> {
    const profile = await firstValueFrom(this.customerApi.getProfile());
    this.applyProfile(profile);
    return profile;
  }
}
