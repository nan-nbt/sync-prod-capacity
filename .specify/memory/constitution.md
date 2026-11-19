<!-- Sync Impact Report
Version change: 1.0.0 → 2.0.0
Bump rationale: MAJOR — replace the existing ETL-platform governance with principles
  for a small personal data-transfer application, materially redefining project scope,
  design and quality policy.
Modified principles: All prior principles replaced by Scope Discipline, Requirements
  Before Technology, Explicit Transfer Input, Readable Simplicity, and Reviewed Decisions
  and Verified Behavior.
Added sections: Core Principles; Governance; Rule ID Index.
Removed sections: Additional Constraints; Review Gates and their ETL-platform-specific
  rules, source-constitution traceability and deprecated-rule mappings.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check, technology-neutral proposal table, and
     owner-review gate now reflect scope, decisions, transfer input, simplicity, and verification.
  ✅ .specify/templates/spec-template.md — Story count is optional within scope; transfer input,
     same-database result, and quantity/time semantics are prompted without technology prescriptions.
  ✅ .specify/templates/tasks-template.md — tasks are scope-limited, gated on owner decisions, and
     verify requested quantity; legacy rule references were removed or rewritten.
  ✅ .specify/templates/checklist-template.md — opened; no constitution-mandated fields or rule IDs,
     no change required.
  ✅ .opencode/commands/*.md — command files reviewed; no references to old CONST rule IDs; no
     constitution-specific update needed.
  ✅ AGENTS.md, README.md, docs/index.md, docs/tech-stack.md, docs/database-schema.md,
     docs/rules/spring-boot.md — reviewed. Existing stack/backend specifics remain separate; the
     plan template no longer seeds ETL-specific examples. Projects must apply reference guidance only
     when relevant to the approved app and its selected technology.
Authoritative Source Writeback List: None. No implementation-specific detail was promoted into the
  constitution or extracted from it that requires writeback.
Follow-up TODOs: Ratification date is retained from the existing constitution (2026-11-16).
-->
# Personal Data Transfer Constitution

## Core Principles

### CONST-SCOPE-1 Scope Discipline

The application MUST be limited to transferring data from a source table to a target table in the
same database, including only behavior necessary to perform that transfer. A proposed capability
outside that boundary MUST be excluded unless the project owner explicitly approves a scope change.

Rationale: a narrow scope keeps a personal utility small, understandable, and maintainable.

### CONST-REQ-1 Requirements Before Technology

Specifications MUST describe user needs, business rules, and observable outcomes without prescribing
technology, libraries, or code structure. Plans MUST record technology choices separately from
requirements, identify proposals as decisions for review, and record the rationale for approved
choices. When reasonable options exist, the plan MAY propose options; it MUST NOT treat an unreviewed
proposal as an approved project decision.

Rationale: separating what the application must do from how it is built enables informed review.

### CONST-TRANSFER-1 Explicit Transfer Input

Every transfer execution MUST require an input value specifying how much data from the previous day
to transfer. The value MUST be validated before transfer begins, and the selected source data MUST
conform to that requested quantity and previous-day period. The plan and specification MUST make the
observable meaning of the requested quantity and previous-day period explicit wherever ambiguity
would change behavior.

Rationale: requiring and validating the transfer input makes each run intentional and testable.

### CONST-SIMPLE-1 Readable Simplicity

An implementation MUST use the simplest readable design that satisfies approved requirements.
Every additional abstraction or component MUST address a documented requirement that cannot be met
as clearly without it. Code and technical documentation MUST use clear names and express the transfer
flow directly.

Rationale: a small personal application benefits more from clarity and low maintenance than
speculative extensibility.

### CONST-REVIEW-1 Reviewed Decisions and Verified Behavior

Technology and design decisions MUST be presented for project-owner review before implementation.
Automated tests MUST verify the approved transfer behavior, including successful transfer, invalid
or missing input, boundary quantities, and relevant data-selection or persistence failures. A change
MUST NOT be considered complete until its relevant tests pass and reviewers can compare the observed
behavior with the approved requirements.

Rationale: review preserves owner control over choices, while tests provide repeatable evidence that
the resulting behavior matches intent.

## Governance

This constitution takes precedence over templates and informal project notes. Amendments MUST be
proposed as documented changes, reviewed by the project owner, and versioned semantically: MAJOR for
removing or redefining a principle or materially changing project-wide policy, MINOR for adding or
materially expanding a principle, and PATCH for wording or non-semantic clarification. Every
amendment MUST update the Sync Impact Report and Rule ID Index and reconcile dependent Spec Kit
templates. Before accepting a change, reviewers MUST confirm it follows these principles and that
relevant automated tests verify the resulting behavior.

**Version**: 2.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-18

---

## Rule ID Index

| Rule ID | Brief Name | Primary Applicable Document(s) |
| :-- | :-- | :-- |
| CONST-SCOPE-1 | Scope discipline | spec, plan, tasks |
| CONST-REQ-1 | Requirements before technology | spec, plan |
| CONST-TRANSFER-1 | Explicit transfer input | spec, plan, tasks |
| CONST-SIMPLE-1 | Readable simplicity | plan |
| CONST-REVIEW-1 | Reviewed decisions and verified behavior | plan, tasks, review |
