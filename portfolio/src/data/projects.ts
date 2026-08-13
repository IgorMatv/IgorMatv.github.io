/**
 * Project content, extracted verbatim from the approved design files:
 * - Beat Game - Project Details.dc.html
 * - LSEG / Tesco / Tungsten Network - Project Details.dc.html
 * - Резюме-візитка.dc.html (homepage summaries)
 *
 * Nothing here is invented, expanded, or summarised beyond what the source
 * files already state.
 */

// ---------------------------------------------------------------------------
// Beat Game (independent product)
// ---------------------------------------------------------------------------

export interface TechGroup {
  title: string;
  items: string[];
}

export const beatGame = {
  slug: 'beat-game',
  name: 'Beat Game',
  statusLabel: 'Independent Product · Live',
  liveUrl: 'https://beatgame.app',
  githubUrl: 'https://github.com/IgorMatv/beat-game-public',
  lede: 'A real-time multiplayer music-guessing game where players create rooms, join sessions, listen to music clips, submit answers, and compete across synchronised rounds.',
  techTags: [
    'Java 21',
    'Spring Boot',
    'WebSocket / STOMP',
    'React / TypeScript',
    'PostgreSQL',
    'Redis',
    'Docker',
  ],
  overview: [
    'Beat Game is an independent web product built around real-time multiplayer music-guessing sessions. Players can create or join a room, take part in synchronised rounds, submit answers, receive scores, and continue playing across a shared game session.',
    'The product also supports solo play and reconnect or rejoin flows, allowing interrupted players to return to an active session.',
  ],
  myRole: [
    'I am the project owner and developer. I designed the application architecture and implemented the backend services, real-time game flows, persistence, external music integrations, frontend application, containerised deployment, monitoring, and automated tests.',
    'I took the product from the initial idea through implementation and public deployment, and continue to develop it as an active independent project.',
  ],
  features: [
    'Create and join multiplayer rooms',
    'Synchronised music-guessing rounds',
    'Answer submission and scoring',
    'Reconnect and rejoin active sessions',
    'Solo-play mode',
    'Music previews through external providers',
  ],
  technicalPoints: [
    'Spring Boot manages rooms, rounds, answers, scoring, and the main game workflows, while WebSocket communication through STOMP and SockJS delivers real-time updates between players and the server.',
    'Redis stores active game state required during live sessions, while PostgreSQL stores durable application entities and persistent data.',
    'Deezer and iTunes preview APIs provide the music clips used during guessing rounds.',
    'The application is deployed as a Docker Compose stack containing the backend, frontend, PostgreSQL, Redis, Prometheus, and Grafana, with Nginx serving the frontend and routing traffic.',
    'Automated testing uses JUnit 5, Spring Boot Test, and Testcontainers for backend and integration-level verification.',
  ],
  techGroups: [
    { title: 'Backend & Real-Time', items: ['Java 21', 'Spring Boot 3.2', 'WebSocket', 'STOMP', 'SockJS'] },
    { title: 'Frontend', items: ['React 18', 'TypeScript'] },
    { title: 'Data & Integrations', items: ['PostgreSQL 16', 'Redis 7', 'Deezer API', 'iTunes API'] },
    {
      title: 'Infrastructure, Monitoring & Testing',
      items: [
        'Docker Compose',
        'Nginx',
        'Prometheus',
        'Grafana',
        'JUnit 5',
        'Spring Boot Test',
        'Testcontainers',
      ],
    },
  ] satisfies TechGroup[],
  currentStatus:
    'Beat Game is live at beatgame.app and remains under active development. The current version supports multiplayer and solo gameplay, real-time session updates, scoring, reconnect and rejoin flows, persistent data, external music previews, monitoring, and automated backend testing.',
  homepage: {
    kicker: 'Featured Independent Product',
    description:
      'A live multiplayer music-guessing game where players create rooms, join sessions, and compete across synchronised rounds.',
    contribution:
      'Designed, built, and deployed end to end — including real-time game state, scoring, reconnect and rejoin flows, data persistence, external music integrations, and monitoring.',
    stack: 'Java 21 · Spring Boot · WebSocket / STOMP · React / TypeScript · PostgreSQL · Redis · Docker',
  },
};

// ---------------------------------------------------------------------------
// Client engagements (LSEG, Tesco, Tungsten Network)
// ---------------------------------------------------------------------------

