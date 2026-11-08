// The three views of the NGO workspace. All amounts are explicitly credits or sandbox USD.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Clock, Download, X } from 'lucide-react';
import Mascot from '../../shared/components/Mascot.jsx';
import { ngo as ngoEnglish } from '../../content/ngo.js';
import { ease, useReduced } from '../../shared/motion.jsx';

export function Overview({ data, open }) {
  const { t, content } = useLanguage();
  const ngo = content(ngoEnglish);

  const { totals, learners } = data;
  return (
    <div className="stack ngo-overview">
      <div className="card ngo-next">
        <div className="stack">
          <span className="tag tag-white">
            <Clock size={16} aria-hidden="true" />
            {t(totals.pending)} {ngo.filters.pending.toLowerCase()}
          </span>
          <h2>{t(totals.pending ? ngo.nextTitle : ngo.allDone)}</h2>
          <p>{t(totals.pending ? ngo.nextText : ngo.allDoneText)}</p>
          <button
            className="btn btn-ink"
            onClick={() => open(totals.pending ? 'reviews' : 'report')}
          >
            {t(totals.pending ? ngo.openQueue : ngo.tabs.report)}
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </div>
        <Mascot size={100} mood={totals.pending ? 'happy' : 'cheer'} />
      </div>
      <div className="section-head">
        <h2>{ngo.jarsTitle}</h2>
        <p>{ngo.jarsText}</p>
      </div>
      <div className="ngo-learners">
        {learners.map((learner) => (
          <article key={learner.code} className="card stack ngo-learner">
            <strong>
              {ngo.learner} #{t(learner.code)}
            </strong>
            <span className="tag tag-white">
              {t(learner.credits)} {ngo.credits}
            </span>
            <dl className="ngo-jars">
              {Object.entries(learner.jars).map(([key, value], i) => (
                <div
                  key={key}
                  style={{
                    background: ['var(--mint)', 'var(--lavender)', 'var(--peach)', 'var(--yellow)'][
                      i
                    ],
                  }}
                >
                  <dt>{ngo.jars[i]}</dt>
                  <dd>{t(value)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

export function Reviews({ data, busy, filter, setFilter, review }) {
  const { t, content } = useLanguage();
  const ngo = content(ngoEnglish);

  const reduced = useReduced();
  const activities = data.activities.filter((a) => a.status === filter);
  return (
    <section className="stack ngo-reviews">
      <div className="section-head">
        <h2>{ngo.queueTitle}</h2>
        <p>{ngo.queueText}</p>
      </div>
      <div className="chips" role="group" aria-label={ngo.filtersLabel}>
        {Object.entries(ngo.filters).map(([key, label]) => (
          <button
            key={key}
            className="chip"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {t(label)} · {t(data.totals[key])}
          </button>
        ))}
      </div>
      <motion.ul className="ngo-queue" layout={!reduced} aria-busy={Boolean(busy)}>
        <AnimatePresence initial={false} mode="popLayout">
          {activities.map((a) => (
            <motion.li
              key={a.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
              transition={{ duration: reduced ? 0 : 0.25, ease }}
              className={`card ngo-activity ${a.status}`}
            >
              <span className="ngo-activity-icon">
                {a.status === 'approved' ? (
                  <Check size={26} aria-hidden="true" />
                ) : a.status === 'returned' ? (
                  <X size={26} aria-hidden="true" />
                ) : (
                  <Clock size={26} aria-hidden="true" />
                )}
              </span>
              <div className="stack ngo-activity-copy">
                <span className="hint">
                  {ngo.learner} #{t(a.learner)} · {a.id}
                </span>
                <h3>{t(a.title)}</h3>
                <span>
                  {t(a.credits)} {ngo.credits}
                </span>
              </div>
              {a.status === 'pending' ? (
                <div className="ngo-review-actions">
                  <button
                    className="btn btn-sm btn-green"
                    aria-label={ngo.reviewName(ngo.approve, t(a.title))}
                    disabled={Boolean(busy)}
                    onClick={() => review(a.id, 'approved')}
                  >
                    <Check size={18} aria-hidden="true" />
                    {t(busy === a.id ? ngo.reviewing : ngo.approve)}
                  </button>
                  <button
                    className="btn btn-sm btn-white"
                    aria-label={ngo.reviewName(ngo.sendBack, t(a.title))}
                    disabled={Boolean(busy)}
                    onClick={() => review(a.id, 'returned')}
                  >
                    <X size={18} aria-hidden="true" />
                    {ngo.sendBack}
                  </button>
                </div>
              ) : (
                <span className={`tag ${a.status === 'approved' ? 'tag-green' : 'tag-peach'}`}>
                  {ngo.filters[a.status]} · {ngo.roles[a.reviewedBy]}
                </span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
      {!activities.length && (
        <div className="ngo-empty card">
          <Mascot size={74} mood="cheer" />
          <h3>{ngo.emptyTitle}</h3>
          <p>{ngo.emptyText}</p>
        </div>
      )}
    </section>
  );
}

export function Report({ data, busy, download }) {
  const { t, content } = useLanguage();
  const ngo = content(ngoEnglish);

  const rows = [
    ...Object.entries(data.totals).map(([key, value]) => [
      key,
      key === 'totalCredits' ? ngo.credits : ngo.count,
      value,
    ]),
    ...Object.entries(data.sandbox).map(([key, value]) => [key, 'USD', value]),
  ];
  return (
    <section className="ngo-report">
      <div className="card stack ngo-report-intro">
        <Download size={32} aria-hidden="true" />
        <h2>{ngo.reportTitle}</h2>
        <p>{ngo.reportText}</p>
        <button className="btn btn-ink" disabled={Boolean(busy)} onClick={download}>
          <Download size={20} aria-hidden="true" />
          {t(busy === 'report' ? ngo.downloading : ngo.download)}
        </button>
        <Link className="link-btn" to="/soon/payout">
          {ngo.payouts}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p className="hint">{ngo.payoutNote}</p>
      </div>
      <div className="table-wrap">
        <table className="ledger-table">
          <caption>{ngo.reportTitle}</caption>
          <thead>
            <tr>
              {ngo.reportColumns.map((name) => (
                <th key={name} scope="col">
                  {t(name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, unit, value]) => (
              <tr key={key}>
                <th scope="row">{ngo.reportRows[key]}</th>
                <td>{t(unit)}</td>
                <td>
                  {t(unit === 'USD' ? '$' : '')}
                  {t(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
