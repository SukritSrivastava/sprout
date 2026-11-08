// The local NGO workspace: saved reviews, sample learning jars and an actual CSV report.
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import Mascot from '../../shared/components/Mascot.jsx';
import { Reveal, Stagger, ease, useReduced } from '../../shared/motion.jsx';
import { useCountUp } from '../../shared/hooks.js';
import { useNgoWorkspace } from './useNgoWorkspace.js';
import { ngo as ngoEnglish } from '../../content/ngo.js';
import { Overview, Reviews, Report } from './Views.jsx';
import { demoAccess } from '../../content/demo-access.js';

function Stat({ label, value, unit, color, dollar = false, testId }) {
  const { t } = useLanguage();

  const shown = useCountUp(value);
  return (
    <Stagger.Item className="card ngo-stat" style={{ background: color }} data-testid={testId}>
      <span>{t(label)}</span>
      <strong>
        {t(dollar ? '$' : '')}
        {shown.toLocaleString('en-US')}
      </strong>
      <span className="hint">{t(unit)}</span>
    </Stagger.Item>
  );
}

export default function NgoDashboard() {
  const { t, content, language } = useLanguage();
  const demoText = demoAccess[language];
  const ngo = content(ngoEnglish);

  const workspace = useNgoWorkspace();
  const { config, checking, data, busy, problem, notice } = workspace;
  const reduced = useReduced();
  const [role, setRole] = useState('mentor');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState('pending');
  useEffect(() => {
    if (config?.roles?.length) setRole(config.roles[0]);
  }, [config]);
  const unlock = async (event) => {
    event.preventDefault();
    const entered = pin;
    setPin('');
    setShowPin(false);
    await workspace.unlock(role, entered);
  };
  const download = async () => {
    const reply = await workspace.report();
    if (!reply) return;
    const url = URL.createObjectURL(new Blob([reply.csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = reply.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section id="preview" className="section ngo-page" data-preview="ngo">
      <div className="container">
        <Link to="/soon" className="link-btn quiet">
          <ArrowLeft size={18} aria-hidden="true" />
          {ngo.back}
        </Link>
        <Reveal className="ngo-heading">
          <div className="stack">
            <span className="tag tag-yellow">{ngo.tag}</span>
            <h1>{ngo.title}</h1>
            <p className="lead">{ngo.intro}</p>
          </div>
          <Mascot size={112} mood={data?.totals.pending === 0 ? 'cheer' : 'think'} />
        </Reveal>
        <div className="preview-banner real-banner ngo-note" role="note">
          <ShieldCheck size={22} aria-hidden="true" />
          <span>{ngo.note}</span>
        </div>
        {!data && (checking || config?.demoOpenAccess) ? (
          <div className="card stack">
            {checking && <p role="status">{t(demoText.loading)}</p>}
            {problem && <p role="alert">{t(problem)}</p>}
            <button className="btn btn-white" onClick={workspace.checkAccess} disabled={checking}>
              {ngo.refresh}
            </button>
          </div>
        ) : !data ? (
          <Reveal className="ngo-unlock">
            <div className="ngo-welcome stack">
              <h2>{ngo.lockedTitle}</h2>
              <p>{ngo.lockedText}</p>
              <ul className="ngo-promises">
                {ngo.promises.map((text) => (
                  <li key={text}>
                    <Check size={20} aria-hidden="true" />
                    {t(text)}
                  </li>
                ))}
              </ul>
            </div>
            <form className="card stack ngo-login" onSubmit={unlock}>
              <Lock size={28} aria-hidden="true" />
              <h2>{ngo.unlockTitle}</h2>
              <p className="hint">{ngo.unlockHelp}</p>
              {checking && <p role="status">{ngo.checking}</p>}
              {config && !config.configured && (
                <div className="ngo-setup stack">
                  <p className="chat-notice" role="status">
                    {ngo.setup}
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-white"
                    onClick={workspace.checkAccess}
                    disabled={checking}
                  >
                    <RefreshCw size={18} aria-hidden="true" />
                    {ngo.checkAccess}
                  </button>
                </div>
              )}
              <label className="field">
                {ngo.role}
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  disabled={!config?.configured || Boolean(busy)}
                >
                  {(config?.roles?.length ? config.roles : ['mentor', 'admin']).map((key) => (
                    <option key={key} value={key}>
                      {ngo.roles[key]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field">
                <label htmlFor="ngo-staff-pin">{ngo.pin}</label>
                <div className="ngo-pin-input">
                  <input
                    id="ngo-staff-pin"
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={64}
                    autoComplete="off"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    disabled={!config?.configured || Boolean(busy)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-white"
                    aria-controls="ngo-staff-pin"
                    aria-pressed={showPin}
                    onClick={() => setShowPin(!showPin)}
                    disabled={!config?.configured || Boolean(busy)}
                  >
                    {showPin ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                    {t(showPin ? ngo.hidePin : ngo.showPin)}
                  </button>
                </div>
              </div>
              <button
                className="btn btn-green"
                disabled={!config?.configured || !pin || Boolean(busy)}
              >
                {t(busy === 'unlock' ? ngo.unlocking : ngo.unlock)}
                <ArrowRight size={20} aria-hidden="true" />
              </button>
              {problem && (
                <p className="chat-notice" role="alert">
                  {t(problem)}
                </p>
              )}
            </form>
          </Reveal>
        ) : (
          <>
            <div className="ngo-toolbar">
              <span className="tag tag-white">
                <ShieldCheck size={18} aria-hidden="true" />
                {ngo.roles[workspace.role]} ·{' '}
                {t(config?.demoOpenAccess ? demoText.session : ngo.session)}
              </span>
              <div className="ngo-actions">
                <button
                  className="btn btn-sm btn-white"
                  onClick={workspace.refresh}
                  disabled={Boolean(busy)}
                >
                  <RefreshCw
                    size={18}
                    className={busy === 'refresh' ? 'spin' : ''}
                    aria-hidden="true"
                  />
                  {ngo.refresh}
                </button>
                {!config?.demoOpenAccess && (
                  <button className="btn btn-sm btn-white" onClick={workspace.lock}>
                    <LogOut size={18} aria-hidden="true" />
                    {ngo.lock}
                  </button>
                )}
              </div>
            </div>
            <Stagger className="ngo-stats" gap={0.07}>
              <Stat
                label={ngo.stats.pending}
                value={data.totals.pending}
                unit={ngo.count}
                color="var(--yellow)"
                testId="ngo-pending"
              />
              <Stat
                label={ngo.stats.credits}
                value={data.totals.totalCredits}
                unit={ngo.sampleUnit}
                color="var(--mint)"
                testId="ngo-credits"
              />
              <Stat
                label={ngo.stats.available}
                value={data.sandbox.available}
                unit={ngo.sandboxUnit}
                color="var(--lavender)"
                dollar
                testId="ngo-pool"
              />
              <Stat
                label={ngo.stats.approved}
                value={data.totals.approved}
                unit={ngo.count}
                color="var(--paper)"
              />
            </Stagger>
            <nav className="ngo-tabs" aria-label={ngo.nav}>
              {Object.entries(ngo.tabs).map(([key, label]) => (
                <button
                  key={key}
                  className={`ngo-tab${tab === key ? ' selected' : ''}`}
                  aria-current={tab === key ? 'page' : undefined}
                  onClick={() => setTab(key)}
                >
                  {t(label)}
                  {key === 'reviews' && (
                    <span className="ngo-tab-count">{t(data.totals.pending)}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="ngo-feedback" aria-live="polite">
              {problem ? (
                <p className="chat-notice" role="alert">
                  {t(problem)}
                </p>
              ) : notice ? (
                <p className="ngo-saved" role="status">
                  <Check size={20} aria-hidden="true" />
                  {t(notice)}
                </p>
              ) : null}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : -8 }}
                transition={{ duration: reduced ? 0 : 0.25, ease }}
              >
                {tab === 'overview' && <Overview data={data} open={setTab} />}
                {tab === 'reviews' && (
                  <Reviews
                    data={data}
                    busy={busy}
                    filter={filter}
                    setFilter={setFilter}
                    review={workspace.review}
                  />
                )}
                {tab === 'report' && <Report data={data} busy={busy} download={download} />}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
