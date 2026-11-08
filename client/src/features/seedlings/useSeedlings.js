// Saved garden requests: keep answers on failure and ignore replies after leaving the page.
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LearningRevision, usePermission } from '../guardian/permission.jsx';
import { call } from '../../shared/api.js';

export function useSeedlings() {
  const revision = useContext(LearningRevision);
  const { changed } = usePermission();
  const [garden, setGarden] = useState(null);
  const [busy, setBusy] = useState('load');
  const [error, setError] = useState('');
  const [incorrect, setIncorrect] = useState([]);
  const [notice, setNotice] = useState('');
  const round = useRef(0);
  const pending = useRef(false);
  const controller = useRef(null);
  const run = useCallback(async (action, body) => {
    if (pending.current) return;
    pending.current = true;
    const current = ++round.current;
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 12_000);
    setBusy(action); setError(''); setNotice(''); setIncorrect([]);
    try {
      const reply = await call(`/api/seedlings${body ? '/complete' : ''}`, {
        signal: request.signal,
        headers: { 'content-type': 'application/json', 'x-learning-revision': String(revision) },
        ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}),
      });
      if (current !== round.current) return;
      if (!reply.ok) {
        if (reply.error === 'consent_required' || reply.error === 'consent_changed') { changed(); return; }
        setError(reply.error === 'lesson_incomplete' ? 'incorrect' : reply.status === 429 ? 'slow' : body ? 'saveFailed' : 'unavailable');
        setIncorrect(reply.incorrect ?? []);
        return;
      }
      setGarden(reply.garden);
      if (body) setNotice(reply.alreadyCompleted ? 'repeated' : 'saved');
    } finally {
      clearTimeout(timer);
      if (current === round.current) { pending.current = false; setBusy(''); }
    }
  }, [revision, changed]);
  useEffect(() => {
    void run('load');
    return () => { round.current++; pending.current = false; controller.current?.abort(); };
  }, [run]);
  const resetFeedback = () => { setError(''); setIncorrect([]); setNotice(''); };
  return { garden, busy, error, incorrect, notice, refresh: () => run('load'),
    complete: (lessonId, answers) => run('save', { lessonId, answers }), resetFeedback };
}
