# Quickstart and Validation Guide

**Status:** The local Gradle application and manual CLI are implemented. Unit/build verification and a non-mutating PostgreSQL connectivity/schema check have run. Full transfer acceptance, concurrency, rollback and commit-outcome scenarios remain unverified; do not consider deployment approved until those checks pass.

## Prerequisites

- Java 21, Gradle 8.x and access to an isolated PostgreSQL 15.x test database containing both documented tables. Never run destructive fixture setup against shared or production data.
- The application reads the root `.env` file. Provide non-empty `POSTGRES_URL`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, and `POSTGRES_DRIVER_CLASS_NAME` entries there. The file is Git-ignored; do not paste secrets into source control, logs, or chat. Ensure the URL points to the authorized test database, never production/shared data. The application maps these to the custom datasource properties at startup.
- The first manual run executes INSERT/UPDATE operations in the target table. Use only a database authorized for test writes, and inspect the eligible source set and target before running. A test-password alone does not ensure the database is safe for test writes.
- Follow the amended safety requirements in [spec.md](spec.md) and verify the operational prerequisites in [plan.md](plan.md) before deployment.

## Build and run

From the project root:

```sh
./gradlew test
./gradlew bootJar
./gradlew bootRun --args='--days=5'
# Or run the packaged application:
java -jar build/libs/sync-production-capacity-0.1.0.jar --days=5
```

The executable JAR name is fixed by the Gradle project version. A successful run exits 0; see [CLI contract](contracts/cli.md). Failed runs exit nonzero. A generic failure does not confirm rollback; inspect target state before retrying if the commit result is uncertain. `./gradlew test` includes the non-mutating connectivity/schema smoke test when the ignored root `.env` contains valid test settings; tests never create or reset database tables.

## Minimal validation scenarios

Use controlled fixtures in the isolated database. Assert source rows are unchanged and inspect target values and timestamps before and after each case; refer to [data-model.md](data-model.md) for the fields and [spec.md](spec.md) for exact behavior.

1. With a fixed test clock at 2026-11-16 UTC+08:00, verify `--days=1` and `--days=5`, including exact start and exclusive end, month/year and leap-day boundaries, and a run crossing midnight.
2. Insert eligible source rows covering a new key, changed target, unchanged target, and null shift; include unrelated and out-of-window target rows. Verify copies, preservation of IDs and creation time, write timestamps in UTC+08:00 with millisecond precision, and no changes to unrelated/identical targets. Repeat and confirm no changes on the second run. Also verify an empty source window succeeds.
3. Verify missing, zero, negative, fractional, nonnumeric and out-of-range `days` fail with nonzero exit and no target changes. Check failures caused by duplicate eligible source keys, multiple matching targets, ID collision and an unstoreable value.
4. Force a failure after an earlier write and assert the entire transfer rolled back. With coordinated PostgreSQL sessions, verify a writer already active delays lock acquisition and is visible after it commits; then verify that existing-row updates, previously absent null-shift inserts and unrelated target writes wait while the job holds the lock, and proceed after commit or rollback. The job is not expected to fail merely because a writer waits, as required by the amended FR-018. Verify one source snapshot by changing source data after snapshot creation.

Keep automated tests focused on these requirements; do not add complex test infrastructure merely for coverage. No special test framework is mandated beyond JUnit and a real isolated PostgreSQL instance where database semantics are essential.
