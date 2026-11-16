<!-- Sync Impact Report
Version change: (unratified template) → 1.0.0
Ratification basis: Initial ratification. Content was consolidated from an external project's
  constitution (v2.1.0, 34 rule IDs) into 18 rule IDs. Project-specific package and class rules,
  duplicated restatements, tooling-behavior notes, and rules already enforced by tooling were
  removed or delegated to the authoritative docs.
Modified principles: N/A (initial ratification)
Added sections: Core Principles (13 IDs), Additional Constraints (4 IDs), Review Gates (1 ID),
  Governance, Rule ID Index
Removed sections: N/A
Deprecated rule IDs: None (new ID space). Mapping from the source constitution, for traceability:
  - SPEC-1, SPEC-US-1, SPEC-US-2, SPEC-US-3 → CONST-SPEC-1
  - SPEC-US-4 → CONST-SPEC-2
  - SPEC-REF-1, SPEC-REF-2, SPEC-REF-3, SRC-1 (baseline part) → CONST-SPEC-3
  - PLAN-1, PLAN-2, PLAN-3, STACK-1, STACK-2, STACK-3 → CONST-PLAN-1
  - PLAN-4, DOC-1 (writeback part) → CONST-PLAN-2
  - SRC-1 (regeneration part) → CONST-PLAN-3
  - STACK-4 → CONST-STACK-1
  - TASK-GRAN-1, TASK-GRAN-3, TASK-GRAN-4, TASK-GRAN-5 → CONST-TASK-1
  - TASK-GRAN-2, API-COVER-3 → CONST-TASK-2
  - QUALITY-1 (contract part), API-COVER-2 → CONST-CONTRACT-1
  - QUALITY-1 (testing part) → CONST-TEST-1
  - QUALITY-1 (configuration and performance part) → CONST-QUALITY-1
  - MODULE-1, COMMON-1, SUBMODULE-1, GOV-1 (module part) → CONST-MODULE-1
  - DOC-1, DEV-1, LANG-1, GIT-1, GOV-1 (merge review) → same IDs
  - AGENT-1 → dropped (describes the agent-context extension's own marker behavior, which its
    configuration already enforces; not a project principle)
Contradictions resolved:
  - "at least 2 stories starting from P1" vs "at least two P1-or-higher stories" → at least two
    stories, the first at P1.
  - Section name "User Scenarios and Testing" → "User Scenarios & Testing" (matches spec-template.md).
  - Change Request "blocking" field required by one restatement only → always required.
  - "No speculative filling" vs spec-template.md Assumptions section → defaults allowed only when
    recorded under Assumptions; scope, security, and user-visible gaps must be marked.
  - Tests "OPTIONAL" in tasks-template.md vs mandatory test-first → tests now required.
  - Seven commit types in the constitution vs the commit tooling's wider list → constitution no
    longer enumerates types.
  - Tech-stack references "by line number" → by section plus item number (line numbers drift).
