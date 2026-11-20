# Research: Production Capacity Transfer

This research records design choices for a training/examination utility that performs its transfer on the configured lab/test database. Automated project tests remain local and do not connect to the lab database or verify live schema behavior.

## Stack and configuration

- **Decision:** Propose a small Java/Spring Boot non-web CLI using Spring JDBC. Exact dependency versions and project configuration remain implementation choices.
- **Rationale:** The selected stack supports input validation, SQL selection, and target insert/update/no-op behavior without adding web or UI features.
- **Alternatives considered:** ORM, Spring Batch, a multi-module platform, HTTP endpoints, and UI are outside the basic demo scope.
- **Configuration:** Retain runtime `.env` configuration for the examiner-managed lab/test database connection. Do not commit secrets or print them in logs; credentials are never command-line arguments.

## Input and time

- **Decision:** Require exactly one `--days` argument containing positive decimal digits; leading zeros are allowed and signs are not. Calculate the run date once at fixed UTC+08:00 and use a half-open calendar-day window.
- **Rationale:** This demonstrates the required date-window behavior and rejects invalid input before target changes.
- **Window:** Inclusive midnight `runDate - (days - 1)` through exclusive midnight `runDate + 1`, with endpoints fixed for the run.

## Sync behavior

- **Decision:** Demonstrate selecting eligible source rows using fixed table/column names and bound values, matching on the defined business key, and inserting missing target rows, updating changed rows, or leaving identical rows untouched.
- **Rationale:** This covers the core behavior and repeat-run no-op without expanding the utility into production operational design.
- **Rules:** Do not modify source rows or delete target rows. Compare synchronized values without using source `updated_at` as the update trigger. Preserve the core behavior specified in the feature requirements.

## Errors and scope

- **Decision:** Keep errors basic and clear for invalid arguments and failed transfer operations. Advanced database recovery, concurrency, rollback, and commit-outcome guarantees are deferred.
- **Scope:** The utility uses the configured lab/test database for manual examination use. Automated tests make no lab database connections. Production deployment and production-readiness assessment are out of scope; this project does not independently verify the live schema.
- **Verification status:** This document records design proposals only; it makes no claim that an implementation, environment, or test has been verified.
