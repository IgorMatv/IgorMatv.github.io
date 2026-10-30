# /demos/ Launcher Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/demos/` page on the portfolio that shows each demo project's live state, starts sleeping EC2 demos on demand, and handles the `?wake=` entry from a sleeping `beatgame.app`.

**Architecture:** Static Astro page whose content comes from `src/data/demos.ts`. All behaviour lives in framework-free TypeScript modules under `src/lib/launcher/`. The core is a DOM-free `LaunchController` with injected API, clock and timers, so `node --test` can cover it. A thin `page.ts` wires the controllers to the DOM. In dev, the client talks to an in-browser mock API.

**Tech Stack:** Astro 7, TypeScript (strict, `allowImportingTsExtensions`), plain CSS in `src/styles/global.css` using `tokens.css`. Node's built-in `node:test` with native type stripping for unit tests. Playwright (already a devDependency, Chromium already installed locally) for the e2e checklist.

**Spec:** `docs/superpowers/specs/2026-10-30-demos-launcher-design.md`. It implements `docs/launcher-hub-spec.md` (the "ТЗ"). Read both. ТЗ §2–§4 is the API contract and the behaviour rules, and this plan does not restate them except for values pinned below.

## Global Constraints

- **Language:** all user-visible copy is English. UI strings are exactly as written in design §4.3/§4.4 and in this plan.
- **Styling:** only tokens from `src/styles/tokens.css`. New CSS goes into `src/styles/global.css` under a `/* ---------- Demos ---------- */` section, following the existing convention (components have no `<style>` blocks). Both themes must work, and mobile works down to 360 px.
- **Client code:** plain TS in Astro `<script>` blocks, following the `MobileNavigation.astro` pattern. No UI framework and no new runtime dependencies.
- **API base:** `import.meta.env.PUBLIC_LAUNCHER_API ?? 'https://iy9imezsie.execute-api.us-east-1.amazonaws.com'`.
- **Timings (ТЗ):** poll every 4000 ms; after 429 wait 8000 ms; network/5xx: up to 3 consecutive retries 4000 ms apart; overall timeout 180000 ms from Start; on a repeat wake that is already `ready`, wait 15000 ms; at most 3 wake attempts; counter TTL 600000 ms. Progress = `min(95, elapsed / expectedBootSeconds * 100)`, and 100 only on `ready`.
- **Requests:** only `/demos/` talks to the API. No polling on page load, ever. Polling runs only after Start or during a wake. It stops on `ready`, `unavailable`, failure, and while `document.hidden`.
- **Production bundle:** the mock must not ship. Every mock import sits behind `import.meta.env.DEV || import.meta.env.PUBLIC_LAUNCHER_MOCK === '1'`.
- **CI must stay green:** `npm run format:check`, `npm run check`, `npm run build`, and the new `npm test`. Run all of them from `portfolio/` before every commit.
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Rapid double-click on Start** (or Start while a poll loop already runs) → exactly one `POST /start` and one poll loop. Pinned in Task 3.
2. **Tab hidden mid-wake, shown again minutes later** → zero requests while hidden. On show: one immediate status check, then either redirect or the timeout failure. Pinned in Task 4.
3. **`next` edge inputs** (`/\evil.com`, `//evil.com`, `https://evil.com`, `evil`, empty, `/a?b=//c`) → only safe absolute paths pass, everything else becomes `/`. Pinned in Task 7.
4. **`sessionStorage` throws** (Safari private mode, blocked storage) → no crash. If the project was already `ready` on arrival, show the manual link instead of redirecting, because without a counter a redirect could loop forever. Pinned in Task 7.
5. **Malformed API data** (unknown `state`, missing `expectedBootSeconds`, non-JSON body) → the card renders as `unavailable` and nothing throws. Pinned in Task 2.

---

## Stage 1 — Page skeleton (no API)

### Task 1: `/demos/` page with static cards, "How it works" and nav link

**Files:**
- Create: `portfolio/src/data/demos.ts`, `portfolio/src/components/demos/HowItWorks.astro`, `portfolio/src/components/demos/DemoCard.astro`, `portfolio/src/pages/demos.astro`
- Modify: `portfolio/src/components/Header.astro:6-12` (navLinks), `portfolio/src/styles/global.css` (new Demos section before "Reduced motion")

