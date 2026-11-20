# Feature Specification: Synchronize Production Capacity

**Feature Branch**: `feat/001-sync-production-capacity`

**Created**: 2026-11-18

**Status**: Draft

**Input**: Demonstrate a manually invoked training utility that synchronizes production-capacity records for a requested number of calendar days, including today, using source reads and target insert/update/no-op behavior.

## Clarifications

### Session 2026-11-18

- Q: How should the conflict between the requested window and CONST-TRANSFER-1 be resolved? → A: Preserve the requested window, including today, and pursue a separate constitution amendment.
- Q: How should the application signal invalid input or a failed transfer? → A: Print a clear error message and return a non-zero process exit code.

### Training scope decision

- This project is for training and examination only. The examiner may run the real transfer against the configured lab/test database; automated tests do not open lab database connections. The project is not intended for production deployment.
- Keep the utility focused on the CLI, fixed requested-day window, source SELECT, target insert/update/no-op behavior, repeat behavior, and straightforward invalid-input/error reporting. Advanced transaction, concurrency, and deployment guarantees are out of scope; see the Deviation Log at the end of this specification.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Synchronize a requested window (Priority: P1)

As the application owner, I want to manually run a transfer for a specified number of days so that the target reflects eligible source records without changing unrelated data.

**Why this priority**: Selecting and transferring the requested records is the application's central purpose.

**Independent Test**: Use local test doubles for automated window and mapping checks; the examiner may separately demonstrate transfer behavior against the configured lab/test database.

**Acceptance Scenarios**:

1. **Given** the run date is 2026-11-16 in UTC+08:00, **When** the owner runs with `--days=5`, **Then** source records created at or after 2026-11-12 00:00:00 +0800 and before 2026-11-17 00:00:00 +0800 are eligible; records at the exclusive end or before the start are not.
2. **Given** an eligible source record has no target match, **When** the transfer succeeds, **Then** a target record is inserted with all synchronized source values, including its ID and creation time, and a new last-written timestamp.
3. **Given** an eligible source record matches a target record whose synchronized values differ, including only the ID, **When** the transfer succeeds, **Then** the target is updated to the source values including the source ID, and its last-written timestamp records the write time.
4. **Given** a matching target has identical synchronized values, even if the source last-updated timestamp differs, **When** the transfer succeeds, **Then** that target and its last-written timestamp remain unchanged.
5. **Given** no eligible source record corresponds to a target record, **When** the transfer succeeds, **Then** that target record remains unchanged.
6. **Given** no source records are eligible, **When** the owner runs with a valid `days` value, **Then** the run succeeds and no target data changes.

### User Story 2 - Reject invalid requests (Priority: P2)

As the application owner, I want invalid requests to be rejected clearly so that the local training demo does not run with an invalid window.

**Why this priority**: Basic input validation prevents accidental invocation with an invalid date range.

**Independent Test**: Launch the CLI with invalid `days` values and assert nonzero exit status and a clear error before any transfer or database access.

**Acceptance Scenarios**:

1. **Given** `days` is absent, zero, negative, fractional, nonnumeric, or outside the supported date range, **When** the owner launches the application, **Then** it prints an error and returns a non-zero exit code before transfer invocation.
2. **Given** an input or transfer validation failure occurs, **When** the CLI reports the failure, **Then** it does not print credentials or record values.

### Edge Cases

- `days=1` selects only the run date in UTC+08:00; date arithmetic crosses month, year, and leap-day boundaries as calendar dates.
- A run crossing midnight uses the window established at its start; the actual write time is used for each changed record.
- Source values that are empty or null remain empty or null where the schema permits them; null shift values match each other.
- If multiple eligible source records share a matching key, or an eligible source record matches multiple target records, the transfer reports an error rather than choosing arbitrarily. Unrelated duplicate keys do not affect the run.
- If preserving an ID would conflict with another target record or a value cannot be stored, the transfer reports a nonzero failure. The training demo does not claim atomic rollback of earlier writes.
- A missing, invalid, or unrepresentably large `days` value is rejected before any target change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The owner MUST explicitly launch each run; the application MUST NOT run transfers on a schedule or automatically.
- **FR-002**: Each run MUST accept the externally supplied command-line argument `--days=<value>`, where the value is a positive integer number of calendar days including the run date.
- **FR-003**: The application MUST report a clear error for a missing, invalid, or unrepresentable `days` value before changing any target data and MUST return a non-zero process exit code.
- **FR-004**: At the start of each run, the application MUST determine the run date once using the fixed UTC+08:00 offset and retain that date window for the entire run.
- **FR-005**: The window MUST start inclusively at midnight UTC+08:00 on the date `(days - 1)` calendar days before the run date and end exclusively at midnight UTC+08:00 immediately after the run date.
- **FR-006**: The application MUST select source records whose `created_at` falls in that window, regardless of production record date or source last-updated timestamp.
- **FR-007**: The source is `production_capacity` and the target is `production_capacity_anan`, both in the same database and with the same record fields.
- **FR-008**: A source and target record MUST match by plant, production line, production record date, and shift; null shift values match null shift values. An ambiguous match MUST fail the run rather than select a record arbitrarily.
- **FR-009**: The application MUST insert an eligible source record when no matching target exists, preserving the source ID, creation time, and all other synchronized values, including empty and null values where allowed.
- **FR-010**: When any synchronized value differs for a matching record, including the ID or creation time, the application MUST update that target record to the source's synchronized values, including the source ID.
- **FR-011**: The source last-updated timestamp MUST NOT be synchronized or considered when determining whether a record differs.
- **FR-012**: For each inserted or updated target record, the target last-written timestamp MUST represent the actual write time in UTC+08:00 with millisecond precision.
- **FR-013**: When all synchronized values match, the target record MUST NOT be updated and its last-written timestamp MUST remain unchanged.
- **FR-014**: Repeating a successful run with unchanged source data and the same window MUST NOT create duplicates or change identical records.
- **FR-015**: Target records without a corresponding eligible source record MUST remain unchanged; source records MUST NOT be modified and target records MUST NOT be deleted.
- **FR-016**: A valid run with no eligible source records MUST succeed without changing target data.
- **FR-017**: On success, the CLI MUST report the total number of target rows inserted or updated. It MUST report straightforward validation or transfer failures as nonzero outcomes and MUST NOT print credentials or record values. Database commit and rollback semantics are not part of the locally verified training-demo contract.

