import { websiteConfig } from './hosting.mjs';

export const config = websiteConfig(process.env.SPROUT_API_ORIGIN);
