# Tasks: Synchronize Production Capacity

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/cli.md`, `quickstart.md`, and `.specify/memory/constitution.md`.

**Review gate**: The owner approved the remaining material stack and design choices and confirmed that the existing PostgreSQL test environment is suitable for implementation testing. This does not approve deployment to production. Keep database checks proportionate to implementation; no separate isolated PostgreSQL instance or elaborate environment audit is required.

**Test-first rule**: For each behavior test below, first create only the minimal compiling interfaces or inert stubs needed to run it; run it and record an assertion failure caused by the missing behavior before implementing that behavior. A compilation, connection or fixture-setup failure is not a red test. Tests may provision or reset the two documented tables in the PostgreSQL test environment. Do not log credentials or record values.

**Format**: `[P]` denotes tasks that can run concurrently after their stated prerequisites, on different files. Story labels identify the owning story. Each task includes a done condition and verification.

## Phase 1: Setup

- [x] T001 Owner approval of the remaining material stack and design choices received; retain existing owner decisions and unresolved deployment caveats — DoD: approval is recorded here; it is not an implementation blocker — Verify: owner confirmation received.
- [ ] T002 Create `settings.gradle`, `build.gradle` and the Gradle 8.x wrapper for Java 21, Spring Boot 3.5.x non-web, Spring JDBC, PostgreSQL, Log4j2 and JUnit 5; exclude default logging and avoid web, ORM and Spring Batch — DoD: a single project builds with focused tests enabled — Verify: `./gradlew test` runs with no application transfer.
- [ ] T003 Confirm the available PostgreSQL test environment is reachable and compatible with the documented tables; no separate isolated instance or broad deployment-environment audit is required for implementation — DoD: database integration tests can run against the test environment, with no schema migration — Verify: connect using externally supplied test settings and run a non-destructive connectivity/schema smoke test.

## Phase 2: Foundational

**Purpose**: Shared runtime and test-environment prerequisites. Complete T002–T006 before database-backed application verification; application implementation may begin under the owner's design approval.

- [ ] T004 Create a PostgreSQL test fixture in `src/test/java/com/example/capacity/PostgresFixture.java` using externally supplied test connection settings; provision or reset only the two documented tables in the PostgreSQL test environment — DoD: tests can arrange and inspect deterministic source/target data — Verify: run a fixture smoke test against the test environment.
- [ ] T005 Write configuration tests in `src/test/java/com/example/capacity/DataSourceConfigurationTest.java` for explicit `postgresql.datasource.url`, `username`, `password` and `driver-class-name` mapping, external file loading and no secret output — DoD: focused assertions exist — Verify: observe an assertion failure with compiling inert configuration before T006.
- [ ] T006 Implement non-web startup and explicit external configuration loading/binding in `src/main/java/com/example/capacity/CapacityApplication.java`, `src/main/java/com/example/capacity/DataSourceConfiguration.java` and `src/main/resources/application.yml`; preserve `${POSTGRES_PASSWORD}`, provide no production default and never run a transfer implicitly — DoD: the documented custom prefix reaches the JDBC `DataSource` without leaking credentials — Verify: T005 passes and startup does not transfer data without valid explicit input.

## Phase 3: User Story 1 — Synchronize a requested window (P1)

**Goal**: Manually transfer the eligible snapshot while preserving unrelated and unchanged data.

**Independent test**: In the PostgreSQL test environment, use a fixed 2026-11-16 UTC+08:00 clock and `--days=5`; compare source and target at both boundaries, including insert, changed, unchanged, null-shift, unrelated and empty-window cases. Repeat and check timestamps.

### Tests — write before the corresponding implementation

- [ ] T007 [P] [US1] Write CLI and window tests in `src/test/java/com/example/capacity/DaysWindowTest.java` for exactly one `--days=<digits>`, positive leading-zero values, missing/duplicate/empty/signed/zero/fractional/nonnumeric/overflow and Java/JDBC/PostgreSQL-unrepresentable endpoints; cover days 1 and 5, inclusive start, exclusive end, month/year/leap boundaries and a fixed window across midnight — DoD: validation and fixed UTC+08:00 window assertions are explicit — Verify: observe assertion failures against compiling inert stubs before T011.
- [ ] T008 [P] [US1] Write transfer integration tests in `src/test/java/com/example/capacity/TransferSuccessTest.java` using T004 for selection by `created_at` rather than record date or source `updated_at`; assert every synchronized field from `data-model.md`, inserted ID/creation time, update including ID-only or creation-time-only changes, null and empty values, null-shift matching, unchanged/unrelated rows, source immutability, no deletes and empty-window success — DoD: before/after data and timestamp assertions are present — Verify: observe assertion failures against compiling inert transfer stubs before T012–T015.
- [ ] T009 [P] [US1] Write idempotence and write-time integration tests in `src/test/java/com/example/capacity/TransferTimestampTest.java` using T004; assert repeated identical runs do not create duplicates or change target timestamps, source `updated_at` differences are ignored, and changed rows get actual write-time instants truncated to milliseconds and rendered at UTC+08:00 — DoD: a transaction-start-versus-write-time distinction is tested — Verify: observe assertion failures against compiling inert transfer stubs before T014–T015.
- [ ] T010 [P] [US1] Write a coordinated snapshot integration test in `src/test/java/com/example/capacity/TransferSnapshotTest.java` using separate PostgreSQL sessions: change eligible source data after the job establishes its snapshot and verify the transferred values are from that snapshot — DoD: session synchronization proves the ordering rather than relying on sleeps — Verify: observe an assertion failure against compiling inert transaction/transfer stubs before T013–T015.

### Implementation

- [ ] T011 [US1] Implement argument parsing and one immutable window in `src/main/java/com/example/capacity/DaysWindow.java`; validate syntax, duplicates, numeric overflow, calendar arithmetic and both PostgreSQL/JDBC-representable bounds before opening a write transaction; take the run date once at fixed UTC+08:00 — DoD: T007 cases pass, including the specified half-open interval — Verify: run `DaysWindowTest`.
- [ ] T012 [US1] Implement schema-qualified, parameter-bound source selection and null-safe key/field mapping in `src/main/java/com/example/capacity/CapacityTransfer.java` using the exact columns in `data-model.md`; identify duplicate eligible source keys and multiple target matches only for eligible keys — DoD: ambiguous keys fail rather than select arbitrarily — Verify: T008 and the duplicate cases in T020 after T020 exists.
- [ ] T013 [US1] Implement a single Spring-managed PostgreSQL REPEATABLE READ transaction in `src/main/java/com/example/capacity/TransferTransaction.java`; acquire `SHARE ROW EXCLUSIVE` on `devuser.production_capacity_anan` before any snapshot-establishing query, wait under configured lock behavior, hold the lock through commit/rollback, and perform no intermediate commits or retries — DoD: the source snapshot and all target operations share one transaction — Verify: T010 and T021 after the transfer is wired.
- [ ] T014 [US1] Implement explicit insert and update-if-different operations in `src/main/java/com/example/capacity/CapacityTransfer.java`: preserve ID, creation time and all synchronized values; exclude source `updated_at`; use actual database write time truncated, not rounded, to milliseconds; never write unchanged/unrelated rows, modify source or delete targets — DoD: inserts, updates and no-ops follow `data-model.md` — Verify: T008 and T009 pass after T015.
- [ ] T015 [US1] Wire the manual CLI in `src/main/java/com/example/capacity/CapacityApplication.java` to validate before transaction, invoke the transfer once, close the non-web context, return zero for success including an empty window, and log start/end without secrets or row contents — DoD: no schedule, HTTP endpoint or implicit run exists — Verify: T007–T010 pass and `java -jar build/libs/<application-jar>.jar --days=5` succeeds against test-environment fixtures.
- [ ] T016 [US1] Perform and record the manual US1 comparison in `specs/001-sync-production-capacity/quickstart.md`: use test-environment fixtures for the documented five-day boundaries, new/changed/identical/null-shift/unrelated rows, empty window and a repeat — DoD: expected and observed results are recorded without sensitive data — Verify: compare full source and target values and unchanged timestamps before and after.

**Checkpoint**: US1 is independently demonstrable in the PostgreSQL test environment; it is not release-ready until US2 safety, review and deployment gates pass.

## Phase 4: User Story 2 — Reject invalid or failed transfers safely (P2)

**Goal**: Ensure invalid requests, known failures, concurrent writers and uncertain commits have the specified safe outcomes.

**Independent test**: Exercise invalid CLI input, inject a failure after a write and compare the entire target; coordinate competing writers and simulate a lost commit acknowledgement, asserting exit status and truthful messages.

### Tests — write before the corresponding safety implementation

- [ ] T017 [P] [US2] Write process-level CLI tests in `src/test/java/com/example/capacity/InvalidInvocationTest.java` for missing, repeated, zero, signed, fractional, nonnumeric, overflow and unrepresentable `--days`; assert clear error, nonzero exit and unchanged entire target — DoD: CLI contract and no-write assertions cover invalid inputs — Verify: observe an assertion failure before T022; use T011 for value validation.
- [ ] T018 [P] [US2] Write PostgreSQL rollback tests in `src/test/java/com/example/capacity/TransferRollbackTest.java` using T004: inject failures before and after at least one write, including ID collision and unstoreable value; assert nonzero error, no partial target changes, unchanged source and no automatic retry — DoD: full target before/after comparisons prove rollback — Verify: observe an assertion failure before T023.
- [ ] T019 [P] [US2] Write outcome-reporting tests in `src/test/java/com/example/capacity/CommitOutcomeTest.java` for successful commit, known pre-commit failure, known rejected commit and lost commit acknowledgement; assert nonzero unknown outcome without claiming rollback, and an instruction to inspect before retry — DoD: distinguish rejection from uncertainty without exposing credentials or row values — Verify: observe an assertion failure before T024 using controlled transaction/connection failure injection.
- [ ] T020 [P] [US2] Write ambiguous-match integration tests in `src/test/java/com/example/capacity/TransferAmbiguityTest.java` using T004 for duplicate eligible source keys and multiple matching targets, including null shifts; assert failure and complete rollback, while unrelated duplicate keys do not fail the run — DoD: eligible and unrelated duplicates are distinguished — Verify: observe an assertion failure before T023 using a compilable test seam; retain T012's duplicate checks.
- [ ] T021 [P] [US2] Write coordinated real-PostgreSQL lock tests in `src/test/java/com/example/capacity/TransferLockTest.java`: an existing writer finishes before snapshot and its committed target value is checked; existing-row, unrelated-row and absent null-shift-key writers wait while the job holds the lock and proceed after commit or rollback — DoD: job succeeds when writers merely wait and never undoes their commits — Verify: use explicit session coordination and PostgreSQL lock observation; observe an assertion failure before T023 against an inert or deliberately unlocked test implementation.

### Implementation

- [ ] T022 [US2] Complete process-level invalid-input handling in `src/main/java/com/example/capacity/CapacityApplication.java`: print a clear safe error, return nonzero and do not start transfer or change target data for every T017 case — DoD: invalid requests cannot reach the write transaction — Verify: T017 passes.
- [ ] T023 [US2] Complete known-failure and transaction handling in `src/main/java/com/example/capacity/TransferTransaction.java` and `src/main/java/com/example/capacity/CapacityTransfer.java`: propagate ambiguity, constraint, selection, lock and write failures; roll back every job write, return nonzero, never retry automatically, and preserve lock-and-wait semantics — DoD: no earlier subset commits and other writers' commits remain intact — Verify: T018, T020 and T021 pass against the PostgreSQL test environment.
- [ ] T024 [US2] Implement commit-outcome classification and safe console logging in `src/main/java/com/example/capacity/CapacityApplication.java` and `src/main/java/com/example/capacity/TransferTransaction.java`: distinguish confirmed rejection and known pre-commit failure from an unconfirmed commit; report unknown with nonzero exit and require inspection before retry, without asserting rollback or compensating — DoD: no secrets or row contents appear in error output — Verify: T019 passes.
- [ ] T025 [US2] Perform and record manual safety verification in `specs/001-sync-production-capacity/quickstart.md` in the PostgreSQL test environment: invalid input, failure after an earlier write, full-target rollback, both lock ordering directions, and unknown-outcome recovery via controlled simulation — DoD: observed statuses, before/after comparisons and inspection-before-retry procedure are recorded without sensitive data — Verify: compare observations to FR-003 and FR-017–018.

**Checkpoint**: US2 builds on the US1 transfer and can be tested independently with the PostgreSQL test fixtures; both stories must pass before release.

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T026 Update `specs/001-sync-production-capacity/quickstart.md` with exact verified Java 21/Gradle and PostgreSQL test-environment prerequisites, safe external `postgresql.datasource.*` configuration loading, secure `POSTGRES_PASSWORD` provisioning, `./gradlew test`, `./gradlew bootJar`, the actual executable JAR invocation with `--days=5`, exits, lock impact and unknown-commit reconciliation — DoD: another operator can start and test without guessed configuration or committed secrets — Verify: execute the documented build, test and run commands against the PostgreSQL test environment.
- [ ] T027 Run the complete automated suite and the manual scenarios in `specs/001-sync-production-capacity/quickstart.md`; record pass/fail evidence and resolve failures, including relevant data-selection and persistence failures — DoD: all approved requirements are reviewable against observed outcomes — Verify: `./gradlew test` passes against the PostgreSQL test environment and the manual checks T016/T025 are complete.
- [ ] T028 Review deployment readiness in `specs/001-sync-production-capacity/plan.md`: confirm owner approval, schema/privileges/writer coverage and practical transaction sizing, and document any remaining blockers and lock impact — DoD: no production deployment is implied while blockers remain — Verify: compare T001, T003 and T027 evidence to the plan's owner review gate.

## Coverage Matrix

| Required behavior / source | Task IDs |
|---|---|
| FR-001 manual invocation only; non-web CLI contract | T006, T015, T026 |
| FR-002–003 explicit validated days; nonzero and no target changes | T007, T011, T017, T022 |
| FR-004–005 fixed UTC+08:00 calendar window | T007, T011, T016 |
| FR-006 snapshot and `created_at` selection | T008, T010, T012, T013 |
| FR-007 same-database source and target | T003, T004, T006, T012 |
| FR-008 null-safe match and ambiguity | T008, T012, T020, T023 |
| FR-009–010 insert/update all values including ID and creation time | T008, T012, T014 |
| FR-011–013 ignore source `updated_at`, actual millisecond write time, unchanged no-op | T008, T009, T014 |
| FR-014 repeat idempotence | T009, T014, T016 |
| FR-015 source/unrelated preservation, no deletes | T008, T014, T016 |
| FR-016 empty-window success | T008, T015, T016 |
| FR-017 atomicity, known failure, rejected/unknown commit, no false rollback | T018, T019, T023–T025 |
| FR-018 lock-and-wait for all target writers, preserve their commits | T003, T013, T021, T023, T025 |
| CLI contract: configuration, outcomes and secret-safe reporting | T005–T007, T015, T017, T019, T022, T024, T026 |
| SC-001–006, automated tests and manual verification | T007–T010, T016–T021, T025, T027 |
| PostgreSQL test setup, deployment readiness, sizing and documentation | T001, T003, T026, T028 |

## Dependencies & Execution Order

- **Graph**: T001–T003 → T004–T006 → US1 (T007–T016) → US2 (T017–T025) → T026–T028. Confirm the PostgreSQL test connection in T003 before database-backed tests; no broad deployment-environment audit gates implementation.
- T002 precedes T004 and T005; T004 precedes database tests; T005 precedes T006. T006 is required before story execution.
- US1 tests T007–T010 precede their listed implementation tasks. T011 precedes CLI integration; T012 and T013 precede T014–T015; T016 follows a working US1.
- US2 uses the US1 transfer, so it is not an independent implementation from scratch: T017–T021 can be authored after US1's interfaces/fixtures exist, but each must demonstrate a meaningful assertion failure for its specific missing safety behavior before T022–T024. T020/T021 may use deliberately faulty test implementations or injected seams to demonstrate sensitivity if US1 already satisfies the behavior; do not weaken production code. T025 follows safety implementation.
- T026 follows both stories so its commands and configuration can be validated. T027 follows T026 and all manual checks; T028 follows review of the verification evidence.

### Parallel Examples

- **US1**: After T004–T006 and minimal compilable stubs, T007, T008, T009 and T010 can be developed in parallel in separate test files. Merge test interfaces before their respective implementations.
- **US2**: After the US1 interfaces and test fixtures exist, T017–T021 can be developed in parallel in separate test files; coordinate database fixtures so concurrent test runs cannot corrupt each other. T022–T024 share application/transaction files and must be sequenced.

## Implementation Strategy

1. Complete shared setup and test infrastructure; owner approval of the stack and design has been received.
2. Build US1 test-first and validate it in the PostgreSQL test environment as the functional MVP.
3. Add and verify US2's safety paths and concurrency tests before any production release.
4. Complete operator instructions, automated and manual verification, and the deployment readiness review. No migration, scheduler, web interface or automatic retry is in scope.