**Interfaces:**
- Produces:
  ```ts
  // src/data/demos.ts
  export interface DemoEntry {
    id: string;            // matches API project id, e.g. 'beatgame'
    name: string;
    description: string;
    stack: string;         // one line, "A · B · C"
    detailsHref?: string;  // '/projects/beat-game/'
    githubUrl?: string;
    appUrl?: string;       // fallback link only when the API is down (design §4.6)
  }
  export const demos: DemoEntry[];
  export const demosIntro: { kicker: string; title: string; lede: string };
  export const howItWorks: { title: string; text: string }[]; // exactly 4
  ```
  `DemoCard.astro` props: `{ demo: DemoEntry }`. It renders `<article class="demo-card" data-demo-id={id}>` and an empty `<div class="demo-control" data-demo-control hidden aria-live="polite"></div>` that Task 6 fills.

- [ ] **Step 1: Create `demos.ts`.** The Beat Game entry is built from `beatGame` in `projects.ts`:
  - `description: beatGame.homepage.description`
  - `stack: beatGame.homepage.stack`
  - `detailsHref: '/projects/beat-game/'`
  - `githubUrl: beatGame.githubUrl`
  - `appUrl: beatGame.liveUrl`

  Copy:
  - `demosIntro`: kicker `Live Demos`, title `Run my projects`, lede `Each demo runs on its own server that scales to zero when nobody is using it. Starting one takes about a minute.`
  - `howItWorks`:
    1. `Asleep` / `The EC2 instance is stopped and costs nothing.`
    2. `Start` / `This page calls an AWS Lambda through API Gateway.`
    3. `Boot ~1 min` / `The instance starts and the app passes a health check.`
    4. `Auto-sleep` / `It stops itself after 30 minutes with no players.`

- [ ] **Step 2: Build the components.**
  - `HowItWorks.astro`: an `<ol class="how-it-works">` with 4 items. Each item shows a step number, a title and a text, in a 4-column grid that becomes 1 column at ≤ 860 px. It matches the approved mockup `.superpowers/brainstorm/466-1793368786/content/demos-layout.html`, option C.
  - `DemoCard.astro` reuses the `featured-card` look. It shows the h3 name, the description, the stack, the control slot, and links `Project details →` / `GitHub ↗` with the same visually-hidden "(opens in new tab)" pattern as `index.astro`.
  - `demos.astro` uses `BaseLayout` with title `Live Demos — Igor Matviichuk` and description = the lede, inside `container container--page`.

- [ ] **Step 3: Add the nav link.** Add `{ href: '/demos/', label: 'Demos' }` between Projects and Contact in `Header.astro`. The mobile menu reuses the same list, so no second change is needed.

- [ ] **Step 4: Verify.**
  - Run `npm run format && npm run check && npm run build` in `portfolio/`. Expected: no errors, and `dist/demos/index.html` exists.
  - Start `astro dev --background` and open `/demos/` at 1280 px and at 375 px, in both themes. The page should match mockup C, minus the control strip.

- [ ] **Step 5: Commit** with message `Add /demos/ page skeleton and nav link`.

---

## Stage 2 — API client, state machine, control strip

### Task 2: Test runner, types and HTTP client

**Files:**
- Create: `portfolio/src/lib/launcher/types.ts`, `portfolio/src/lib/launcher/config.ts`, `portfolio/src/lib/launcher/api.ts`, `portfolio/src/lib/launcher/api.test.ts`
- Modify: `portfolio/package.json` (add the `test` script), `.github/workflows/*.yml` (add a `Test` step after "Astro check")

**Interfaces:**
- Produces:
  ```ts
  // types.ts
  export type ProjectState = 'stopped' | 'starting' | 'booting' | 'ready' | 'stopping' | 'unavailable';
  export interface Project { id: string; name: string; appUrl: string; state: ProjectState;
    startedAt: string | null; expectedBootSeconds: number; idleStopMinutes: number; }
  export type ApiErrorKind = 'rate-limited' | 'not-found' | 'server' | 'network';
  export class ApiError extends Error { constructor(public kind: ApiErrorKind, message?: string) }
  export interface LauncherApi {
    listProjects(): Promise<Project[]>;
    getStatus(id: string): Promise<Project>;
    start(id: string): Promise<Project>;
  }
  // config.ts — every timing value from Global Constraints as named exports:
  // API_BASE, POLL_MS, RATE_LIMIT_MS, RETRY_MS, MAX_RETRIES, TIMEOUT_MS,
  // WAKE_REPEAT_DELAY_MS, WAKE_MAX_ATTEMPTS, WAKE_COUNTER_TTL_MS
  // api.ts
  export function normalizeProject(raw: unknown): Project | null;
  export function createHttpApi(baseUrl: string, fetchFn?: typeof fetch): LauncherApi;
  ```

