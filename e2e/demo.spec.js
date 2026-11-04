// The demo at /app. Expected numbers come from the same model code the page uses,
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
  await page.goto('/app');
});

const jarAmounts = (page) => page.locator('.jar-amount');

test.describe('Earn', () => {
  test('completing the activity adds ₹200, celebrates, and can be reset', async ({ page }) => {
    await goToSection(page, 'earn');
    const complete = page.getByRole('button', { name: 'Complete the activity' });
    await complete.click();

    await expect(page.getByRole('button', { name: 'Reward added' })).toBeDisabled();
    await expect(page.getByText('Your jars now hold ₹400.')).toBeVisible();
    await expect(page.locator('.balance-card strong')).toHaveText(money(400));
    await expect(jarAmounts(page)).toHaveText(splitReward(400, 50).map(money));

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(complete).toBeEnabled();
    await expect(page.locator('.balance-card strong')).toHaveText(money(200));
    await expect(jarAmounts(page)).toHaveText(splitReward(200, 50).map(money));
  });

  test('the celebration burst appears, but not when motion is reduced', async ({ page }) => {
    await goToSection(page, 'earn');
    await page.getByRole('button', { name: 'Complete the activity' }).click();
    await expect(page.locator('.burst')).toHaveCount(1);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await goToSection(page, 'earn');
    await page.getByRole('button', { name: 'Complete the activity' }).click();
    await expect(page.getByRole('button', { name: 'Reward added' })).toBeDisabled();
    await expect(page.locator('.burst')).toHaveCount(0);
  });

  test('"See your jars" glides to the jars', async ({ page }) => {
    await goToSection(page, 'earn');
    await page.getByRole('button', { name: 'Complete the activity' }).click();
    await page.getByRole('button', { name: 'See your jars' }).click();
    await expect(page.locator('#jars h2')).toBeInViewport();
  });
});

test.describe('Jars', () => {
  test('selecting a jar marks it and explains it', async ({ page }) => {
    await goToSection(page, 'jars');
    const cards = page.locator('.jar-card');
    await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true');
    for (const [index, name] of ['Save', 'Spend', 'Give', 'Invest'].entries()) {
      await cards.nth(index).click();
      await expect(cards.nth(index)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.allocation h3')).toHaveText(`${name}, your way.`);
    }
    await expect(page.locator('.jar-card[aria-pressed="true"]')).toHaveCount(1);
  });

  for (const percent of [0, 35, 100]) {
    test(`saving ${percent}% keeps every rupee`, async ({ page }) => {
      await goToSection(page, 'jars');
      await page.locator('#save-split').fill(String(percent));
      await expect(page.locator('output[for="save-split"]')).toHaveText(`${percent}%`);
      await expect(jarAmounts(page)).toHaveText(splitReward(200, percent).map(money));
    });
  }
});

test.describe('Growth calculator', () => {
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
    test(`${goal} at ${money(monthly)} a month`, async ({ page }) => {
      await goToSection(page, 'grow');
      await page.getByRole('button', { name: goal, exact: true }).click();
      const amount = page.getByRole('button', { name: money(monthly), exact: true });
      await amount.click();
      await expect(amount).toHaveAttribute('aria-pressed', 'true');
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
    ['What is a budget?', 'A plan for your money'],
    ['Is investing like gambling?', 'Not really.'],
    ['How do I spot a money scam?', 'Watch for hurry'],
  ];
  for (const [question, answerStart] of questions) {
    test(`"${question}" shows Sprout thinking, then the answer`, async ({ page }) => {
      // A fake clock holds the "thinking" state until we move time forward ourselves.
      await page.clock.install();
      await page.reload();
      await goToSection(page, 'mentor');
      await page.getByRole('button', { name: question }).click();
      await expect(page.locator('.chat-body .bubble-user')).toHaveText(question);
      await expect(page.getByLabel('Paisa Mentor is typing')).toBeVisible();
      await page.clock.runFor(1200);
      await expect(page.getByLabel('Paisa Mentor is typing')).toHaveCount(0);
      await expect(page.locator('.chat-body .bubble-mentor')).toContainText(answerStart);
      await expect(page.getByRole('button', { name: question })).toHaveAttribute('aria-pressed', 'true');
    });
  }

  test('offers six questions', async ({ page }) => {
    await expect(page.locator('.question-list .chip')).toHaveCount(6);
  });

  test('answers straight away when motion is reduced', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await goToSection(page, 'mentor');
    await page.getByRole('button', { name: 'Do I have to give?' }).click();
    await expect(page.getByLabel('Paisa Mentor is typing')).toHaveCount(0);
    await expect(page.locator('.chat-body .bubble-mentor')).toContainText('No. Giving is a choice');
  });
});

test.describe('Withdraw: accountability trail', () => {
  test('steps through approval, payout and receipt, then starts again', async ({ page }) => {
    await goToSection(page, 'withdraw');
    const status = page.locator('.receipt-status');
    const done = page.locator('.timeline li.done');
    await expect(status).toHaveText('Withdrawal requested');
    await expect(done).toHaveCount(1);

    await page.getByRole('button', { name: 'Simulate mentor approval' }).click();
    await expect(status).toHaveText('Approved by a mentor');
    await page.getByRole('button', { name: 'Simulate payout' }).click();
    await expect(status).toHaveText('Payout simulated');
    await page.getByRole('button', { name: 'Show receipt' }).click();
    await expect(status).toHaveText('Preview only · no real transaction');
    await expect(done).toHaveCount(4);

    await page.getByRole('button', { name: 'Start again' }).click();
    await expect(status).toHaveText('Withdrawal requested');
    await expect(done).toHaveCount(1);
  });
});