Relaxed or delegated:
  - Commit message layout and type list, branch naming → commit tooling and the branch-convention
    extension.
  - Test-first evidence: the no-squash and branch-protection mandates were dropped; the expected
    review evidence is defined in docs/rules/spring-boot.md (Unit Testing and Testing Culture).
  - [FE/BE/NA] task tag and CONST-NA placeholder removed (docs/tech-stack.md has no frontend);
    per-task RuleID tags replaced by the tasks.md Coverage Matrix.
  - Non-retroactivity clause dropped (no feature predates this constitution).
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates per CONST ID; added Existing
     Design Confirmation, Implementation Details, Contract Coverage, Needs Clarification, and
     Authoritative Source Writeback List sections.
  ✅ .specify/templates/spec-template.md — story-count rule and Assumptions rule cite CONST IDs;
     added Change Request section.
  ✅ .specify/templates/tasks-template.md — tests required and test-first; format line and US1
     examples carry DoD and Verify; added Coverage Matrix section; endpoint split noted.
  ✅ .specify/templates/checklist-template.md — opened; carries no constitution-mandated field;
     no change needed.
  ✅ .opencode/commands/*.md — searched; no CONST-* references; no change needed.
  ✅ AGENTS.md — removed the contradictory "Prohibited" language rule (it forbade English chapters
     while the same section requires English; the English-only rule already covers its intent).
Authoritative Source Writeback List:
  ✅ docs/rules/spring-boot.md already carries the test-first commit evidence, uniform error
     format, entry-point responsibility, and layer map that this constitution cites.
  ⚠ pending docs/rules/spring-boot.md (Unit Testing and Testing Culture) — detailed criteria for
     what disqualifies a class from the configuration-only smoke-test allowance in CONST-TEST-1.
  ⚠ pending docs/rules/spring-boot.md (Directory Structure) — builder/starter naming and component
     key conventions from the source constitution's sub-module skeleton rule, if adopted.
Follow-up TODOs: None beyond the two pending writeback items above.
-->
# ETL Quickstart Constitution

## Core Principles

### CONST-SPEC-1 Spec Scope and User Story Quality

A spec MUST state only business intent, scope boundaries, and acceptance outcomes. Implementation
details — file paths, dependencies, configuration, initialization, security design, error
formats, observability, and deployment — belong in the plan. A spec MUST keep every section of
`.specify/templates/spec-template.md` and MUST contain a `User Scenarios & Testing` section with
at least two independently testable User Stories, the first at priority P1. Each User Story MUST
state its value, its priority, an independent test approach, and at least one Acceptance Scenario
in `Given/When/Then` form that describes observable behavior. The same flow, feedback, or error
state MUST be described with the same user-facing wording across spec, plan, and tasks.

Rationale: a spec mixed with design cannot be reviewed by the business, and a story without an
observable scenario cannot be accepted.

### CONST-SPEC-2 Clarification Handling

A requirement gap MAY be filled with a reasonable default only when that default is recorded in
the spec's `Assumptions` section. A gap that changes scope, security, or user-visible behavior
MUST instead be marked `[NEEDS CLARIFICATION]`, and any marker still unresolved when planning
starts MUST be carried into the plan's `Needs Clarification` section. Neither spec nor plan may
present an unrecorded assumption as a requirement.

Rationale: hidden assumptions surface as defects after implementation, when they cost the most.

### CONST-SPEC-3 Existing Spec as Baseline

An existing spec or design artifact under `docs/` or `specs/` is the sole baseline for the
feature it covers. New work MUST reference it by file path plus section or ID, and MUST NOT
re-create it or establish a parallel authoritative document. Changing an existing spec MUST go
through a `Change Request` section listing each change, its reason, the affected sections, and
whether it is blocking.

Rationale: one source of truth per requirement keeps every later decision traceable.

### CONST-PLAN-1 Existing Design Confirmation and Implementation Detail

Before any technical design, the plan MUST contain an `Existing Design Confirmation` table that
cites, by file path plus section or item number, every authoritative document relevant to the
feature and every item of `docs/tech-stack.md`, marking each `Applicable` or `Not Applicable`.
Each `Applicable` item MUST be expanded to implementable detail: dependencies, configuration keys,
initialization flow, target file paths, and verification method. Each `Not Applicable` item MUST
state its rationale, impact, and alternative. A conflict or gap between the requirements and the
authoritative docs MUST be moved to `Needs Clarification` rather than resolved by new design.
Where applicable, the plan MUST also cover security, error format, observability, deployment, and
rollback, and every key decision MUST cite its source and rationale.

Rationale: incremental design is only safe once the existing design has been read and confirmed.

### CONST-PLAN-2 Authoritative Source Writeback

Every operational, dependency, or configuration fact introduced during planning MUST be listed in
the plan's `Authoritative Source Writeback List` with its target document under `docs/` and a
one-line summary, and MUST be written back before the feature is merged.

Rationale: knowledge that lives only in a branch draft is lost when the branch closes.

### CONST-PLAN-3 Incremental Change to Existing Plans and Tasks

When a feature already has `plan.md` or `tasks.md`, corrections MUST be applied as localized
patches whose description states the reason and the affected scope. Regenerating either document
wholesale is prohibited unless a Change Request under CONST-SPEC-3 explicitly supersedes it.

Rationale: regeneration silently discards decisions and rationale that were already confirmed.

### CONST-STACK-1 Runtime Applicability of Infrastructure Components

Security, identity, health-probe, API-documentation, and secret-management components MAY be
introduced only when the module's runtime form requires them, as defined in `docs/tech-stack.md`.
When one is not introduced, the plan MUST say so explicitly in `Existing Design Confirmation`,
citing the module behavior that makes it not applicable.

Rationale: unneeded infrastructure adds attack surface and maintenance without adding value.

### CONST-TASK-1 Atomic Tasks

Each task MUST be completable by one engineer in 0.5–1 person-day. Its description MUST name the
exact file path, class, or package, a Definition of Done, and at least one verification method
proportionate to the task, such as a unit test, contract validation, health check, or log
observation. Milestone tasks such as "complete backend feature" or "finish API" are prohibited.
Where an API endpoint is in scope, its work MUST be split into at least: request/response model
and controller, use case, data access, security, error mapping, API documentation, and
documentation writeback, omitting only categories the plan marks `Not Applicable`.

Rationale: a task that cannot be verified on its own cannot be reviewed or tracked.

### CONST-TASK-2 Coverage Matrix

`tasks.md` MUST contain a `Coverage Matrix` that maps every `Applicable` item from the plan's
`Existing Design Confirmation` and every operation in the feature's API contract to at least one
task ID. An item that no task can cover MUST be listed, with its blocking reason, in the plan's
`Needs Clarification` and `Authoritative Source Writeback List`.

Rationale: an applicable decision with no task is a decision that will not be implemented.

### CONST-CONTRACT-1 Contracts First

When behavior depends on an external system's contract — an API response shape, a message shape,
or a file format — that contract MUST be recorded in the feature's `contracts/` directory before
implementation begins. An unavailable contract is a `Needs Clarification` blocker under
CONST-SPEC-2, not a reason to implement against an assumed shape. A throwaway spike against the
real system that is never merged MAY be used to capture the contract. When the feature defines
its own API contract, the plan MUST map every operation (path and method) to a User Story or
requirement, and an unmapped operation is a blocker.

Rationale: code built on an assumed contract fails at integration, the latest possible point.

### CONST-TEST-1 Test-First Development and Coverage

A core behavior change is any change to what the code decides, validates, transforms, maps, or
causes externally; creating directories, declaring dependencies, formatting configuration, and
behavior-preserving renames or moves are not. Every core behavior change MUST be covered by
automated tests that verify the success path, the failure path, boundary conditions, and
configuration loading. Tests MUST be written first: in `tasks.md` each test task precedes the
implementation task it covers, and the test MUST be observed failing on an assertion before its
implementation exists. The evidence reviewers expect is defined in `docs/rules/spring-boot.md`
(Unit Testing and Testing Culture). A change that only removes behavior MUST delete or narrow the
tests for that behavior instead. A class that only holds configuration or wires components, and
makes no decision on runtime data, MAY be covered by a test that starts the application context
and asserts it binds and wires correctly, instead of a dedicated test.

Rationale: a test that was never seen failing proves nothing about the behavior it claims to cover.

### CONST-QUALITY-1 Configuration and Batch Performance

Endpoints, credentials, timeouts, storage locations, table names, and other environment-dependent
values MUST be externalized configuration injected at startup; hardcoding them is prohibited
outside test doubles, and credentials MUST be sourced as `docs/tech-stack.md` prescribes. Access
to an external system MUST go through injected configuration and a shared connection object.
Shared processing paths MUST NOT create expensive clients or connections per record, nor repeat
an identical query per record. Every buffered or batched write MUST declare its batch size and its
behavior on partial failure.

Rationale: batch jobs fail at volume; the costs that matter there are per-record costs.

### CONST-MODULE-1 Module Boundaries

The shared module MUST contain only capabilities used across modules — configuration, connection
parameters, shared models, exceptions, infrastructure contracts, and stateless utilities — and
MUST NOT contain logic, mappings, orchestration, or entry points specific to one source system.
A capability MAY move into the shared module only when the change demonstrates use by at least two
modules. Each module's startup entry point MUST only bootstrap and hand off, with no business
logic. The layer map and naming conventions are defined in `docs/rules/spring-boot.md` (System
Architecture and Design Principles).

Rationale: premature sharing couples modules that would otherwise change independently.

## Additional Constraints

### CONST-DOC-1 Authority of docs/

All authoritative rules, architecture references, and schemas MUST live under `docs/`.
`docs/index.md` is the entry point, but compliance reading MUST include the specific source files
it links, including every file under `docs/rules/`. Knowledge that exists only in a branch draft
is not authoritative.

### CONST-DEV-1 Backend Standards

Backend implementations MUST follow `docs/rules/spring-boot.md` and the selections in
`docs/tech-stack.md`, including constructor injection, externalized configuration, the standard
logging stack, and — for modules exposing HTTP endpoints — the uniform error format and health
probes defined there. Testing requirements are governed solely by CONST-TEST-1 and are not
restated here.

### CONST-LANG-1 Document Language and Format

All spec, plan, task, and checklist documents MUST be written in English; proper nouns, technical
terms, and file names keep their original form. Generated documents MUST preserve the section
hierarchy of their templates. Code or configuration snippets MAY appear only where technically
required.

### CONST-GIT-1 Change Control

Commit messages MUST follow the Conventional Commits specification, explain why the change was
made, and mark breaking changes. Branch names MUST follow the convention configured in
`.specify/branch-convention.yml`. The commit type list and message layout are owned by the commit
tooling and are not restated here.

## Review Gates

### CONST-GOV-1 Merge Review

Before merge, every change MUST pass a review confirming: compliance with this constitution; that
spec, plan, and tasks follow their templates; that every item in the `Authoritative Source
Writeback List` has been written back; test-first evidence per CONST-TEST-1; and no conflict with
existing modules. A change that adds a module MUST also show compliance with CONST-MODULE-1 and
supply an externalized configuration sample. Any violation blocks the merge until the design is
corrected.

## Governance

This constitution takes precedence over templates, agent prompts, and informal notes. When a
document under `docs/` conflicts with it, the conflict MUST be recorded in `Needs Clarification`
and either that document or this constitution MUST be amended. Amendments MUST be proposed as a
documented change, reviewed against `docs/`, and versioned semantically: MAJOR for removing or
redefining a principle, MINOR for adding or materially expanding one, PATCH for wording and
clarification only. Every amendment MUST update the Sync Impact Report and the Rule ID Index and
propagate to `.specify/templates/`. A compliance review is required whenever a spec, plan, tasks,
or checklist document is produced.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16

---

## Rule ID Index

<!-- Maintenance rules:
  1. Update this table whenever the version is bumped (add new rows, remove deprecated rows).
  2. Deprecated IDs MUST also be recorded in the Sync Impact Report.
  3. Any CONST-* appearing in a template but not in this table is an invalid reference.
-->

| Rule ID | Brief Name | Primary Applicable Document(s) |
| :-- | :-- | :-- |
| CONST-SPEC-1 | Spec scope and User Story quality | spec |
| CONST-SPEC-2 | Clarification handling | spec, plan |
| CONST-SPEC-3 | Existing spec as baseline, Change Request | spec |
| CONST-PLAN-1 | Existing design confirmation and implementation detail | plan |
| CONST-PLAN-2 | Authoritative source writeback | plan |
| CONST-PLAN-3 | Incremental change to existing plans and tasks | plan, tasks |
| CONST-STACK-1 | Runtime applicability of infrastructure components | plan |
| CONST-TASK-1 | Atomic tasks | tasks |
| CONST-TASK-2 | Coverage Matrix | tasks |
| CONST-CONTRACT-1 | Contracts first | plan, tasks |
| CONST-TEST-1 | Test-first development and coverage | plan, tasks |
| CONST-QUALITY-1 | Configuration and batch performance | plan, tasks |
| CONST-MODULE-1 | Module boundaries | plan, tasks |
| CONST-DOC-1 | Authority of docs/ | plan |
| CONST-DEV-1 | Backend standards | plan |
| CONST-LANG-1 | Document language and format | all documents |
| CONST-GIT-1 | Change control | all changes |
| CONST-GOV-1 | Merge review | all changes |
