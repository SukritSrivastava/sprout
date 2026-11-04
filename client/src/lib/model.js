export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export function splitReward(amount, savePercent) {
  const save = Math.round(amount * savePercent / 100);
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
  { id: 'home', seconds: 10, title: 'Meet your money era.', text: 'Welcome to Sprout. Teens earn NGO-funded learning rewards, make their own money choices, and build confidence with a mentor beside them.' },
  { id: 'earn', seconds: 11, title: 'Do a little. Earn a little.', text: 'Start with a useful activity. Submit it for mentor approval. Once approved, the reward appears in your virtual balance. Try the sample activity here.' },
  { id: 'jars', seconds: 12, title: 'One reward. Four possibilities.', text: 'Split a reward between Save, Spend, Give, and Invest. Move the slider to see the trade-off. These are virtual jars, and giving is your choice.' },
  { id: 'grow', seconds: 12, title: 'Give your future a head start.', text: 'Choose a goal and explore what regular saving could look like. This calculator illustrates compound growth. Its returns are hypothetical, never money added to your balance.' },
  { id: 'mentor', seconds: 11, title: 'Money questions welcome.', text: 'Paisa Mentor explains the why behind your choices in everyday language. Try a sample question. This draft uses prepared answers; live AI comes in a later stage.' },
  { id: 'trust', seconds: 12, title: 'A little more accountability.', text: 'Adults approve withdrawals. The planned PayPal connection will track payouts, while blockchain receipts can expose changed records. This frontend simulates the flow. It cannot prevent every kind of fraud.' },
  { id: 'start', seconds: 7, title: 'Small start. Yours to grow.', text: 'That is Sprout. Try the demo, change your plan, and make your next money decision a little more confidently.' },
];
export const tourDuration = tourSteps.reduce((total, step) => total + step.seconds, 0);
export const tourStart = index => tourSteps.slice(0, index).reduce((total, step) => total + step.seconds, 0);
export function tourIndex(seconds) {
  let end = 0;
  return tourSteps.findIndex(step => { end += step.seconds; return seconds < end; });
}