### Key Entities *(include if feature involves data)*

- **Production capacity record**: Source or target values consisting of ID, plant, line, record date, shift, quantities, defect rate, status, remarks, creation time, and last-updated or last-written time. The plant, line, date, and shift identify a match; the ID is a synchronized value, not the matching key.
- **Transfer run**: A manual training-demo request with a validated day count and one fixed UTC+08:00 date window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Local window tests for `days=1` and `days=5` cover the inclusive start and exclusive end boundaries.
- **SC-002**: Local transfer-mapping tests cover eligible source values, matching behavior, target insert/update/no-op decisions, and preservation of unrelated target rows.
- **SC-003**: Local tests confirm an identical repeated transfer decision does not request an additional target write.
- **SC-004**: Local tests of missing, invalid, and out-of-range input confirm a clear error and nonzero exit before transfer invocation.
- **SC-005**: In local tests of invalid input and straightforward validation failures, 100% of cases report a nonzero outcome without exposing credentials or record values.
- **SC-006**: In tests of inserts and updates, 100% of changed records have a last-written time corresponding to the actual write, expressed in UTC+08:00 to millisecond precision.

## Assumptions

- This is a training and examination project. Manual runs use the configured lab/test database to read source rows and write target rows; automated tests MUST NOT open lab database connections.
- The project is not intended for production deployment and does not claim advanced rollback, concurrency, or deployment verification.
- The source and target schema descriptions in `docs/database-schema.md` identify the available fields and permitted null values. A last-written timestamp is the target's `updated_at`; the source field of that name is excluded from synchronization.
- The examiner avoids intentionally overlapping manual lab runs. Source records are selected using the requested window; snapshot isolation and concurrency behavior are not specified by this training contract. Ambiguous matches for eligible source records, including duplicate null-shift keys, cause the run to fail rather than be reconciled.
- Values or dates that cannot be represented by the local input/window logic are errors rather than silently rounded, truncated, or skipped, except for the explicitly required millisecond precision of the target last-written time.
- **Governance resolution**: Constitution version 3.0.0 permits the specification to define the requested time period, including the run date; the window in FR-005 remains unchanged.

## Deviation Log

The following original specification text is retained verbatim as a record of scope changes. These advanced database transaction and concurrency requirements are deferred because this is a training utility manually used on a lab/test database, not a production deployment.

### Original snapshot requirement (FR-006)

> The application MUST select source records from one consistent snapshot for the run, including only records whose `created_at` falls in that window, regardless of production record date or source last-updated timestamp. Source changes after that snapshot MUST NOT affect the run.

### Original atomicity and commit outcome requirement (FR-017)

> All inserts and updates in one run MUST be atomic; no earlier subset may remain committed. For a known failure before commit, the application MUST print a clear error, return a non-zero process exit code, and roll back all target changes made by the run. For a commit known to have been rejected, it MUST report failure and return a non-zero exit code without claiming that the run committed. If the final commit outcome cannot be determined, the application MUST report the outcome as unknown, return a non-zero process exit code, and MUST NOT claim that the run rolled back. The owner MUST inspect the target state before retrying.

### Original target writer lock requirement (FR-018)

> Before taking the source snapshot or checking target records, the transfer MUST wait for existing target writers to finish and obtain exclusive write access to the target. While the transfer holds that access, other processes attempting to write any target record, including unrelated records and previously absent keys, MUST wait until the transfer commits or rolls back. An attempted concurrent write MUST NOT by itself make the transfer fail. The transfer MUST NOT undo another process's committed changes.

These database and concurrency guarantees are not implemented, tested, or claimed by the training deliverable.