- [ ] **Step 1: Add the script** `"test": "node --test \"src/**/*.test.ts\""` to `package.json`. Node ≥ 22.18 strips types natively, and CI uses the latest 22.x. Add a CI step `npm test` (working-directory `portfolio`) after "Astro check". Test files import with explicit `.ts` extensions.

- [ ] **Step 2: Write failing tests** in `api.test.ts` against a fake `fetchFn`:
  ```ts
  test('listProjects returns normalized projects', ...)  // 200 {projects:[beatgameStopped]} → deepEqual
  test('unknown state becomes unavailable', ...)         // state:'exploded' → state === 'unavailable'
  test('missing numbers fall back to 60 / 30', ...)      // no expectedBootSeconds/idleStopMinutes
  test('entries without id or appUrl are dropped', ...)
  test('429 → ApiError rate-limited', ...)
  test('404 → ApiError not-found', ...)
  test('503 → ApiError server', ...)
  test('fetch rejects → ApiError network', ...)
  test('non-JSON 200 body → ApiError server', ...)
  test('start sends POST with no body to /projects/{id}/start', ...)
  test('baseUrl trailing slash is tolerated', ...)
  ```

- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement** `types.ts`, `config.ts` and `api.ts`. `normalizeProject` handles unknown states, the 60/30 defaults, and drops entries with no `id`/`appUrl` (it returns `null`). Also strip any trailing `/` from `appUrl`.

- [ ] **Step 5: Run** `npm test`. Expected: PASS. Then run format, check and build.

- [ ] **Step 6: Commit** with message `Add launcher API client and test runner`.

### Task 3: Progress and LaunchController: start, poll, ready, timeout

**Files:**
- Create: `portfolio/src/lib/launcher/progress.ts`, `portfolio/src/lib/launcher/controller.ts`, `portfolio/src/lib/launcher/controller.test.ts`, `portfolio/src/lib/launcher/fake-deps.test-helper.ts` (fake clock + timers; not matched by `*.test.ts`)

**Interfaces:**
- Consumes: `LauncherApi`, `Project`, `ApiError`, `config.ts` (Task 2).
- Produces:
  ```ts
  // progress.ts
  export function progressPercent(o: { state: ProjectState; startedAt: string | null;
    clickedAt: number | null; expectedBootSeconds: number; now: number }): number | null;
  // null when state is not starting/booting/stopping-after-start

  // controller.ts
  export type Phase = 'stopped' | 'starting' | 'booting' | 'ready' | 'stopping'
    | 'failed' | 'unavailable' | 'unknown';
  export interface LaunchView { phase: Phase; name: string; appUrl: string;
    progress: number | null; elapsedSeconds: number | null;
    expectedBootSeconds: number; idleStopMinutes: number; }
  export interface ControllerDeps { api: LauncherApi; now(): number;
    setTimer(fn: () => void, ms: number): unknown; clearTimer(id: unknown): void;
    timeoutMs?: number; } // defaults to TIMEOUT_MS
  export class LaunchController {
    constructor(project: Project, deps: ControllerDeps, onChange: (v: LaunchView) => void);
    readonly view: LaunchView;
    start(): void;                      // Start / Try again; no-op while a run is in flight
    setHidden(hidden: boolean): void;   // Task 4
    dispose(): void;                    // clears every timer
  }
  export function unknownView(name: string, appUrl: string): LaunchView; // API-down card
  ```

