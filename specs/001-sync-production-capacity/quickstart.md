# Quickstart and Validation Guide

## Prerequisites

- Java 21 and Gradle 8.x.
- The application reads the root `.env` file for the examiner-managed lab/test database connection. The file is Git-ignored; do not paste secrets into source control, logs, or chat.
- Source access is SELECT-only. Never insert, update, delete, or otherwise perform DML against the source table. Do not reset, truncate, or otherwise clear the target table. Automated tests do not connect to the lab database. Any manual target-writing experiment must be authorized and limited to the lab/test target; do not clean up with a table reset or truncate.
- This project is for training and examination only and is not intended for production deployment; manual transfer runs are for the configured lab/test database only.

## Build and test

From the project root:

```sh
./gradlew test
./gradlew bootJar
```

Automated tests are local-only and must not open lab database connections.

## Manual lab run

The examiner may configure the root `.env` with `POSTGRES_URL`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD`, and `POSTGRES_DRIVER_CLASS_NAME`, then manually run the executable against the authorized lab/test database:

```sh
./gradlew bootRun --args='--days=5'
# Or run the packaged application:
java -jar build/libs/sync-production-capacity-0.1.0.jar --days=5
```

The executable JAR name is fixed by the Gradle project version. A successful run exits 0 and prints the total number of rows inserted or updated; invalid input and straightforward transfer failures exit nonzero. Run only against the authorized lab/test database, never production. Do not reset or truncate the target table, and keep all source operations SELECT-only. Protect `.env` credentials and do not include them in logs, source control, or chat.

## Automated validation scenarios

Use local unit tests and non-database test doubles only; automated tests must not connect to the lab database or create database fixtures. Manual lab runs are separate and controlled by the examiner. Refer to [data-model.md](data-model.md) for fields and [spec.md](spec.md) for behavior.

1. Verify the CLI accepts the supported `--days=<positive integer>` form and rejects missing, duplicate, zero, negative, fractional, nonnumeric, and out-of-range values with a nonzero exit.
2. Verify the requested window uses the intended UTC+08:00 calendar calculation with an inclusive start and exclusive end, including representative month/year boundaries.
3. Verify source selection is SELECT-only and filters by the specified window and source timestamp. Verify eligible records map to target inserts; changed target records update; identical records are no-ops; source rows and unrelated target records remain unchanged; and a repeat run is idempotent.
4. Verify local invalid-input handling with automated tests. Any manual lab transfer failure should be reported as a failure; advanced rollback/unknown-commit semantics are not part of the verified training scope.

Keep automated tests focused on these requirements. Use local unit tests only; no lab database integration tests, connectivity checks, fixture setup, or deployment-readiness validation are required.
