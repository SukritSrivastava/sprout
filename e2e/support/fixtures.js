// Shared test setup. Every test that imports `test` from here automatically fails if the page
// logs a console error or throws an uncaught exception, so silent breakage can't slip through.
// A test that *expects* an error (say, a failed request) lists it with:
//   test.use({ expectedConsoleErrors: [/Failed to load resource/] })
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  guardianPermission: [true, { option: true }],
  expectedConsoleErrors: [[], { option: true }],
  page: async ({ page, expectedConsoleErrors, guardianPermission }, use) => {
    // Existing feature tests exercise an explicitly permitted sample session. Guardian tests
    // turn this off to cover first entry, withdrawal, deletion and real API enforcement.
    if (guardianPermission) {
    await page.route('**/api/seedlings', (route) => route.fulfill({ json: { garden: { completed: [], seeds: 0, totalLessons: 3 } } }));
    await page.route('**/api/guardian/status?learner=A12', (route) => route.fulfill({ json: {
      configured: true, consent: { learner: 'A12', status: 'active', revision: 1, policy: 'demo-permission-v2', acknowledgedAt: '2026-11-06T00:00:00.000Z', changedAt: '2026-11-06T00:00:00.000Z' },
    } }));
    }
    const problems = [];
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      if (expectedConsoleErrors.some((pattern) => pattern.test(message.text()))) return;
      problems.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`exception: ${error.message}`));
    await use(page);
    expect(problems, 'browser errors during the test').toEqual([]);
  },
});

export { expect };

// The demo app hides its section headings until they scroll into view; this jumps straight to a
// section without waiting for smooth scrolling.
export async function goToSection(page, id) {
  await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
}

export const isPhone = (testInfo) => testInfo.project.name === 'phone';
