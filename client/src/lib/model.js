// Built once: creating a formatter on every render is slow and money() runs often during count-ups.
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
export const money = (value) => inr.format(value);

export const savingsGoals = [
  { id: 'headphones', label: 'Headphones', cost: 1000 },
  { id: 'bicycle', label: 'Bicycle', cost: 6000 },
  { id: 'laptop', label: 'Laptop', cost: 30000 },
];
export const monthlyOptions = [100, 250, 500];

// Months of month-end deposits needed to reach the goal, or null if it takes longer than maxMonths.
export function monthsToGoal(monthly, goal, annualRate = 0.08, maxMonths = 240) {
  if (goal <= 0) return 0;
  if (monthly <= 0) return null;
  let balance = 0;
  for (let month = 1; month <= maxMonths; month++) {
    balance = balance * (1 + annualRate / 12) + monthly;
    if (balance >= goal) return month;
  }
  return null;
}

export function describeMonths(months) {
  if (months === null) return 'more than 20 years';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (rest) parts.push(`${rest} month${rest > 1 ? 's' : ''}`);
  return parts.join(' ') || '0 months';
}

export function splitReward(amount, savePercent) {
  const save = Math.round((amount * savePercent) / 100);
  const rest = amount - save;
  const spend = Math.round(rest * 0.6);
  const give = Math.round(rest * 0.2);
  return [save, spend, give, rest - spend - give];
}

export function projectSavings(monthly, years, annualRate = 0.08) {
  let balance = 0;
  const points = [0];
  for (let month = 1; month <= years * 12; month++) {
    balance = balance * (1 + annualRate / 12) + monthly;
    if (month % 12 === 0) points.push(Math.round(balance));
  }
  return { balance: Math.round(balance), contributed: monthly * years * 12, points };
}

// The guided tour. Each step names the page (`path`) and section (`id`) it shows.
// Steps add up to 75 seconds of playback.
export const tourSteps = [
  {
    path: '/',
    id: 'home',
    seconds: 9,
    title: 'Hi, I’m Sprout.',
    text: 'Sprout teaches kids money skills through NGOs. Kids earn small rewards for useful activities, plan them, and ask a mentor anything.',
  },
  {
    path: '/',
    id: 'how',
    seconds: 9,
    title: 'Three steps. No bank account.',
    text: 'Do something useful, a mentor checks it, then you decide where the reward goes. It works even if you start with nothing.',
  },
  {
    path: '/',
    id: 'trust',
    seconds: 8,
    title: 'Adults hold the money.',
    text: 'The NGO keeps the funds and two adults approve every payout. Payouts and public receipts are planned; today they are simulated.',
  },
  {
    path: '/app',
    id: 'earn',
    seconds: 10,
    title: 'Earn your first ₹200.',
    text: 'This is the demo. Complete the sample activity and watch the reward land in your jars.',
  },
  {
    path: '/app',
    id: 'jars',
    seconds: 10,
    title: 'Four jars, your split.',
    text: 'Save, Spend, Give and Invest. Move the slider and every rupee stays accounted for. Giving is always your choice.',
  },
  {
    path: '/app',
    id: 'grow',
    seconds: 10,
    title: 'When can I get it?',
    text: 'Pick a goal and a monthly amount to see how long it could take. The growth is a pretend example, never added to your money.',
  },
  {
    path: '/app',
    id: 'mentor',
    seconds: 11,
    title: 'Ask Paisa Mentor.',
    text: 'Tap a question and get a plain answer. These are prepared answers for now; the live AI mentor, in English and Hindi, comes next.',
  },
  {
    path: '/app',
    id: 'withdraw',
    seconds: 8,
    title: 'Every step leaves a trail.',
    text: 'Request money for a goal, a mentor approves, and you get a receipt. No real money moves in this demo.',
  },
];
export const tourDuration = tourSteps.reduce((total, step) => total + step.seconds, 0);
export const tourStart = (index) =>
  tourSteps.slice(0, index).reduce((total, step) => total + step.seconds, 0);
export function tourIndex(seconds) {
  let end = 0;
  return tourSteps.findIndex((step) => {
    end += step.seconds;
    return seconds < end;
  });
}
