# Implementation Plan: [FEATURE]

**Branch**: `feat/feature-name or fix/bug-name` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/<branch-path>/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Existing Design Confirmation

<!--
  ACTION REQUIRED (CONST-PLAN-1, CONST-STACK-1): Complete this table BEFORE any technical design.
  - List every authoritative document under docs/ relevant to this feature (file path + section or ID).
  - List EVERY item of docs/tech-stack.md (section + item number, e.g. "Backend #6"), not only relevant ones.
  - Applicable: expand to dependencies, configuration keys, initialization flow, target file paths, verification.
  - Not Applicable: give rationale, impact, and alternative.
  - Conflict or gap with the requirements: move it to "Needs Clarification"; do not design around it.
-->

| Source (path + section/item) | Status | Implementation Detail / Rationale | Verification |
|------------------------------|--------|-----------------------------------|--------------|
| `docs/tech-stack.md` Backend #1 | Applicable | [deps, config keys, init flow, file paths] | [how verified] |
| `docs/tech-stack.md` Backend #8 | Not Applicable | [rationale, impact, alternative] | N/A |

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
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

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] **CONST-SPEC-2**: Every unresolved `[NEEDS CLARIFICATION]` from the spec is carried into `Needs Clarification`
- [ ] **CONST-SPEC-3**: Existing specs/designs are referenced by path + section, not re-created; amendments use a `Change Request`
- [ ] **CONST-PLAN-1**: `Existing Design Confirmation` covers every relevant doc and every `docs/tech-stack.md` item
- [ ] **CONST-PLAN-2**: Every new operational, dependency, or configuration fact is in `Authoritative Source Writeback List`
- [ ] **CONST-PLAN-3**: If `plan.md`/`tasks.md` already existed, changes are localized patches with reason and scope
- [ ] **CONST-STACK-1**: Security, identity, health-probe, API-doc, and secret components are introduced only when the runtime form requires them
- [ ] **CONST-CONTRACT-1**: External contracts are recorded in `contracts/`; every own API operation is mapped in `Contract Coverage`
- [ ] **CONST-TEST-1**: Test strategy covers success, failure, boundary, and configuration loading; tests are written first
- [ ] **CONST-QUALITY-1**: Environment-dependent values are externalized; batched writes declare batch size and partial-failure behavior
- [ ] **CONST-MODULE-1**: Shared-module placement is justified by at least two consuming modules; entry points only bootstrap
- [ ] **CONST-DOC-1 / CONST-DEV-1**: Design follows `docs/rules/` and `docs/tech-stack.md`
- [ ] **CONST-LANG-1**: Document is in English and keeps this template's section hierarchy

## Implementation Details

<!--
  ACTION REQUIRED (CONST-PLAN-1): Fill each item where applicable; write "N/A - [reason]" otherwise.
  Every key decision MUST cite its source (doc path + section) and rationale.
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

## Contract Coverage

<!--
  CONST-CONTRACT-1: Include only when the feature has contracts/. Map every API operation (path + method)
  to a User Story or requirement. An unmapped operation is a blocker and MUST go to "Needs Clarification".
  External-system contracts consumed by this feature MUST also be listed here with their contracts/ file.
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
  CONST-SPEC-2, CONST-PLAN-1, CONST-TASK-2: Unresolved spec markers, conflicts or gaps against
  authoritative docs, unavailable contracts, and items no task can cover. Do not fill these by assumption.
-->

| ID | Question / Conflict | Source | Blocking? |
|----|---------------------|--------|-----------|
| NC-001 | [description] | [doc path + section, or spec marker] | Yes/No |

## Authoritative Source Writeback List

<!--
  CONST-PLAN-2: Every operational, dependency, or configuration fact introduced by this plan.
  Each entry MUST be written back to docs/ before merge.
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
