import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { APP_CONFIG, APP_CONFIG_READY, AppConfig } from './app-config';
import { AppConfigError, provideAppConfig } from './provide-app-config';

describe('provideAppConfig', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function stubConfigResponse(body: unknown, ok = true, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok,
      status,
      json: () =>
        typeof body === 'string'
          ? Promise.reject(new SyntaxError('Unexpected token'))
          : Promise.resolve(body),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  async function expectRejected(body: unknown, ok = true, status = 200) {
    stubConfigResponse(body, ok, status);
    TestBed.configureTestingModule({ providers: [provideAppConfig()] });

    const ready = TestBed.inject(APP_CONFIG_READY);
    await expect(ready).rejects.toThrow(AppConfigError);
    const initStatus = TestBed.inject(ApplicationInitStatus);
    await expect(initStatus.donePromise).rejects.toThrow(AppConfigError);
    expect(() => TestBed.inject(APP_CONFIG)).toThrow(AppConfigError);
  }

  async function expectRejectedFetch() {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    TestBed.configureTestingModule({ providers: [provideAppConfig()] });

    const ready = TestBed.inject(APP_CONFIG_READY);
    await expect(ready).rejects.toThrow(AppConfigError);
    const initStatus = TestBed.inject(ApplicationInitStatus);
    await expect(initStatus.donePromise).rejects.toThrow(AppConfigError);
    expect(() => TestBed.inject(APP_CONFIG)).toThrow(AppConfigError);
  }

  it('loads runtime config before making APP_CONFIG available', async () => {
    const runtimeConfig: AppConfig = {
      identityAuthority: 'https://identity.example.test',
      customerApiBaseUrl: 'https://api.example.test',
      clientId: 'customer-spa',
      scopes: 'openid profile',
    };
    const fetchMock = stubConfigResponse(runtimeConfig);

    TestBed.configureTestingModule({
      providers: [provideAppConfig()],
    });

    const initStatus = TestBed.inject(ApplicationInitStatus);
    await initStatus.donePromise;
    await TestBed.inject(APP_CONFIG_READY);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('/assets/config.json');
    expect(TestBed.inject(APP_CONFIG)).toEqual(runtimeConfig);
  });

  it('rejects a rejected fetch before provider use', async () => {
    await expectRejectedFetch();
  });

  it('rejects a non-2xx fetch before provider use', async () => {
    await expectRejected({}, false, 503);
  });

  it('rejects malformed JSON before provider use', async () => {
    await expectRejected('not-json');
  });

  it.each([
    ['non-object JSON', ['identityAuthority']],
    ['null JSON', null],
    ['string JSON', 'identityAuthority'],
  ] as const)('rejects %s', async (_label, body) => {
    await expectRejected(body);
  });

  it.each([
    ['missing identityAuthority', { customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: 'openid profile' }],
    ['missing customerApiBaseUrl', { identityAuthority: 'https://identity.example.test', clientId: 'customer-spa', scopes: 'openid profile' }],
    ['missing clientId', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', scopes: 'openid profile' }],
    ['missing scopes', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa' }],
    ['extra key', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: 'openid profile', clientSecret: 'top-secret' }],
  ])('rejects %s', async (_label, body) => {
    await expectRejected(body);
  });

  it.each([
    ['invalid authority URL', { identityAuthority: 'not-a-url', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: 'openid profile' }],
    ['relative authority URL', { identityAuthority: '/authority', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: 'openid profile' }],
    ['non-http authority scheme', { identityAuthority: 'ftp://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: 'openid profile' }],
    ['invalid API URL', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'not-a-url', clientId: 'customer-spa', scopes: 'openid profile' }],
  ])('rejects %s', async (_label, body) => {
    await expectRejected(body);
  });

  it.each([
    ['empty clientId', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: '', scopes: 'openid profile' }],
    ['empty scopes', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: '' }],
    ['non-string clientId', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: 42, scopes: 'openid profile' }],
    ['non-string scopes', { identityAuthority: 'https://identity.example.test', customerApiBaseUrl: 'https://api.example.test', clientId: 'customer-spa', scopes: ['openid'] }],
  ])('rejects %s', async (_label, body) => {
    await expectRejected(body);
  });

  it('accepts only allowed public values and rejects token-holding extras', async () => {
    const allowed = stubConfigResponse({
      identityAuthority: 'https://identity.example.test',
      customerApiBaseUrl: 'https://api.example.test',
      clientId: 'customer-spa',
      scopes: 'openid profile',
    });

    TestBed.configureTestingModule({ providers: [provideAppConfig()] });
    await TestBed.inject(APP_CONFIG_READY);

    expect(allowed).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(APP_CONFIG).clientId).toBe('customer-spa');
  });
});
