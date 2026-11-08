// Browser-only fake NGO API. Real authorization, persistence and money isolation have API tests.
export async function fakeNgo(page, { configured = true, failReview = false } = {}) {
  const token = 'a'.repeat(64);
  let unlocked = false;
  const activities = [
    { id: 'ACT-001', learner: 'A12', title: 'Reading hour at the learning centre', credits: 200, status: 'pending' },
    { id: 'ACT-002', learner: 'B07', title: 'Sorted the library shelves', credits: 150, status: 'pending' },
    { id: 'ACT-003', learner: 'C33', title: 'Taught counting change to a younger kid', credits: 200, status: 'pending' },
  ];
  function dashboard() {
    const approved = activities.filter((a) => a.status === 'approved');
    return {
      activities,
      learners: activities.map((a) => ({ code: a.learner, credits: a.status === 'approved' ? a.credits : 0,
        jars: a.status === 'approved' ? { save: a.credits / 2, spend: a.credits * 0.3, give: a.credits * 0.1, invest: a.credits * 0.1 } : { save: 0, spend: 0, give: 0, invest: 0 } })),
      totals: { pending: activities.filter((a) => a.status === 'pending').length, approved: approved.length,
        returned: activities.filter((a) => a.status === 'returned').length, totalCredits: approved.reduce((s, a) => s + a.credits, 0) },
      sandbox: { donated: 50, paid: 8, reserved: 5, available: 37 },
    };
  }
  await page.route('**/api/ngo/**', async (route) => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    if (path.endsWith('/config')) return route.fulfill({ json: { configured, roles: configured ? ['mentor', 'admin'] : [] } });
    if (path.endsWith('/unlock')) {
      if (req.postDataJSON().pin !== 'mentor-test-123') return route.fulfill({ status: 403, json: { message: 'That PIN is not right for this staff role.' } });
      unlocked = true;
      return route.fulfill({ json: { token, expiresAt: Date.now() + 900_000, role: req.postDataJSON().approver, dashboard: dashboard() } });
    }
    if (!unlocked || req.headers().authorization !== `Bearer ${token}`) return route.fulfill({ status: 401, json: { message: 'Unlock the workspace with your PIN to continue.' } });
    if (path.endsWith('/lock')) { unlocked = false; return route.fulfill({ json: { locked: true } }); }
    if (path.includes('/reviews/')) {
      if (failReview) return route.fulfill({ status: 503, json: { message: 'The review could not be saved. Nothing was awarded.' } });
      const a = activities.find((a) => path.endsWith(a.id));
      a.status = req.postDataJSON().decision; a.reviewedBy = 'mentor'; a.reviewedAt = new Date().toISOString();
      return route.fulfill({ json: { dashboard: dashboard() } });
    }
    if (path.endsWith('/report')) return route.fulfill({ json: {
      filename: 'sprout-ngo-report-test.csv', csv: `metric,unit,value\r\nlearning_rewards,credits,${dashboard().totals.totalCredits}\r\nsandbox_available,USD,37\r\n`,
    } });
    return route.fulfill({ json: { dashboard: dashboard() } });
  });
  return { dashboard };
}

export async function openNgo(page) {
  await page.goto('/soon/ngo');
  await page.getByLabel('Your staff PIN').fill('mentor-test-123');
  await page.getByRole('button', { name: 'Open workspace', exact: true }).click();
}