export interface ClientSubProject {
  title: string;
  status: string;
  overview: string[];
  contribution: string[];
  technical: string[];
  tags: string[];
}

export interface ClientEngagement {
  slug: string;
  name: string;
  kicker: string;
  engagementNote: string;
  intro: string[];
  projects: ClientSubProject[];
  /** Short summary shown in the homepage "Professional Projects" section. */
  homepage: {
    summary: string;
    projects: { title: string; description: string }[];
    tags: string[];
  };
}

export const lseg: ClientEngagement = {
  slug: 'lseg',
  name: 'LSEG',
  kicker: 'Investment Analytics · HR Technology',
  engagementNote: 'Client engagement delivered through Luxoft',
  intro: [
    'Two separate internal proof-of-concept projects exploring backend solutions for investment analytics and HR operations. The work focused on validating application architecture, data models, calculations, APIs, and business workflows before potential production development.',
  ],
  projects: [
    {
      title: 'CxO Investment Analytics',
      status: 'Proof of Concept',
      overview: [
        'An internal analytics prototype designed to give senior stakeholders a top-down view of investments across organisations, departments, teams, and projects.',
        'The platform modelled investment amounts, planned-versus-actual costs, risk indicators, and calculated metrics, with drill-down views for exploring the underlying organisational and investment data.',
      ],
      contribution: [
        'Designed and documented the backend architecture and implemented REST APIs, database modelling, CRUD and drill-down operations, and investment calculations.',
        'Worked on fact-and-dimension modelling for the analytical data layer and prototyped orchestration for multi-stage calculation workflows.',
      ],
      technical: [
        'The proof of concept used representative warehouse data and manually prepared Excel input rather than completed production data integrations.',
        'PostgreSQL was used for analytical and application data, with JPA and MyBatis supporting persistence and queries. Spring Batch and Spring Cloud Data Flow were used to prototype orchestration for calculation workflows.',
        'The work validated the backend structure and calculation approach. External ingestion, scheduled data loading, Keycloak or SSO integration, and production Kubernetes deployment were outside the completed PoC scope.',
      ],
      tags: [
        'Java',
        'Spring Boot',
        'PostgreSQL',
        'JPA',
        'MyBatis',
        'Liquibase',
        'Spring Batch',
        'Spring Cloud Data Flow',
        'Docker Compose',
        'Testcontainers',
        'Grafana',
      ],
    },
    {
      title: 'HR Bench & Candidate Platform',
      status: 'Proof of Concept',
      overview: [
        'An internal HR prototype for recruiters and HR teams working with bench employees, candidates, projects, assignments, and interview coordination.',
        'The platform supported employee and candidate profiles, skills, seniority, location, availability, projects and statements of work, filtering, vacancy comparison, and interview scheduling.',
      ],
      contribution: [
        'Implemented backend REST APIs, the PostgreSQL data model, persistence, and workflow-related functionality for employee, candidate, assignment, project, skills, and interview operations.',
        'Worked on the backend structures required for profile search, filtering, and coordination workflows.',
      ],
      technical: [
        'The backend was implemented as a Spring Boot REST application with PostgreSQL, Spring Data, and Liquibase.',
        'The initial mobile-oriented interface used mock data. Candidate CVs were expected to come from another internal system; CV parsing and production integrations were not implemented as part of the proof of concept.',
        'The project remained a prototype and was not presented as a production HR platform.',
      ],
      tags: ['Java', 'Spring Boot', 'REST APIs', 'PostgreSQL', 'Spring Data', 'Liquibase', 'Docker'],
    },
  ],
  homepage: {
    summary: 'Internal proof-of-concept solutions for investment analytics and HR operations.',
    projects: [
      {
        title: 'CxO Investment Analytics',
        description:
          'Developed backend services for a proof-of-concept platform providing a top-down view of investments, projects, planned-versus-actual performance, and risk indicators.',
      },
      {
        title: 'HR Bench & Candidate Platform',
        description:
          'Built backend APIs and data workflows for bench management, candidate search, vacancy matching, profile analytics, and interview coordination.',
      },
    ],
    tags: ['Java', 'Spring Boot', 'PostgreSQL', 'Liquibase', 'Docker'],
  },
};

