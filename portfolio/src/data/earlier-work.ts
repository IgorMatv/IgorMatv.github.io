/**
 * Earlier-work content, extracted verbatim from
 * portfolio-design/Selected Earlier Work - Project Details.dc.html and the
 * "Selected Earlier Work" section of Резюме-візитка.dc.html.
 */

export interface EarlierWorkSummary {
  title: string;
  description: string;
}

/** Short entries shown in the homepage "Selected Earlier Work" section. */
export const earlierWorkSummary: EarlierWorkSummary[] = [
  {
    title: 'Energy Billing Platform',
    description: 'Production billing and reporting system used by energy companies across Ukraine.',
  },
  {
    title: 'Debt Collection Operations Platform',
    description:
      'Operational CRM connecting call-centre teams, field agents, and management throughout the debt-collection workflow.',
  },
  {
    title: 'University Electronic Library Platform',
    description:
      'Customised electronic-library implementations with portal-based access, content management, and full-text search.',
  },
  {
    title: 'Public Procurement Portal Search',
    description:
      'Production search modernisation integrating Sphinx and later Lucene into an existing enterprise portal.',
  },
  {
    title: 'Online Java Learning Platform',
    description:
      'Interactive Java education product with programming exercises, automated validation, community features, and student development projects.',
  },
];

export interface EarlierWorkEntry {
  domain: string;
  title: string;
  overview: string[];
  contribution: string;
  tags: string[];
}

/** Full entries shown on the /earlier-work/ detail page. */
export const earlierWork: EarlierWorkEntry[] = [
  {
    domain: 'Energy & Utilities',
    title: 'Energy Billing Platform',
    overview: [
      'A production billing system for power plants and energy companies. It supported energy-consumption accounting, tariff application, billing calculations, payments, outstanding balances, invoice generation, and operational reporting.',
      'The system was deployed across multiple energy companies in Ukraine.',
    ],
    contribution:
      'Worked primarily on backend business logic and reporting. Implemented parts of the calculation and billing functionality and developed invoices and operational reports with JasperReports.',
    tags: ['Java', 'EJB', 'JasperReports', 'SQL'],
  },
  {
    domain: 'Financial Operations',
    title: 'Debt Collection Operations Platform',
    overview: [
      'A production operations platform used by a debt-collection company working with debt portfolios acquired from banks and other organisations.',
      'The system coordinated workflows across call-centre operators, field collection teams, and management. It included debtor profiles, contract and balance information, contact and payment history, promises to pay, operator tasks, field assignments, case statuses, reporting, and management analytics.',
    ],
    contribution:
      'Developed backend and ZK-based interface functionality, including debtor profiles, search, reports, application maintenance, and bug fixes.',
    tags: ['Java', 'Spring', 'Hibernate', 'ZK', 'Oracle', 'JBoss Portal'],
  },
  {
    domain: 'Education Technology',
    title: 'University Electronic Library Platform',
    overview: [
      'An existing electronic-library product customised and extended for the requirements of multiple universities.',
      'The completed implementations allowed students, faculty, and library staff to manage, catalogue, search, view, and download educational resources.',
    ],
    contribution:
      'Implemented customer-specific changes across metadata structures, catalogue organisation, content import, user roles, access permissions, search, and interface functionality. Also modified the Sphinx-based full-text search implementation for the requirements of individual deployments.',
    tags: ['Java', 'Spring', 'Hibernate', 'WebSphere Portal', 'Portlets', 'Struts', 'Sphinx'],
  },
  {
    domain: 'Enterprise Search',
    title: 'Public Procurement Portal Search Modernisation',
    overview: [
      'A production search-modernisation project for an existing public procurement portal.',
      'The primary portal was developed and maintained by another organisation, while the subcontractor team was responsible for adding and improving its dedicated full-text search layer.',
    ],
    contribution:
      'Worked on the Java-side integration of the search layer with the existing enterprise portal. Integrated the initial Sphinx-based implementation and later adapted the application during the migration to Lucene.',
    tags: ['Java', 'Spring', 'Hibernate', 'WebSphere Portal', 'Portlets', 'Sphinx', 'Lucene'],
  },
  {
    domain: 'Developer Education',
    title: 'Online Java Learning Platform',
    overview: [
      'An interactive product for learning Java through structured lessons, programming exercises, automated validation, progression, gamification, and community features.',
    ],
    contribution:
      'Contributed to both the platform and its learning content. Worked on functionality for delivering and validating programming exercises, created learning tasks, contributed to forum features, supported users, coordinated student development projects, collaborated with the community, and helped deliver product improvements.',
    tags: ['Java', 'Spring', 'Hibernate', 'GWT'],
  },
];

export const additionalModulesNote =
  'Additional assignments included configurable reporting, telecom customer-data synchronisation, operational file-generation tools, customer activation and document-storage modules, and an interface for working with records in a police information system.';

export const earlierWorkIntro = {
  kicker: 'Earlier Work',
  title: 'Selected systems from earlier in my career',
  lede: 'A selection of production systems and completed products spanning energy, financial operations, education, enterprise search, and online learning.',
  note: 'This page intentionally focuses on the systems, my contribution, and the technologies involved rather than presenting a complete employment timeline.',
};
