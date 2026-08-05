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
});
