// The live Paisa Mentor chat on /app.
// Most tests answer for the server with page.route(), so they are fast, repeatable and never use
// Gemini quota. The last test talks to the real AI, only when you run: LIVE_AI=1 npm run test:e2e
import { test, expect, goToSection } from './fixtures.js';
import { money, splitReward } from '../client/src/lib/model.js';

// Builds a streamed reply in the server's format (docs/mentor-api.md).
const ndjson = ({ text, source = 'ai', flagged = false, suggestions = ['Next idea?'] }) =>
  [
    { type: 'start', source, flagged },
    ...text.split(/(?<= )/).map((piece) => ({ type: 'delta', text: piece })),
    { type: 'done', suggestions },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n') + '\n';

// Pretends to be the server. Records each request body so tests can inspect it.
async function fakeMentor(
  page,
  reply = { text: 'Save a little each week. ' },
  { health = true } = {},
) {
  const requests = [];
  await page.route('**/api/health', (route) =>
    route.fulfill({
      json: { ok: true, service: 'sprout-server', mentor: { aiConfigured: health } },
    }),
  );
  await page.route('**/api/mentor/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    const next = typeof reply === 'function' ? await reply(requests.length) : reply;
    if (next.status)
      return route.fulfill({ status: next.status, json: next.json, headers: next.headers });
    if (next.abort) return route.abort();
    return route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: ndjson(next) });
  });
  return requests;
}

const input = (page) => page.getByRole('textbox', { name: 'Your question' });
const mentorBubbles = (page) => page.locator('.chat-log .bubble-mentor');
const userBubbles = (page) => page.locator('.chat-log .bubble-user');

async function openChat(page) {
  await page.goto('/app');
  await goToSection(page, 'mentor');
}

test('typing a question and pressing Enter streams in the answer', async ({ page }) => {
  await fakeMentor(page, {
    text: 'Put ₹20 in your Save jar every week. ',
    suggestions: ['What next?'],
  });
  await openChat(page);
  await expect(page.locator('.status-tag')).toHaveText('Live AI');
  await input(page).fill('How do I save faster?');
  await input(page).press('Enter');
  await expect(userBubbles(page).last()).toHaveText('How do I save faster?');
  await expect(mentorBubbles(page).last()).toHaveText('Put ₹20 in your Save jar every week.');
  await expect(page.getByRole('button', { name: 'What next?' })).toBeVisible();
  await expect(input(page)).toHaveValue('');
});

test('shows Sprout thinking until the first words arrive', async ({ page }) => {
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await fakeMentor(page, async () => {
    await held;
    return { text: 'Here you go. ' };
  });
  await openChat(page);
  await input(page).fill('Hi');
  await input(page).press('Enter');
  await expect(page.getByLabel('Paisa Mentor is typing')).toBeVisible();
  release();
  await expect(page.getByLabel('Paisa Mentor is typing')).toHaveCount(0);
  await expect(mentorBubbles(page).last()).toHaveText('Here you go.');
});

test('sends the demo’s current jars and goal as sample context', async ({ page }) => {
  const requests = await fakeMentor(page);
  await page.goto('/app');
  await goToSection(page, 'jars');
  await page.locator('#save-split').fill('80');
  await goToSection(page, 'grow');
  await page.getByRole('button', { name: 'Laptop', exact: true }).click();
  await page.getByRole('button', { name: money(500), exact: true }).click();
  await goToSection(page, 'mentor');
  await input(page).fill('Can I afford it?');
  await input(page).press('Enter');
  await expect(mentorBubbles(page).last()).toContainText('Save a little');
  const [save, spend, give, invest] = splitReward(200, 80);
  expect(requests[0]).toEqual({
    language: 'en',
    messages: [{ role: 'user', text: 'Can I afford it?' }],
    context: {
      jars: { save, spend, give, invest },
      goal: { label: 'Laptop', cost: 30000, monthly: 500 },
    },
  });
});

test('remembers the conversation and sends it with the next question', async ({ page }) => {
  const requests = await fakeMentor(page, (n) => ({ text: `Answer ${n}. ` }));
  await openChat(page);
  await input(page).fill('First question');
  await input(page).press('Enter');
  await expect(mentorBubbles(page).last()).toHaveText('Answer 1.');
  await input(page).fill('Second question');
  await input(page).press('Enter');
  await expect(mentorBubbles(page).last()).toHaveText('Answer 2.');
  expect(requests[1].messages).toEqual([
    { role: 'user', text: 'First question' },
    { role: 'mentor', text: 'Answer 1. ' },
    { role: 'user', text: 'Second question' },
  ]);
});

test('tapping a suggestion asks it', async ({ page }) => {
  const requests = await fakeMentor(page);
  await openChat(page);
  await page.getByRole('button', { name: 'What is compound interest?' }).click();
  await expect(userBubbles(page).last()).toHaveText('What is compound interest?');
  expect(requests[0].messages.at(-1).text).toBe('What is compound interest?');
});

