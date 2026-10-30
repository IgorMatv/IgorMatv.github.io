/**
 * Content for the /demos/ page. Card copy is reused from projects.ts — no new
 * product claims. Which cards get launch controls is decided at runtime by
 * the launcher API (GET /projects), matched by `id`; nothing here enables
 * launching on its own.
 */
import { beatGame } from './projects';

export interface DemoEntry {
  /** Matches the launcher API project id. */
  id: string;
  name: string;
  description: string;
  /** One line, "A · B · C". */
  stack: string;
  detailsHref?: string;
  githubUrl?: string;
  /** Fallback link, used only when the launcher API is unreachable. */
  appUrl?: string;
}

export const demos: DemoEntry[] = [
  {
    id: 'beatgame',
    name: beatGame.name,
    description: beatGame.homepage.description,
    stack: beatGame.homepage.stack,
    detailsHref: `/projects/${beatGame.slug}/`,
    githubUrl: beatGame.githubUrl,
    appUrl: beatGame.liveUrl,
  },
];

export const demosIntro = {
  kicker: 'Live Demos',
  title: 'Run my projects',
  lede: 'Each demo runs on its own server that scales to zero when nobody is using it. Starting one takes about a minute.',
};

export interface HowItWorksStep {
  title: string;
  text: string;
}

export const howItWorks: HowItWorksStep[] = [
  { title: 'Asleep', text: 'The EC2 instance is stopped and costs nothing.' },
  { title: 'Start', text: 'This page calls an AWS Lambda through API Gateway.' },
  { title: 'Boot ~1 min', text: 'The instance starts and the app passes a health check.' },
  { title: 'Auto-sleep', text: 'It stops itself after 30 minutes with no players.' },
];
