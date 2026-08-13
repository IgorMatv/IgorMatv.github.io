# Igor Matviichuk — Portfolio

A static developer portfolio built with [Astro](https://astro.build), TypeScript, and hand-written CSS. No
React, no CSS framework, no client-side JavaScript beyond the theme toggle and mobile navigation.

Content and visual design are a faithful reproduction of the approved Claude Design reference in
`../portfolio-design/`. See `portfolio-design/*.dc.html` for the original source of truth for copy and layout.

## Structure

```text
portfolio/
├── public/                  static files served as-is (favicon, robots.txt, manifest, assets/)
├── src/
│   ├── components/          small, single-purpose Astro components
│   ├── layouts/              BaseLayout (head/header/footer) + two project-page layouts
│   ├── data/                 typed content — the single source of truth for text
│   ├── pages/                one file per route (Astro file-based routing)
│   └── styles/                tokens.css (design tokens) + global.css (everything else)
├── astro.config.mjs
└── .github/workflows/deploy.yml
```

### Deviations from the suggested structure (and why)

- **`src/data/home.ts` added.** The suggested structure listed `site.ts`, `projects.ts`, and
  `earlier-work.ts`. The homepage also has About/Experience/Skills content that doesn't belong in any of
  those three (it isn't reused on other pages), so it got its own typed file rather than being bolted onto
  `projects.ts` or inlined in `index.astro`.
- **`ProjectDetailLayout` split into `IndependentProjectLayout` + `ClientProjectsLayout`, matching the
  brief's own naming.** Beat Game (single product, live/GitHub actions, features/technical-approach/status
  sections) and the client engagements (LSEG/Tesco/Tungsten — a list of sub-projects, each with
  Overview/My Contribution/Technical Details) share header/footer chrome but little else. Forcing both
  through one generic layout would have meant a pile of conditional props; two small layouts plus shared
  components (`SectionRow`, `ClientSubProjectBlock`, `TechnologyTags`, ...) turned out simpler to read and
  extend.
- **`SectionRow.astro`** is the one addition not explicitly requested: it reproduces the repeated
  "uppercase label column + content column" pattern used by almost every section across every page
  (About, Overview, My Contribution, Technical Details, ...). Extracting it removed a lot of duplication.

## Content source of truth

All page copy lives in `src/data/*.ts`, copied verbatim from the corresponding `.dc.html` design file — no
text was invented, expanded, or rewritten. If the approved copy changes, edit the data file; the templates
never need to change for a content-only update.

## Local development

```bash
npm install
npm run dev
```

Starts the dev server (default `http://localhost:4321`).

## Production build & preview

```bash
npm run build      # outputs static files to dist/
npm run preview    # serves the built dist/ output locally
```

## Checks

```bash
npm run format         # apply Prettier formatting (incl. .astro files)
npm run format:check   # verify formatting without writing
npm run check           # astro check — type-checks .astro files and content
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `format:check`, `check`, and `build` on
every push to `main` before deploying — a red check there means one of those three failed.

## Adding the CV

Real link logic, not a placeholder: `src/data/site.ts` checks at build time whether
`public/assets/Igor_Matviichuk_CV.pdf` exists. If it doesn't, both "Download CV" buttons (hero and footer)
are omitted — not linked to a 404. Once you add the real file at that exact path and rebuild, both buttons
appear automatically, pointing at `/assets/Igor_Matviichuk_CV.pdf`.

```bash
cp /path/to/your-cv.pdf portfolio/public/assets/Igor_Matviichuk_CV.pdf
npm run build
```

## Setting the LinkedIn URL

`site.linkedinUrl` in `src/data/site.ts` is `null` — the real profile URL wasn't available at
implementation time, and the design explicitly should not ship with a generic `https://linkedin.com` link.
The "Connect on LinkedIn" button in the footer only renders when this is set. To enable it:

```ts
// src/data/site.ts
linkedinUrl: 'https://www.linkedin.com/in/your-actual-handle/',
```

## Changing the site URL

`site.siteUrl` in `src/data/site.ts` and `site` in `astro.config.mjs` both default to
`https://igormatv.github.io` (used for canonical links, Open Graph tags, and the generated sitemap). Update
**both** if the deployed URL changes.

## Deploying to GitHub Pages

The included workflow assumes this `portfolio/` directory is deployed from within a repository named
`IgorMatv.github.io` (a GitHub _user site_, served at the domain root — no base path needed, and
`trailingSlash`/`build.format: 'directory'` in `astro.config.mjs` already produce Pages-friendly
`/route/index.html` output). `public/.nojekyll` is included so GitHub Pages doesn't run Jekyll over Astro's
`_astro/` asset folder.

1. Push this project to the `IgorMatv.github.io` repository. The workflow builds from a `portfolio/`
   subdirectory (`working-directory: portfolio` in `deploy.yml`) — if you instead move the contents of
   `portfolio/` to the repository root, update those `working-directory` lines (and
   `cache-dependency-path`) to drop the `portfolio/` prefix.
2. In the repository settings, under **Pages**, set the source to **GitHub Actions**.
3. Push to `main` (or run the workflow manually via **Actions → Deploy to GitHub Pages → Run workflow**).
4. The site publishes to `https://igormatv.github.io/`.

Nothing here pushes or publishes automatically on your behalf — the workflow only runs once you push it to
GitHub yourself.

### Custom domain later

1. Add a `public/CNAME` file containing just the domain, e.g. `example.com`.
2. Point the domain's DNS at GitHub Pages (an `A`/`ALIAS` record to GitHub's IPs, or a `CNAME` record for a
   subdomain — see [GitHub's custom domain docs](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. Update `site.siteUrl` (`src/data/site.ts`) and `site` (`astro.config.mjs`) to the new domain.
4. Enable "Enforce HTTPS" in the repository's Pages settings once DNS has propagated.

## What's intentionally not here

Per the project brief: no analytics, cookies, tracking, contact forms, backend services, CMS, UI/animation
libraries, or invented content. The two Claude Design placeholder templates
(`Project Template - Independent Product.dc.html`, `Project Template - Client Engagement.dc.html`) were used
only as structural references and do not have corresponding public routes.
