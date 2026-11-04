// Reads settings from environment variables (and server/.env when present) and checks them once
// at startup, so a typo fails loudly instead of causing a strange bug later.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
// Node 22+ can read .env files itself, so no dotenv package is needed.
if (existsSync(envFile)) process.loadEnvFile(envFile);

const schema = z.object({
  // API_PORT, not PORT: tools and hosts often set PORT for the website, which would clash.
  API_PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('127.0.0.1'),
  // The website's address. Only this origin may call the API from a browser (used from Phase 1).
  ALLOWED_ORIGIN: z.url().default('http://127.0.0.1:5173'),
  // Secret. Lives only on the server; never sent to the browser or written to logs.
  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().optional(),
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
