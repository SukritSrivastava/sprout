// Home page, section 4 (black band): who holds the money and how it stays honest.
// The three points appear one after another as you scroll to them.
import React from 'react';
import { Landmark, Receipt, ShieldCheck, Users } from 'lucide-react';
import { Reveal, Stagger } from '../../lib/motion.jsx';
import { icon, iconSized } from '../../lib/icons.js';

const points = [
  { Icon: Landmark, title: 'The NGO keeps the money.', text: 'Kids see their balance in sprout.io. The real funds stay with the NGO.' },
  { Icon: Users, title: 'Two adults approve every payout.', text: 'A mentor and an NGO admin both say yes before anything is paid.' },
  { Icon: Receipt, title: 'Every rupee leaves a receipt.', text: 'Donors and parents can check where the money went.' },
];

export default function Trust() {
  return (
    <section id="trust" className="section band band-ink">
      <div className="container trust-grid">
        <Reveal className="trust-head">
          <span className="tag tag-green">
            <ShieldCheck {...iconSized(18, 2.75)} /> Built on trust
          </span>
          <h2>
            Kids learn.
            <br />
            Adults hold the money.
          </h2>
          <p className="muted-on-ink">
            Payouts through PayPal and public receipts are planned. In today’s demo they are
            simulated, and it says so.
          </p>
        </Reveal>
        <Stagger as="ul" className="trust-list">
          {points.map(({ Icon, title, text }) => (
            <Stagger.Item as="li" key={title}>
              <span className="trust-icon">
                <Icon {...icon} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </Stagger.Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
