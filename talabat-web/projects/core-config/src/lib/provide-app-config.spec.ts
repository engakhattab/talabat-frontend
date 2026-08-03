import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { APP_CONFIG, AppConfig } from './app-config';
import { provideAppConfig } from './provide-app-config';

describe('provideAppConfig', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads runtime config before making APP_CONFIG available', async () => {
    const runtimeConfig: AppConfig = {
      identityAuthority: 'identity-authority',
      customerApiBaseUrl: 'customer-api-base-url',
      clientId: 'customer-spa',
      scopes: 'openid profile',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(runtimeConfig),
    });
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({
      providers: [provideAppConfig()],
    });

    const initStatus = TestBed.inject(ApplicationInitStatus);
    await initStatus.donePromise;

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/assets/config.json');
    expect(TestBed.inject(APP_CONFIG)).toEqual(runtimeConfig);
  });
});
