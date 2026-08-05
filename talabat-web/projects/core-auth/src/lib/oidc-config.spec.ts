import { AuthRuntimeConfig, createOidcRuntimeConfig } from './oidc-config';

describe('createOidcRuntimeConfig', () => {
  it('maps runtime configuration to authorization code flow with PKCE', () => {
    const appConfig: AuthRuntimeConfig = {
      identityAuthority: 'https://identity.example',
      customerApiBaseUrl: 'https://customer.example',
      clientId: 'customer-spa',
      scopes: 'openid profile customer.api offline_access',
    };

    const result = createOidcRuntimeConfig(appConfig, 'https://customer-app.example/path', sessionStorage);

    expect(result.settings.authority).toBe(appConfig.identityAuthority);
    expect(result.settings.client_id).toBe(appConfig.clientId);
    expect(result.settings.scope).toBe(appConfig.scopes);
    expect(result.settings.redirect_uri).toBe('https://customer-app.example/signin-callback');
    expect(result.settings.post_logout_redirect_uri).toBe(
      'https://customer-app.example/signout-callback',
    );
    expect(result.settings.response_type).toBe('code');
    expect(result.settings.disablePKCE).toBe(false);
    expect(result.settings.automaticSilentRenew).toBe(true);
    expect(result.settings.validateSubOnSilentRenew).toBe(true);
    expect(result.settings).not.toHaveProperty('client_secret');
    expect(result.usesTransientSessionStorage).toBe(true);
    expect(result.usesInMemoryUserStorage).toBe(true);
  });
});