export const tesco: ClientEngagement = {
  slug: 'tesco',
  name: 'Tesco',
  kicker: 'Enterprise HR Systems · Reporting & Workflow Automation',
  engagementNote: 'Client engagement delivered through Luxoft',
  intro: [
    'Two separate production HR applications supporting statutory reporting and employee performance-management workflows. The work covered backend data processing, validation, report generation, BPMN workflow implementation, administrative APIs, monitoring, testing, and production support.',
  ],
  projects: [
    {
      title: 'Gender Pay Gap Reporting',
      status: 'Production',
      overview: [
        "An enterprise backend application supporting Tesco's annual statutory gender pay gap reporting process for approximately 250,000 employee records.",
        'The system imported large Excel datasets, validated employee data, performed statutory calculations, generated detailed validation feedback, and produced the final Excel report.',
      ],
      contribution: [
        'Implemented independent backend modules for Excel import, metadata-driven parsing, validation, raw-data persistence, calculations, validation reporting, and final report generation.',
        'Worked under architectural guidance, participated in code reviews, supported QA and production investigation, and contributed to automated tests and code-quality improvements.',
      ],
      technical: [
        'Employee data was uploaded through the application interface or API and parsed with Apache POI using metadata describing expected columns, types, and validation rules.',
        'The processing flow included immediate validation, raw-data persistence, calculations, detailed validation reports, and final Excel report generation. Invalid data prevented calculations and final report creation until corrected.',
        'The application retained one current dataset. Uploading corrected data replaced the previous dataset rather than merging records, making repeated report preparation predictable.',
        'Spring Batch supported the processing workflow, while PostgreSQL, MyBatis, and Liquibase handled persistence and database changes. JUnit and Testcontainers supported automated testing, with Prometheus metrics and Splunk logs used for monitoring and investigation.',
      ],
      tags: [
        'Java',
        'Spring Boot',
        'Spring Batch',
        'Apache POI',
        'PostgreSQL',
        'MyBatis',
        'Liquibase',
        'JUnit',
        'Testcontainers',
        'Docker Compose',
        'Jenkins',
        'Prometheus',
        'Splunk',
      ],
    },
    {
      title: 'Performance Management Application',
      status: 'Production',
      overview: [
        'An enterprise HR application supporting employee performance-review workflows for administrators, managers, and employees.',
        'The system used reusable process templates for multiple review types, including end-of-year reviews, and created concrete review processes for organisational and employee scopes.',
      ],
      contribution: [
        'Created and modified Camunda BPMN workflows and reusable process templates, and implemented backend APIs for process and template management.',
        'Worked on configuration, creation, launch, and administrative operations through a domain-oriented application API built over the Camunda Engine API.',
        'Also contributed to code reviews, QA support, monitoring, and investigation of workflow-related issues.',
      ],
      technical: [
        'A reusable template defined the structure of a review type. Administrators could configure a concrete review process from the template and launch it for an organisational scope.',
        'Some review cycles created multiple employee-level process instances from a main process. Workflows included user actions and email notifications, making process administration and recovery dependent on the current workflow state.',
        'The application exposed domain-oriented APIs instead of requiring clients to interact directly with the Camunda Engine API. PostgreSQL, MyBatis, and Liquibase supported application persistence and schema management, while Prometheus and Splunk supported monitoring and investigation.',
      ],
      tags: [
        'Java',
        'Spring Boot',
        'Camunda 7',
        'BPMN',
        'Camunda Engine API',
        'PostgreSQL',
        'MyBatis',
        'Liquibase',
        'JUnit',
        'Docker Compose',
        'Jenkins',
        'Prometheus',
        'Splunk',
      ],
    },
  ],
  homepage: {
    summary: 'Enterprise HR systems supporting statutory reporting and employee performance management.',
    projects: [
      {
        title: 'Gender Pay Gap Reporting',
        description:
          'Developed backend data-processing workflows for importing employee data from Excel, validation, statutory calculations, and annual report generation.',
      },
      {
        title: 'Performance Management Application',
        description:
          'Implemented Camunda BPMN workflows, administration APIs, and notifications supporting enterprise employee performance reviews.',
      },
    ],
    tags: ['Java', 'Spring Boot', 'Camunda 7', 'Spring Batch', 'PostgreSQL', 'Apache POI'],
  },
};

