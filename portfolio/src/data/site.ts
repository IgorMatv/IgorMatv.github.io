import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Central, typed site configuration.
 *
 * Values marked "TEMPORARY" are placeholders the design does not have a
 * real destination for yet. Rather than link to a generic/broken URL,
 * the corresponding UI (see Footer.astro / index.astro) hides the action
 * entirely until a real value is provided here.
 */

// Resolve whether the CV has actually been added to public/assets. Do not
// invent a PDF — only link to it once the real file exists on disk.
//
// Resolved from process.cwd() rather than import.meta.url: after `astro
// build` this module is compiled into dist/, so a URL relative to its own
// location no longer points at the project's src/public tree.
const resumeAbsolutePath = resolve(process.cwd(), 'public/assets/Igor_Matviichuk_CV.pdf');
const resumeFileExists = existsSync(resumeAbsolutePath);

export interface SiteConfig {
  name: string;
  role: string;
  location: string;
  remoteNote: string;
  available: boolean;
  availabilityLabel: string;
  /** Canonical deployed site URL, used for canonical links, OG tags and the sitemap.
   * Defaults to the GitHub Pages user-site URL. Replace with a custom domain
   * later — see README.md "Custom domain" section. */
  siteUrl: string;
  githubUrl: string;
  linkedinUrl: string | null;
  /** Populated only once public/assets/Igor_Matviichuk_CV.pdf exists on disk. */
  resumeUrl: string | null;
}

export const site: SiteConfig = {
  name: 'Igor Matviichuk',
  role: 'Backend Engineer',
  location: 'Malta',
  remoteNote: 'Remote',
  available: true,
  availabilityLabel: 'Open to opportunities',
  siteUrl: 'https://igormatv.github.io',
  githubUrl: 'https://github.com/IgorMatv',
  linkedinUrl: 'https://www.linkedin.com/in/igor-matviichuk-543b613/',
  resumeUrl: resumeFileExists ? '/assets/Igor_Matviichuk_CV.pdf' : null,
};

export const currentYear = 2026;
