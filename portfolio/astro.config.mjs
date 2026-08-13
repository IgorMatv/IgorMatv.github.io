// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Central site URL used for canonical links, Open Graph tags, and the
  // generated sitemap. Defaults to the GitHub Pages user-site URL for the
  // planned `IgorMatv.github.io` repository (served at the domain root, no
  // base path needed). To use a custom domain instead:
  //   1. Update this value (and src/data/site.ts -> siteUrl) to the new domain.
  //   2. Add a public/CNAME file containing the domain name.
  //   3. Point the domain's DNS at GitHub Pages.
  // See README.md "Custom domain" for the full walkthrough.
  site: 'https://igormatv.github.io',

  // Static output with clean, trailing-slash-style URLs (e.g. /projects/beat-game/),
  // which is what GitHub Pages expects.
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },

  integrations: [sitemap()],
});
