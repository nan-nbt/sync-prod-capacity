# Feature Specification: Synchronize Production Capacity

**Feature Branch**: `feat/001-sync-production-capacity`

**Created**: 2026-11-18

**Status**: Draft

**Input**: Manually synchronize production-capacity records for a requested number of calendar days, including today, while preserving data, serializing target writes, and rolling back known failed transfers.

## Clarifications

### Session 2026-11-18

- Q: How should the conflict between the requested window and CONST-TRANSFER-1 be resolved? → A: Preserve the requested window, including today, and pursue a separate constitution amendment.
- Q: What should happen if source records change during a run? → A: Use one consistent snapshot of eligible source records for the run.
- Q: How should the transfer handle concurrent changes to target records it must insert or update? → A: Fail and roll back the run rather than overwrite the concurrent change.
- Q: When does the target conflict-detection period begin? → A: When the run first checks the target record or determines that no matching target record exists; it ends at transfer commit.
- Q: How should the application signal invalid input or a failed transfer? → A: Print a clear error message and return a non-zero process exit code.
- Q: How should target changes be applied when a run has multiple eligible records? → A: Apply all inserts and updates atomically; any failure rolls back the entire run.

### Subsequent owner decision

- The earlier detect-and-fail answers about concurrent target changes are superseded: target writers wait while the transfer has exclusive write access; the transfer waits for existing target writers before taking its source snapshot. This applies to unrelated target records too.
- If the final commit outcome cannot be determined, report an unknown outcome with a non-zero exit code rather than assert a rollback. The owner must inspect the target before retrying. Known failures before commit still roll back all transfer writes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Synchronize a requested window (Priority: P1)

As the application owner, I want to manually run a transfer for a specified number of days so that the target reflects eligible source records without changing unrelated data.

**Why this priority**: Selecting and transferring the requested records is the application's central purpose.

**Independent Test**: Prepare source and target records inside and outside a known window, manually run with `--days=5`, and compare the resulting records and timestamps with the expected values.

**Acceptance Scenarios**:

1. **Given** the run date is 2026-11-16 in UTC+08:00, **When** the owner runs with `--days=5`, **Then** source records created at or after 2026-11-12 00:00:00 +0800 and before 2026-11-17 00:00:00 +0800 are eligible; records at the exclusive end or before the start are not.
2. **Given** an eligible source record has no target match, **When** the transfer succeeds, **Then** a target record is inserted with all synchronized source values, including its ID and creation time, and a new last-written timestamp.
3. **Given** an eligible source record matches a target record whose synchronized values differ, including only the ID, **When** the transfer succeeds, **Then** the target is updated to the source values including the source ID, and its last-written timestamp records the write time.
4. **Given** a matching target has identical synchronized values, even if the source last-updated timestamp differs, **When** the transfer succeeds, **Then** that target and its last-written timestamp remain unchanged.
5. **Given** no eligible source record corresponds to a target record, **When** the transfer succeeds, **Then** that target record remains unchanged.
6. **Given** no source records are eligible, **When** the owner runs with a valid `days` value, **Then** the run succeeds and no target data changes.
7. **Given** an eligible source record changes after the run's source snapshot is taken, **When** the transfer succeeds, **Then** the target reflects the source values from that snapshot, not the later change.

### User Story 2 - Reject invalid or failed transfers safely (Priority: P2)

As the application owner, I want invalid requests and known failed transfers to leave target data unchanged, and uncertain outcomes to be reported honestly, so that I can inspect the data before a safe repeat.

**Why this priority**: Protecting existing data is essential when a request or transfer cannot complete.

**Independent Test**: Try invalid `days` values, then force a failure after at least one intended write and compare the entire target before and after each run.

**Acceptance Scenarios**:

1. **Given** `days` is absent, zero, negative, fractional, nonnumeric, or outside the representable date range, **When** the owner launches the application, **Then** it prints an error, returns a non-zero exit code, and does not change any target data.
2. **Given** at least one target write has occurred during a transfer, **When** a later selection or write fails, **Then** the run prints an error, returns a non-zero exit code, and none of that run's target changes remain.
3. **Given** a successful run, **When** the owner repeats it with the same window and unchanged source data, **Then** no duplicate target records are created and unchanged target timestamps remain unchanged.
4. **Given** another process is writing to the target when the transfer starts, **When** the transfer requests exclusive write access, **Then** it waits for that writer to finish before taking its source snapshot and checking target records.
5. **Given** the transfer has exclusive write access to the target, **When** another process attempts to write any target record, including an unrelated record or a new null-shift key, **Then** that writer waits until the transfer commits or rolls back; the transfer does not fail merely because the writer waits.
6. **Given** the commit acknowledgement is lost and the transfer cannot determine whether it committed, **When** the job reports its outcome, **Then** it reports an unknown outcome and returns a non-zero exit code without claiming rollback; the owner inspects the target before retrying.

### Edge Cases

