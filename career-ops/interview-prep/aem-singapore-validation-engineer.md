# Interview Prep: AEM Singapore — Validation Engineer

**Interview Date:** Wednesday, 22 April 2026
**Time:** 11:00 AM
**Mode:** In-person
**Location:** AEM Singapore Pte Ltd, 52 Serangoon North Avenue 4, Singapore 555853
**Contact:** Avril Ang <avril.ang@aem.com.sg> (CC: Cheryl)
**LinkedIn JD:** https://www.linkedin.com/jobs/view/4384935460/
**Report:** [034](../reports/034-aem-singapore-2026-04-16.md)
**CV submitted:** BANILAD_Alain_Rex_SW_QA_Automation_Resume_2P.pdf

---

## ⚠️ CV Inconsistency — Prepare for This

The submitted CV shows AUMOVIO as **"Dec 2022 – Present"** — but employment ended **March 2026**.

**Prepare this answer if asked:**
> "The CV was prepared before my departure was finalised. I left AUMOVIO in March 2026 when the company went through a restructuring and my position was made redundant. I'm currently available immediately."

Do NOT volunteer this unprompted. If asked directly, be calm and factual.

---

## Company Snapshot

**AEM Holdings Ltd (SGX: AWX)** — Singapore-listed, leading semiconductor test equipment manufacturer. Vision: **"A Zero Failure World."**

| Fact | Detail |
|------|--------|
| Listed | SGX: AWX |
| HQ | 52 Serangoon North Ave 4, Singapore 555853 |
| Founded | 1992 |
| Industry | Semiconductor test equipment (SLT handlers, ATE, wafer/package test) |
| Key customers | Intel (tier-1 supplier), major semiconductor fabs |
| Products | System Level Test (SLT) solutions, burn-in handlers, ATE systems, test interface solutions, contract manufacturing |
| Culture | "Critical yet inspirational" — challenges existing systems while pushing innovation |
| Recent news | 2026 Intel EPIC Supplier Award — one of only 41 companies globally |
| Video reference | "Driving Singapore's Economy: AEM, Testing Innovations to Build A Zero Failure World" (YouTube — no transcript available, title confirms Zero Failure mission) |

**What is System Level Test (SLT)?**
Traditional chip testing (wafer probe, package test) catches electrical defects. SLT tests the chip running actual software in a near-production environment — validating real-world behaviour including OS boot, memory access, and peripheral interfaces. AEM's handlers automate this at high throughput.

**What does a Validation Engineer do at AEM?**
Validate the *software* that controls AEM's SLT hardware — write and execute test plans for firmware, control software, and interfaces between the handler and the device under test (DUT). It's software QA applied to industrial test equipment.

---

## JD Requirements vs Your CV (Verified Match)

| JD Requirement | Your Evidence | Strength |
|----------------|--------------|----------|
| Min 3 years software testing | 10+ years across 3 companies | ✅ Strong |
| End-to-end system testing | AUMOVIO TCU: 200+ scenarios, 95% coverage | ✅ Strong |
| Develop test cases + test plans | Lear: 500+ cases, 100% traceability, 15 releases | ✅ Strong |
| Document + report to stakeholders | AUMOVIO: customer-facing demos, multinational reporting | ✅ Strong |
| Configure test equipment | NCR: POS lab setup (terminals, gateways, kitchen controllers, network) | ✅ Moderate |
| Python programming | AUMOVIO + NCR: two full frameworks built from scratch | ✅ Strong |
| UNIX/Linux command line | NCR: multi-OS test environments (Windows/Linux) | ✅ Moderate |
| Self-motivated, task ownership | Led QA strategy solo at AUMOVIO; no manager on-site | ✅ Strong |
| Quick learner, independent | 3 domain transitions (automotive → POS → back to automotive) | ✅ Strong |
| Flexible shift hours | Not explicitly in CV — **prepare answer** (see below) | ⚠️ Address |
| Diploma min CS or equivalent | B.S. Electronics Engineering, GPA 4.2/5.0, CIT-U | ✅ Exceeds |

---

## Key Interview Themes

### 1. System-Level Testing Mindset
AEM wants someone who tests *systems*, not just functions. Lead with AUMOVIO (full TCU system) and Lear (BCM/PEPS — hardware + software co-validation).

> "At AUMOVIO I validated complete telematics control units — hardware, firmware, REST APIs, and cloud integration in one test cycle. At Lear I validated automotive body control modules using CANoe bench setups. Both required understanding the hardware interface before writing a single test — which is exactly the mindset I'd bring to SLT software validation."

---

### 2. Test Plan Ownership
JD says "develop test cases aligned with requirements and establish test plans." They want an owner, not an executor. Lead with Lear's traceability story.

> "I build test suites from requirements up. At Lear every test case was traceable to a requirement — 500+ cases, zero audit gaps, across 15 releases. That discipline is how you maintain quality at speed without relying on heroics during release."