- [ ] **Step 1: Write failing tests.** Each test drives the fake timers by hand.
  ```ts
  test('progressPercent: from startedAt, capped at 95', ...) // 30s of 60 → 50; 120s → 95
  test('progressPercent: uses clickedAt while startedAt is null', ...)
  test('progressPercent: ready → 100', ...)
  test('initial view mirrors project state and makes no request', ...)  // api calls === 0
  test('start: POST once, then status every 4000 ms', ...)
  test('double start() while running → one POST, one poll loop', ...)  // Review Focus 1
  test('ready stops polling and progress becomes 100', ...)
  test('unavailable from status stops polling', ...)
  test('no ready after 180000 ms → phase failed, polling stopped', ...)
  test('start() from failed retries (new POST, timeout restarts)', ...)
  test('dispose clears pending timers', ...)
  ```

- [ ] **Step 2: Run** `npm test`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement** `progress.ts` and `controller.ts` (start/poll/ready/timeout only). For elapsed time, use the parsed `startedAt` from the latest status. Before the first status arrives, use the click time (ТЗ §2.4: the POST response usually carries `startedAt: null`).

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** with message `Add launch controller core loop`.

### Task 4: Controller error handling, `stopping` and visibility

**Files:**
- Modify: `portfolio/src/lib/launcher/controller.ts`, `portfolio/src/lib/launcher/controller.test.ts`

**Interfaces:**
- Consumes/Produces: same as Task 3. `setHidden` is now implemented.

- [ ] **Step 1: Write failing tests.**
  ```ts
  test('429 skips the tick; next status after 8000 ms', ...)
  test('network/5xx: 3 retries at 4000 ms, 4th failure → failed', ...)
  test('a success resets the retry counter', ...)
  test('404 on status → unavailable', ...)
  test('start returns stopping → keep polling; first stopped → POST once more', ...)
  test('second stopped after the re-POST does not POST a third time', ...)
  test('setHidden(true) → no requests while hidden', ...)
  test('setHidden(false) → immediate status, then 4000 ms cadence', ...) // Review Focus 2
  test('hidden past the timeout → on show: one status; not ready → failed', ...)
  test('POST fails with network error → counts as a retry, not a crash', ...)
  ```

- [ ] **Step 2: Run** `npm test`. Expected: the new tests FAIL.

- [ ] **Step 3: Implement** in `controller.ts`.

- [ ] **Step 4: Run** `npm test`. Expected: PASS.

- [ ] **Step 5: Commit** with message `Handle launcher errors, stopping and hidden tabs`.

### Task 5: Mock API for dev

**Files:**
- Create: `portfolio/src/lib/launcher/mock-api.ts`, `portfolio/src/lib/launcher/mock-api.test.ts`

**Interfaces:**
- Consumes: `LauncherApi`, `Project`, `ApiError`.
- Produces:
  ```ts
  export type MockScenario = 'stopped' | 'ready' | 'stopping' | 'ratelimit' | 'flaky'
    | 'down' | 'timeout' | 'unavailable' | 'unknown-state';
  export function createMockApi(o: { scenario: MockScenario; bootSeconds?: number;
    now?: () => number }): LauncherApi;
  export function scenarioFromSearch(search: string): MockScenario; // ?mock=…, default 'stopped'
  ```
  Each scenario simulates one situation:
  - `stopped`: after start, starting for the first half of `bootSeconds` (default 12), booting for the second half, then ready.
  - `ready`: ready from the start.
  - `stopping`: stopping for 4 s, then stopped.
  - `ratelimit`: every other status returns 429.
  - `flaky`: the first 2 status calls throw `server`.
  - `down`: every call throws `network`.
  - `timeout`: stays booting forever.
  - `unavailable`: the project is unavailable from the start.
  - `unknown-state`: the API returns a state the client doesn't know (`'exploded'`).

  The mock returns one project, `beatgame`, with `appUrl: 'https://beatgame.app'`.

- [ ] **Step 1: Write failing tests**, one per scenario, asserting the state sequence over a fake `now`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Pass `unknown-state` through `normalizeProject` so it behaves exactly like real data.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with message `Add dev mock for launcher API`.

### Task 6: Control strip on `/demos/`

**Files:**
- Create: `portfolio/src/lib/launcher/render.ts`, `portfolio/src/lib/launcher/page.ts`
- Modify: `portfolio/src/pages/demos.astro` (add `<script>` importing `page.ts`), `portfolio/src/styles/global.css` (status strip, dots, progress bar)

