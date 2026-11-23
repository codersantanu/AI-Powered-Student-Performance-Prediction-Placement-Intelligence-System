import { chromium, expect, test } from '@playwright/test';

const baseUrl = process.env.TEST_URL || 'http://localhost:5173';

test('student and admin workspace interactions and responsive layouts', async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const routes = ['dashboard', 'profile', 'academic-performance', 'study-behaviour', 'psychometric-assessment', 'technical-assessment', 'skills-experience', 'performance-prediction', 'improvement-recommendations', 'reports'];
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.goto(`${baseUrl}/student/dashboard`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${baseUrl}/login`);
    await page.goto(`${baseUrl}/student/dashboard?preview=1`, { waitUntil: 'networkidle' });
    await expect(page.locator('.preview-banner')).toBeVisible();
    await expect(page.locator('.gradient-stat')).toHaveCount(5);
    await page.getByRole('tab', { name: 'Mathematics', exact: true }).click();
    await expect(page.locator('.subject-overview')).toContainText('Mathematics');
    await page.getByRole('button', { name: 'Expand Linear Algebra', exact: true }).click();
    await expect(page.locator('.topic-details')).toContainText('Vectors');
    await page.getByRole('tab', { name: 'Programming', exact: true }).click();
    await page.getByRole('button', { name: 'Expand Algorithms', exact: true }).click();
    await expect(page.locator('.topic-details')).toContainText('Algorithm design');
    await page.getByRole('button', { name: 'Log Study Session', exact: true }).click();
    await page.getByLabel('Subject', { exact: true }).fill('Python revision');
    await page.getByLabel('Study duration (hours)').fill('1.5');
    await page.getByRole('button', { name: 'Save Session', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Study Behaviour', exact: true }).click();
    await expect(page.locator('.data-table')).toContainText('Python revision');
    await page.getByRole('button', { name: 'Delete Python revision session', exact: true }).click();
    await page.getByRole('button', { name: 'Delete Session', exact: true }).click();
    await expect(page.locator('.data-table')).not.toContainText('Python revision');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'My Profile', exact: true }).click();
    await page.getByRole('button', { name: 'Edit Profile', exact: true }).click();
    await page.getByLabel('Phone number').fill('+1 555 0100');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.information-list')).toContainText('+1 555 0100');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Skills & Experience', exact: true }).click();
    await page.getByRole('button', { name: 'Add New Entry', exact: true }).click();
    await page.getByLabel('Title', { exact: true }).fill('Browser test project');
    await page.getByLabel('Description', { exact: true }).fill('A test entry.');
    await page.getByRole('button', { name: 'Add entry', exact: true }).click();
    await expect(page.locator('.skills-grid')).toContainText('Browser test project');
    await page.getByRole('button', { name: 'Delete Browser test project', exact: true }).click();
    await page.getByRole('button', { name: 'Delete Entry', exact: true }).click();
    await expect(page.locator('.skills-grid')).not.toContainText('Browser test project');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Technical Assessment', exact: true }).click();
    await page.getByRole('button', { name: 'Start Assessment', exact: true }).click();
    for (let i = 0; i < 5; i++) {
      await page.locator('.answer-option').first().click();
      if (i < 4) await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Submit Assessment', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Submit Assessment', exact: true }).click();
    await expect(page.locator('.assessment-result-hero')).toContainText('SAMPLE ASSESSMENT RESULT');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Psychometric Assessment', exact: true }).click();
    await page.getByRole('button', { name: 'Start Self-Assessment', exact: true }).click();
    await expect(page.locator('.answer-option')).toHaveCount(4);
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Performance Prediction', exact: true }).click();
    await expect(page.locator('.prediction-unavailable')).toContainText('not available yet');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Improvement Recommendations', exact: true }).click();
    await page.getByRole('button', { name: 'Set a Study Goal', exact: true }).click();
    await page.getByLabel('Goal title').fill('Read documentation');
    await page.getByRole('button', { name: 'Create Goal', exact: true }).click();
    await expect(page.locator('.study-goals-list')).toContainText('Read documentation');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'My Reports', exact: true }).click();
    await page.getByRole('button', { name: 'View report', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Academic Performance');
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Academic Performance PDF', exact: true }).click();
    expect((await downloading).suggestedFilename()).toContain('.pdf');

    for (const route of [...routes.map((item) => `/student/${item}`), '/admin/dashboard', '/admin/students', '/admin/academic-records', '/admin/assessments', '/admin/reports']) {
      await page.goto(`${baseUrl}${route}?preview=1`, { waitUntil: 'networkidle' });
      await expect(page.locator('.workspace-content h1')).toBeVisible();
      for (const width of [1440, 1024, 768,390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        expect(dimensions.document, `${route} overflow at ${width}px`).toBeLessThanOrEqual(width);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      console.log(`PASS: ${route} at five widths`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/student/dashboard?preview=1`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Open navigation drawer' }).click();
    await expect(page.locator('.workspace-sidebar--open')).toBeVisible();
    await page.locator('.workspace-sidebar').getByRole('link', { name: 'My Profile', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/student/profile?preview=1`);
    await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
