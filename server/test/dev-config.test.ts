// Exercise the real dev watch command with disposable settings, never the user's .env.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('dev reloads hidden .env changes and recovers after duplicate PIN settings', { timeout: 90_000 }, async () => {
  const folder = mkdtempSync(join(tmpdir(), 'sprout-env-watch-'));
  const envFile = join(folder, '.env');
  mkdirSync(join(folder, 'src'));
  writeFileSync(envFile, '');
  const configUrl = new URL('../src/config.ts', import.meta.url).href;
  writeFileSync(join(folder, 'src/index.ts'), `
    import { readFileSync } from 'node:fs';
    import { parseEnv } from 'node:util';
    import { loadConfig } from ${JSON.stringify(configUrl)};
    async function main() {
      try {
        const config = loadConfig(parseEnv(readFileSync('.env', 'utf8')));
        console.log('GUARDIAN_READY=' + Boolean(config.PAYOUT_PIN_GUARDIAN));
      } catch (error) { console.error(error.message); process.exitCode = 1; }
    }
    void main();
  `);
  const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const [runner, entry] = scripts.dev.split(' ');
  assert.equal(runner, 'node');
  const cli = fileURLToPath(new URL(`../${entry}`, import.meta.url));
  const child = fork(cli, [], { cwd: folder, execArgv: [], windowsHide: true, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
  let output = '';
  child.stdout!.on('data', (chunk) => { output += chunk; });
  child.stderr!.on('data', (chunk) => { output += chunk; });
  let spawnError: Error | undefined;
  child.on('error', (error) => { spawnError = error; });
  let cursor = 0;
  const waitFor = async (expected: string) => {
    const deadline = Date.now() + 20_000;
    while (!output.slice(cursor).includes(expected)) {
      if (spawnError) throw spawnError;
      assert.equal(child.exitCode, null, `Dev watcher exited: ${output}`);
      assert.ok(Date.now() < deadline, `Dev watcher did not report ${expected}: ${output}`);
      await new Promise((done) => setTimeout(done, 50));
    }
    cursor = output.length;
  };
  try {
    await waitFor('GUARDIAN_READY=false');
    writeFileSync(envFile, 'PAYOUT_PIN_GUARDIAN=guardian-watch-test\n');
    await waitFor('GUARDIAN_READY=true');
    writeFileSync(envFile, 'PAYOUT_PIN_GUARDIAN=duplicate-watch-test\nPAYOUT_PIN_ADMIN=duplicate-watch-test\n');
    await waitFor('PAYOUT_PIN_GUARDIAN: must differ from PAYOUT_PIN_ADMIN');
    writeFileSync(`${envFile}.tmp`, 'PAYOUT_PIN_GUARDIAN=guardian-watch-test\nPAYOUT_PIN_ADMIN=admin-watch-test\n');
    renameSync(`${envFile}.tmp`, envFile); // Editors often replace the file instead of editing it.
    await waitFor('GUARDIAN_READY=true');
    writeFileSync(envFile, '');
    await waitFor('GUARDIAN_READY=false');
    assert.doesNotMatch(output, /guardian-watch-test|admin-watch-test|duplicate-watch-test/);
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise<void>((done) => child.once('exit', () => done()));
      child.disconnect();
      await exited;
    }
    assert.equal(resolve(dirname(folder)), resolve(tmpdir()));
    assert.ok(folder.startsWith(join(tmpdir(), 'sprout-env-watch-')));
    rmSync(folder, { recursive: true, force: true });
  }
});
