import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AddCartItemRequest,
  CartApiService,
  CartLineItemDto,
  CartResponse,
} from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { AuthStore } from '@talabat/core-auth';

export type CartStatusState = 'uninitialized' | 'loading' | 'loaded' | 'error';

export type CartNoticeKind =
  | 'product-unavailable'
  | 'restaurant-closed'
  | 'cart-expired'
  | 'cart-not-active'
  | 'invalid-quantity'
  | 'cart-item-not-found'
  | 'unavailable-items'
  | 'network'
  | 'general';

export interface CartNotice {
  readonly kind: CartNoticeKind;
  readonly title: string;
  readonly detail?: string;
}

export interface CartStoreState {
  readonly status: CartStatusState;
  readonly cart: CartResponse | null;
  readonly error: AppError | null;
  readonly notice: CartNotice | null;
  readonly isMutating: boolean;
  readonly mutatingProductId: number | null;
  readonly conflictAddRequest: AddCartItemRequest | null;
}

export type AddItemOutcome =
  | { readonly kind: 'added' }
  | { readonly kind: 'conflict' }
  | { readonly kind: 'error'; readonly error: AppError };

export type ConflictResolution = 'clear-and-add' | 'keep-current';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly cartApi = inject(CartApiService);
  private readonly auth = inject(AuthStore);

  private readonly statusState = signal<CartStatusState>('uninitialized');
  private readonly cartState = signal<CartResponse | null>(null);
  private readonly errorState = signal<AppError | null>(null);
  private readonly noticeState = signal<CartNotice | null>(null);
  private readonly isMutatingState = signal(false);
  private readonly mutatingProductIdState = signal<number | null>(null);
  private readonly conflictAddRequestState = signal<AddCartItemRequest | null>(null);

  private loadGeneration = 0;
  private mutationQueue: Promise<unknown> = Promise.resolve();

  readonly status = this.statusState.asReadonly();
  readonly cart = this.cartState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly notice = this.noticeState.asReadonly();
  readonly isMutating = this.isMutatingState.asReadonly();
  readonly mutatingProductId = this.mutatingProductIdState.asReadonly();
  readonly conflictAddRequest = this.conflictAddRequestState.asReadonly();

  readonly items = computed<CartLineItemDto[]>(() => this.cartState()?.items ?? []);
  readonly total = computed(() => this.cartState()?.total ?? null);
  readonly totalItemCount = computed(() =>
    this.cartState()?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
  );
  readonly isEmpty = computed(() => (this.cartState()?.items.length ?? 0) === 0);
  readonly restaurantId = computed(() => this.cartState()?.restaurantId ?? null);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.loadCart();
      } else {
        this.reset();
      }
    });
  }

  loadCart(): Promise<void> {
    return this.reload();
  }

  async reload(preserveNotice = false): Promise<void> {
    if (!this.auth.isAuthenticated()) return;

    const generation = ++this.loadGeneration;
    if (this.statusState() !== 'loaded') {
      this.statusState.set('loading');
    }
    this.errorState.set(null);

    try {
      const cart = await firstValueFrom(this.cartApi.getCart());
      if (generation !== this.loadGeneration) return;
      this.applyCart(cart, preserveNotice);
    } catch (err) {
      if (generation !== this.loadGeneration) return;
      const appError = err as AppError;
      if (this.cartState() === null) {
        this.errorState.set(appError);
        this.statusState.set('error');
      } else {
        this.noticeState.set({
          kind: appError.isNetworkError ? 'network' : 'general',
          title: appError.isNetworkError ? 'Connection problem' : appError.title,
          detail: appError.detail,
        });
      }
    }
  }

  async addItem(request: AddCartItemRequest): Promise<AddItemOutcome> {
    if (!this.auth.isAuthenticated()) {
      return {
        kind: 'error',
        error: {
          status: 401,
          code: AppErrorCode.Unknown,
          title: 'Not authenticated',
          isNetworkError: false,
        },
      };
    }

    if (this.conflictAddRequestState() !== null) {
      return { kind: 'conflict' };
    }

    this.isMutatingState.set(true);
    this.mutatingProductIdState.set(request.productId);
    try {
      const cart = await this.enqueue(() =>
        firstValueFrom(this.cartApi.addCartItem({ addCartItemRequest: request })),
      );
      this.applyCart(cart);
      return { kind: 'added' };
    } catch (err) {
      const appError = err as AppError;
      if (appError.code === AppErrorCode.CrossRestaurantCart) {
        this.conflictAddRequestState.set(request);
        return { kind: 'conflict' };
      }
      this.handleMutationError(appError);
      return { kind: 'error', error: appError };
    } finally {
      this.isMutatingState.set(false);
      this.mutatingProductIdState.set(null);
    }
  }

  resolveConflict(choice: ConflictResolution): Promise<void> {
    const pending = this.conflictAddRequestState();
    this.conflictAddRequestState.set(null);
    if (choice === 'keep-current' || pending === null) return Promise.resolve();

    this.isMutatingState.set(true);
    this.mutatingProductIdState.set(pending.productId);
    return this.enqueue(async () => {
      await firstValueFrom(this.cartApi.clearCart());
      this.applyEmptyCartInternal();
      const cart = await firstValueFrom(
        this.cartApi.addCartItem({ addCartItemRequest: pending }),
      );
      this.applyCart(cart);
    })
      .catch((err: unknown) => {
        this.handleMutationError(err as AppError);
      })
      .finally(() => {
        this.isMutatingState.set(false);
        this.mutatingProductIdState.set(null);
      });
  }

  async updateQuantity(productId: number, quantity: number): Promise<void> {
    if (quantity < 1) {
      await this.removeItem(productId);
      return;
    }

    this.isMutatingState.set(true);
    this.mutatingProductIdState.set(productId);
    try {
      const cart = await this.enqueue(() =>
        firstValueFrom(
          this.cartApi.updateCartItemQuantity({
            productId,
            updateCartItemRequest: { quantity },
          }),
        ),
      );
      this.applyCart(cart);
    } catch (err) {
      this.handleMutationError(err as AppError);
    } finally {
      this.isMutatingState.set(false);
      this.mutatingProductIdState.set(null);
    }
  }

  async removeItem(productId: number): Promise<void> {
    this.isMutatingState.set(true);
    this.mutatingProductIdState.set(productId);
    try {
      const cart = await this.enqueue(() =>
        firstValueFrom(this.cartApi.removeCartItem({ productId })),
      );
      this.applyCart(cart);
    } catch (err) {
      this.handleMutationError(err as AppError);
    } finally {
      this.isMutatingState.set(false);
      this.mutatingProductIdState.set(null);
    }
  }

  async clearCart(): Promise<void> {
    this.isMutatingState.set(true);
    try {
      await this.enqueue(() => firstValueFrom(this.cartApi.clearCart()));
      this.applyEmptyCartInternal();
    } catch (err) {
      this.handleMutationError(err as AppError);
    } finally {
      this.isMutatingState.set(false);
      this.mutatingProductIdState.set(null);
    }
  }

  reset(): void {
    this.loadGeneration += 1;
    this.statusState.set('uninitialized');
    this.cartState.set(null);
    this.errorState.set(null);
    this.noticeState.set(null);
    this.isMutatingState.set(false);
    this.mutatingProductIdState.set(null);
    this.conflictAddRequestState.set(null);
  }

  applyEmptyCart(): void {
    this.applyEmptyCartInternal();
  }

  showNotice(notice: CartNotice): void {
    this.noticeState.set(notice);
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.mutationQueue.then(operation);
    this.mutationQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private applyCart(cart: CartResponse, keepNotice = false): void {
    this.cartState.set(cart);
    this.statusState.set('loaded');
    this.errorState.set(null);
    if (!keepNotice) {
      this.noticeState.set(null);
    }
  }

  private applyEmptyCartInternal(): void {
    const current = this.cartState();
    this.cartState.set({
      id: null,
      customerId: current?.customerId ?? 0,
      restaurantId: null,
      status: 'Empty',
      items: [],
      total: { amount: 0, currency: 'EGP' },
    });
    this.statusState.set('loaded');
    this.errorState.set(null);
  }

  private handleMutationError(appError: AppError): void {
    switch (appError.code) {
      case AppErrorCode.ProductUnavailable:
        this.noticeState.set({
          kind: 'product-unavailable',
          title: 'Item is no longer available',
          detail: appError.detail,
        });
        void this.reload(true);
        break;
      case AppErrorCode.RestaurantClosed:
        this.noticeState.set({
          kind: 'restaurant-closed',
          title: 'Restaurant is closed',
          detail: appError.detail,
        });
        break;
      case AppErrorCode.RestaurantInactive:
        this.noticeState.set({
          kind: 'general',
          title: 'Restaurant is no longer active',
          detail: appError.detail,
        });
        break;
      case AppErrorCode.CartExpired:
      case AppErrorCode.CartNotActive:
        this.applyEmptyCartInternal();
        this.noticeState.set({
          kind: appError.code === AppErrorCode.CartExpired ? 'cart-expired' : 'cart-not-active',
          title:
            appError.code === AppErrorCode.CartExpired
              ? 'Your cart has expired'
              : 'Your cart is no longer active',
          detail: appError.detail,
        });
        break;
      case AppErrorCode.InvalidQuantity:
        this.noticeState.set({
          kind: 'invalid-quantity',
          title: 'Invalid quantity',
          detail: appError.detail,
        });
        void this.reload(true);
        break;
      case AppErrorCode.CartItemNotFound:
        this.noticeState.set({
          kind: 'cart-item-not-found',
          title: 'Item not found in cart',
          detail: appError.detail,
        });
        void this.reload(true);
        break;
      default:
        this.noticeState.set({
          kind: appError.isNetworkError ? 'network' : 'general',
          title: appError.isNetworkError ? 'Connection problem' : appError.title,
          detail: appError.detail,
        });
        break;
    }
  }
}