**Interfaces:**
- Consumes: `createHttpApi`, `createMockApi`, `scenarioFromSearch`, `LaunchController`, `unknownView`, `demos`.
- Produces:
  ```ts
  // render.ts
  export function renderControl(el: HTMLElement, view: LaunchView, onStart: () => void): void;
  // page.ts
  export function getApi(): LauncherApi;   // mock when DEV or PUBLIC_LAUNCHER_MOCK==='1' and ?mock!=='real'
  // in mock mode, ?mockTimeout=<seconds> is passed to controllers as timeoutMs
  export function initDemosPage(): Promise<Map<string, LaunchController>>; // Task 9 reuses it
  ```

- [ ] **Step 1: Write `render.ts`.** Copy per phase (`{n}` = `round(expectedBootSeconds/60)`, minimum 1):

  | Phase | Dot | Title | Subtitle | Action |
  |---|---|---|---|---|
  | stopped | grey | `Asleep` | `Starts in ~{n} min` | button `Start demo` (`btn btn--sm btn--deep`) |
  | starting | pulse | `Starting the server…` | `{s} s of ~{expected} s` + bar | disabled `Starting…` |
  | booting | pulse | `Starting the app…` | same + bar | disabled `Starting…` |
  | stopping | pulse | `Going to sleep…` | `It will start again automatically in a few seconds` + bar | disabled `Waiting…` |
  | ready | ring | `Running` | `Sleeps after {idleStopMinutes} min with no players` | link `Open {name} ↗` (`btn btn--sm btn--primary`, new tab, visually-hidden note) |
  | failed | rose | `Couldn't start` | `Please try again in a moment` | button `Try again` (`btn btn--sm btn--outline`) |
  | unavailable | rose | `Unavailable` | `This demo is temporarily offline` | none |
  | unknown | hollow | `Status unknown` | `It may still be running` | link `Try opening ↗` to `appUrl` |

  The progress bar is `role="progressbar"` with `aria-valuenow`. Re-render only the strip, never the whole card. Keep focus on the button across re-renders when it stays the same element.

- [ ] **Step 2: Write `page.ts`.**
  1. Call `listProjects()` once.
  2. For each `[data-demo-id]` card whose id is in the response, create a controller, reveal `[data-demo-control]` and render it.
  3. Wire `document.visibilitychange` to `setHidden(document.hidden)` on every controller.
  4. If `listProjects` throws, cards with `appUrl` render `unknownView`, and cards without it keep the control hidden.
  5. An API project with no static card gets a minimal card appended (h3 `name`, no links).

- [ ] **Step 3: Add the CSS** for `.demo-control`, the dot variants (`--color-text-faint`, `--color-accent` + `--color-accent-soft` ring, pulse, `--color-accent-2`, hollow), and `.progress-bar`. Respect the existing reduced-motion block (no pulse).

- [ ] **Step 4: Verify in dev.** Run `astro dev --background` and open `/demos/?mock=<scenario>` for each of the 9 scenarios. Each should match its row in the table and the approved mockup `demos-states.html` part 1. In devtools, confirm that `?mock=ready` makes no requests after load, and that a hidden tab stops ticks. Then run format, check, `npm test` and build.

- [ ] **Step 5: Verify the production bundle.** Run `npm run build`, then `grep -r "unknown-state" dist/_astro`. Expected: no matches.

- [ ] **Step 6: Commit** with message `Wire launcher control strip on /demos/`.

### Task 7: Point Beat Game links to `/demos/`

**Files:**
- Modify: `portfolio/src/data/projects.ts:23` (`statusLabel` → `'Independent Product · Live Demo'`), `portfolio/src/pages/index.astro:54-56`, `portfolio/src/layouts/IndependentProjectLayout.astro:46-52`

- [ ] **Step 1: Change the links.** On the home card, the link becomes `Try Live Demo →` with `href="/demos/"`, with no `target`/`rel`/visually-hidden note. In `IndependentProjectLayout`, add an optional prop `demoHref?: string`. When it is set, render `<a class="btn btn--sm btn--deep" href={demoHref}>Try Live Demo</a>` instead of the `liveUrl` button. Pass `demoHref="/demos/"` from `beat-game.astro`.
- [ ] **Step 2: Verify.** Run format, check and build. On `/` and `/projects/beat-game/`, the buttons should lead to `/demos/`.
- [ ] **Step 3: Commit** with message `Point Beat Game live links to /demos/`.

