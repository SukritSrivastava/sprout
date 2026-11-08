// The real PayPal button (PayPal JavaScript SDK, sandbox). Clicking it opens PayPal's own window,
// where the donor logs in with a sandbox buyer account (or uses a test card) and approves.
//
// What happens, step by step:
//   1. createOrder → our server asks PayPal for an order of exactly `amount` dollars.
//   2. The donor approves in PayPal's window.
//   3. onApprove → our server captures the order, checks PayPal's answer, makes a receipt and
//      asks the AI for a thank-you note. `onPaid` gets all of that.
import { useLanguage } from '../language/language.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadPayPalSdk } from './sdk.js';
import { captureOrder, createOrder } from './api.js';

// Shown instead of PayPal when the server has no sandbox keys yet.
export function PayPalSetupNotice() {
  const { t } = useLanguage();

  return (
    <div className="chat-notice" role="status" data-testid="paypal-setup">
      <strong>{t('PayPal sandbox isn’t set up on this computer yet.')}</strong>
      {t(' Create a free sandbox app at developer.paypal.com, then put its keys in ')}
      <code>{t('server/.env')}</code>
      {t(' as')}
      {t(' ')}
      <code>{t('PAYPAL_CLIENT_ID')}</code>
      {t(' and ')}
      <code>{t('PAYPAL_CLIENT_SECRET')}</code>
      {t(' and restart')}
      {t(' ')}
      <code>{t('npm run dev')}</code>
      {t('. The README has the steps.')}
    </div>
  );
}

export default function PayPalButton({ clientId, currency, amount, onPaid, onError, onBusy }) {
  const { t } = useLanguage();

  const holder = useRef(null);
  const [ready, setReady] = useState(false);
  // Keep the latest callbacks without re-drawing PayPal's button on every render.
  const callbacks = useRef({ onPaid, onError, onBusy });
  callbacks.current = { onPaid, onError, onBusy };

  useEffect(() => {
    let buttons = null;
    let gone = false;
    setReady(false);
    loadPayPalSdk(clientId, currency)
      .then((paypal) => {
        if (gone || !holder.current) return;
        let problem = ''; // our server's message, shown instead of PayPal's generic one
        buttons = paypal.Buttons({
          style: { layout: 'vertical', shape: 'pill', color: 'gold', label: 'paypal' },
          createOrder: async () => {
            callbacks.current.onError('');
            const reply = await createOrder(amount);
            if (!reply.ok) {
              problem = reply.message;
              throw new Error(reply.message);
            }
            return reply.id;
          },
          onApprove: async (data) => {
            callbacks.current.onBusy(true);
            const reply = await captureOrder(data.orderID);
            callbacks.current.onBusy(false);
            if (reply.ok) callbacks.current.onPaid(reply);
            else callbacks.current.onError(reply.message);
          },
          onCancel: () => callbacks.current.onError('Payment cancelled. Nothing was charged.'),
          onError: (error) =>
            callbacks.current.onError(
              problem ||
                (/popup/i.test(String(error?.message ?? error))
                  ? 'This browser blocked PayPal’s window. Allow pop-ups for this site, or open the page in Chrome or Edge.'
                  : 'PayPal couldn’t finish the payment. Try again.'),
            ),
        });
        return buttons.render(holder.current).then(() => !gone && setReady(true));
      })
      .catch((error) => !gone && callbacks.current.onError(error.message));
    return () => {
      gone = true;
      buttons?.close?.().catch?.(() => {});
    };
  }, [clientId, currency, amount]);

  return (
    <div className="paypal-holder">
      {!ready && (
        <p className="hint">
          <Loader2 className="spin" size={18} strokeWidth={2.75} aria-hidden="true" />
          {t(' Loading PayPal…')}
        </p>
      )}
      <div ref={holder} data-testid="paypal-buttons" />
    </div>
  );
}
