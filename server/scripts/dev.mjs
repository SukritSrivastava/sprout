// Keep tsx's source watcher, and ask it to restart when the hidden .env file is saved.
// Poll file metadata so replacements and initially missing files work on Windows too.
import { spawn } from 'node:child_process';
import { watchFile, unwatchFile } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const child = spawn(process.execPath, [fileURLToPath(import.meta.resolve('tsx/cli')), 'watch', '--clear-screen=false', 'src/index.ts'], {
  stdio: ['pipe', 'inherit', 'inherit'], windowsHide: true,
});
let timer;
const envFile = resolve('.env');
function settingsChanged(current, previous) {
  if (current.mtimeMs === previous.mtimeMs && current.ctimeMs === previous.ctimeMs && current.size === previous.size) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!child.stdin.destroyed) child.stdin.write('\n'); // tsx supports Enter to restart.
  }, 200);
}
watchFile(envFile, { interval: 500 }, settingsChanged);
process.stdin.pipe(child.stdin);
// A restart can race with closing the dev command; do not crash on a closed input pipe.
child.stdin.on('error', () => {});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; cleanup(); });
child.on('exit', (code) => { process.exitCode = code ?? 0; cleanup(); });
function cleanup() {
  clearTimeout(timer);
  unwatchFile(envFile, settingsChanged);
  process.stdin.unpipe(child.stdin);
  process.stdin.pause();
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { cleanup(); child.kill(signal); });
}
// A managed parent (including the regression test) can close this runner cleanly.
process.on('disconnect', () => { cleanup(); child.kill(); });