---

### 3. Python + UNIX
JD lists these as "preferred" — treat them as required.

> "Python is my primary scripting language — I've built two production automation frameworks from scratch using Python, one at AUMOVIO for telematics TCU testing and one at NCR for POS regression. I'm comfortable on both Windows and Linux from my NCR work where we maintained multi-OS lab environments."

---

### 4. Equipment Configuration
JD explicitly requires: *"Configure test equipment per testing specifications."* Your NCR story is the best fit — POS lab builds from scratch.

> "At NCR I built and configured complete test lab environments from scratch — POS terminals, kitchen display controllers, payment gateways, and network configurations — all integrated and validated before each major deployment for Chick-fil-A, YumUK, and In-N-Out. Configuring test equipment to spec and validating the setup before any software testing begins is standard practice for me."

---

### 5. Shift Work Flexibility
JD states *"work flexible shift hours as operational needs require."* This is not on your CV — prepare a direct, positive answer.

> "I'm completely open to flexible shift arrangements. At AUMOVIO I ran overnight Jenkins regression cycles that I monitored remotely and addressed failures first thing each morning — so I'm already used to non-standard testing schedules. Whatever the operational rhythm is at AEM, I can adapt."

---

### 6. New Domain = Fast Learner
You don't have semiconductor domain knowledge. Don't hide it — frame it as a pattern.

> "I've onboarded into three distinct domains — embedded automotive electronics, enterprise POS systems, and automotive telematics — and delivered measurable results in each within my first few months. Semiconductor validation is a new domain, but the fundamentals transfer directly: requirements analysis, test design, hardware interface understanding, and defect lifecycle management."

---

### 7. Why AEM / Why this role
Be specific — generic answers fail here.

> "AEM's Zero Failure World mission resonates with how I approach testing — every defect you catch before production is a failure you've prevented in the real world. AEM is Intel's tier-1 SLT supplier and the 2026 EPIC Award confirms the engineering standard you're operating at. I want to be in a company where validation is core to the product, not an afterthought. After validating safety-critical automotive systems, AEM's semiconductor test environment is the natural next step."

---

## Questions to Ask (priority order)

1. "What does the current validation workflow look like — from software release to test sign-off?"
2. "Is the Python tooling mostly custom-built at AEM, or do you use off-the-shelf frameworks? Is there existing automation I'd be inheriting?"
3. "What does the typical shift schedule look like for the validation team?"
4. "What would success look like at 3 months and at 1 year in this role?"
5. "How does validation interact with software development — embedded in sprints or as a separate sign-off gate?"
6. "What's the career path from Validation Engineer to Senior level — what does that transition typically require?"

---

## STAR Stories — Quick Reference

| Likely question | Story |
|----------------|-------|
| "Walk me through complex end-to-end system testing" | AUMOVIO: TCU — 200+ scenarios, 95% coverage, CI/CD overnight runs |
| "How do you build a test plan from requirements?" | Lear: BCM/PEPS — 500+ cases, 100% traceability, zero audit gaps across 15 releases |
| "Tell me about configuring test equipment" | NCR: POS lab — terminal + gateway + kitchen controller + network from scratch |
| "Describe a critical defect you found before production" | AUMOVIO: 15 critical API defects caught pre-production via REST API test suite |
| "How do you manage multiple priorities?" | AUMOVIO: 3 new products onboarded simultaneously with zero regressions |
| "Experience with cross-functional or multinational teams" | AUMOVIO: SG, Japan, China, Germany, India — async discipline, customer demos |
| "Why did you leave your last role?" | Company restructuring — redundancy (AUMOVIO, March 2026) |
| "Why does your CV still say Present?" | See ⚠️ CV Inconsistency section above |

---

## Logistics

- **Address:** 52 Serangoon North Avenue 4, Singapore 555853
- **Nearest MRT:** Serangoon North (TEL) ~10 min walk, or Yio Chu Kang (NSL) ~15 min bus
- **Arrive:** 10:45 AM (15 min buffer)
- **Bring:** Printed CV (2P version), IC/NRIC for building sign-in, pen

---

## Salary Negotiation

Expected remuneration on application form: **SGD 6,500–7,500/month**. Hold to this range.

If asked about salary expectation:
> "I submitted SGD 6,500–7,500 on the application form. That's based on my 10+ years of system-level test automation experience. I understand this role is titled Associate, but I'm bringing senior-level execution capacity and I'd expect the compensation to reflect that."

**Walk-away floor:** SGD 6,500/month — confirm EP/S Pass sponsorship is included before accepting any offer.

If they push below your floor:
> "I appreciate the offer, but SGD 6,500 is the minimum I can consider given my experience level and the work permit sponsorship required. Is there flexibility to get closer to that floor?"
