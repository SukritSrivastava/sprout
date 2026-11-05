// Every preview: its address (/soon/<id>), how it's listed, and which component shows it.
// Add a preview here and it appears on the hub page and gets its own route automatically.
// `live` marks the ones that really work today; its words are shown as a green stamp.
import {
  HandCoins,
  Languages,
  LayoutDashboard,
  Receipt,
  School,
  Send,
  ShieldCheck,
  Sprout as SproutIcon,
  Award,
} from 'lucide-react';
import Donate from './Donate.jsx';
import Payout from './Payout.jsx';
import NgoDashboard from './NgoDashboard.jsx';
import ImpactLedger from './ImpactLedger.jsx';
import Seedlings from './Seedlings.jsx';
import Safety from './Safety.jsx';
import { Certificates, Classroom, Hindi } from './More.jsx';

export const previews = [
  { id: 'donate', title: 'PayPal donations', live: 'Live · PayPal sandbox', line: 'Fund an NGO’s reward pool with real PayPal Checkout (test money), and get an AI thank-you.', icon: HandCoins, color: 'var(--green)', component: Donate },
  { id: 'payout', title: 'Payouts to guardians', live: 'Live · PayPal sandbox', line: 'Two adults approve, then PayPal Payouts pays a guardian (test money).', icon: Send, color: 'var(--purple)', component: Payout },
  { id: 'ngo', title: 'NGO & mentor dashboard', line: 'Check activities, track money in and out, report to donors.', icon: LayoutDashboard, color: 'var(--yellow)', component: NgoDashboard },
  { id: 'impact', title: 'Public impact ledger', live: 'Live · local blockchain', line: 'PayPal receipts sealed on a blockchain. Check any receipt yourself; no kid data.', icon: Receipt, color: 'var(--peach)', component: ImpactLedger },
  { id: 'seedlings', title: 'Seedlings mode', line: 'Picture-first lessons for ages 8 to 11, with seeds instead of rupees.', icon: SproutIcon, color: 'var(--mint)', component: Seedlings },
  { id: 'safety', title: 'Guardian consent & safety', line: 'A guardian agrees first; very little data; delete any time.', icon: ShieldCheck, color: 'var(--lavender)', component: Safety },
  { id: 'hindi', title: 'Hindi everywhere', line: 'The whole app in Hindi, not just the mentor.', icon: Languages, color: 'var(--mint)', component: Hindi },
  { id: 'classroom', title: 'Classroom mode & offline', line: 'One shared tablet, a PIN per kid, works without internet.', icon: School, color: 'var(--yellow)', component: Classroom },
  { id: 'certificates', title: 'Learning certificates', line: 'Proof of what a kid learned that a school can check.', icon: Award, color: 'var(--purple)', component: Certificates },
];

export const previewById = Object.fromEntries(previews.map((p) => [p.id, p]));