- `days=1` selects only the run date in UTC+08:00; date arithmetic crosses month, year, and leap-day boundaries as calendar dates.
- A run crossing midnight uses the window established at its start; the actual write time is used for each changed record.
- Source values that are empty or null remain empty or null where the schema permits them; null shift values match each other.
- If multiple eligible source records share a matching key, or an eligible source record matches multiple target records, the run fails rather than choosing a record arbitrarily; all run changes are rolled back. Unrelated duplicate keys do not affect the run.
- If preserving an ID would conflict with another target record or a value cannot be stored, the run fails and all run changes are rolled back.
- A missing, invalid, or unrepresentably large `days` value is rejected before any target change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The owner MUST explicitly launch each run; the application MUST NOT run transfers on a schedule or automatically.
- **FR-002**: Each run MUST accept the externally supplied command-line argument `--days=<value>`, where the value is a positive integer number of calendar days including the run date.
- **FR-003**: The application MUST report a clear error for a missing, invalid, or unrepresentable `days` value before changing any target data and MUST return a non-zero process exit code.
- **FR-004**: At the start of each run, the application MUST determine the run date once using the fixed UTC+08:00 offset and retain that date window for the entire run.
- **FR-005**: The window MUST start inclusively at midnight UTC+08:00 on the date `(days - 1)` calendar days before the run date and end exclusively at midnight UTC+08:00 immediately after the run date.
- **FR-006**: The application MUST select source records from one consistent snapshot for the run, including only records whose `created_at` falls in that window, regardless of production record date or source last-updated timestamp. Source changes after that snapshot MUST NOT affect the run.
- **FR-007**: The source is `production_capacity` and the target is `production_capacity_anan`, both in the same database and with the same record fields.
- **FR-008**: A source and target record MUST match by plant, production line, production record date, and shift; null shift values match null shift values. An ambiguous match MUST fail the run without retaining any target changes.
- **FR-009**: The application MUST insert an eligible source record when no matching target exists, preserving the source ID, creation time, and all other synchronized values, including empty and null values where allowed.
- **FR-010**: When any synchronized value differs for a matching record, including the ID or creation time, the application MUST update that target record to the source's synchronized values, including the source ID.
- **FR-011**: The source last-updated timestamp MUST NOT be synchronized or considered when determining whether a record differs.
- **FR-012**: For each inserted or updated target record, the target last-written timestamp MUST represent the actual write time in UTC+08:00 with millisecond precision.
- **FR-013**: When all synchronized values match, the target record MUST NOT be updated and its last-written timestamp MUST remain unchanged.
- **FR-014**: Repeating a successful run with unchanged source data and the same window MUST NOT create duplicates or change identical records.
- **FR-015**: Target records without a corresponding eligible source record MUST remain unchanged; source records MUST NOT be modified and target records MUST NOT be deleted.
- **FR-016**: A valid run with no eligible source records MUST succeed without changing target data.
- **FR-017**: All inserts and updates in one run MUST be atomic; no earlier subset may remain committed. For a known failure before commit, the application MUST print a clear error, return a non-zero process exit code, and roll back all target changes made by the run. For a commit known to have been rejected, it MUST report failure and return a non-zero exit code without claiming that the run committed. If the final commit outcome cannot be determined, the application MUST report the outcome as unknown, return a non-zero process exit code, and MUST NOT claim that the run rolled back. The owner MUST inspect the target state before retrying.
- **FR-018**: Before taking the source snapshot or checking target records, the transfer MUST wait for existing target writers to finish and obtain exclusive write access to the target. While the transfer holds that access, other processes attempting to write any target record, including unrelated records and previously absent keys, MUST wait until the transfer commits or rolls back. An attempted concurrent write MUST NOT by itself make the transfer fail. The transfer MUST NOT undo another process's committed changes.

### Key Entities *(include if feature involves data)*

- **Production capacity record**: Source or target values consisting of ID, plant, line, record date, shift, quantities, defect rate, status, remarks, creation time, and last-updated or last-written time. The plant, line, date, and shift identify a match; the ID is a synchronized value, not the matching key.
- **Transfer run**: A manual request with a validated day count, one fixed UTC+08:00 date window, and a success, known failure, or unknown commit outcome.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance tests covering the start and end boundaries and `days=1` and `days=5`, 100% of eligible records and 0% of ineligible records are selected.
- **SC-002**: In successful transfer tests, 100% of eligible records in the run's source snapshot with unambiguous keys have the specified synchronized values in the target, and 100% of unrelated target records remain unchanged.
- **SC-003**: Across two consecutive identical runs, the second run creates 0 duplicate records and changes 0 identical records or their last-written timestamps.
- **SC-004**: In tests of missing, invalid, and out-of-range input, 100% of requests print an error, return a non-zero exit code, and leave all target data unchanged.
- **SC-005**: In tests injecting known failures before commit, both before and after target writes, 100% of runs print an error, return a non-zero exit code, and leave none of their own target changes behind. In coordinated concurrent-writer tests, writers already active finish before the transfer proceeds and writers attempting target changes during the transfer wait until it ends. In tests simulating an unknown commit outcome, the run reports uncertainty and a non-zero exit code without asserting rollback.
- **SC-006**: In tests of inserts and updates, 100% of changed records have a last-written time corresponding to the actual write, expressed in UTC+08:00 to millisecond precision.

## Assumptions

- The owner has appropriate access to both existing tables and runs this personal utility manually; provisioning access is outside this feature.
- The source and target schema descriptions in `docs/database-schema.md` identify the available fields and permitted null values. A last-written timestamp is the target's `updated_at`; the source field of that name is excluded from synchronization.
- Valid runs are not intentionally overlapped. Each run uses one consistent snapshot of eligible source records; changes after that snapshot are not included in the current run and may be considered in a later run if still eligible. Ambiguous matches for eligible source records, including duplicate null-shift keys, cause the run to fail rather than be reconciled.
- Values or dates that cannot be represented or stored are errors rather than silently rounded, truncated, or skipped, except for the explicitly required millisecond precision of the target last-written time.
- **Governance resolution**: Constitution version 3.0.0 permits the specification to define the requested time period, including the run date; the window in FR-005 remains unchanged.