---

## Stage 3 — `?wake=` flow

### Task 8: Wake helpers: `next` validation, parsing, attempt counter

**Files:**
- Create: `portfolio/src/lib/launcher/wake.ts`, `portfolio/src/lib/launcher/wake.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function sanitizeNext(raw: string | null): string;
  export function parseWake(search: string): { id: string; next: string } | null; // next already sanitized
  export function buildTarget(appUrl: string, next: string): string;               // appUrl + next
  export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }
  export function createAttemptCounter(storage: StorageLike | null, now: () => number): {
    record(id: string): number;   // returns attempts incl. this one; resets if older than 600000 ms
    reset(id: string): void;
    readonly available: boolean;  // false when storage is null or throws
  };
  export type WakeDecision = { action: 'redirect'; delayMs: number } | { action: 'manual' };
  export function decideRedirect(o: { attempt: number; wasReadyOnArrival: boolean; storageAvailable: boolean }): WakeDecision;
  export function cleanWakeParams(url: string): string; // drops wake and next, keeps every other param
  ```
  `decideRedirect` rules:
  - `attempt > 3` → manual.
  - Otherwise, if `wasReadyOnArrival && !storageAvailable` → manual.
  - Otherwise, if `wasReadyOnArrival && attempt > 1` → redirect after 15000 ms.
  - Otherwise → redirect after 0 ms.

- [ ] **Step 1: Write failing tests.**
  ```ts
  test('sanitizeNext keeps safe paths', ...)  // '/', '/?room=WRY3H2', '/a?b=//c' unchanged
  test('sanitizeNext rejects unsafe values', ...) // null, '', 'evil', '//evil.com', 'https://evil.com', '/\\evil.com', '/a\\b' → '/'
  test('parseWake decodes next', ...)  // '?wake=beatgame&next=%2F%3Froom%3DWRY3H2' → {id:'beatgame', next:'/?room=WRY3H2'}
  test('parseWake without wake → null', ...)
  test('buildTarget joins without double slash', ...)  // ('https://beatgame.app','/x') → 'https://beatgame.app/x'
  test('counter increments per id and expires after 600000 ms', ...)
  test('counter with throwing storage → available false, no throw', ...) // Review Focus 4
  test('decideRedirect table', ...)  // first arrival 0 ms; repeat ready 15000; 4th → manual; ready+no storage → manual
  test('cleanWakeParams drops wake and next, keeps the rest', ...)
  ```
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** with message `Add wake URL validation and attempt counter`.

### Task 9: Home forward, wake modal and wake flow

**Files:**
- Create: `portfolio/src/components/demos/WakeModal.astro`, `portfolio/src/lib/launcher/wake-flow.ts`
- Modify: `portfolio/src/layouts/BaseLayout.astro` (add `<slot name="head" />` at the end of `<head>`), `portfolio/src/pages/index.astro` (inline forward script), `portfolio/src/pages/demos.astro` (render `<WakeModal />`, start the wake flow), `portfolio/src/styles/global.css` (modal)

**Interfaces:**
- Consumes: `initDemosPage`, `getApi`, `LaunchController`, everything from `wake.ts`, `demos`.
- Produces: `export function runWakeFlow(controllers: Map<string, LaunchController> | null, apiDown: boolean): void` in `wake-flow.ts`. `initDemosPage` is extended to return `{ controllers, apiDown }` (update its signature and the Task 6 call site).

- [ ] **Step 1: Add the home forward.** In `index.astro`, add `<script is:inline slot="head">`: if `URLSearchParams(location.search).has('wake')`, then `location.replace('/demos/' + location.search + location.hash)`. Verify with `npm run build`, then check that `dist/index.html` contains the script inside `<head>`.

