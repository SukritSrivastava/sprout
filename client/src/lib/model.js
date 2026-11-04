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
