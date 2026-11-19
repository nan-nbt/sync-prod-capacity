# Implementation Plan: Synchronize Production Capacity

**Branch**: `feat/001-sync-production-capacity` | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)

**Status**: Draft proposal; the owner-approved specification now describes lock-and-wait concurrency and unknown commit outcomes. No requirement-conflict blocker remains. Verify the deployed database schema, privileges and locking behavior before implementation or deployment.

## Summary

Propose a small, manually invoked, non-web Spring Boot job using parameterized Spring JDBC against one PostgreSQL database. It validates the required calendar-day window, takes a consistent source snapshot, matches by the specified business key, and inserts or updates only differing target rows in one transaction. Per owner preference, the proposal is to acquire a target-table lock before the snapshot so concurrent target writers wait until commit; the amended FR-018 requires this lock-and-wait behavior.

## Existing Design Confirmation

| Source | Applicability | Proposal / rationale | Owner decision / verification |
|---|---|---|---|
| [Constitution v3.0.0](../../.specify/memory/constitution.md) | Governs scope, window, simplicity and review | Single transfer only; design and verification presented for review | Owner review pending |
| [Feature specification](spec.md), FR-001–018 | Defines transfer, CLI and safety behavior | Implement lock-and-wait target serialization and outcome-unknown reporting as specified | Updated by owner-confirmed decision; see subsequent owner decision in spec.md |
| [Database schema index](../../docs/database-schema.md) and linked DBML/DDL | Source and target columns and constraints | Copy matching fields; target `updated_at` is write time | Verify live schema, triggers, RLS, partitions, permissions and writers |
| [`docs/application.yml`](../../docs/application.yml) | Existing PostgreSQL connection configuration | Preserve its `postgresql.datasource.*` prefix and propose explicit binding/translation to Spring's `DataSource`; password remains `${POSTGRES_PASSWORD}` | Owner confirms file exists and prefix mapping; verify externally supplied password and safe handling |
| [Technology stack](../../docs/tech-stack.md) and [Spring Boot rules](../../docs/rules/spring-boot.md) | Java 21, Boot 3.5, Gradle, logging and test guidance | Single small Gradle project; constructor injection, focused runner/service, SLF4J and Log4j2; no platform modules | Owner review pending; constitution's simplicity takes precedence over unrelated multi-module infrastructure |
| User planning input | Selected stack, scope and exclusions | Boot 3.5.x, Gradle 8.x, PostgreSQL 15.x, Spring JDBC; no ORM, web, UI, G2FW or unnecessary features | Explicitly requested; detailed design remains pending |

## Technical Context

- **Language/Version**: Java 21 (proposal).
- **Primary Dependencies**: Spring Boot 3.5.x non-web core, Spring JDBC/transaction management, PostgreSQL JDBC driver, SLF4J/Log4j2. Gradle 8.x, Groovy DSL. Choose compatible patch versions at implementation.
- **Storage**: PostgreSQL 15.x, same database for existing `devuser.production_capacity` and `devuser.production_capacity_anan`.
- **Testing**: JUnit 5, with a few unit tests and focused integration tests against an isolated PostgreSQL 15 instance; no elaborate testing platform.
- **Target Platform**: JVM with network access and authorized database credentials; operating environment not specified.
- **Project Type**: Manual CLI ETL batch; no HTTP server.
- **Performance Goals**: None specified; no invented throughput target.
- **Constraints**: Exactly one explicit `--days` argument containing positive decimal digits; fixed UTC+08:00; consistent source snapshot; no source writes or target deletes; atomic target writes; null-safe key matching; truncate write time to milliseconds; target-table lock-and-wait as required by FR-018; no secrets in logs.
- **Scale/Scope**: Two existing tables, one job. Expected source volume and practical memory/transaction duration are unknown; select streaming/batching only if required while retaining one transaction and snapshot.

## Constitution Check

| Principle | Before research | Post-design assessment |
|---|---|---|
| **CONST-SCOPE-1** | Pass | Pass: transfer-only job; no scheduling, endpoints or unrelated capability. |
| **CONST-REQ-1** | Pass | Pass: amended requirements describe observable behavior; technical proposals are separate. |
| **CONST-TRANSFER-1** | Pass | Pass: required positive `days` explicitly selects calendar days including today in UTC+08:00; validate before writes. |
| **CONST-SIMPLE-1** | Pass | Direct JDBC, one transaction and one target-table lock meet the clarified transfer scope without additional infrastructure. |
| **CONST-REVIEW-1** | Conditional | Owner has reviewed and selected the principal behavior; live schema verification and implementation verification tests remain required before considering the feature complete. |

**Gate result: Pass for planning; implementation review items remain.** The specification has been updated to require lock-and-wait instead of detect-and-fail, and to report unknown commit outcomes honestly. The target lock delays all target writers, including unrelated writes. Verify actual database privileges/schema/lock behavior before implementing against the deployed database; no migration is proposed.

