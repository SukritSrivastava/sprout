// Deliberately separate from fixture suites: this mode never starts local services or sends payments.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SPROUT_PREVIEW_URL;
if (!baseURL || new URL(baseURL).protocol !== 'https:')
  throw new Error('Set SPROUT_PREVIEW_URL to the HTTPS website preview URL.');

export default defineConfig({
  testDir: 'e2e/platform',
  testMatch: 'preview.spec.js',
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/preview',
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
});
