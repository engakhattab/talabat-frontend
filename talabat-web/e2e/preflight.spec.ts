import { expect, test } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

import {
  E2E_CUSTOMER_API_HEALTH,
  E2E_IDENTITY_DISCOVERY,
  E2E_SPA_URL,
  assertPublicSpaConfig,
  assertRequiredCredentials,
  resolveProvisionerContract,
} from './support/test-data';

async function fetchJson(request: APIRequestContext, url: string) {
  const response = await request.get(url);
  expect(response.ok(), `${url} did not respond with a 2xx status`).toBeTruthy();
  return response.json();
}

test('live E2E topology preflight rejects a missing backend provisioner', async ({ request }) => {
  assertRequiredCredentials(process.env.E2E_CUSTOMER_EMAIL, process.env.E2E_CUSTOMER_PASSWORD);

  resolveProvisionerContract();

  const config = (await fetchJson(
    request,
    `${E2E_SPA_URL}/assets/config.json`,
  )) as Parameters<typeof assertPublicSpaConfig>[0];
  assertPublicSpaConfig(config);

  const discovery = await fetchJson(request, E2E_IDENTITY_DISCOVERY);
  expect(discovery).toHaveProperty('authorization_endpoint');

  const health = await request.get(E2E_CUSTOMER_API_HEALTH);
  expect(health.ok(), `${E2E_CUSTOMER_API_HEALTH} did not respond with a 2xx status`).toBeTruthy();
  expect(await health.text()).toBe('Healthy');
});
