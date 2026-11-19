# Quickstart and Validation Guide

**Planning only:** The application and Gradle build do not yet exist. Commands below are proposed for use after implementation, not commands validated in this repository.

## Prerequisites

- Java 21, Gradle 8.x and access to an isolated PostgreSQL 15.x test database containing both documented tables. Never run destructive fixture setup against shared or production data.
- Use the existing [`docs/application.yml`](../../docs/application.yml) as the connection reference; its `postgresql.datasource.*` keys require explicit runtime loading and mapping into Spring's `DataSource`. Supply `POSTGRES_PASSWORD` securely without recording its value in the repository or logs. The owner reports that an isolated PostgreSQL 15 test database is available; ensure its connection configuration is separate from any shared or production database. Verify actual schema, permissions, writer paths and locking behavior before implementation.
- Follow the amended safety requirements in [spec.md](spec.md) and verify the operational prerequisites in [plan.md](plan.md) before deployment.

## Build and run

From the project root, once the proposed Gradle wrapper and application exist:

```sh
./gradlew test
./gradlew bootJar
java -jar build/libs/<application-jar>.jar --days=5
```

Replace the placeholder with the produced executable JAR. A successful run exits 0; see [CLI contract](contracts/cli.md). Failed runs exit nonzero and must not retain partial changes, subject to the documented commit-outcome ambiguity.

## Minimal validation scenarios

Use controlled fixtures in the isolated database. Assert source rows are unchanged and inspect target values and timestamps before and after each case; refer to [data-model.md](data-model.md) for the fields and [spec.md](spec.md) for exact behavior.

1. With a fixed test clock at 2026-11-16 UTC+08:00, verify `--days=1` and `--days=5`, including exact start and exclusive end, month/year and leap-day boundaries, and a run crossing midnight.
2. Insert eligible source rows covering a new key, changed target, unchanged target, and null shift; include unrelated and out-of-window target rows. Verify copies, preservation of IDs and creation time, write timestamps in UTC+08:00 with millisecond precision, and no changes to unrelated/identical targets. Repeat and confirm no changes on the second run. Also verify an empty source window succeeds.
3. Verify missing, zero, negative, fractional, nonnumeric and out-of-range `days` fail with nonzero exit and no target changes. Check failures caused by duplicate eligible source keys, multiple matching targets, ID collision and an unstoreable value.
4. Force a failure after an earlier write and assert the entire transfer rolled back. With coordinated PostgreSQL sessions, verify a writer already active delays lock acquisition and is visible after it commits; then verify that existing-row updates, previously absent null-shift inserts and unrelated target writes wait while the job holds the lock, and proceed after commit or rollback. The job is not expected to fail merely because a writer waits, as required by the amended FR-018. Verify one source snapshot by changing source data after snapshot creation.

Keep automated tests focused on these requirements; do not add complex test infrastructure merely for coverage. No special test framework is mandated beyond JUnit and a real isolated PostgreSQL instance where database semantics are essential.
