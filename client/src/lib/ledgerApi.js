// Talks to the server's public impact ledger (server/src/routes/ledger.ts), which talks to the
// blockchain. Every function returns { ok: true, ...data } or { ok: false, message }.

async function call(path, options) {
  try {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, ...body };
    return { ok: false, status: response.status, message: body.message ?? 'Something went wrong.' };
  } catch {
    return { ok: false, status: 0, message: 'Can’t reach the server. Is `npm run dev` running?' };
  }
}

export const ledgerStatus = () => call('/api/ledger/status');

export const readBatch = (batchId) => call(`/api/ledger/batches/${batchId}`);

export const publishBatch = (batchId, receipts) =>
  call('/api/ledger/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ batchId, receipts }),
  });

// Shortens long codes for display: 0x5fbd…0aa3
export const shortHex = (value, start = 6, end = 4) =>
  value && value.length > start + end + 1 ? `${value.slice(0, start)}…${value.slice(-end)}` : value;
