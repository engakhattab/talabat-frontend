import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  CheckoutApiService,
  CheckoutUnavailableResponse,
  UnavailableItemDto,
} from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';

import { ProfileStore } from '../../core/profile/profile.store';
import { CartStore } from '../cart/cart.store';

export type CheckoutNoticeKind = 'unavailable-items' | 'network' | 'general';

export interface CheckoutNotice {
  readonly kind: CheckoutNoticeKind;
  readonly title: string;
  readonly detail?: string;
}

export function isCheckoutUnavailableResponse(value: unknown): value is CheckoutUnavailableResponse {
  if (value === null || typeof value !== 'object') return false;

  const candidate = value as Record<string, unknown>;
  if (!('unavailableItems' in candidate)) return false;
  const unavailableItems = candidate['unavailableItems'];
  if (unavailableItems !== null && !Array.isArray(unavailableItems)) {
    return false;
  }

  const items = unavailableItems;
  if (items === null) return true;

  for (const item of items) {
    if (item === null || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    if (typeof record['productId'] !== 'number') return false;
    if (typeof record['productName'] !== 'string') return false;
    if (typeof record['reason'] !== 'string') return false;
  }

  return true;
}

@Injectable({ providedIn: 'root' })
export class CheckoutStore {
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly cartStore = inject(CartStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly router = inject(Router);

  private readonly overrideAddressIdState = signal<number | null>(null);
  private readonly isSubmittingState = signal(false);
  private readonly orderIdState = signal<number | null>(null);
  private readonly noticeState = signal<CheckoutNotice | null>(null);
  private readonly unavailableItemsState = signal<UnavailableItemDto[]>([]);

  readonly addresses = computed(() => this.profileStore.profile()?.addresses ?? []);
  readonly defaultAddressId = computed(() => {
    const addresses = this.addresses();
    return (
      addresses.find((address) => address.isDefault)?.id ??
      addresses[0]?.id ??
      null
    );
  });
  readonly selectedAddressId = computed(() => {
    const overrideId = this.overrideAddressIdState();
    if (overrideId !== null && this.addresses().some((address) => address.id === overrideId)) {
      return overrideId;
    }
    return this.defaultAddressId();
  });
  readonly selectedAddress = computed(() => {
    const id = this.selectedAddressId();
    if (id === null) return null;
    return this.addresses().find((address) => address.id === id) ?? null;
  });
  readonly hasSavedAddresses = computed(() => this.addresses().length > 0);
  readonly isSubmitting = this.isSubmittingState.asReadonly();
  readonly orderId = this.orderIdState.asReadonly();
  readonly notice = this.noticeState.asReadonly();
  readonly unavailableItems = this.unavailableItemsState.asReadonly();

  readonly canSubmit = computed(
    () =>
      this.selectedAddressId() !== null &&
      !this.isSubmittingState() &&
      !this.cartStore.isEmpty(),
  );

  selectAddress(addressId: number): void {
    if (this.isSubmittingState()) return;
    this.overrideAddressIdState.set(addressId);
  }

  clearSubmission(): void {
    this.orderIdState.set(null);
    this.noticeState.set(null);
    this.unavailableItemsState.set([]);
    this.overrideAddressIdState.set(null);
  }

  async submitOrder(): Promise<void> {
    const addressId = this.selectedAddressId();
    if (addressId === null || this.isSubmittingState() || this.cartStore.isEmpty()) {
      return;
    }

    this.isSubmittingState.set(true);
    this.orderIdState.set(null);
    this.noticeState.set(null);
    this.unavailableItemsState.set([]);

    try {
      const response = await firstValueFrom(
        this.checkoutApi.checkout({ checkoutRequest: { deliveryAddressId: addressId } }),
      );

      this.orderIdState.set(response.orderId);
      this.overrideAddressIdState.set(null);
      this.noticeState.set(null);
      this.unavailableItemsState.set([]);
      this.cartStore.applyEmptyCart();
      await this.router.navigateByUrl(`/orders/${response.orderId}`);
    } catch (error) {
      this.handleSubmitError(error as AppError);
    } finally {
      this.isSubmittingState.set(false);
    }
  }

  private handleSubmitError(appError: AppError): void {
    if (appError.status === 422 && isCheckoutUnavailableResponse(appError.rawError)) {
      const unavailableItems = appError.rawError.unavailableItems ?? [];
      this.unavailableItemsState.set(unavailableItems);
      this.noticeState.set({
        kind: 'unavailable-items',
        title: 'Some items are no longer available',
        detail: unavailableItems
          .map((item) => `${item.productName} (${item.reason})`)
          .join(', '),
      });
      void this.cartStore.loadCart();
      void this.router.navigateByUrl('/cart');
      return;
    }

    if (appError.isNetworkError || appError.code === AppErrorCode.Unknown) {
      this.noticeState.set({
        kind: 'network',
        title: 'We could not confirm your order',
        detail:
          'Your connection was interrupted before the server confirmed your order. Check your order history before placing the order again to avoid a duplicate.',
      });
      return;
    }

    this.noticeState.set({
      kind: 'general',
      title: appError.title,
      detail: appError.detail,
    });
  }
}
