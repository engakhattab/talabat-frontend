import { expect, test, type Page } from '@playwright/test';

import { assertAccessiblePage } from './support/accessibility';
import { signInViaIdentity, signOutViaHeader, type SignInCredentials } from './support/auth';
import {
  attachFailureArtifacts,
  assertNoBearerLeakage,
  assertNoPersistedSensitiveState,
  NetworkAudit,
} from './support/network-audit';
import {
  E2E_SPA_URL,
  assertRequiredCredentials,
  runProvisioner,
  type ProvisionMetadata,
} from './support/test-data';

let credentials: SignInCredentials;
let prepared: ProvisionMetadata;

test.beforeAll(async () => {
  const email = process.env.E2E_CUSTOMER_EMAIL ?? '';
  const password = process.env.E2E_CUSTOMER_PASSWORD ?? '';
  assertRequiredCredentials(email, password);
  credentials = { email, password };
  prepared = await runProvisioner('prepare', { email, password });
});

test.afterAll(async () => {
  if (credentials) {
    await runProvisioner('restore', credentials).catch(() => undefined);
  }
});

test('anonymous-to-order happy path uses live OIDC and dynamic order verification', async ({
  page,
}, testInfo) => {
  const audit = new NetworkAudit(page);
  try {
    const { restaurant, happyProduct } = prepared.catalog;
    const menuPath = `/restaurants/${restaurant.id}`;

    await page.goto(`${E2E_SPA_URL}/restaurants`);
    await expect(page.getByText('Browsing as guest', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
    await assertAccessiblePage(page, testInfo, 'anonymous-catalog');

    await page.getByRole('link').filter({ hasText: restaurant.name }).first().click();
    await page.waitForURL((url) => url.origin === E2E_SPA_URL && url.pathname === menuPath);
    await expect(page.getByRole('heading', { name: happyProduct.name })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add to cart', exact: true }).first(),
    ).toBeVisible();

    await signInViaIdentity(page, credentials, menuPath);

    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();
    await expect(page.getByText(prepared.customer.displayName, { exact: true })).toBeVisible();

    await page.goto(`${E2E_SPA_URL}/profile`);
    await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
    await expect(page.getByText(prepared.customer.displayName, { exact: true })).toBeVisible();
    const savedAddresses = page.locator('section[aria-label="Saved delivery addresses"]');
    await expect(savedAddresses.getByText(prepared.addresses.default.label)).toBeVisible();
    await expect(savedAddresses.getByText('Default', { exact: true })).toBeVisible();

    await addProductToCart(page, menuPath, happyProduct.name);
    await page.goto(`${E2E_SPA_URL}/cart`);
    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    await expect(page.getByText(happyProduct.name, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Proceed to Checkout' })).toBeVisible();

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await page.waitForURL((url) => url.origin === E2E_SPA_URL && url.pathname === '/checkout');
    await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    await expect(page.getByText(prepared.addresses.default.label)).toBeVisible();
    await expect(page.getByText('Default', { exact: true })).toBeVisible();
    await expect(page.getByText(happyProduct.name, { exact: true })).toBeVisible();

    await assertAccessiblePage(page, testInfo, 'authenticated-checkout');
    await assertKeyboardAndResponsiveOrderingControls(page);

    await page.getByRole('button', { name: 'Place Order', exact: true }).click();
    await page.waitForURL(
      (url) => url.origin === E2E_SPA_URL && /^\/orders\/\d+$/u.test(url.pathname),
    );
    const orderId = orderIdFromUrl(page.url());

    await expect(page.getByRole('heading', { name: 'Order Details' })).toBeVisible();
    await expect(page.getByText(`Order #${orderId}`, { exact: true })).toBeVisible();
    await expect(page.getByText(happyProduct.name, { exact: true })).toBeVisible();
    await expect(page.getByText('Order confirmed', { exact: true })).toBeVisible();
    await expect(page.getByText(prepared.addresses.default.label)).toBeVisible();

    await page.goto(`${E2E_SPA_URL}/cart`);
    await expect(page.getByText('Your cart is empty', { exact: true })).toBeVisible();

    await page.goto(`${E2E_SPA_URL}/orders/${orderId}`);
    await expect(page.getByText(`Order #${orderId}`, { exact: true })).toBeVisible();
    await expect(page.getByText(happyProduct.name, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(`Order #${orderId}`, { exact: true })).toBeVisible();
    await expect(page.getByText(happyProduct.name, { exact: true })).toBeVisible();

    await signOutViaHeader(page);
    await expect(page.getByText('Browsing as guest', { exact: true })).toBeVisible();

    assertNoBearerLeakage(audit);
    await assertNoPersistedSensitiveState(page);
  } catch (error) {
    await attachFailureArtifacts(page, audit, testInfo);
    throw error;
  }
});

test('unavailable-item checkout recovers to a preserved cart with a safe notice', async ({
  page,
}, testInfo) => {
  const audit = new NetworkAudit(page);
  let madeUnavailable = false;
  try {
    const { restaurant, negativeProduct } = prepared.catalog;
    const menuPath = `/restaurants/${restaurant.id}`;
    expect(prepared.catalog.negativeProduct.available).toBe(true);

    await page.goto(`${E2E_SPA_URL}/restaurants`);
    await signInViaIdentity(page, credentials, '/restaurants');
    await expect(page.getByText(prepared.customer.displayName, { exact: true })).toBeVisible();

    const baselineOrders = await readOrderIds(page);

    await addProductToCart(page, menuPath, negativeProduct.name);
    await page.goto(`${E2E_SPA_URL}/cart`);
    await expect(page.getByText(negativeProduct.name, { exact: true })).toBeVisible();

    const unavailable = await runProvisioner('make-negative-product-unavailable', credentials);
    madeUnavailable = true;
    expect(unavailable.catalog.negativeProduct.available).toBe(false);

    await page.goto(`${E2E_SPA_URL}/checkout`);
    await expect(page.getByText(negativeProduct.name, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Place Order', exact: true }).click();
    await page.waitForURL((url) => url.origin === E2E_SPA_URL && url.pathname === '/cart');

    await expect(page.getByRole('heading', { name: 'Your Cart' })).toBeVisible();
    await expect(page.getByText(negativeProduct.name, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await page.waitForURL((url) => url.origin === E2E_SPA_URL && url.pathname === '/checkout');
    const notice = page.getByRole('alert');
    await expect(notice).toBeVisible();
    await expect(notice.getByText('Some items are no longer available')).toBeVisible();
    await expect(notice.getByText(negativeProduct.name)).toBeVisible();
    await expect(page.getByText(negativeProduct.name, { exact: true })).toBeVisible();

    expect(await readOrderIds(page)).toEqual(baselineOrders);

    assertNoBearerLeakage(audit);
    await assertNoPersistedSensitiveState(page);
  } catch (error) {
    await attachFailureArtifacts(page, audit, testInfo);
    throw error;
  } finally {
    if (madeUnavailable) {
      await runProvisioner('restore', credentials).catch(() => undefined);
    }
  }
});

function orderIdFromUrl(url: string): number {
  const match = /^\/orders\/(\d+)$/u.exec(new URL(url).pathname);
  if (!match) {
    throw new Error(`could not extract an order id from the URL '${url}'`);
  }
  return Number(match[1]);
}

async function addProductToCart(page: Page, menuPath: string, productName: string): Promise<void> {
  await page.goto(`${E2E_SPA_URL}${menuPath}`);
  const card = page.getByRole('article').filter({ hasText: productName });
  await expect(card.getByRole('heading', { name: productName })).toBeVisible();
  await card.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(card.getByRole('status').getByText('Added to your cart')).toBeVisible();
}

async function readOrderIds(page: Page): Promise<string[]> {
  await page.goto(`${E2E_SPA_URL}/orders`);
  await expect(page.getByRole('heading', { name: 'Your Orders' })).toBeVisible();
  const links = page.locator('ul[role="list"] a');
  await Promise.race([
    links.first().waitFor({ state: 'visible' }),
    page.getByText('No orders yet', { exact: true }).waitFor({ state: 'visible' }),
  ]);
  const ids: string[] = [];
  for (const text of await links.allTextContents()) {
    const match = /#(\d+)/u.exec(text);
    if (match) {
      ids.push(match[1]);
    }
  }
  return ids;
}

async function assertKeyboardAndResponsiveOrderingControls(page: Page): Promise<void> {
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(page.getByRole('button', { name: 'Place Order', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const placeOrder = page.getByRole('button', { name: 'Place Order', exact: true });
  await placeOrder.focus();
  await expect(placeOrder).toBeFocused();
  expect(await placeOrder.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(42);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(placeOrder).toBeEnabled();
}
