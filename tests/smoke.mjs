import { chromium, expect, test } from '@playwright/test';

const baseUrl = process.env.TEST_URL || 'http://localhost:5173';

test('landing navigation and frontend-only account forms', async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle('StudentIQ — Shape Your Academic Future');
    await expect(page.locator('.feature-card')).toHaveCount(6);
    await page.getByRole('link', { name: 'Explore Features', exact: true }).click();
    await expect(page).toHaveURL(/#features$/);
    await page.locator('.nav-actions').getByRole('link', { name: 'Get Started', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/register`);
    await page.getByLabel('Full name').fill('Test Student');
    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
    await page.getByLabel('Confirm password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Flask backend');
    await page.getByRole('link', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/login`);
    await expect(page.getByText('Continue with Demo Account')).toHaveCount(0);
    await expect(page.getByText('Explore the sample dashboard. No credentials or account required.')).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to home' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Features', exact: true }).click();
    await expect(page).toHaveURL(/#features$/);
    await page.getByRole('link', { name: 'StudentIQ home' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
