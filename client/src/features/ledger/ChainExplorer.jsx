// A mini block explorer: shows one blockchain transaction the way sites like etherscan.io do.
// Used by the impact-ledger preview after a batch is published.
import { useLanguage } from '../language/language.jsx';
import React from 'react';
import { motion } from 'motion/react';
import { Blocks, CircleCheck, CircleX } from 'lucide-react';
import { ease } from '../../shared/motion.jsx';
import { shortHex } from './api.js';

export default function ChainExplorer({ batch, network }) {
  const { t, language } = useLanguage();

  const { tx } = batch;
  if (!tx) return null;
  const rows = [
    ['Status', tx.status === 'success' ? 'Success' : 'Failed'],
    ['Block', `#${tx.blockNumber}`],
    ['Transaction', shortHex(tx.hash, 10, 8)],
    ['Time', new Date(tx.timestamp * 1000).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN')],
    ['From (NGO publisher)', shortHex(tx.from, 8, 6)],
    ['To (ImpactLedger contract)', shortHex(tx.to, 8, 6)],
    ['Batch code stored', shortHex(`0x${batch.root}`, 10, 8)],
    ['Gas used', tx.gasUsed.toLocaleString('en-IN')],
    ['Fee paid', t('{0} test ETH', [Number(tx.feeEth).toFixed(6)])],
  ];
  return (
    <motion.div
      className="card explorer"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      data-testid="chain-explorer"
    >
      <div className="explorer-head">
        <Blocks size={22} strokeWidth={2.5} aria-hidden="true" />
        <strong>{t('Block explorer')}</strong>
        <span className="tag tag-yellow">{t(batch.identity?.chainId===84532?'Base Sepolia · test ETH':network)}</span>
      </div>
      <dl className="explorer-rows">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{t(label)}</dt>
            <dd
              className={
                label === 'Status'
                  ? tx.status === 'success'
                    ? 'explorer-ok'
                    : 'verify-result bad'
                  : 'mono'
              }
            >
              {label === 'Status' &&
                (tx.status === 'success' ? (
                  <CircleCheck size={16} strokeWidth={2.75} aria-hidden="true" />
                ) : (
                  <CircleX size={16} strokeWidth={2.75} aria-hidden="true" />
                ))}
              {label==='Transaction'&&batch.identity?.chainId===84532?
                <a href={`https://sepolia.basescan.org/tx/${encodeURIComponent(tx.hash)}`} target="_blank" rel="noreferrer">{t(value)}</a>:t(value)}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </motion.div>
  );
}
