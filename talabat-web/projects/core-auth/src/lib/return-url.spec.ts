import { AUTH_FALLBACK_URL, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/restaurants', '/restaurants/12', '/restaurants?sort=name', '/restaurants#nearby'])(
    'accepts internal route %s',
    (value) => expect(safeReturnUrl(value)).toBe(value),
  );

  it.each([
    'https://evil.example',
    '//evil.example',
    'javascript:alert(1)',
    'data:text/html,test',
    '\\\\evil.example',
    '/%2f%2fevil.example',
    '/%252f%252fevil.example',
    '/signin-callback',
    '/signin-callback?code=secret',
    '/signout-callback',
    '/%E0%A4%A',
    '',
    null,
  ])('rejects unsafe or malformed value %s', (value) => {
    expect(safeReturnUrl(value)).toBe(AUTH_FALLBACK_URL);
  });

  it.each([
    '/restaurants?redirect_uri=https://evil.example',
    '/restaurants?redirect_uri=//evil.example',
    '/restaurants?next=javascript:alert(1)',
    '/restaurants?returnUrl=https%3A%2F%2Fevil.example',
  ])('keeps query values as internal parameters, not redirect targets: %s', (value) => {
    expect(safeReturnUrl(value)).toBe(value);
  });

  it.each([
    '/restaurants#redirect_uri=https://evil.example',
    '/restaurants#/account?returnTo=https://evil.example',
  ])('keeps hash fragments apart from the navigation target: %s', (value) => {
    const result = safeReturnUrl(value);
    expect(result).toBe(value);
    expect(result.startsWith('/restaurants')).toBe(true);
  });
});
