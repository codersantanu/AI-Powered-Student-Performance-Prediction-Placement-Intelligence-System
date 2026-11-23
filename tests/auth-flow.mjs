import { chromium, expect, test } from '@playwright/test';

const baseUrl = process.env.TEST_URL || `http://localhost:${process.env.VITE_TEST_PORT || '5173'}`;

test('mocked authentication and server-role-based redirects', async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const student = { id: 1, name: 'Test Student', email: 'student@example.com', role: 'student' };
  const admin = { id: 2, name: 'Test Admin', email: 'admin@example.com', role: 'admin' };
  let currentUser = null;
  const headers = { 'Access-Control-Allow-Origin': baseUrl, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-CSRF-TOKEN', 'Access-Control-Allow-Credentials': 'true' };
  const json = (pattern, handler) => page.route(`http://localhost:5000/api${pattern}`, async (route) => {
    if (handler) return handler(route);
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 200, contentType: 'application/json', headers, body: '[]' });
  });
  try {
    await json('/auth/session', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ user: currentUser, csrf_token: 'test-csrf' }) }));
    await json('/auth/register', (route) => route.fulfill({ status: 201, contentType: 'application/json', headers, body: JSON.stringify({ message: 'Account created successfully.' }) }));
    await json('/auth/login', (route) => {
      const body = route.request().postDataJSON();
      currentUser = body.email === 'admin@example.com' ? admin : student;
      return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ user: currentUser, access_token: 'test-token', csrf_token: 'test-csrf' }) });
    });
    await json('/auth/me');
    await json('/auth/logout', (route) => { currentUser = null; return route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ message: 'Signed out.' }) }); });
    await json('/student/dashboard', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ profile: null, academicRecords: [], studySessions: [], assessmentResults: [], upcomingAssessments: [], prediction: null, recommendations: [], goals: [] }) }));
    await json('/predictions/model-metrics', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ available: false, selectedModel: 'Not connected', target: 'next semester', version: '', metrics: null, dataset: null, calibrated: false, trainedAt: '' }) }));
    await json('/predictions/history', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers, body: '[]' }));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('.nav-actions').getByRole('link', { name: 'Get Started', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/register`);
    await expect(page.locator('.site-header')).toHaveCount(0);
    await page.getByLabel('Full name').fill('Test Student');
    await page.getByLabel('Email address').fill('student@example.com');
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
    await page.getByLabel('Confirm password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Account created successfully.' })).toBeVisible();
    await page.getByRole('link', { name: 'Sign In', exact: true }).click();
    await expect(page.locator('.auth-success-message')).toContainText('Account created successfully');
    await page.getByLabel('Email address').fill('student@example.com');
    await page.getByLabel('Password', { exact: true }).fill('TestPassword123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/student/dashboard`);
    await expect(page.locator('.workspace-content h1')).toContainText('A little progress, every day');
    await page.locator('.sidebar-nav').getByRole('link', { name: 'Performance Prediction', exact: true }).click();
    await expect(page.locator('.workspace-content h1')).toContainText('Performance Prediction');
    await expect(page.getByRole('heading', { name: /model integration is being verified/i })).toBeVisible();
    expect(errors).toEqual([]);
    await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('.preview-banner')).not.toBeVisible();
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('button', { name: 'Logout', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/login`);
    await page.goto(`${baseUrl}/student/dashboard`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${baseUrl}/login`);
    await page.getByLabel('Email address').fill('admin@example.com');
    await page.getByLabel('Password', { exact: true }).fill('AdminPassword123!');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}/admin/dashboard`);
    await expect(page.locator('.workspace-content h1')).toContainText('Academic Analytics Overview');
    await expect(page.locator('.site-header')).toHaveCount(0);
    await page.goto(`${baseUrl}/student/dashboard`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${baseUrl}/admin/dashboard`);
  } finally { await browser.close(); }
});
