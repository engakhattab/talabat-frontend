import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { AppError, AppErrorCode } from './app-error';
import { problemDetailsInterceptor } from './problem-details.interceptor';

describe('problemDetailsInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('maps a known Problem Details error code to AppError', async () => {
    const body = {
      title: 'Customer profile is required',
      detail: 'Create a profile before continuing.',
      errorCode: 'ProfileNotCreated',
    };
    const response = firstValueFrom(http.get('/test'));

    httpTesting.expectOne('/test').flush(body, { status: 409, statusText: 'Conflict' });

    await expect(response).rejects.toEqual({
      status: 409,
      code: AppErrorCode.ProfileNotCreated,
      title: 'Customer profile is required',
      detail: 'Create a profile before continuing.',
      isNetworkError: false,
      rawError: body,
    } satisfies AppError);
  });

  it('degrades an unrecognised backend error code to Unknown', async () => {
    const body = { title: 'A newer backend error', errorCode: 'FutureErrorCode' };
    const response = firstValueFrom(http.get('/test'));

    httpTesting
      .expectOne('/test')
      .flush(body, { status: 422, statusText: 'Unprocessable Entity' });

    await expect(response).rejects.toEqual({
      status: 422,
      code: AppErrorCode.Unknown,
      title: 'A newer backend error',
      detail: undefined,
      isNetworkError: false,
      rawError: body,
    } satisfies AppError);
  });

  it('uses safe defaults when the response has no Problem Details body', async () => {
    const response = firstValueFrom(http.get('/test'));

    httpTesting
      .expectOne('/test')
      .flush(null, { status: 500, statusText: 'Internal Server Error' });

    await expect(response).rejects.toEqual({
      status: 500,
      code: AppErrorCode.Unknown,
      title: 'Something went wrong',
      detail: undefined,
      isNetworkError: false,
    } satisfies AppError);
  });

  it('maps status 0 network failure to a network AppError', async () => {
    const response = firstValueFrom(http.get('/test'));

    httpTesting.expectOne('/test').error(new ProgressEvent('error'));

    await expect(response).rejects.toEqual({
      status: 0,
      code: AppErrorCode.Unknown,
      title: 'Cannot reach the server',
      isNetworkError: true,
    } satisfies AppError);
  });

  it('preserves a 422 CheckoutUnavailableResponse body on AppError.rawError', async () => {
    const checkoutBody = {
      status: 'unavailable',
      unavailableItems: [
        {
          productId: 12,
          productName: 'Chicken Shawarma Deluxe',
          reason: 'Out of stock',
        },
      ],
    };
    const response = firstValueFrom(http.get('/test'));

    httpTesting
      .expectOne('/test')
      .flush(checkoutBody, { status: 422, statusText: 'Unprocessable Entity' });

    await expect(response).rejects.toEqual({
      status: 422,
      code: AppErrorCode.Unknown,
      title: 'Something went wrong',
      detail: undefined,
      isNetworkError: false,
      rawError: checkoutBody,
    } satisfies AppError);
  });

  it('keeps an unknown 422 body safe without runtime exceptions', async () => {
    const body = { unexpected: 'shape' };
    const response = firstValueFrom(http.get('/test'));

    httpTesting.expectOne('/test').flush(body, { status: 422, statusText: 'Unprocessable Entity' });

    const error = await response.then(
      () => undefined as never,
      (e: unknown) => e as AppError,
    );

    expect(error.status).toBe(422);
    expect(error.code).toBe(AppErrorCode.Unknown);
    expect(error.isNetworkError).toBe(false);
    expect(error.rawError).toEqual(body);
  });

  it.each([
    ['CrossRestaurantCart', 409],
    ['CartExpired', 409],
    ['CartNotActive', 409],
    ['CartItemNotFound', 404],
    ['ProductUnavailable', 422],
    ['RestaurantClosed', 422],
    ['RestaurantInactive', 422],
    ['InvalidQuantity', 400],
  ] as const)('maps cart domain error code %s to AppError', async (errorCode, status) => {
    const body = { title: `${errorCode} occurred`, detail: 'Cart operation failed', errorCode };
    const response = firstValueFrom(http.get('/test'));

    httpTesting
      .expectOne('/test')
      .flush(body, { status, statusText: 'Error' });

    await expect(response).rejects.toEqual({
      status,
      code: AppErrorCode[errorCode],
      title: `${errorCode} occurred`,
      detail: 'Cart operation failed',
      isNetworkError: false,
      rawError: body,
    } satisfies AppError);
  });
});