- [ ] **Step 2: Build `WakeModal.astro`.** A `<dialog class="wake-modal" data-wake-modal>` containing:
  - kicker `Waking up`
  - h2 `{name} is starting`
  - text `The server sleeps when nobody is playing. This takes about a minute, then you'll be taken back automatically.`
  - progress bar and status line, reusing `renderControl` output styles
  - button `Stay on this page`

  Extra variants of the dialog body:
  - **Manual:** h2 `Ready — open {name}`, link `Open {name}` (same tab).
  - **Failed:** h2 `Couldn't start {name}`, button `Try again`.
  - **API down (design §4.4, option B):** h2 `Can't reach the launcher right now`, buttons `Try again` and `Try opening {name} ↗`.

  Open it with `showModal()`. `Esc` and `Stay` both close the dialog and cancel the auto-redirect. Match mockup `demos-states.html` part 2, option 1.

- [ ] **Step 3: Write `runWakeFlow`.**
  1. `parseWake(location.search)`. If null, return.
  2. Immediately `history.replaceState` with `cleanWakeParams`.
  3. If the API is down:
     - if `id` matches a `demos` entry with `appUrl`, open the API-down variant. Its `Try again` re-runs `initDemosPage` + `runWakeFlow` with the saved wake.
     - else return.
  4. If `id` is not among the controllers, return.
  5. Record `wasReadyOnArrival`, `record(id)` the attempt, open the modal, and call `controller.start()`. The modal mirrors the controller's view, so subscribe to it: add `subscribe(fn): () => void` to `LaunchController`, with a test in `controller.test.ts`.
  6. On `ready`: `decideRedirect`. On redirect: wait `delayMs`, then `location.replace(buildTarget(project.appUrl, next))`. On manual: show the manual variant. Clicking its link calls `reset(id)`.
  7. On `failed`/`unavailable`: show the failed variant.

- [ ] **Step 4: Verify in dev** with `astro dev --background`:
  - `/?wake=beatgame&next=%2F%3Froom%3DX&mock=stopped` → lands on `/demos/`, the URL is cleaned, the modal runs, and you end up on `https://beatgame.app/?room=X`.
  - `&next=//evil.com` → target `https://beatgame.app/`.
  - `?wake=unknown` → no modal and no POST (check the Network tab, or count mock calls through a `console.debug` in the mock).
  - `&mock=down` → API-down variant.
  - `&mock=timeout` → failed variant once the 3-minute timeout passes. For a quick check, temporarily pass a 10-second timeout via `?mockTimeout=10`, dev only.
  - Reloading after the wake → no new start.

  Then run format, check, `npm test` and build.

- [ ] **Step 5: Commit** with message `Add ?wake= flow with wake-up modal`.

---

## Stage 4 — Acceptance

### Task 10: e2e checklist on the mock, then production check

**Files:**
- Create: `portfolio/e2e/demos.e2e.ts` (run with `node --test e2e/`; not part of `npm test` or CI), and add the script `"test:e2e": "node --test \"e2e/*.e2e.ts\""` to `package.json`

- [ ] **Step 1: Write the Playwright tests** (`playwright` library + `node:test`). Start `astro dev --port 4329` in `before`, stop it in `after`. Cover ТЗ §8 against the mock:
  - `ready` card: Running, an Open link to `appUrl`, and no requests after load (count route hits)
  - `stopped` → Start → Running
  - wake with `next` → final URL `https://beatgame.app/?room=XXXXXX` (intercept that navigation with `page.route`)
  - `next=//evil.com` and `next=https://evil.com` → `https://beatgame.app/`
  - `?wake=unknown` → no start call
  - reload after wake → no second start
  - hidden tab → no requests (`page.evaluate` overriding `document.hidden` + dispatching `visibilitychange`)
  - timeout → failed variant (with `mockTimeout`)
  - viewport 375×812 → no horizontal scroll (`scrollWidth <= innerWidth`)
- [ ] **Step 2: Run** `npm run test:e2e`. Expected: all PASS.
- [ ] **Step 3: Commit** with message `Add e2e checks for /demos/`.
- [ ] **Step 4: Production check (manual, after deploy).** Push to `main`, wait for the Pages deploy, then:
  - with BeatGame running: `/demos/` shows Running.
  - ask the Beat-game session to stop the instance, then use Start → Running in about a minute.
  - with it stopped again: open `https://beatgame.app/?room=XXXXXX` → you should land back on the room.
  - check `/demos/` on a phone.

  This step needs the owner: pushing and stopping the instance are their actions.
