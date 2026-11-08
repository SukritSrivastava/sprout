// The staff token lives only in component memory. PINs are sent only when opening the workspace.
import { call, post } from '../../shared/api.js';
export const ngoConfig = () => call('/api/ngo/config');
export const unlockNgo = (approver, pin) => post('/api/ngo/unlock', { approver, pin });
export const staffCall = (path, token, body) =>
  call(`/api/ngo/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