## Implementation Details

### Validation and window

Accept exactly one `--days=<value>` explicitly for each manually launched run. Accept decimal digits only with leading zeros permitted when the value is positive; reject duplicate arguments and any sign. Reject missing, nonnumeric, fractional, zero, negative, overflowing or unrepresentable values with a clear console error and nonzero process exit code before any target write. Parse safely without integer overflow; validate calendar arithmetic and both endpoint instants against Java, JDBC and PostgreSQL supported ranges rather than relying only on Java's larger date range. Record one run date using a clock at fixed UTC+08:00. Bind the inclusive start at midnight `runDate - (days - 1)` and exclusive end at midnight `runDate + 1`. `days=1` means only today; month/year/leap-day arithmetic is calendar-based. Keep these endpoints fixed even if the run crosses midnight. Example for 2026-11-16 and five days: `[2026-11-12 00:00 +08:00, 2026-11-17 00:00 +08:00)`.

### Sync rules

1. Read source rows whose `created_at` falls in the fixed half-open interval from one consistent database snapshot; later source edits do not alter the selected values.
2. Match `(plant_code, line_code, record_date, shift_type)` with null shifts equal. Reject duplicate eligible source keys or multiple target matches for an eligible key; unrelated duplicates do not matter. The documented ordinary unique constraints do not enforce null-equal uniqueness.
3. Insert a missing target, preserving source `id`, `created_at` and all other synchronized values. For an existing match, compare all synchronized values including ID and creation time using null-safe equality; update only if any differs. Do not compare or copy source `updated_at`.
4. On each insert or update, set target `updated_at` to actual write time in UTC+08:00 at millisecond precision, not transaction-start time. PostgreSQL `clock_timestamp()` is a candidate for actual write-time evaluation; `now()` is fixed at transaction start and is unsuitable. PostgreSQL `timestamptz` represents an instant rather than a stored timezone; render it at UTC+08:00. Truncate sub-millisecond digits rather than round, as confirmed by the owner.
5. Do not touch identical or unrelated targets, modify source, or delete target rows. ID collisions, invalid values, ambiguous matches and SQL errors fail the run. Repeat runs with unchanged source and window leave identical rows and their timestamps unchanged.

Use fixed schema-qualified identifiers and parameter binding for all values. Do not use blind conflict-upserts, which can overwrite another writer or change an unchanged row's timestamp.

### Transaction, concurrency and failure handling

Use one Spring-managed PostgreSQL REPEATABLE READ transaction, one consistent source snapshot and no intermediate commits. After transaction start and before any query or DML establishes the snapshot, acquire a `SHARE ROW EXCLUSIVE` lock on `devuser.production_capacity_anan`; wait for conflicting existing writers under PostgreSQL's configured lock-wait behavior. Once acquired, read the source snapshot, check target matches and transfer, then commit. The lock remains held until commit or rollback. Other target DML, including changes to unrelated keys, waits; a writer that completes before lock acquisition is included in subsequent target checks. Verify exact behavior, permissions, timeouts, RLS, partitions and writer paths on the live schema before implementation. Lock errors or timeout cause failure; do not automatically retry.

The amended FR-018 requires lock-and-wait: competing writers are delayed, not detected as conflicts. Row locks cannot lock an absent key; ordinary nullable unique constraints and SERIALIZABLE isolation alone are not a substitute. On a known pre-commit failure, roll back the whole run, log a clear error without secrets and return a nonzero exit code. Report zero for success, including an empty source window.

If a connection is lost during COMMIT, the server may have committed although the client received no confirmation. Report **outcome unknown**, not a definite rollback; the operator must inspect target state before any retry. FR-017 now explicitly permits an outcome-unknown report if commit acknowledgement is lost; operator inspection is required before retrying. No automatic compensation or modification of another process's committed work is proposed.

### Paths, dependencies, operations

