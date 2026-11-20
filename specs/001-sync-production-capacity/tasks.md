# Tasks: Synchronize Production Capacity

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/cli.md`, `quickstart.md`, and `.specify/memory/constitution.md`.

**Project scope**: This is a training and examination project for manually transferring records on the configured lab/test database; it is not intended for production deployment. Keep work focused on the basic CLI, requested time window, SELECT-only source access, target insert/update/no-op behavior, local unit tests, and straightforward failures. Automated tests must not connect to the lab database. Do not claim verification that has not been performed.

**Test-first rule**: Write focused local unit tests for behavior before implementing it. No automated lab database fixtures, integration tests, connectivity checks, or connections are in scope. Do not log credentials or record values.

**Format**: `[P]` denotes tasks that can run concurrently after their stated prerequisites, on different files. Story labels identify the owning story. Each task includes a done condition and verification.

## Phase 1: Setup

- [x] T001 Confirm the remaining material stack and design choices — DoD: decisions relevant to the training/examination scope are recorded — Verify: owner confirmed training/lab transfer purpose, no production deployment, no automated DB tests, and requested a success count in console output.
- [x] T002 Create `settings.gradle`, `build.gradle` and the Gradle 8.x wrapper for Java 21, Spring Boot 3.5.x non-web, Spring JDBC, PostgreSQL, Log4j2 and JUnit 5; exclude default logging and avoid web, ORM and Spring Batch — DoD: a single project builds with focused local tests enabled — Verify: `./gradlew test` runs with no application transfer.

## Phase 2: Foundational

**Purpose**: Establish runtime configuration and local testing prerequisites. Lab database connection and transfer verification are reserved for manually controlled examiner use.

- [x] T005 Write configuration tests in `src/test/java/com/example/capacity/DataSourceConfigurationTest.java` for explicit `postgresql.datasource.url`, `username`, `password` and `driver-class-name` mapping, external file loading and no secret output — DoD: focused assertions exist — Verify: local configuration tests passed without requesting a lab database connection.
- [x] T006 Implement non-web startup and explicit external configuration loading/binding; application reads root `.env` and binds all four `POSTGRES_*` settings — DoD: custom datasource values passed to Spring without logging them; no production default; transfer occurs only after valid explicit CLI input — Verify: configuration unit tests passed; valid CLI input explicitly invokes the configured lab transfer.

## Phase 3: User Story 1 — Synchronize a requested window (P1)

**Goal**: Manually transfer the eligible source records for a requested window while preserving unrelated and unchanged data.

**Independent verification**: Local unit tests cover CLI/window behavior and transfer mapping using non-database test doubles. Automated tests make no lab database connections; `CapacityTransferTest` exercises SQL parameters and write decisions via mocked JdbcTemplate. Lab-specific behavior remains for manual examiner verification.

### Tests — write before the corresponding implementation

- [x] T007 [P] [US1] Write CLI and window unit tests in `src/test/java/com/example/capacity/DaysWindowTest.java` for exactly one `--days=<digits>`, positive leading-zero values, missing/duplicate/empty/signed/zero/fractional/nonnumeric/overflow input; cover days 1 and 5, inclusive start, exclusive end, representative month/year boundaries, and a fixed window — DoD: validation and UTC+08:00 window assertions are explicit — Verify: `DaysWindowTest` passes in the local suite.
- [x] T008 [P] [US1] Write local transfer unit tests in `src/test/java/com/example/capacity/CapacityTransferTest.java` using non-database test doubles for selection by `created_at`, null-safe mapping, inserted values, updates, duplicate/ambiguous key handling, and unchanged/no-op behavior — DoD: expected mapping and operation assertions are present — Verify: `CapacityTransferTest` passes without lab database connections.
- [x] T009 [P] [US1] Write local idempotence and write-time unit tests in `src/test/java/com/example/capacity/CapacityTransferTest.java` using non-database test doubles — DoD: repeated identical runs do not duplicate writes and changed rows use millisecond-precision write times — Verify: repeated no-op and update counts, plus millisecond-truncated database-time SQL, are asserted by `CapacityTransferTest`; no lab database connection made.

### Implementation

- [x] T011 [US1] Implement argument parsing and an immutable window in `src/main/java/com/example/capacity/DaysWindow.java`; validate syntax, duplicates, numeric overflow and calendar arithmetic using the fixed UTC+08:00 window — DoD: T007 cases pass, including the specified half-open interval — Verify: local `DaysWindowTest` passes.
- [x] T012 [US1] Implement parameter-bound source selection and null-safe key/field mapping in `src/main/java/com/example/capacity/CapacityTransfer.java` using the exact columns in `data-model.md`; source operations must remain SELECT-only — DoD: eligible records are selected and mapped without source mutation — Verify: `CapacityTransferTest` passes against mock JdbcTemplate; no lab database connection made.
- [x] T014 [US1] Implement target insert and update-if-different behavior in `src/main/java/com/example/capacity/CapacityTransfer.java`: preserve required IDs, creation time and synchronized values; exclude source `updated_at`; use the specified millisecond-precision write time; do not write unchanged or unrelated targets, modify source, or delete targets — DoD: inserts, updates and no-ops follow `data-model.md` — Verify: `CapacityTransferTest` passes mock insert/update/no-op cases; no lab database connection made.
- [x] T015 [US1] Wire the manual CLI in `src/main/java/com/example/capacity/CapacityApplication.java` to validate input before startup, invoke the configured lab transfer once, close the non-web context, return zero for success including an empty window, report the number of inserted/updated rows, and avoid exposing secrets or row contents — DoD: no schedule, HTTP endpoint or implicit run exists — Verify: `rtk ./gradlew test --rerun-tasks` passed; no lab database connection was made.

**Checkpoint**: Local window/CLI tests and mocked JdbcTemplate transfer tests cover the basic flow. Manual examiner transfer against the lab/test database is separate; no live lab database test or deployment verification is claimed.

## Phase 4: Straightforward failure handling (P2)

**Goal**: Reject invalid CLI input and report straightforward validation or transfer failures without falsely claiming success.

**Independent verification**: Local tests assert invalid input is rejected and straightforward failures are reported as nonzero outcomes. No lab database failures are injected or simulated.

- [x] T017 [P] Write local CLI tests in `src/test/java/com/example/capacity/InvalidInvocationTest.java` for missing, repeated, zero, signed, fractional, nonnumeric and overflow `--days`; assert clear errors and nonzero outcomes — DoD: invalid inputs are covered without lab database access — Verify: local suite passes.
- [x] T022 Complete invalid-input handling in `src/main/java/com/example/capacity/CapacityApplication.java`: report a clear safe error, return nonzero and do not start a transfer for invalid inputs — DoD: invalid requests cannot reach transfer invocation — Verify: local CLI tests pass.
- [x] T023 Propagate straightforward validation and transfer failures through `src/main/java/com/example/capacity/CapacityTransfer.java` and `src/main/java/com/example/capacity/CapacityApplication.java`; return nonzero and do not claim that a database rollback occurred — DoD: errors are reported without secrets or row contents and are not presented as successful transfers — Verify: generic failure reporting is present; invalid-input process tests pass; no lab DB failure was induced.

## Phase 5: Polish

- [x] T026 Update `specs/001-sync-production-capacity/quickstart.md` with build/test instructions, `.env` lab runtime configuration, manual CLI usage and the project’s basic behavior, including total successful row count output — DoD: guide distinguishes manual lab use from local automated tests and excludes production deployment — Verify: reviewed; `rtk ./gradlew test --rerun-tasks` passed; no lab database connection was made.
- [x] T027 Run applicable local unit tests and record only observed results — DoD: no unperformed database or deployment checks are reported as verified — Verify: final `rtk ./gradlew test --rerun-tasks` passed after mock transfer/idempotence tests; `rtk git diff --check` passed; no lab database connection was made.

## Coverage Matrix

| Required behavior / source | Task IDs |
|---|---|
| FR-001 manual invocation only; non-web CLI contract | T006, T015, T026 |
| FR-002–003 explicit validated days and straightforward invalid-input failures | T007, T011, T017, T022 |
| FR-004–005 fixed UTC+08:00 calendar window | T007, T011 |
| FR-006 `created_at` source selection | T008, T012 |
| FR-007 source and target configuration | T005, T006, T012 |
| FR-008 null-safe matching | T008, T012, T023 |
| FR-009–010 target insert/update values | T008, T014 |
| FR-011–013 ignore source `updated_at`, write-time precision, unchanged no-op | T009, T014 |
| FR-014 repeat idempotence | T009, T014 |
| FR-015 source/unrelated preservation, no deletes | T008, T012, T014 |
| FR-016 empty-window success | T008, T015 |
| FR-017 successful total rows changed output | T015, T026, T027 |
| CLI configuration, total transferred-row success count, and secret-safe failure reporting | T005–T007, T015, T017, T022–T023, T026 |
| Local unit tests and documentation | T007–T009, T017, T027 |

## Dependencies & Execution Order

- **Graph**: T002 → T005–T006 → US1 (T007–T009, T011–T015) → straightforward failure handling (T017, T022–T023) → T026–T027. Local transfer tests (T008) cover mock JDBC mapping and write decisions; lab-specific behavior remains for manual examiner use.
- T002 precedes configuration tests and implementation. T005 precedes T006.
- US1 local tests T007–T009 precede their implementation tasks. T011 precedes CLI integration; transfer behavior is covered by T008–T009. Transfer persistence tests use mocked JdbcTemplate and do not access any database.
- Invalid-input test T017 precedes T022. T026 documents the project scope; T027 records only checks actually run.

## Implementation Strategy

1. Maintain the existing runtime configuration and implement the CLI/window behavior.
2. Implement source SELECT and target insert/update/no-op behavior, covered by local mock-based unit tests.
3. Handle invalid input and straightforward failures without claiming unverified database rollback behavior.
4. Keep the project limited to training/examination scope; do not add automated lab database tests/connections, advanced concurrency/failure scenarios, or production-readiness work. The real transfer remains available for manual examiner use on the lab/test database.

## Completion Boundary

All listed implementation, test, and local verification tasks are marked complete. The checklist describes project-specification quality; automated checks cover local logic and mock JDBC behavior. No lab database run was performed here; the examiner remains responsible for manual verification against the configured lab/test database.
