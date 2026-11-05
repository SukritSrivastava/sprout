// Talks to the server's public impact ledger (server/src/routes/ledger.ts), which talks to the
// blockchain. Every function returns { ok: true, ...data } or { ok: false, message }.

import { call, post } from './api.js';

export const ledgerStatus = () => call('/api/ledger/status');

export const readBatch = (batchId) => call(`/api/ledger/batches/${batchId}`);

export const publishBatch = (batchId, receipts) => post('/api/ledger/publish', { batchId, receipts });

// Seals the server's own real PayPal sandbox receipts (the browser sends nothing).
export const publishLiveReceipts = () => post('/api/ledger/publish-live');

// Shortens long codes for display: 0x5fbd…0aa3
export const shortHex = (value, start = 6, end = 4) =>
  value && value.length > start + end + 1 ? `${value.slice(0, start)}…${value.slice(-end)}` : value;
