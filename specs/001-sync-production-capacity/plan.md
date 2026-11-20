# Implementation Plan: Synchronize Production Capacity

**Branch**: `feat/001-sync-production-capacity` | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)

**Status**: Training/examination utility for manually transferring records between the configured lab source and target tables. It is not intended for production deployment. Automated verification is limited to local tests; the test suite makes no lab database connections.

## Summary

Use a small, manually invoked, non-web Spring Boot CLI utility to transfer production-capacity records between the configured lab source and target tables. It validates arguments, calculates a date window, performs a source `SELECT`, and inserts, updates, or leaves target rows unchanged. Repeating a run with unchanged source data should leave identical target rows alone. Automated tests remain local and do not connect to a lab database; manual use is performed by the examiner against the configured lab/test database.

## Existing Design Confirmation

| Source | Applicability | Proposal / rationale |
|---|---|---|
| [Constitution](../../.specify/memory/constitution.md) | Governs scope and review | Keep this a small, transfer-focused training demo. |
| [Feature specification](spec.md) | Defines the approved training utility behavior | Follow the lab-transfer core behavior and documented scope deviations. |
| [Database schema documentation](../../docs/database-schema.md) and linked schema references | Reference for table/field names | Use as the documented mapping for the lab transfer; the project does not claim independent schema verification. |
| [`docs/application.yml`](../../docs/application.yml) | Configuration reference | Retain `.env` runtime configuration for the examiner's manually managed lab connection. |
| [Technology stack](../../docs/tech-stack.md) and [Spring Boot rules](../../docs/rules/spring-boot.md) | Technology guidance | Java/Spring Boot/JDBC proposal, subject to implementation review. |
| User planning input | Scope and exclusions | Real lab database transfer is the purpose; no production deployment and no automated database tests. |

## Technical Context

- **Language/Version**: Java 21 proposal.
- **Primary Dependencies**: Spring Boot non-web application, Spring JDBC and transaction support, PostgreSQL JDBC driver, and Gradle proposal. Exact versions remain implementation choices.
- **Storage**: One configured lab/test PostgreSQL database containing the source and target tables.
- **Testing**: Local unit tests only; no automated test opens a lab database connection. The examiner manually controls lab/test runs.
- **Target Platform**: Training/examination lab environment, not production deployment.
- **Project Type**: Manually invoked CLI demo; no HTTP server.
- **Performance Goals**: None specified.
- **Constraints**: Validate one positive decimal `--days` value; use a fixed UTC+08:00 calendar window; demonstrate source selection and target insert/update/no-op; do not modify source or delete target rows; avoid logging secrets.
- **Scale/Scope**: Training demonstration only; no throughput or production workload claims.

## Constitution Check

| Principle | Assessment |
|---|---|
| **CONST-SCOPE-1** | Aligned: manually invoked lab/test-transfer utility; no scheduler, endpoint, deployment, or unrelated capability. |
| **CONST-REQ-1** | Aligned: implementation details remain proposals rather than additional requirements. |
| **CONST-TRANSFER-1** | Aligned: required positive `days` selects calendar days including today in UTC+08:00. |
| **CONST-SIMPLE-1** | Aligned: propose a focused CLI and direct SQL for the demonstrated transfer. |
| **CONST-REVIEW-1** | Review status is not asserted here; this is a training-demo proposal. |

**Gate result**: Scope is limited to the training/examination utility and manually controlled lab/test transfer use. Automated tests do not connect to the lab database. Production deployment/readiness validation is not part of this plan.

## Implementation Details

### Validation and window

Accept exactly one explicit `--days=<value>` for each manual run. Accept decimal digits only, with leading zeros permitted if the numeric value is positive. Reject missing, repeated, signed, empty, nonnumeric, fractional, zero, negative, or unrepresentable values with a clear error before target changes. Calculate the window once using UTC+08:00: inclusive midnight `runDate - (days - 1)` through exclusive midnight `runDate + 1`. Keep the window fixed for the run. For example, five days on 2026-11-16 selects `[2026-11-12 00:00 +08:00, 2026-11-17 00:00 +08:00)`.

### Sync rules

1. Select source rows whose `created_at` is within the fixed half-open window.
2. Match rows using the business key defined by the specification, treating null shift values as equal where applicable.
3. Insert a target row when no match exists; update a matching target row only when synchronized values differ; otherwise perform no write.
4. Do not change source rows or delete target rows. A repeated run with unchanged source data should leave already-identical target rows unchanged.
5. Report basic invalid-input and transfer errors clearly, without printing secrets or record contents.

Use fixed schema-qualified identifiers and bound values in SQL. The behavior is a training utility, not a production concurrency or recovery design.

### Configuration and execution

- **Configuration**: Retain `.env` configuration for the examiner-managed lab/test database connection. Do not put secrets in source control or logs.
- **Initialization flow**: Manually launch → parse and validate input → calculate the fixed date window → select source rows → insert/update/no-op target rows → exit.
- **Errors**: Provide clear errors for invalid input or transfer failures without exposing credentials or record values. Advanced transaction-outcome reporting is deferred by the training-scope deviation.
- **Deployment**: No production deployment. The executable is intended for manually controlled examination-lab use.

## Contract Coverage

| Contract | Requirement |
|---|---|
| [CLI invocation and outcome](contracts/cli.md) | Manual `--days` invocation, window, basic errors, and transfer behavior |

No HTTP or UI contract exists. Source/target field references are in [data-model.md](data-model.md).

## Project Structure

```text
specs/001-sync-production-capacity/
├── spec.md              # feature requirements
├── plan.md              # this plan
├── research.md          # design research
├── data-model.md        # fields and rules
└── contracts/cli.md     # manual CLI contract

# Proposed implementation only; not created by this planning task:
build.gradle
settings.gradle
src/main/java/           # CLI entry point and transfer behavior
src/main/resources/      # runtime configuration
```

**Structure Decision**: Propose a single small Gradle project for the training demo. Implementation files are not created by this planning task.
