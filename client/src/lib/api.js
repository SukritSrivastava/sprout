// One small helper for every call to sprout.io's own server (/api/...).
// Always returns { ok: true, ...data } or { ok: false, status, message }, never throws, so pages
// can show the message as it is.
export async function call(path, options) {
  try {
    const response = await fetch(path, options);
    const body = await response.json().catch(() => null);
    if (response.ok) {
      if (!response.headers.get('content-type')?.includes('application/json') ||
          !body || typeof body !== 'object' || Array.isArray(body)) {
        return { ok: false, status: response.status, message: 'The server returned an invalid response. Please try again.' };
      }
      return { ...body, ok: true };
    }
    // Payment errors can include an UNKNOWN receipt and its reserved balance. Keep these
    // recovery details while making sure a response body cannot override the HTTP failure.
    return { ...(body && typeof body === 'object' && !Array.isArray(body) ? body : {}),
      ok: false, status: response.status, message: body?.message ?? 'Something went wrong.' };
  } catch {
    return { ok: false, status: 0, message: 'Can’t reach the server. Is `npm run dev` running?' };
  }
}

// A JSON POST.
export const post = (path, body = {}) =>
  call(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
