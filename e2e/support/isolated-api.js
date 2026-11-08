// Disposable API processes for browser tests, with no access to the user's saved demo records.
import { fork } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import assert from 'node:assert/strict';

export async function startIsolatedApi(mode = 'guardian', startupTimeout = 20_000) {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-guardian-browser-'));
  const child = fork(resolve('e2e/support/guardian-server.ts'), [folder, mode], { execArgv: ['--import', 'tsx'], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let errors = ''; child.stderr.on('data', (chunk) => { errors += chunk; });
  const close = async () => {
    if (child.exitCode === null && child.connected) {
      child.disconnect();
      await new Promise((done) => {
        const timer = setTimeout(() => { child.kill(); done(); }, 5000);
        child.once('exit', () => { clearTimeout(timer); done(); });
      });
    }
    assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
    assert.ok(folder.startsWith(join(tmpdir(), 'sprout-guardian-browser-')));
    rmSync(folder, { recursive: true, force: true });
  };
  try {
    const address = await new Promise((resolveAddress, reject) => {
      const timer = setTimeout(() => reject(new Error(`Guardian test API startup timed out: ${errors}`)), startupTimeout);
      child.once('message', (url) => { clearTimeout(timer); resolveAddress(url); });
      child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Guardian test API exited ${code}: ${errors}`)); });
    });
    return { address, close };
  } catch (error) { await close(); throw error; }
}

export async function proxyApi(page, address) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${address}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
}
