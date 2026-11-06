// A guardian records, withdraws or deletes demo permission with their own configured PIN.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { call } from '../lib/api.js';
import { usePermission } from '../lib/permission.jsx';
import { guardian as text } from '../content/guardian.js';

export default function Safety() {
  const { changed } = usePermission();
  const [learner, setLearner] = useState('A12');
  const [data, setData] = useState(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [ticks, setTicks] = useState([]);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const round = useRef(0);
  const pending = useRef(false);
  const controller = useRef(null);
  const feedback = useRef(null);
  const run = async (action) => {
    if (pending.current) return;
    pending.current = true;
    const current = ++round.current;
    const request = new AbortController(); controller.current = request;
    const timer = setTimeout(() => request.abort(), 12_000);
    setBusy(true); setError(''); setNotice('');
    const body = action ? { learner, action, pin, revision: data.consent.revision,
      ...(action === 'acknowledge' ? { policy: text.policy, acknowledged: ticks.length === text.statements.length } : {}),
      ...(action === 'delete' ? { confirm } : {}) } : null;
    setPin(''); setShowPin(false);
    try {
      const result = await call(body ? '/api/guardian/permission' : `/api/guardian/status?learner=${learner}`, {
        signal: request.signal, cache: 'no-store', ...(body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      if (current !== round.current) return;
      if (!result.ok) {
        setError(result.status ? result.message : 'We couldn’t confirm this change. Refresh the saved permission before trying again.');
        if (action) { setData(null); changed(); }
        return;
      }
      setData(result);
      if (action) {
        changed(); setTicks([]); setConfirm('');
        setNotice(action === 'acknowledge' ? 'Demo permission saved.' : action === 'withdraw' ? 'Permission withdrawn. Learning and AI chat are blocked.' : 'Learning data deleted. PayPal records are unchanged.');
      }
    } finally {
      clearTimeout(timer);
      if (current === round.current) { pending.current = false; setBusy(false); }
    }
  };
  useEffect(() => {
    setData(null); setTicks([]); setConfirm(''); setPin(''); setShowPin(false);
    void run();
    return () => { round.current++; pending.current = false; controller.current?.abort(); };
  }, [learner]);
  useEffect(() => { if (notice || error) feedback.current?.focus(); }, [notice, error]);
  const consent = data?.consent;
  return <section id="preview" className="section guardian-page" data-preview="safety"><div className="container">
    <Link to="/soon" className="link-btn quiet"><ArrowLeft size={18} aria-hidden="true" />All features</Link>
    <div className="guardian-heading stack"><span className="tag tag-green">Working · local demo</span><h1>{text.title}</h1><p className="lead">{text.intro}</p></div>
    <div className="preview-banner real-banner" role="note"><ShieldCheck size={24} aria-hidden="true" /><span>{text.note}</span></div>
    <div className="guardian-grid">
      <div className="card stack guardian-controls" aria-busy={busy}>
        <h2>Choose a sample learner</h2>
        <div className="field"><label htmlFor="guardian-learner">Sample learner</label><select id="guardian-learner" value={learner} disabled={busy} onChange={(e) => setLearner(e.target.value)}>
          {['A12', 'B07', 'C33'].map((code) => <option key={code} value={code}>{code}{code === 'A12' ? ' · Seedlings & AI demo' : ' · NGO activities'}</option>)}
        </select></div>
        {consent && <div className="guardian-state stack"><strong data-testid="permission-state">{text.states[consent.status]}</strong>
          {consent.changedAt && <span>Saved: <time dateTime={consent.changedAt}>{new Date(consent.changedAt).toLocaleString('en-IN')}</time></span>}
          {consent.acknowledgedAt && <span>Acknowledged: <time dateTime={consent.acknowledgedAt}>{new Date(consent.acknowledgedAt).toLocaleString('en-IN')}</time></span>}
          <span>Policy: {text.policy}</span></div>}
        {busy && <p role="status">Checking & saving permission…</p>}
        {data && !data.configured && <div className="stack"><h3>Set up guardian access</h3>
          <ol><li>Open the local <code>server/.env</code> file.</li><li>Set <code>PAYOUT_PIN_GUARDIAN</code> to a unique PIN of at least six characters.</li><li>Restart the API, then select “Refresh permission”.</li></ol>
          <p>Use a different PIN from mentor and admin. Do not put a PIN in chat. PayPal keys are not needed for this feature.</p></div>}
        {data?.configured && <>
          <fieldset className="guardian-statements" disabled={busy}><legend>Read before recording permission</legend>
            {text.statements.map((statement, index) => <label className="consent-item" key={statement}><input type="checkbox" checked={ticks.includes(index)}
              onChange={() => setTicks((list) => list.includes(index) ? list.filter((n) => n !== index) : [...list, index])} />{statement}</label>)}
          </fieldset>
          <label className="field">Guardian PIN<input type={showPin ? 'text' : 'password'} value={pin} maxLength={64} autoComplete="off" disabled={busy} onChange={(e) => setPin(e.target.value)} /></label>
          <button className="link-btn" type="button" aria-pressed={showPin} disabled={busy} onClick={() => setShowPin((value) => !value)}>{showPin ? 'Hide PIN' : 'Show PIN'}</button>
          <button className="btn btn-green" disabled={busy || !pin || ticks.length !== text.statements.length} onClick={() => run('acknowledge')}>Record demo permission</button>
          <button className="btn btn-white" disabled={busy || !pin || consent?.status !== 'active'} onClick={() => run('withdraw')}>Withdraw permission</button>
          <label className="field">Type {learner} to confirm deletion<input value={confirm} maxLength={3} autoComplete="off" disabled={busy} onChange={(e) => setConfirm(e.target.value)} /></label>
          <button className="btn btn-yellow" disabled={busy || !pin || confirm !== learner || consent?.status === 'deleted'} onClick={() => run('delete')}>Delete learning data</button>
        </>}
        <div ref={feedback} tabIndex={-1}>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</div>
        <button className="btn btn-white" disabled={busy} onClick={() => run()}>Refresh permission</button>
        {learner === 'A12' && consent?.status === 'active' && <div className="stack"><Link className="link-btn" to="/soon/seedlings">Open Seedlings lessons</Link><Link className="link-btn" to="/app#mentor">Open Paisa Mentor</Link></div>}
      </div>
      <aside className="card stack guardian-explainer"><h2>What happens to the data?</h2><p>{text.data}</p><h3>Withdraw permission</h3><p>Learning and AI entry stop. Existing saved progress stays on this computer until you delete it or agree again.</p><h3>Delete learning data</h3><p>{text.deletion}</p><p>{text.future}</p></aside>
    </div>
  </div></section>;
}
