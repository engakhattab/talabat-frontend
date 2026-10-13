import { expect, type Page, type TestInfo } from '@playwright/test';

import { E2E_CUSTOMER_API_ORIGIN, E2E_SPA_URL } from './test-data';

export interface AuditedRequest {
  url: string;
  hasBearer: boolean;
}

export class NetworkAudit {
  readonly requests: AuditedRequest[] = [];
  readonly consoleMessages: string[] = [];

  constructor(page: Page) {
    page.on('request', (request) => {
      const authorization = request.headers()['authorization'] ?? '';
      this.requests.push({
        url: request.url(),
        hasBearer: /^Bearer\s/iu.test(authorization),
      });
    });
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        this.consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });
  }
}

const SENSITIVE_QUERY_KEYS = ['code', 'state', 'session_state'] as const;

export function redactSensitiveUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  for (const key of SENSITIVE_QUERY_KEYS) {
    if (url.searchParams.has(key)) url.searchParams.set(key, 'REDACTED');
  }
  return url.toString();
}

export function assertNoBearerLeakage(audit: NetworkAudit): void {
  const leaked = audit.requests.filter(
    (request) =>
      request.hasBearer && !request.url.startsWith(`${E2E_CUSTOMER_API_ORIGIN}/api/me`),
  );
  expect(
    leaked.map((request) => redactSensitiveUrl(request.url)),
    'bearer token was attached outside the exact Customer API protected boundary',
  ).toEqual([]);
}

export function assertCleanCallbackUrl(page: Page): void {
  const url = new URL(page.url());
  expect(url.origin, 'callback did not return to the SPA origin').toBe(E2E_SPA_URL);
  for (const key of SENSITIVE_QUERY_KEYS) {
    expect(
      url.searchParams.has(key),
      `callback URL still contains '${key}'`,
    ).toBe(false);
  }
}

export async function assertNoPersistedSensitiveState(page: Page): Promise<void> {
  const storage = await page.evaluate(() => {
    const read = (store: Storage): Array<[string, string]> => {
      const entries: Array<[string, string]> = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key !== null) entries.push([key, store.getItem(key) ?? '']);
      }
      return entries;
    };
    return {
      local: read(window.localStorage),
      session: read(window.sessionStorage),
    };
  });

  const allEntries = [...storage.local, ...storage.session];
  const sensitiveEntries = allEntries.filter(([key, value]) =>
    isSensitiveStorageEntry(key, value),
  );
  expect(
    sensitiveEntries,
    'OIDC tokens, secrets, or user snapshots persisted in browser storage',
  ).toEqual([]);
}

export async function attachFailureArtifacts(
  page: Page,
  audit: NetworkAudit,
  testInfo: TestInfo,
): Promise<void> {
  await testInfo.attach('sanitized-network-summary', {
    body: JSON.stringify(
      {
        currentUrl: redactSensitiveUrl(page.url()),
        console: audit.consoleMessages.slice(-50),
        requests: audit.requests
          .map((request) => ({
            url: redactSensitiveUrl(request.url),
            hasBearer: request.hasBearer,
          }))
          .slice(-200),
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
}

function isSensitiveStorageEntry(key: string, value: string): boolean {
  if (/^(talabat\.oidc\.|oidc\.)/u.test(key)) return true;
  if (/\b(access_token|refresh_token|id_token|client_secret|password)\b/iu.test(value)) {
    return true;
  }
  return /\b(token|secret|credential)\b/iu.test(key);
}
