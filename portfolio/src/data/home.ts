/**
 * Content unique to the homepage (About / Experience / Skills sections).
 * Text is carried over verbatim from portfolio-design/Резюме-візитка.dc.html.
 */

export const about: string[] = [
  "I'm a backend engineer focused on Java and Spring Boot, with experience building enterprise applications across finance, retail, e-invoicing, HR, and workflow automation.",
  'I enjoy turning complex requirements into practical, maintainable systems — from APIs and data-processing workflows to real-time applications. Alongside enterprise projects, I build independent products and explore practical ways to integrate AI into real software.',
];

export interface ExperienceEntry {
  role: string;
  company?: string;
  period: string;
  bullets: string[];
  tags: string[];
}

export const experience: ExperienceEntry[] = [
  {
    role: 'Independent Development',
    period: '2025 — Present',
    bullets: [
      'Building and releasing independent software, with a focus on backend architecture, real-time communication, data processing, and deployment',
      'Designed and developed Beat Game end to end while continuing hands-on development in backend engineering, distributed systems, and data engineering.',
    ],
    tags: ['Java', 'Spring Boot', 'WebSocket', 'React', 'PostgreSQL', 'Redis', 'Docker'],
  },
  {
    role: 'Backend Engineer',
    company: 'Luxoft',
    period: '2018 — 2024',
    bullets: [
      'Developed enterprise backend applications for international clients across finance, retail, e-invoicing, HR, analytics, and workflow automation',
      'Worked with backend services, event-driven data processing, business workflows, reporting systems, and internal administration tools. Selected client projects are presented below',
    ],
    tags: ['Java', 'Spring Boot', 'Kafka', 'Apache NiFi', 'Camunda 7', 'PostgreSQL', 'Docker'],
  },
];

export interface SkillGroup {
  title: string;
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  { title: 'Backend Engineering', items: ['Java', 'Spring Boot', 'REST APIs', 'Spring Data', 'Hibernate'] },
  {
    title: 'Messaging & Integration',
    items: ['Kafka', 'Apache NiFi', 'WebSocket / STOMP', 'Event-Driven Architecture'],
  },
  { title: 'Workflow & Batch Processing', items: ['Camunda 7', 'BPMN', 'Spring Batch'] },
  {
    title: 'Data & Reporting',
    items: ['PostgreSQL', 'Redis', 'SQL', 'Liquibase', 'Apache POI', 'JasperReports'],
  },
  {
    title: 'Infrastructure & Observability',
    items: ['Docker', 'Kubernetes', 'Nginx', 'Prometheus', 'Grafana', 'Splunk'],
  },
  { title: 'Testing', items: ['JUnit 5', 'Testcontainers', 'Integration Testing', 'API Testing'] },
];
