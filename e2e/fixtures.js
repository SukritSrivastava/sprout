// Shared test setup. Every test that imports `test` from here automatically fails if the page
// logs a console error or throws an uncaught exception, so silent breakage can't slip through.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const problems = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
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