export const tungsten: ClientEngagement = {
  slug: 'tungsten',
  name: 'Tungsten Network',
  kicker: 'Global E-Invoicing · Data Processing & Operations',
  engagementNote: 'Client engagement delivered through Luxoft',
  intro: [
    'Production systems supporting the input-processing stage of a global electronic invoicing platform. The work covered configurable invoice-processing flows, validation and routing, error handling, operational visibility, configuration management, and controlled reprocessing.',
    'The applications operated within a wider AWS and Kubernetes environment supported by a dedicated DevOps team. My work focused on application code, processing flows, backend services, Dockerfiles, testing, and operational functionality.',
  ],
  projects: [
    {
      title: 'Electronic Invoice Processing',
      status: 'Production',
      overview: [
        'An Apache NiFi-based processing system receiving electronic invoice files through SFTP and FTP and preparing them for downstream core invoice processing.',
        'The flows parsed, validated, transformed, enriched, and routed incoming files while separating successful processing from errors and supporting retries and failed-file handling.',
      ],
      contribution: [
        'Maintained and extended configurable Apache NiFi processing flows using FlowFiles, RouteOnAttribute, and ExecuteScript components.',
        'Implemented and modified Scala scripts for parsing, validation, transformation, attribute handling, and routing. Worked on success and failure paths, processing errors, retries, and controlled reprocessing.',
      ],
      technical: [
        'Incoming files passed through configurable NiFi flows that attached and evaluated processing attributes, applied validation and transformation logic, and routed each file according to its result.',
        'Processed and failed files were separated into appropriate operational paths. Error handling supported investigation, retry, and reprocessing without treating failed input as successfully completed.',
        'Kafka supported asynchronous processing and reprocessing between components. The surrounding platform used microservices and operated within a wider AWS and Kubernetes environment supported by a dedicated DevOps team.',
      ],
      tags: [
        'Apache NiFi',
        'FlowFiles',
        'RouteOnAttribute',
        'ExecuteScript',
        'Scala',
        'Kafka',
        'Java',
        'Spring Integration',
        'PostgreSQL',
        'Docker',
        'Gradle',
        'Jenkins',
        'JUnit',
      ],
    },
    {
      title: 'Invoice Processing Administration',
      status: 'Production',
      overview: [
        'An internal administration application giving operational teams visibility and control over electronic invoice processing.',
        'The application provided processing dashboards, statuses and results, reporting, configuration management, and controlled reprocessing of invoices that required operational attention.',
      ],
      contribution: [
        'Developed a new Spring Boot backend from scratch for a separate React frontend.',
        'Implemented REST APIs for operational dashboards, processing statuses and results, reporting, configuration management, and controlled invoice reprocessing.',
        'Integrated the backend with Kafka and PostgreSQL and contributed corporate SSO support, audit logging, unit tests, and controller tests.',
      ],
      technical: [
        'The Spring Boot backend exposed application-level REST APIs used by the React interface to retrieve processing information and perform controlled administrative operations.',
        'Processing state and operational information were stored in PostgreSQL using MyBatis. Kafka was used to initiate asynchronous invoice reprocessing after an authorised administrative action.',
        'Corporate SSO restricted access to internal users, while audit logging recorded administrative operations. The application was containerised with Docker and deployed within infrastructure supported by a dedicated DevOps team.',
      ],
      tags: [
        'Java',
        'Spring Boot',
        'REST APIs',
        'React',
        'Kafka',
        'PostgreSQL',
        'MyBatis',
        'Corporate SSO',
        'Audit Logging',
        'Docker',
        'Gradle',
        'Jenkins',
        'JUnit',
      ],
    },
  ],
  homepage: {
    summary:
      'Event-driven systems supporting electronic invoice processing, operational monitoring, and controlled reprocessing.',
    projects: [
      {
        title: 'Electronic Invoice Processing',
        description:
          'Maintained and enhanced Apache NiFi workflows for receiving, validating, routing, and reprocessing invoice files across distributed processing flows.',
      },
      {
        title: 'Invoice Processing Administration',
        description:
          'Built an internal Spring Boot and React application for monitoring invoice processing, managing configuration, and triggering Kafka-based reprocessing.',
      },
    ],
    tags: ['Apache NiFi', 'Kafka', 'Spring Boot', 'React', 'PostgreSQL'],
  },
};

export const clientEngagements: ClientEngagement[] = [lseg, tesco, tungsten];