test('the Hindi switch changes the greeting, suggestions and reply language', async ({ page }) => {
  const requests = await fakeMentor(page, { text: 'हर हफ़्ते थोड़ा बचाओ। ' });
  await openChat(page);
  await page.getByRole('button', { name: 'हिंदी' }).click();
  await expect(page.getByRole('button', { name: 'हिंदी' })).toHaveAttribute('aria-pressed', 'true');
  await expect(mentorBubbles(page).first()).toContainText('नमस्ते');
  await page
    .getByRole('button', { name: 'बजट क्या होता है?' })
    .or(page.getByRole('button', { name: 'चक्रवृद्धि ब्याज क्या है?' }))
    .first()
    .click();
  await expect(mentorBubbles(page).last()).toHaveText('हर हफ़्ते थोड़ा बचाओ।');
  expect(requests[0].language).toBe('hi');
});

test('prepared answers are tagged and risky topics show the trusted-adult card', async ({
  page,
}) => {
  await fakeMentor(page, { text: 'Never share your OTP. ', source: 'prepared', flagged: true });
  await openChat(page);
  await input(page).fill('Someone wants my OTP');
  await input(page).press('Enter');
  await expect(page.locator('.bubble-tag')).toHaveText('Prepared answer');
  await expect(page.getByRole('note')).toContainText('This sounds important.');
  await expect(page.getByRole('note')).toContainText('1098');
});

test.describe('when a request fails', () => {
  // The browser itself logs failed requests; here that's the point of the test.
  test.use({ expectedConsoleErrors: [/Failed to load resource/] });

  test('too many messages shows a friendly notice and no empty reply', async ({ page }) => {
    await fakeMentor(page, {
      status: 429,
      json: {
        error: 'rate_limited',
        message: "Let's take a short break. Try again in 30 seconds.",
      },
      headers: { 'retry-after': '30' },
    });
    await openChat(page);
    await input(page).fill('Hello?');
    await input(page).press('Enter');
    await expect(page.locator('.chat-notice')).toContainText('short break');
    await expect(mentorBubbles(page)).toHaveCount(1); // only the greeting
  });

  test('if the server can’t be reached, a prepared answer keeps the chat going', async ({
    page,
  }) => {
    await fakeMentor(page, { abort: true });
    await openChat(page);
    await input(page).fill('How do I spot a scam?');
    await input(page).press('Enter');
    await expect(mentorBubbles(page).last()).toContainText('Watch for hurry');
    await expect(page.locator('.bubble-tag')).toHaveText('Prepared answer');
    await expect(page.locator('.status-tag')).toHaveText('Offline mode');
    await expect(page.locator('.chat-notice')).toContainText('prepared answer');
  });
});

test('shows Offline mode when the server has no AI key', async ({ page }) => {
  await fakeMentor(page, undefined, { health: false });
  await openChat(page);
  await expect(page.locator('.status-tag')).toHaveText('Offline mode');
});

test('Shift+Enter adds a line, the counter counts, empty questions can’t be sent', async ({
  page,
}) => {
  const requests = await fakeMentor(page);
  await openChat(page);
  const send = page.getByRole('button', { name: 'Send' });
  await expect(send).toBeDisabled();
  await input(page).fill('Line one');
  await input(page).press('Shift+Enter');
  await input(page).pressSequentially('two');
  await expect(input(page)).toHaveValue('Line one\ntwo');
  await expect(page.locator('.chat-form-foot .hint')).toHaveText('12/600');
  expect(requests).toHaveLength(0);
  await send.click();
  await expect(userBubbles(page).last()).toHaveText('Line one\ntwo');
});

test('Clear chat removes the conversation', async ({ page }) => {
  await fakeMentor(page);
  await openChat(page);
  await input(page).fill('Hi');
  await input(page).press('Enter');
  await expect(userBubbles(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear chat' }).click();
  await expect(userBubbles(page)).toHaveCount(0);
  await expect(mentorBubbles(page)).toHaveCount(1);
});

test('LIVE: the real Gemini mentor answers in English and Hindi', async ({ page }, testInfo) => {
  test.skip(
    !process.env.LIVE_AI || testInfo.project.name !== 'desktop',
    'set LIVE_AI=1 to call the real AI',
  );
  test.setTimeout(60_000);
  await openChat(page);
  await expect(page.locator('.status-tag')).toHaveText('Live AI');
  await input(page).fill('Why should I save money?');
  await input(page).press('Enter');
  await expect(mentorBubbles(page).last()).toContainText(/\w{3,}/, { timeout: 30_000 });
  // Wait until the answer has finished streaming before asking the next question.
  await expect(page.locator('.chat-log .caret')).toHaveCount(0, { timeout: 30_000 });
  await page.getByRole('button', { name: 'हिंदी' }).click();
  await input(page).fill('बचत क्यों ज़रूरी है?');
  await input(page).press('Enter');
  await expect(mentorBubbles(page).last()).toContainText(/[ऀ-ॿ]{3,}/, { timeout: 30_000 });
  await expect(page.locator('.bubble-tag')).toHaveCount(0); // real AI, not prepared
});
