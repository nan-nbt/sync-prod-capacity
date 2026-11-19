<!-- Sync Impact Report
Version change: 2.0.0 → 3.0.0
Bump rationale: MAJOR — redefine CONST-TRANSFER-1 so a transfer's required, validated input
  specifies an explicit time period, no longer requiring a previous-day period.
Modified principles:
  CONST-TRANSFER-1 Explicit Transfer Input → Explicit Transfer Window
Added sections: None
Removed sections: None
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check now requires an explicit
     quantity and period, including whether the run date is included.
  ✅ .specify/templates/spec-template.md — guidance prompts for the requested quantity and
     time period without prescribing previous-day selection.
  ✅ .specify/templates/tasks-template.md — verification covers requested quantity and period.
  ✅ .specify/templates/checklist-template.md — opened; no rule IDs or transfer-period
     requirements to update.
  ✅ .specify/templates/commands/*.md — no such directory exists; no command template
     references to update.
  ✅ .opencode/commands/*.md — repository search found no stale previous-day or
     CONST-TRANSFER-1 guidance in command files.
  ✅ AGENTS.md, README.md, docs/index.md, docs/tech-stack.md, docs/rules/spring-boot.md —
     reviewed; none prescribe a previous-day transfer period.
Authoritative Source Writeback List:
  None. The exact time window remains feature-specific and is recorded in its specification.
Follow-up TODOs: None.
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

### CONST-TRANSFER-1 Explicit Transfer Window

Every transfer execution MUST require a value that specifies the quantity and time period of source
data to transfer. The value MUST be validated before transfer begins, and the selected source data MUST
conform to the requested quantity and time period. The specification and plan MUST state the observable
meaning of the requested quantity and time period, including whether the run date is included.

Rationale: explicit, validated selection boundaries make each run intentional and testable.

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

**Version**: 3.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-18

---

## Rule ID Index

| Rule ID | Brief Name | Primary Applicable Document(s) |
| :-- | :-- | :-- |
| CONST-SCOPE-1 | Scope discipline | spec, plan, tasks |
| CONST-REQ-1 | Requirements before technology | spec, plan |
| CONST-TRANSFER-1 | Explicit transfer window | spec, plan, tasks |
| CONST-SIMPLE-1 | Readable simplicity | plan |
| CONST-REVIEW-1 | Reviewed decisions and verified behavior | plan, tasks, review |
