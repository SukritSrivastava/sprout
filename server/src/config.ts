// Reads settings from environment variables (and server/.env when present) and checks them once
// at startup, so a typo fails loudly instead of causing a strange bug later.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

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
  // API_PORT, not PORT: tools and hosts often set PORT for the website, which would clash.
  API_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('127.0.0.1'),
  // Website addresses allowed to use the mentor from a browser, comma-separated. Other websites
  // get 403. (Scripts without a browser aren't stopped by this; the hourly cap limits them.)
  ALLOWED_ORIGIN: z
    .string()
    .default('http://127.0.0.1:5173,http://127.0.0.1:4173,http://localhost:5173,http://localhost:4173')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  // Set to "true" when deployed behind a host's proxy (Render, Railway, Fly), so each user's real
  // address is used for rate limiting. Leave "false" locally: then nobody can fake their address.
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  // Most mentor questions per hour from everyone together, to protect the Gemini quota.
  MENTOR_HOURLY_LIMIT: z.coerce.number().int().min(1).default(300),
  // The blockchain for the public impact ledger. Default: the local test chain `npm run dev` starts.
  CHAIN_RPC_URL: z.url().default('http://127.0.0.1:8545'),
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
  // adults to type their PIN. Leave them empty and payouts stay switched off.
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
  // Secret. Lives only on the server; never sent to the browser or written to logs.
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().optional(),
}).superRefine((config, ctx) => {
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
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid server settings:\n  ${problems.join('\n  ')}`);
  }
  return parsed.data;
}
