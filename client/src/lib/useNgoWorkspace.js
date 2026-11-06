// Workspace lifecycle: credentials stay in memory, stale replies cannot reopen a locked page.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ngoConfig, staffCall, unlockNgo } from './ngoApi.js';
import { ngo } from '../content/ngo.js';

export function useNgoWorkspace() {
  const [config, setConfig] = useState(null);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState(null);
  const [role, setRole] = useState('mentor');
  const [expiresAt, setExpiresAt] = useState(0);
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const token = useRef('');
  const generation = useRef(0);
  const inFlight = useRef(false);
  const configRequest = useRef(0);
  const checkAccess = useCallback(async () => {
    const request = ++configRequest.current;
    setChecking(true);
    const reply = await ngoConfig();
    if (request !== configRequest.current) return;
    setConfig(reply.ok ? reply : { configured: false, roles: [] });
    setProblem(reply.ok ? '' : reply.message);
    setChecking(false);
  }, []);
  useEffect(() => {
    void checkAccess();
    return () => { configRequest.current++; generation.current++; token.current = ''; };
  }, [checkAccess]);
  function clear() {
    generation.current++; token.current = ''; inFlight.current = false;
    setData(null); setExpiresAt(0); setBusy(''); setNotice('');
  }
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { clear(); setProblem(ngo.expired); }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);
  async function run(label, work, success) {
    if (inFlight.current) return null;
    inFlight.current = true;
    const round = generation.current;
    setBusy(label); setProblem(''); setNotice('');
    try {
      const reply = await work();
      if (round !== generation.current) return null;
      if (reply.status === 401) { clear(); setProblem(reply.message); return null; }
      if (!reply.ok) { setProblem(reply.message); return null; }
      if (reply.dashboard) setData(reply.dashboard);
      success?.(reply);
      return reply;
    } finally {
      if (round === generation.current) { inFlight.current = false; setBusy(''); }
    }
  }
  const unlock = (who, pin) => run('unlock', () => unlockNgo(who, pin), (reply) => {
    token.current = reply.token; setRole(reply.role); setExpiresAt(reply.expiresAt);
  });
  const review = (id, decision) => run(id, () => staffCall(`reviews/${id}`, token.current, { decision }), () => {
    setNotice(decision === 'approved' ? ngo.saved : ngo.returned);
  });
  const refresh = () => run('refresh', () => staffCall('dashboard', token.current));
  const report = () => run('report', () => staffCall('report', token.current), () => setNotice(ngo.reportReady));
  const lock = () => {
    const previous = token.current;
    clear(); setProblem('');
    if (previous) void staffCall('lock', previous, {});
  };
  return { config, checking, checkAccess, data, role, busy, problem, notice, unlock, review, refresh, report, lock };
}
