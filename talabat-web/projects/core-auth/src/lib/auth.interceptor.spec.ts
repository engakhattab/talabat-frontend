import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfig } from '@talabat/core-config';
import { firstValueFrom } from 'rxjs';

import { authInterceptor, isProtectedCustomerRequest } from './auth.interceptor';
import { AuthStore } from './auth.store';
import { AUTH_RUNTIME_CONFIG } from './oidc-config';

describe('isProtectedCustomerRequest', () => {
  const base = 'https://localhost:7056';

  it.each([
    'https://localhost:7056/api/me/profile',
    'https://localhost:7056/api/me/profile?include=addresses',
  ])('accepts protected Customer API URL %s', (url) => {
    expect(isProtectedCustomerRequest(url, base)).toBe(true);
  });

  it.each([
    'https://localhost:7237/api/me/profile',
    'http://localhost:4200/assets/config.json',
    'https://example.com/api/me/profile',
    'https://localhost:7056.evil.example/api/me/profile',
    'https://localhost:7056-other.example/api/me/profile',
    'https://localhost:7056/api/metadata',
    'https://localhost:7056/api/meevil/profile',
    'https://localhost:7056/api/catalog/restaurants',
  ])('rejects untrusted or non-protected URL %s', (url) => {
    expect(isProtectedCustomerRequest(url, base)).toBe(false);
  });
});

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  const auth = {
    getAccessToken: vi.fn<() => string | null>().mockReturnValue('test-access-token'),
    handleUnauthorized: vi.fn(),
    handleForbidden: vi.fn(),
  };
  const config: AppConfig = {
    identityAuthority: 'https://localhost:7237',
    customerApiBaseUrl: 'https://localhost:7056',
    clientId: 'customer-spa',
    scopes: 'openid customer.api',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.getAccessToken.mockReturnValue('test-access-token');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_RUNTIME_CONFIG, useValue: config },
        { provide: AuthStore, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('attaches one token while preserving query, body, and unrelated headers', async () => {
    const body = { fullName: 'Test Customer' };
    const response = firstValueFrom(
      http.post('https://localhost:7056/api/me/profile?mode=create', body, {
        headers: { 'X-Custom': 'value' },
      }),
    );
    const request = httpTesting.expectOne(
      'https://localhost:7056/api/me/profile?mode=create',
    );
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    expect(request.request.headers.getAll('Authorization')).toHaveLength(1);
    expect(request.request.headers.get('X-Custom')).toBe('value');
    expect(request.request.body).toBe(body);
    request.flush({});
    await response;
  });

  it.each([
    'https://localhost:7237/',
    'http://localhost:4200/assets/config.json',
    'https://example.com/api/me/profile',
    'https://localhost:7056.evil.example/api/me/profile',
    'https://localhost:7056/api/catalog/restaurants',
  ])('never attaches a token to %s', async (url) => {
    const response = firstValueFrom(http.get(url));
    const request = httpTesting.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await response;
  });

  it('does not replace an existing Authorization header', async () => {
    const response = firstValueFrom(
      http.get('https://localhost:7056/api/me/profile', {
        headers: { Authorization: 'Bearer existing' },
      }),
    );
    const request = httpTesting.expectOne('https://localhost:7056/api/me/profile');
    expect(request.request.headers.get('Authorization')).toBe('Bearer existing');
    request.flush({});
    await response;
  });

  it('passes an eligible request unchanged when no token exists', async () => {
    auth.getAccessToken.mockReturnValue(null);
    const response = firstValueFrom(http.get('https://localhost:7056/api/me/profile'));
    const request = httpTesting.expectOne('https://localhost:7056/api/me/profile');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await response;
  });

  it('clears a 401 session without replaying the request', async () => {
    const response = firstValueFrom(http.post('https://localhost:7056/api/me/profile', {}));
    httpTesting
      .expectOne('https://localhost:7056/api/me/profile')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await expect(response).rejects.toBeDefined();
    expect(auth.handleUnauthorized).toHaveBeenCalledOnce();
    httpTesting.expectNone('https://localhost:7056/api/me/profile');
  });

  it('represents 403 without clearing authentication', async () => {
    const response = firstValueFrom(http.get('https://localhost:7056/api/me/profile'));
    httpTesting
      .expectOne('https://localhost:7056/api/me/profile')
      .flush(null, { status: 403, statusText: 'Forbidden' });
    await expect(response).rejects.toBeDefined();
    expect(auth.handleForbidden).toHaveBeenCalledOnce();
    expect(auth.handleUnauthorized).not.toHaveBeenCalled();
  });
});