- **File paths** (proposed, not created): root `settings.gradle`, `build.gradle`, Gradle wrapper, `src/main/java/...` for application runner and a focused transfer service, `src/main/resources/application.yml`, and `src/test/java/...` for minimal tests. Keep package names and exact class split subject to review; do not create framework layers without a demonstrated need.
- **Dependencies**: Boot non-web, `spring-boot-starter-jdbc`, PostgreSQL JDBC driver, `spring-boot-starter-log4j2` with default logging excluded, JUnit 5 and Spring test support as needed; no ORM, web starter, G2FW, or Spring Batch.
- **Configuration**: `spring.main.web-application-type=none`; load or otherwise explicitly map the documented `postgresql.datasource.url`, `postgresql.datasource.username`, `postgresql.datasource.password` and `postgresql.datasource.driver-class-name` into the Spring `DataSource`; these custom-prefix keys are not automatically bound as `spring.datasource.*`. Preserve the `POSTGRES_PASSWORD` environment placeholder; never commit a password. Decide how the runtime receives the documented file without assuming `docs/` is automatically loaded by Spring. No default production profile.
- **Initialization flow**: Manually launch → parse and validate input and calculate window → start transaction and acquire target lock → establish snapshot → compare/write → commit → close context and return exit status. Startup must not implicitly execute without explicit valid arguments.
- **Security / ACL**: No application ACL or HTTP authentication; use a least-privilege database account and verified access to both tables. Actual privilege requirements depend on the approved concurrency strategy. Never log credentials or row contents.
- **Error / logging**: A clear console error and nonzero exit for invalid input or known transfer failure; separate outcome-unknown status text for commit uncertainty. Log transfer start/end and failure category without secrets. Do not leak database values.
- **Batch behavior**: One atomic run, no intermediate commits and no automatic retry. Start with the clearest per-record operations; configurable batching only if needed and without changing transactional semantics.
- **Deployment**: Manually invoked executable JAR; no web server, probes or scheduler.
- **Rollback**: A known transaction error rolls back database changes. For deployment rollback, stop launching the new JAR and revert the release; do not delete or revert persisted user data automatically. A lost commit acknowledgement requires manual reconciliation.

**Owner Review Gate:** The owner confirmed exact `days` syntax, timestamp truncation, configuration prefix mapping, table lock and wait, outcome-unknown reporting, and use of an available isolated PostgreSQL 15 test database. The safety changes are now recorded in the specification. Verify deployed schema/privileges and writer coverage, select a configuration loading method, and assess sizing before production deployment; run the required tests against the isolated database.

## Contract Coverage

| Contract | Requirement |
|---|---|
| [CLI invocation and outcome](contracts/cli.md) | US1, US2; FR-001–006, FR-016–018, including outcome-unknown reporting |

No HTTP or UI contract exists. Source/target data and behavior are detailed in [data-model.md](data-model.md); operational scenarios are in [quickstart.md](quickstart.md).

## Project Structure

```text
specs/001-sync-production-capacity/
├── spec.md              # amended feature requirements
├── plan.md              # this draft
├── research.md          # design research
├── data-model.md        # fields and rules
├── contracts/cli.md     # manual CLI contract
└── quickstart.md        # validation guide

# Proposed implementation only; not created by this planning task:
build.gradle
settings.gradle
src/main/java/           # batch entry point and transfer service
src/main/resources/      # externalizable configuration
src/test/java/           # focused input and PostgreSQL tests
```

**Structure Decision**: Propose a single Gradle project; existing Docusaurus documentation files remain unrelated. `tasks.md` belongs to a later task-planning command and is not generated here.

## Needs Clarification

| ID | Question / Conflict | Source | Blocking? |
|---|---|---|---|
| NC-001 | Resolved: FR-018 specifies target write serialization with waiting. Verify locking and actual writer paths in the deployed database. | [spec.md](spec.md) FR-018; [target DDL](../../docs/db_schema/production_capacity_anan.sql) | No requirement conflict; operational verification required |
| NC-002 | Resolved: FR-017 requires an outcome-unknown report and manual reconciliation if the commit outcome cannot be determined. | [spec.md](spec.md) FR-017 | No |
| NC-003 | Configuration file exists; verify actual deployed schema, triggers, RLS, partitions, privileges and writers, and determine how the application loads or maps its custom keys without exposing credentials. | [application.yml](../../docs/application.yml); [schema index](../../docs/database-schema.md) | Verification required before implementation against the deployed database |
| NC-004 | Resolved: exactly one positive decimal `--days` value; leading zeros allowed, signs and repeated options rejected. | Owner confirmation | No |
| NC-005 | Resolved: truncate sub-millisecond write time. | Owner confirmation | No |
| NC-006 | Owner reports an isolated PostgreSQL 15 test database is available. Data volume and acceptable transaction duration remain unspecified; verify access and suitability securely. | Owner confirmation | Sizing review before choosing data handling |

## Authoritative Source Writeback List

| Target Document | Change Summary | Status |
|---|---|---|
| `specs/001-sync-production-capacity/spec.md` | Amend FR-018 and related acceptance criteria for lock-and-wait and FR-017 for outcome-unknown | Done following owner authorization |
| `docs/application.yml` | Existing custom-prefix datasource reference; preserve `${POSTGRES_PASSWORD}` and verify runtime loading | Present; no document change proposed |
| `docs/database-schema.md` and linked schema references | Reconcile with deployed schema if verification finds discrepancies; no migration proposed | Pending verification |

## Complexity Tracking

No constitutional violation is justified or waived. Table locking is the owner-selected approach for the amended FR-018; confirm its behavior and operational impact in the target environment.
