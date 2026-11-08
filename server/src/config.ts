// Reads settings from environment variables (and server/.env when present) and checks them once
// at startup, so a typo fails loudly instead of causing a strange bug later.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { X509Certificate } from 'node:crypto';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
// Node 22+ can read .env files itself, so no dotenv package is needed.
if (existsSync(envFile)) process.loadEnvFile(envFile);

// An empty PIN means "not set"; a set PIN must be at least 6 characters so it can't be guessed fast.
const optionalPin = z
  .string()
  .trim()
  .min(6, 'must be at least 6 characters')
  .max(64)
  .optional()
  .or(z.literal('').transform(() => undefined));

const schema = z.object({
  // Local API port. loadConfig selects Render's PORT only when RENDER=true.
  API_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('127.0.0.1'),
  // Website addresses allowed to use the mentor from a browser, comma-separated. Other websites
  // get 403. (Scripts without a browser aren't stopped by this; the hourly cap limits them.)
  ALLOWED_ORIGIN: z
    .string()
    .default('http://127.0.0.1:5173,http://127.0.0.1:4173,http://localhost:5173,http://localhost:4173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  // Render trusts one private ingress hop. Generic true remains for separately trusted hosts.
  TRUST_PROXY: z.enum(['true', 'false', 'render']).default('false')
    .transform((value) => value === 'render' ? value : value === 'true'),
  // Judges can explore without PINs. Set false to restore the existing protected flows.
  DEMO_OPEN_ACCESS: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  // Most mentor questions per hour from everyone together, to protect the Gemini quota.
  MENTOR_HOURLY_LIMIT: z.coerce.number().int().min(1).default(300),
  // The blockchain for the public impact ledger. Default: the local test chain `npm run dev` starts.
  CHAIN_RPC_URL: z.url().default('http://127.0.0.1:8545'),
  LEDGER_CHAIN_ID: z.coerce.number().int().positive().default(84532),
  LEDGER_CONTRACT_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional().or(z.literal('').transform(() => undefined)),
  LEDGER_DEPLOY_TX: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional().or(z.literal('').transform(() => undefined)),
  // The NGO publisher wallet's key. Leave empty for the local test chain (it uses Hardhat's
  // built-in test account). Only needed, and only safe to set, for a real public chain.
  PUBLISHER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, 'must be 0x followed by 64 hex characters')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // PayPal SANDBOX app keys (developer.paypal.com → Apps & Credentials → Sandbox). The client id
  // is public (the browser needs it for the PayPal button); the secret never leaves the server.
  // Leave both empty and the PayPal pages show "add sandbox keys" instead of the button.
  PAYPAL_CLIENT_ID: z.string().trim().optional(),
  PAYPAL_CLIENT_SECRET: z.string().trim().optional(),
  // Payout approvals: each adult's own PIN (at least 6 characters). A payout needs two different
  // adults to type their PIN when DEMO_OPEN_ACCESS is false. Demo mode needs no PINs.
  PAYOUT_PIN_MENTOR: optionalPin,
  PAYOUT_PIN_ADMIN: optionalPin,
  PAYOUT_PIN_GUARDIAN: optionalPin,
  // The guardian's PayPal sandbox email. The server always pays this address; the page can't change it.
  GUARDIAN_PAYPAL_EMAIL: z.email().optional().or(z.literal('').transform(() => undefined)),
  // Where PayPal receipts, the pool and payout requests are saved, so a restart doesn't lose them.
  // Relative paths start in the server/ folder.
  DATA_FILE: z.string().trim().min(1).default('data/paypal-records.json'),
  // Learning credits are kept separately; they are never a claim on the PayPal pool.
  LEARNING_DATA_FILE: z.string().trim().min(1).default('data/learning-records.json'),
  DATABASE_URL: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
  DATABASE_SSL_CA: z.string().trim().transform(value => value.replace(/\\n/g, '\n')).optional()
    .or(z.literal('').transform(() => undefined)),
  RENDER: z.string().optional(),
  // Secret. Lives only on the server; never sent to the browser or written to logs.
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().optional(),
}).superRefine((config, ctx) => {
  if (Boolean(config.LEDGER_CONTRACT_ADDRESS) !== Boolean(config.LEDGER_DEPLOY_TX))
    ctx.addIssue({ code:'custom',path:['LEDGER_CONTRACT_ADDRESS'],message:'and LEDGER_DEPLOY_TX must be set together when binding an existing contract.' });
  if (config.RENDER === 'true' && !config.DATABASE_URL)
    ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'is required on Render; local records are not durable across deployments.' });
  for (const origin of config.ALLOWED_ORIGIN) {
    if (!URL.canParse(origin)) continue;
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || url.username || url.password || url.hostname.includes('*'))
      ctx.addIssue({ code: 'custom', path: ['ALLOWED_ORIGIN'], message: 'must contain exact HTTP(S) origins without credentials, paths, wildcards or trailing slashes.' });
    if (config.RENDER === 'true' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
      ctx.addIssue({ code: 'custom', path: ['ALLOWED_ORIGIN'], message: 'must explicitly list the HTTPS Vercel website origins on Render.' });
  }
  if (config.TRUST_PROXY === 'render' && config.RENDER !== 'true')
    ctx.addIssue({ code: 'custom', path: ['TRUST_PROXY'], message: 'render mode requires the Render runtime.' });
  if (config.RENDER === 'true') {
    if (config.TRUST_PROXY !== 'render')
      ctx.addIssue({ code: 'custom', path: ['TRUST_PROXY'], message: 'must be render on Render; arbitrary forwarded chains are not trusted.' });
    const rpc = URL.canParse(config.CHAIN_RPC_URL) ? new URL(config.CHAIN_RPC_URL) : null;
    if (config.LEDGER_CHAIN_ID !== 84532 || !rpc || rpc.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(rpc.hostname))
      ctx.addIssue({ code: 'custom', path: ['CHAIN_RPC_URL'], message: 'must be an HTTPS Base Sepolia RPC with LEDGER_CHAIN_ID=84532 on Render.' });
  }
  if (config.DATABASE_URL) {
    try {
      const url = new URL(config.DATABASE_URL);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw new Error();
      if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.searchParams.get('sslmode') !== 'verify-full')
        ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'must use sslmode=verify-full for hosted Postgres.' });
      if (['ssl', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'].some(key => url.searchParams.has(key)))
        ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'must put the trusted CA in DATABASE_SSL_CA instead of URL SSL overrides.' });
      if (/(^|\.)supabase\.(com|co)$/.test(url.hostname) && !config.DATABASE_SSL_CA)
        ctx.addIssue({ code: 'custom', path: ['DATABASE_SSL_CA'], message: 'must contain the Supabase server root certificate from Database Settings.' });
    } catch { ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'must be a Postgres connection URL with a database name.' }); }
  }
  if (config.DATABASE_SSL_CA) {
    try { new X509Certificate(config.DATABASE_SSL_CA); }
    catch { ctx.addIssue({ code: 'custom', path: ['DATABASE_SSL_CA'], message: 'must be a PEM-encoded CA certificate.' }); }
  }
  const keys = ['PAYOUT_PIN_MENTOR', 'PAYOUT_PIN_ADMIN', 'PAYOUT_PIN_GUARDIAN'] as const;
  for (const [index, key] of keys.entries()) {
    for (const other of keys.slice(index + 1)) {
      if (config[key] && config[key] === config[other]) {
        // Name the conflicting settings, never their secret values.
        ctx.addIssue({ code: 'custom', path: [other], message: `must differ from ${key}. Each adult must have a different payout PIN.` });
      }
    }
  }
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env.RENDER === 'true'
    ? { ...env, API_PORT: env.PORT ?? '10000', HOST: '0.0.0.0' }
    : env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid server settings:\n  ${problems.join('\n  ')}`);
  }
  return parsed.data;
}
