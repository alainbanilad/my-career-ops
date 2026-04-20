# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

## Stories

<!-- Stories will be added here as you evaluate offers -->
<!-- Format:
### [Theme] Story Title
**Source:** Report #NNN — Company — Role
**S (Situation):** ...
**T (Task):** ...
**A (Action):** ...
**R (Result):** ...
**Reflection:** What I learned / what I'd do differently
**Best for questions about:** [list of question types this story answers]
-->

### [System Testing] AUMOVIO Telematics End-to-End Validation
**Source:** Report #034 — AEM Singapore — Validation Engineer
**S (Situation):** AUMOVIO needed full regression coverage for Suzuki and Nissan telematics control units — complex systems spanning GPS, CAN bus, REST APIs, and cloud back-end.
**T (Task):** Own the entire automated test suite and ensure zero escapes to OEM customers before each release.
**A (Action):** Built Python-Selenium automation framework from scratch with 200+ scenarios, integrated Jenkins for overnight CI/CD regression runs, achieved 95% coverage across multiple products.
**R (Result):** 40% reduction in manual testing effort, 3 days saved per sprint on release validation, zero production escapes to Suzuki or Nissan.
**Reflection:** Should have documented the framework architecture earlier — tribal knowledge risk was real when team grew. Invest in architecture docs at framework v1, not v2.
**Best for questions about:** end-to-end testing, test automation, CI/CD, framework ownership, QA strategy

---

### [Test Planning] Lear BCM Requirement Traceability
**Source:** Report #034 — AEM Singapore — Validation Engineer
**S (Situation):** Lear's BCM (Body Control Module) project required ASPICE-compliant test documentation with 100% requirement traceability across 500+ requirements for Jaguar Land Rover.
**T (Task):** Design a CAPL-based test suite that could be audited for automotive safety certification with zero gaps.
**A (Action):** Decomposed SRS into test cases, wrote CAPL scripts for each, maintained traceability matrix linking every test to its requirement, ran suite across 15 releases.
**R (Result):** Zero audit gaps across all 15 releases, passed automotive safety certification every time, 35% reduction in test execution time via automation.
**Reflection:** The traceability matrix took 2x longer to build than the test scripts. In future projects, invest in tooling (TestRail, Jama) earlier — manual matrices don't scale.
**Best for questions about:** test planning, requirement-based testing, audit readiness, embedded systems, automotive quality

---

### [Defect Prevention] AUMOVIO API Critical Defects
**Source:** Report #034 — AEM Singapore — Validation Engineer
**S (Situation):** AUMOVIO's telematics APIs connected the vehicle TCU to cloud services — bugs here would affect live vehicle data for OEM customers in production.
**T (Task):** Design an API test suite that catches integration defects before any release reaches the OEM.
**A (Action):** Built 1,000+ API test cases in Python covering boundary values, negative scenarios, and edge cases that the dev team's unit tests missed.
**R (Result):** Caught 15 critical integration defects pre-production — none escaped to Suzuki or Nissan environments.
**Reflection:** Negative testing is systematically underinvested by dev teams under sprint pressure. QA's highest leverage is the scenarios developers didn't think to write.
**Best for questions about:** defect prevention, API testing, integration testing, quality mindset

---

### [New Domain Onboarding] AUMOVIO 3-Product Parallel Onboarding
**Source:** Report #034 — AEM Singapore — Validation Engineer
**S (Situation):** AUMOVIO needed to onboard 3 new telematics products into the automation framework while the existing suite for Suzuki and Nissan remained in active use.
**T (Task):** Extend the framework without breaking existing coverage, while delivering automation for 3 new products concurrently.
**A (Action):** Refactored framework to use a modular, product-agnostic architecture — shared core with product-specific configuration layers. Enabled parallel test execution across products.
**R (Result):** All 3 products onboarded with zero regressions in the existing suite; new products reached 80%+ automation coverage within 2 sprints each.
**Reflection:** Abstract the product-specific layer from day one — not day three. The refactor cost less than I feared, and the payoff at product #2 was immediate.
**Best for questions about:** scalability, framework design, multitasking, onboarding, technical leadership
