// Browser checks for /demos/ (docs/launcher-hub-spec.md §8 acceptance list).
// Runs against `astro dev`; the launcher API and beatgame.app are faked with
// Playwright routes, so nothing leaves the machine.
//
//   npm run test:e2e
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

const PORT = 4331;
const BASE = `http://localhost:${PORT}`;
const API = 'https://iy9imezsie.execute-api.us-east-1.amazonaws.com';
const APP = 'https://beatgame.app';

let browser: Browser;

before(async () => {
  execSync(`npx astro dev --background --port ${PORT}`, { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/demos/`)).ok) break;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  execSync('npx astro dev stop', { stdio: 'ignore' });
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fake launcher API: one project whose state machine runs on wall-clock time. */
class FakeLauncher {
  calls: { method: string; path: string }[] = [];
  private startedAt: number | null = null;
  private readonly bootMs: number;
  private readonly initial: 'stopped' | 'ready';

  constructor(initial: 'stopped' | 'ready', bootMs = 6000) {
    this.initial = initial;
    this.bootMs = bootMs;
    if (initial === 'ready') this.startedAt = Date.now() - 600_000;
  }

  count(path: string) {
    return this.calls.filter((c) => c.path.endsWith(path)).length;
  }

  private project() {
    let state = this.initial === 'ready' ? 'ready' : 'stopped';
    if (this.startedAt !== null) {
      const elapsed = Date.now() - this.startedAt;
      state = elapsed < this.bootMs / 2 ? 'starting' : elapsed < this.bootMs ? 'booting' : 'ready';
    }
    return {
      id: 'beatgame',
      name: 'BeatGame',
      appUrl: APP,
      state,
      startedAt: this.startedAt === null ? null : new Date(this.startedAt).toISOString(),
      expectedBootSeconds: this.bootMs / 1000,
      idleStopMinutes: 30,
    };
  }

  async install(context: BrowserContext) {
    await context.route(`${API}/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      this.calls.push({ method: request.method(), path });
      const reply = (status: number, body: unknown) =>
        route.fulfill({
          status,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify(body),
        });
      if (path === '/projects') return reply(200, { projects: [this.project()] });
      if (path === '/projects/beatgame/status') return reply(200, this.project());
      if (path === '/projects/beatgame/start' && request.method() === 'POST') {
        if (this.startedAt === null) this.startedAt = Date.now();
        return reply(202, { ...this.project(), startedAt: null });
      }
      return reply(404, { error: 'unknown_project' });
    });
  }
}

async function open(
  fake: FakeLauncher | null,
  path: string,
): Promise<{ page: Page; context: BrowserContext }> {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await context.route('https://static.cloudflareinsights.com/**', (r) => r.abort());
  await context.route(`${APP}/**`, (r) => r.fulfill({ contentType: 'text/html', body: '<h1>BeatGame</h1>' }));
  if (fake) await fake.install(context);
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`);
  return { page, context };
}

const strip = (page: Page) => page.locator('[data-demo-control]').first();
const modal = (page: Page) => page.locator('[data-wake-modal]');

test('ready: card says Running, Open goes to appUrl, no polling after load', async () => {
  const fake = new FakeLauncher('ready');
  const { page, context } = await open(fake, '/demos/?mock=real');
  await strip(page).getByText('Running').waitFor();
  assert.equal(
    await strip(page)
      .getByRole('link', { name: /Open Beat Game/ })
      .getAttribute('href'),
    APP,
  );
  await sleep(6000);
  assert.deepEqual(
    fake.calls.map((c) => c.path),
    ['/projects'],
  );
  await context.close();
});

test('stopped: Start → progress → Running → Open', async () => {
  const fake = new FakeLauncher('stopped');
  const { page, context } = await open(fake, '/demos/?mock=real');
  await strip(page).getByText('Asleep').waitFor();
  await strip(page).getByRole('button', { name: 'Start demo' }).click();
  await strip(page).getByRole('progressbar').waitFor();
  await strip(page).getByText('Running').waitFor({ timeout: 20_000 });
  await strip(page)
    .getByRole('link', { name: /Open Beat Game/ })
    .waitFor();
  assert.equal(fake.count('/start'), 1);
  const polls = fake.count('/status');
  await sleep(5000);
  assert.equal(fake.count('/status'), polls, 'polling stops on ready');
  await context.close();
});

test('wake with next: lands back on the room', async () => {
  const fake = new FakeLauncher('stopped');
  const { page, context } = await open(fake, '/?wake=beatgame&next=%2F%3Froom%3DXXXXXX&mock=real');
  await modal(page).getByText('Beat Game is starting').waitFor();
  await page.waitForURL(`${APP}/?room=XXXXXX`, { timeout: 25_000 });
  await context.close();
});

for (const evil of ['%2F%2Fevil.com', 'https%3A%2F%2Fevil.com']) {
  test(`wake with next=${decodeURIComponent(evil)} goes to appUrl + /`, async () => {
    const fake = new FakeLauncher('ready');
    const { page, context } = await open(fake, `/?wake=beatgame&next=${evil}&mock=real`);
    await page.waitForURL(`${APP}/`, { timeout: 15_000 });
    await context.close();
  });
}

test('wake=unknown: normal page, no start request', async () => {
  const fake = new FakeLauncher('stopped');
  const { page, context } = await open(fake, '/?wake=unknown&mock=real');
  await strip(page).getByText('Asleep').waitFor();
  await sleep(2000);
  assert.equal(fake.count('/start'), 0);
  assert.equal(await modal(page).isVisible(), false);
  await context.close();
});

test('reload after wake does not start again (URL cleaned)', async () => {
  const fake = new FakeLauncher('stopped', 60_000);
  const { page, context } = await open(fake, '/?wake=beatgame&mock=real');
  await modal(page).getByText('Beat Game is starting').waitFor();
  assert.equal(new URL(page.url()).search, '?mock=real');
  await page.reload();
  await strip(page).waitFor();
  await sleep(2000);
  assert.equal(fake.count('/start'), 1);
  assert.equal(await modal(page).isVisible(), false);
  await context.close();
});

test('hidden tab makes no requests', async () => {
  const fake = new FakeLauncher('stopped', 60_000);
  const { page, context } = await open(fake, '/demos/?mock=real');
  await strip(page).getByRole('button', { name: 'Start demo' }).click();
  await strip(page).getByRole('progressbar').waitFor();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await sleep(500);
  const before = fake.calls.length;
  await sleep(9000);
  assert.equal(fake.calls.length, before);
  await context.close();
});

test('no ready before the timeout: error and Try again', async () => {
  const { page, context } = await open(null, '/demos/?mock=timeout&mockTimeout=6');
  await strip(page).getByRole('button', { name: 'Start demo' }).click();
  await strip(page).getByText("Couldn't start").waitFor({ timeout: 15_000 });
  await strip(page).getByRole('button', { name: 'Try again' }).waitFor();
  await context.close();
});

test('mobile: no horizontal scroll, wake modal fits', async () => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await context.route('https://static.cloudflareinsights.com/**', (r) => r.abort());
  const page = await context.newPage();
  await page.goto(`${BASE}/?wake=beatgame&mock=stopped`);
  await modal(page).getByText('Beat Game is starting').waitFor();
  const { scrollWidth, innerWidth, dialogRight } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    dialogRight: document.querySelector('[data-wake-modal]')!.getBoundingClientRect().right,
  }));
  assert.ok(scrollWidth <= innerWidth, `scrollWidth ${scrollWidth} > ${innerWidth}`);
  assert.ok(dialogRight <= innerWidth, `dialog overflows: ${dialogRight}`);
  await context.close();
});
