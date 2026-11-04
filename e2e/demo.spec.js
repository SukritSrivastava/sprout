// The interactive demo sections. Expected numbers come from the same model code the page uses,
// so the tests check the page shows the model's answer rather than repeating magic numbers.
import { test, expect, goToSection } from './fixtures.js';
import {
  money,
  splitReward,
  projectSavings,
  monthsToGoal,
  describeMonths,
} from '../client/src/lib/model.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const jarAmounts = (page) => page.locator('.jar-card > strong');

test.describe('Earn: demo activity', () => {
  test('completing the activity adds ₹200, disables the button, and can be reset', async ({ page }) => {
    await goToSection(page, 'earn');
    const complete = page.getByRole('button', { name: 'Complete demo activity' });
    await complete.click();

    const done = page.getByRole('button', { name: 'Sample reward added' });
    await expect(done).toBeDisabled();
    await expect(page.getByText('Your sample jars now hold ₹400.')).toBeVisible();
    await expect(page.getByText('Your sample reward is ready.')).toBeVisible();
    await expect(jarAmounts(page)).toHaveText(splitReward(400, 50).map(money));

    await page.getByRole('button', { name: 'Reset example' }).click();
    await expect(complete).toBeEnabled();
    await expect(jarAmounts(page)).toHaveText(splitReward(200, 50).map(money));
  });

  test('"See your jars" jumps to the jars section', async ({ page }) => {
    await goToSection(page, 'earn');
    await page.getByRole('button', { name: 'Complete demo activity' }).click();
    await page.getByRole('button', { name: 'See your jars →' }).click();
    await expect(page.locator('#jars h2')).toBeInViewport();
  });
});

test.describe('Jars', () => {
  test('selecting a jar marks it pressed and explains it', async ({ page }) => {
    await goToSection(page, 'jars');
    const cards = page.locator('.jar-card');
    await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true');
    for (const [index, name] of ['Save', 'Spend', 'Give', 'Invest'].entries()) {
      await cards.nth(index).click();
      await expect(cards.nth(index)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.allocation-copy strong')).toHaveText(`${name}, your way.`);
    }
    await expect(page.locator('.jar-card[aria-pressed="true"]')).toHaveCount(1);
  });

  for (const percent of [0, 35, 100]) {
    test(`saving ${percent}% conserves every rupee`, async ({ page }) => {
      await goToSection(page, 'jars');
      await page.locator('#save-split').fill(String(percent));
      await expect(page.locator('output[for="save-split"]')).toHaveText(`${percent}%`);
      const expected = splitReward(200, percent);
      await expect(jarAmounts(page)).toHaveText(expected.map(money));
      expect(expected.reduce((a, b) => a + b, 0)).toBe(200);
    });
  }
});

test.describe('Growth calculator and goal picker', () => {
  test('defaults to a bicycle at ₹100 a month over 5 years', async ({ page }) => {
    await goToSection(page, 'grow');
    await expect(page.getByRole('button', { name: 'Bicycle' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.goal-eta')).toHaveText(
      `Your ${money(6000)} bicycle in ${describeMonths(monthsToGoal(100, 6000))}`,
    );
    await expect(page.locator('.growth-value')).toContainText(money(projectSavings(100, 5).balance));
    await expect(page.locator('.goal-line')).toBeVisible();
  });

  const cases = [
    { goal: 'Headphones', cost: 1000, monthly: 250 },
    { goal: 'Bicycle', cost: 6000, monthly: 500 },
    { goal: 'Laptop', cost: 30000, monthly: 100 },
  ];
  for (const { goal, cost, monthly } of cases) {
    test(`${goal} at ${money(monthly)} a month shows the right time to goal`, async ({ page }) => {
      await goToSection(page, 'grow');
      await page.getByRole('button', { name: goal, exact: true }).click();
      await page.getByRole('button', { name: money(monthly), exact: true }).click();
      await expect(page.getByRole('button', { name: money(monthly), exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      const months = monthsToGoal(monthly, cost);
      const eta = page.locator('.goal-eta');
      if (months === null) await expect(eta).toContainText('needs a bigger monthly amount');
      else await expect(eta).toContainText(describeMonths(months));
      await expect(page.locator('.growth-value')).toContainText(
        money(projectSavings(monthly, 5).balance),
      );
    });
  }

  test('the goal line hides when the goal is above the chart', async ({ page }) => {
    await goToSection(page, 'grow');
    await page.getByRole('button', { name: 'Laptop', exact: true }).click();
    await expect(page.locator('.goal-line')).toHaveCount(0);
  });

  test('the years slider updates the total and labels', async ({ page }) => {
    await goToSection(page, 'grow');
    await page.locator('#years').fill('10');
    await expect(page.locator('output[for="years"]')).toHaveText('10 years');
    await expect(page.locator('.growth-value')).toContainText(money(projectSavings(100, 10).balance));
    await expect(page.locator('.calculator-note')).toContainText(
      `You put in ${money(projectSavings(100, 10).contributed)} over 10 years`,
    );
  });
});

test.describe('Paisa Mentor (prepared answers)', () => {
  const questions = [
    ['What is a budget?', 'A budget is a plan'],
    ['Is investing like gambling?', 'Not quite.'],
    ['How do I spot a money scam?', 'Watch for pressure'],
  ];
  for (const [question, answerStart] of questions) {
    test(`"${question}" shows typing, then its answer`, async ({ page }) => {
      // A fake clock holds the typing bubble on screen until we move time forward ourselves,
      // so the test doesn't depend on how fast the machine is.
      await page.clock.install();
      await page.reload();
      await goToSection(page, 'mentor');
      await page.getByRole('button', { name: question }).click();
      await expect(page.locator('.user-message')).toHaveText(question);
      await expect(page.getByLabel('Paisa Mentor is typing')).toBeVisible();
      await page.clock.runFor(800);
      await expect(page.getByLabel('Paisa Mentor is typing')).toHaveCount(0);
      await expect(page.locator('.mentor-message')).toContainText(answerStart);
      await expect(page.getByRole('button', { name: question })).toHaveAttribute('aria-pressed', 'true');
    });
  }

  test('has six questions to choose from', async ({ page }) => {
    await expect(page.locator('.question-options button')).toHaveCount(6);
  });

  test('skips the typing pause when motion is reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await goToSection(page, 'mentor');
    await page.getByRole('button', { name: 'Do I have to give?' }).click();
    await expect(page.getByLabel('Paisa Mentor is typing')).toHaveCount(0);
    await expect(page.locator('.mentor-message')).toContainText('No. Giving is a choice');
  });
});

test.describe('Trust: accountability trail', () => {
  test('steps through approval, payout and receipt, then replays', async ({ page }) => {
    await goToSection(page, 'trust');
    const status = page.locator('.receipt-status');
    const steps = page.locator('.receipt-timeline li.done');
    await expect(status).toHaveText('Withdrawal requested');
    await expect(steps).toHaveCount(1);

    await page.getByRole('button', { name: 'Simulate mentor approval' }).click();
    await expect(status).toHaveText('Approved by a mentor');
    await page.getByRole('button', { name: 'Simulate payout' }).click();
    await expect(status).toHaveText('Payout simulated');
    await page.getByRole('button', { name: 'Preview receipt' }).click();
    await expect(status).toHaveText('Preview only · no transaction published');
    await expect(steps).toHaveCount(4);

    await page.getByRole('button', { name: 'Replay example' }).click();
    await expect(status).toHaveText('Withdrawal requested');
    await expect(steps).toHaveCount(1);
  });
});
