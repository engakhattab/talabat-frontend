import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

/** Runs the stable WCAG A/AA scan and keeps the failure report useful without snapshots. */
export async function assertAccessiblePage(
  page: Page,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  if (results.violations.length > 0) {
    await testInfo.attach(`axe-${label}`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });
  }

  expect(results.violations, `${label} has WCAG A/AA violations`).toEqual([]);
}
