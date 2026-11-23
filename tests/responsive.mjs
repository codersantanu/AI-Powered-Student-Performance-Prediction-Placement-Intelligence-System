import { chromium, expect, test } from '@playwright/test';
const baseUrl = process.env.TEST_URL || 'http://localhost:5173';

test('dashboard preview and account screens remain responsive', async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    for (const route of ['/', '/login', '/register']) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
      for (const width of [1440, 1024, 768, 640, 480, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} overflow at ${width}`).toBeLessThanOrEqual(width);
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Academic Performance', exact: true }).click();
    await expect(page.locator('.semester-history')).toBeVisible();
    await page.getByRole('combobox', { name: 'Sample semester', exact: true }).selectOption('4');
    await expect(page.locator('.dashboard-stat').first()).toContainText('7.8');
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download sample report' }).click();
    expect((await downloading).suggestedFilename()).toBe('StudentIQ-sample-academic-report.csv');
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Contact', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Explore the project' }).click();
    await expect(page).toHaveURL(/#about$/);
  } finally { await browser.close(); }
});
