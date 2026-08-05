import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BASE_PATH, CustomerApiService } from '@talabat/api-customer';
import { authInterceptor, AuthStore } from '@talabat/core-auth';
import { APP_CONFIG, AppConfig } from '@talabat/core-config';
import { firstValueFrom } from 'rxjs';

import { AUTH_RUNTIME_CONFIG } from '@talabat/core-auth';

describe('generated Customer API authentication integration', () => {
  const configuredBase = 'https://customer-api.example';
  const config: AppConfig = {
    identityAuthority: 'https://identity.example',
    customerApiBaseUrl: configuredBase,
    clientId: 'customer-spa',
    scopes: 'openid customer.api',
  };

  it('attaches bearer auth to generated /api/me request at the configured base', async () => {
    const auth = {
      getAccessToken: () => 'integration-access-token',
      handleUnauthorized: vi.fn(),
      handleForbidden: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        CustomerApiService,
        { provide: BASE_PATH, useValue: configuredBase },
        { provide: APP_CONFIG, useValue: config },
        { provide: AUTH_RUNTIME_CONFIG, useValue: config },
        { provide: AuthStore, useValue: auth },
      ],
    });
    const api = TestBed.inject(CustomerApiService);
    const httpTesting = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(api.getProfile());
    const request = httpTesting.expectOne(`${configuredBase}/api/me/profile`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer integration-access-token');
    request.flush({ fullName: 'Customer', age: 30, phoneNumber: null, addresses: [] });
    await response;
    httpTesting.verify();
  });

  it('does not attach bearer auth when generated base belongs to a foreign origin', async () => {
    const auth = {
      getAccessToken: () => 'integration-access-token',
      handleUnauthorized: vi.fn(),
      handleForbidden: vi.fn(),
    };
    const foreignBase = 'https://customer-api.example.evil.test';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        CustomerApiService,
        { provide: BASE_PATH, useValue: foreignBase },
        { provide: APP_CONFIG, useValue: config },
        { provide: AUTH_RUNTIME_CONFIG, useValue: config },
        { provide: AuthStore, useValue: auth },
      ],
    });
    const api = TestBed.inject(CustomerApiService);
    const httpTesting = TestBed.inject(HttpTestingController);
    const response = firstValueFrom(api.getProfile());
    const request = httpTesting.expectOne(`${foreignBase}/api/me/profile`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ fullName: 'Customer', age: 30, phoneNumber: null, addresses: [] });
    await response;
    httpTesting.verify();
  });
});
