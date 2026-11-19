# Research: Production Capacity Transfer

Key behavior choices have been confirmed by the owner and incorporated in the specification. Remaining operational verification and technical proposals are recorded in [plan.md](plan.md); research cannot establish undocumented environment facts.

## Stack and configuration

- **Decision:** Propose Java 21, Spring Boot 3.5.x non-web application, Gradle 8.x (Groovy DSL), PostgreSQL 15.x driver, Spring JDBC and Spring transaction management. Use JUnit 5 and focused real-PostgreSQL integration tests.
- **Rationale:** The user chose the stack; `docs/tech-stack.md` identifies Java 21 and Boot 3.5.x. Direct parameterized SQL is sufficient for a same-database transfer. Real PostgreSQL is needed to test SQL, isolation and constraints. Mock-only tests cannot establish database concurrency behavior.
- **Alternatives considered:** ORM, Spring Batch, multi-module platform, HTTP endpoints and UI add unnecessary scope. H2-only tests do not prove PostgreSQL behavior. The company G2FW stack is explicitly excluded.
- **Configuration finding:** `docs/application.yml` exists and defines `postgresql.datasource.url`, `.username`, `.password`, and `.driver-class-name`, with password `${POSTGRES_PASSWORD}`. This nonstandard prefix will not automatically bind as Spring Boot's `spring.datasource.*`; propose explicit mapping/binding to a `DataSource` without modifying the document or committing secrets. The app's method of loading `docs/application.yml` must be specified because Spring does not automatically load arbitrary files under `docs/`. Owner confirms the isolated PostgreSQL 15 test database is available; verify access through secure means.

## Input and time

- **Decision:** Require exactly one `--days` argument containing positive decimal digits (leading zeros permitted; no sign); parse without overflow, calculate one run date with fixed UTC+08:00, and validate both calendar arithmetic and PostgreSQL/driver timestamp binding range before writes. Bind a half-open time interval as offset-aware instants.
- **Rationale:** FR-002–006 require calendar days including today, a fixed start-of-run window and failure before target changes. Java's date range is broader than PostgreSQL's; Java arithmetic success alone does not prove a parameter is representable by the database.
- **Alternatives considered:** Defaulting missing `days`, moving windows during a run, server-local timezone, and inclusive end are inconsistent with the spec. The owner confirmed the exact syntax: one occurrence, decimal digits only, no sign; leading zeros are allowed.

## Sync algorithm

- **Decision:** Propose an explicit read-and-compare flow using fixed table/column names and bound values: one eligible source snapshot, detect ambiguous eligible keys, compare null-safely with target, insert missing rows, update changed rows, and leave identical and unrelated target rows untouched. Exclude source `updated_at` from both comparison and copy; set target `updated_at` to actual write time truncated to millisecond precision only when writing.
- **Rationale:** This directly implements FR-006–016 and handles source IDs as copied values, not matching keys. Ordinary target unique constraints permit multiple null-shift rows, so they cannot replace duplicate checks.
- **Alternatives considered:** Blind upsert can overwrite a concurrent writer and alter unchanged timestamps; comparing source `updated_at` violates FR-011; copying only changed rows by `updated_at` uses the wrong eligibility criterion. No destructive reconciliation or target deletion is allowed.

## Transaction, concurrent writers, and failures

- **Decision:** The owner selected one Spring-managed PostgreSQL REPEATABLE READ transaction and a `SHARE ROW EXCLUSIVE` lock on `devuser.production_capacity_anan` before any query establishes the snapshot. Wait for a conflicting lock under the configured database behavior, then read the source snapshot and transfer; other target DML, including unrelated rows, waits until commit/rollback. Do not retry automatically on lock, duplicate, constraint, connection or write errors. A known pre-commit failure rolls back all job writes.
- **Rationale:** A consistent source snapshot and atomic writes are required. The lock blocks target writers during the job and makes previously committed data visible before the job's snapshot/check. It does not detect an attempted concurrent change; the amended FR-018 requires waiting instead of detect-and-fail. Validate lock acquisition, privileges and actual writer coverage against the live database before implementation.
- **Alternatives considered:** Partial commits violate atomicity; unconditional upsert may overwrite; ordinary nullable unique constraints do not prevent null-shift duplicates; row locks cannot lock a missing key; SERIALIZABLE alone does not guarantee the desired reject-every-intervening-write behavior. Owner chose lock-and-wait rather than retaining detect-and-fail; the specification has been amended accordingly.
- **Commit ambiguity:** If a connection is lost while COMMIT is being acknowledged, the client cannot tell whether PostgreSQL committed. Owner selected a nonzero outcome-unknown report and manual state reconciliation before retry. FR-017 has been amended accordingly; no false claim of definite rollback or automatic compensation.

No schema migration is proposed. The lock's impact on unrelated target writers must be communicated operationally.

## Testing and sizing

- **Decision:** A few input/window unit tests plus focused PostgreSQL integration tests for actual matching, idempotence, rollback and coordinated lock/wait behavior on the owner-confirmed isolated PostgreSQL 15 database. Test-first practices apply when implementing; no tests are executed in this documentation-only planning phase.
- **Rationale:** Constitution CONST-REVIEW-1 requires success, invalid/boundary input and selection/persistence failure coverage. Database-specific behavior requires database tests; keep setup small and use an isolated existing PostgreSQL instance rather than inventing a platform.
- **Alternatives considered:** No tests violates the constitution; a large infrastructure, benchmark suite or external service is unnecessary. No throughput, memory or row-count target is specified; verify practicality for the actual dataset before selecting eager in-memory loading or batching.
