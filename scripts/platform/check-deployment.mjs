// Compiled output checks. Render runs --api-only without building the Vercel frontend.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { websiteConfig } from '../../client/hosting.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--api-only'),
  'Usage: npm run check:deployment -- [--api-only]');
const apiOnly = process.argv[2] === '--api-only';
const render = await readFile(resolve(root, 'render.yaml'), 'utf8');
assert.match(render, /rootDir: \./);
assert.match(render, /startCommand: node server\/dist\/index\.js/);
for (const path of ['package.json', 'client/package.json', 'server/package.json'])
  assert.equal((await json(path)).engines.node, '22.x');
const website = websiteConfig(process.env.SPROUT_API_ORIGIN ?? 'https://synthetic-api.example');
assert.equal(website.rewrites[0].source, '/api/:path*');
if (!apiOnly) await access(resolve(root, 'client/dist/index.html'));
const { loadConfig } = await import(pathToFileURL(resolve(root, 'server/dist/config.js')).href);
const { buildApp } = await import(pathToFileURL(resolve(root, 'server/dist/build-app.js')).href);
const { contract } = await import(pathToFileURL(resolve(root, 'server/dist/features/ledger/chain.js')).href);
assert.deepEqual(contract, await json('chain/build/ImpactLedger.json'));
const app = buildApp(loadConfig({}), { model: null, paypal: null, chain: null });
try {
  const health = await app.inject('/api/health');
  assert.equal(health.statusCode, 200);
  assert.equal(health.headers['cache-control'], 'no-store');
  assert.equal((await app.inject('/api/ready')).statusCode, 200);
  assert.equal((await app.inject('/api/missing')).json().error, 'not_found');
} finally { await app.close(); }
console.log(`${apiOnly ? 'Render API' : 'Website/API'} output: compiled Fastify API, Node 22 configuration and committed contract artifact passed.`);
console.log('Actual Render/Vercel/Supabase connectivity still requires the hosted preview checks.');
