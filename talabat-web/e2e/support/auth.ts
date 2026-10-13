import { expect, type Page } from '@playwright/test';

import { assertCleanCallbackUrl } from './network-audit';
import { E2E_IDENTITY_ORIGIN, E2E_SPA_URL } from './test-data';

export interface SignInCredentials {
  email: string;
  password: string;
}

export async function signInViaIdentity(
  page: Page,
  credentials: SignInCredentials,
  expectedPath: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL(
    (url) => url.origin === E2E_IDENTITY_ORIGIN && url.pathname === '/auth/login',
  );

  await page.locator('#Input_Email').fill(credentials.email);
  await page.locator('#Input_Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  await page.waitForURL(
    (url) => url.origin === E2E_SPA_URL && url.pathname === expectedPath,
  );

  assertCleanCallbackUrl(page);
  expect(new URL(page.url()).pathname).toBe(expectedPath);
}

export async function signOutViaHeader(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();

  await page.waitForURL(
    (url) => url.origin === E2E_SPA_URL && url.pathname === '/restaurants',
  );
}
