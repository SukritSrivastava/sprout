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

export const tourSteps = [
  {
    id: 'home',
    seconds: 10,
    title: 'Meet your money era.',
    text: 'Welcome to Sprout. Teens earn NGO-funded learning rewards, make their own money choices, and build confidence with a mentor beside them.',
  },
  {
    id: 'earn',
    seconds: 11,
    title: 'Do a little. Earn a little.',
    text: 'Start with a useful activity. Submit it for mentor approval. Once approved, the reward appears in your virtual balance. Try the sample activity here.',
  },
  {
    id: 'jars',
    seconds: 12,
    title: 'One reward. Four possibilities.',
    text: 'Split a reward between Save, Spend, Give, and Invest. Move the slider to see the trade-off. These are virtual jars, and giving is your choice.',
  },
  {
    id: 'grow',
    seconds: 12,
    title: 'Give your future a head start.',
    text: 'Pick a goal and a monthly amount to see when you could reach it. This calculator illustrates compound growth. Its returns are hypothetical, never money added to your balance.',
  },
  {
    id: 'mentor',
    seconds: 11,
    title: 'Money questions welcome.',
    text: 'Paisa Mentor explains the why behind your choices in everyday language. Try a sample question. This draft uses prepared answers; live AI comes in a later stage.',
  },
  {
    id: 'trust',
    seconds: 12,
    title: 'A little more accountability.',
    text: 'Adults approve withdrawals. The planned PayPal connection will track payouts, while blockchain receipts can expose changed records. This frontend simulates the flow. It cannot prevent every kind of fraud.',
  },
  {
    id: 'start',
    seconds: 7,
    title: 'Small start. Yours to grow.',
    text: 'That is Sprout. Try the demo, change your plan, and make your next money decision a little more confidently.',
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
