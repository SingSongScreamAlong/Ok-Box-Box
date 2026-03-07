const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '.env.test.local');
if (fs.existsSync(envPath)) {
  const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of envLines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
const { chromium } = require('playwright');

(async () => {
  const base = 'https://app.okboxbox.com';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const results = [];

  async function audit(label, route) {
    const consoleErrors = [];
    const pageErrors = [];
    const onConsole = (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    };
    const onPageError = (err) => pageErrors.push(String(err));
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    let status = null;
    let gotoError = null;
    try {
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      status = response ? response.status() : null;
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
    } catch (err) {
      gotoError = err.message;
    }

    const title = await page.title().catch(() => null);
    const heading = await page.locator('h1').first().textContent().catch(() => null);
    const mainText = await page.locator('main').innerText().catch(async () => await page.locator('body').innerText().catch(() => ''));
    const links = await page.locator('a').evaluateAll((els) =>
      els.slice(0, 25).map((a) => ({
        text: (a.textContent || '').trim(),
        href: a.getAttribute('href'),
      }))
    ).catch(() => []);

    results.push({
      label,
      route,
      requestedUrl: base + route,
      finalUrl: page.url(),
      status,
      gotoError,
      title,
      heading: heading ? heading.trim() : null,
      textSnippet: (mainText || '').replace(/\s+/g, ' ').trim().slice(0, 1000),
      links,
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors: pageErrors.slice(0, 10),
    });

    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }

  const publicRoutes = [
    ['root', '/'],
    ['login', '/login'],
    ['signup', '/signup'],
    ['forgot-password', '/forgot-password'],
    ['pricing', '/pricing'],
    ['download', '/download'],
    ['launch', '/launch'],
  ];

  for (const [label, route] of publicRoutes) {
    await audit(label, route);
  }

  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('Missing E2E_TEST_EMAIL or E2E_TEST_PASSWORD');
  }

  await page.goto(base + '/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const authedRoutes = [
    ['driver-home', '/driver/home'],
    ['driver-cockpit', '/driver/cockpit'],
    ['driver-history', '/driver/history'],
    ['driver-profile', '/driver/profile'],
    ['driver-progress', '/driver/progress'],
    ['driver-idp', '/driver/idp'],
    ['driver-engineer', '/driver/crew/engineer'],
    ['driver-spotter', '/driver/crew/spotter'],
    ['driver-analyst', '/driver/crew/analyst'],
    ['driver-blackbox', '/driver/blackbox'],
    ['settings', '/settings'],
    ['teams', '/teams'],
    ['create-team', '/create-team'],
    ['leagues', '/leagues'],
    ['create-league', '/create-league'],
    ['subscription', '/subscription'],
    ['track-intel', '/track-intel'],
    ['admin-ops', '/admin/ops'],
  ];

  for (const [label, route] of authedRoutes) {
    await audit(label, route);
  }

  await page.goto(base + '/teams', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const teamHref = await page.locator('a[href^="/team/"]').first().getAttribute('href').catch(() => null);
  if (teamHref) {
    await audit('team-entity', teamHref);
    await audit('team-pitwall', `${teamHref.replace(/\/$/, '')}/pitwall`);
  }

  await page.goto(base + '/leagues', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  const leagueHref = await page.locator('a[href^="/league/"]').evaluateAll((els) => {
    const hrefs = els.map((a) => a.getAttribute('href')).filter(Boolean);
    return hrefs.find((href) => href && !href.includes('/timing')) || null;
  }).catch(() => null);
  if (leagueHref) {
    await audit('league-entity', leagueHref);
    await audit('league-incidents', `${leagueHref.replace(/\/$/, '')}/incidents`);
  }

  fs.writeFileSync(path.resolve(__dirname, 'prod-page-audit-clean.json'), JSON.stringify(results, null, 2));
  console.log(`Wrote ${results.length} audit entries to prod-page-audit-clean.json`);
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
