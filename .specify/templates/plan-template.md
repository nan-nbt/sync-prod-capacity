# Implementation Plan: [FEATURE]

**Branch**: `feat/feature-name or fix/bug-name` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/<branch-path>/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Existing Design Confirmation

<!--
  ACTION REQUIRED (CONST-REQ-1, CONST-SIMPLE-1): Complete this table BEFORE finalizing technical
  design. List relevant authoritative docs and record technology/design proposals separately from
  requirements. Explain applicability and rationale, and surface behavior-changing requirement gaps
  for owner review instead of silently deciding them.
-->

| Source (path + section/item) | Applicability | Proposal / rationale | Owner decision / verification |
|------------------------------|---------------|----------------------|------------------------------|
| [Relevant reference, or approved option] | [Applicable / Not applicable + reason] | [Proposed technical choice, distinct from requirement] | [Pending / Approved / Rejected; evidence] |

## Technical Context

<!--
  Record technical proposals separately from requirements. Mark unknowns and present material
  design choices for owner review; do not expand product scope to justify technology choices.
  Treat existing ETL-platform reference material as applicable only when relevant to the selected
  technology and app needs; do not add unrelated runtime, infrastructure, or multi-module features.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design and before implementation.*

- [ ] **CONST-SCOPE-1**: The plan contains no product capability outside the agreed transfer scope.
- [ ] **CONST-REQ-1**: Requirements are separated from technology decisions; unresolved behavior is surfaced for review.
- [ ] **CONST-TRANSFER-1**: A required, validated input controls the source data selection; the plan and specification state the requested quantity and time period, including whether the run date is included.
- [ ] **CONST-SIMPLE-1**: The design uses the smallest readable approach that meets requirements.
- [ ] **CONST-REVIEW-1**: Material design/technology decisions are presented to the owner, with approval or rejection and rationale recorded before implementation; resulting behavior has verification coverage.

## Implementation Details

<!--
  ACTION REQUIRED (CONST-REQ-1, CONST-SIMPLE-1, CONST-REVIEW-1): Fill applicable items with
  proposals; write "N/A - [reason]" otherwise. Record each material decision's owner disposition
  (Pending / Approved / Rejected) and rationale. Implementation MUST NOT begin while a material
  decision is Pending.
-->

- **File paths**: [new/changed files and classes]
- **Dependencies**: [added or changed dependencies]
- **Configuration keys**: [keys, defaults, per-profile values]
- **Initialization flow**: [startup and wiring order]
- **Security / ACL**: [or N/A - reason]
- **Error format**: [or N/A - reason]
- **Observability / logging**: [log events, context fields, metrics]
- **Batch behavior**: [batch size and partial-failure behavior, or N/A]
- **Deployment**: [runtime form, probes, packaging]
- **Rollback**: [how to revert safely]

**Owner Review Gate**: [List material decisions and their owner disposition. All must be approved or
rejected with rationale before implementation begins.]

## Contract Coverage

<!--
  Include only when the feature defines or consumes a contract. Map each in-scope operation to a User
  Story or requirement; surface any unmapped operation for review. Keep contract details out of
  requirement statements unless they describe observable behavior.
-->

| Contract (file + operation) | User Story / Requirement |
|-----------------------------|--------------------------|
| `contracts/[file]` `GET /v1/[resource]` | US1 / FR-001 |

## Project Structure

### Documentation (this feature)

```text
specs/<branch-path>/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Needs Clarification

<!--
  CONST-REQ-1: Record unresolved requirement gaps and disagreements between requested behavior and
  approved design. Do not silently resolve behavior-changing questions as technical choices.
-->

| ID | Question / Conflict | Source | Blocking? |
|----|---------------------|--------|-----------|
| NC-001 | [description] | [doc path + section, or spec marker] | Yes/No |

## Authoritative Source Writeback List

<!--
  Record implementation decisions that belong in the project's authoritative reference documents,
  so accepted operational and technology guidance remains available for future work.
-->

| Target Document (docs/...) | Change Summary | Status |
|----------------------------|----------------|--------|
| `docs/[file].md` [section] | [one-line summary] | Pending/Done |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
