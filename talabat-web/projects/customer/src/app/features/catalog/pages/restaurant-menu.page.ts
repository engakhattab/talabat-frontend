import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CatalogApiService, MenuResponse } from '@talabat/api-customer';
import { AppError, AppErrorCode } from '@talabat/core-http';
import { DialogService, EmptyStateComponent, ErrorStateComponent, SpinnerComponent } from '@talabat/shared-ui';
import { AuthStore } from '@talabat/core-auth';
import { Subject, switchMap, of, catchError, map } from 'rxjs';

import { MenuHeaderComponent } from '../components/menu-header.component';
import { MenuProductCardComponent, CartEntryRequest } from '../components/menu-product-card.component';
import { CartEntryCoordinator } from '../../../core/cart-entry/cart-entry-coordinator.service';
import { CartDeferredDialogComponent } from '../../../layout/cart-entry-bar.component';

type MenuViewState =
  | 'invalid-parameter'
  | 'loading'
  | 'error-retryable'
  | 'not-found'
  | 'empty'
  | 'populated';

@Component({
  selector: 'tal-restaurant-menu-page',
  imports: [
    EmptyStateComponent,
    ErrorStateComponent,
    MenuHeaderComponent,
    MenuProductCardComponent,
    SpinnerComponent,
  ],
  template: `
    <main class="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-9 lg:px-9">
      @if (viewState() === 'loading') {
        <div class="grid min-h-56 place-items-center rounded-food-md bg-white shadow-food-sm">
          <tal-spinner label="Loading menu" />
        </div>
      } @else if (viewState() === 'error-retryable') {
        <tal-error-state
          [description]="errorDetail()"
          [title]="errorTitle()"
          (retry)="reload()"
        />
      } @else if (viewState() === 'invalid-parameter' || viewState() === 'not-found') {
        <tal-error-state
          description="We couldn't find this restaurant. It may have moved or is no longer available."
          title="Restaurant not found"
          (retry)="goBack()"
        />
      } @else if (viewState() === 'empty') {
        <tal-empty-state
          description="This restaurant has no items available right now."
          title="No items available"
          actionLabel="Back to restaurants"
          (action)="goBack()"
        />
      } @else if (menu(); as m) {
        <tal-menu-header [restaurantName]="m.restaurantName" />
        <ul class="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" role="list">
          @for (product of m.products; track product.id) {
            <li>
              <tal-menu-product-card
                [product]="product"
                [restaurantId]="m.restaurantId"
                (cartEntry)="onCartEntry($event)"
              />
            </li>
          }
        </ul>
      }
    </main>
  `,
})
export class RestaurantMenuPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cartEntryCoordinator = inject(CartEntryCoordinator);
  private readonly auth = inject(AuthStore);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);

  readonly restaurantId = input.required<string>();

  private readonly stateSignal = signal<MenuViewState>('loading');
  private readonly menuSignal = signal<MenuResponse | null>(null);
  private readonly errorSignal = signal<AppError | null>(null);
  private readonly reload$ = new Subject<void>();

  private readonly parsedId = computed<number | undefined>(() => parseRestaurantId(this.restaurantId()));

  protected readonly viewState = computed<MenuViewState>(() => {
    if (this.parsedId() === undefined) return 'invalid-parameter';
    return this.stateSignal();
  });

  protected readonly menu = computed<MenuResponse | null>(() => this.menuSignal());

  protected errorTitle(): string {
    return this.errorSignal()?.title ?? 'Something went wrong';
  }

  protected errorDetail(): string {
    return this.errorSignal()?.detail ?? 'Check your connection and try again.';
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/restaurants');
  }

  protected onCartEntry(request: CartEntryRequest): void {
    const outcome = this.cartEntryCoordinator.handle(request, this.auth.isAuthenticated());

    if (outcome === 'authentication-started') {
      void this.auth.signIn(this.router.url).catch(() => undefined);
      return;
    }

    this.dialog.openModal(CartDeferredDialogComponent, {
      ariaLabel: 'Ordering preview',
    });
  }

  ngOnInit(): void {
    this.reload$
      .pipe(
        map(() => this.parsedId()),
        switchMap((id) => {
          if (id === undefined) {
            return of({ kind: 'invalid' as const });
          }
          return this.api.getRestaurantMenu({ restaurantId: id }).pipe(
            map((response) => ({ kind: 'success' as const, response })),
            catchError((error: unknown) => of({ kind: 'error' as const, error: error as AppError })),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (result.kind === 'invalid') {
          this.stateSignal.set('invalid-parameter');
          this.menuSignal.set(null);
          this.errorSignal.set(null);
          return;
        }

        if (result.kind === 'error') {
          const appError = result.error;
          if (appError.code === AppErrorCode.RestaurantNotFound || appError.status === 404) {
            this.stateSignal.set('not-found');
          } else {
            this.stateSignal.set('error-retryable');
          }
          this.menuSignal.set(null);
          this.errorSignal.set(appError);
          return;
        }

        const menu = result.response;
        if (menu.products.length === 0) {
          this.stateSignal.set('empty');
        } else {
          this.stateSignal.set('populated');
        }
        this.menuSignal.set(menu);
        this.errorSignal.set(null);
      });

    this.reload$.next();
  }
}

function parseRestaurantId(raw: string): number | undefined {
  if (!/^[1-9]\d*$/.test(raw)) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return undefined;
  return parsed;
}
