# Manual Transfer CLI Contract

**Status**: Proposed; owner review required. Requirements are in [spec.md](../spec.md).

## Invocation

Launch the packaged non-web job manually with `--days=<positive integer>`. The argument is required on every invocation; the job does not schedule itself. One day includes only the run date at fixed UTC+08:00; larger values include that date and the preceding `days - 1` calendar dates. The window is `[start of first day, start of day after run date)` and is fixed once per run.

Accept exactly one `--days` argument whose value contains decimal digits only; leading zeros are permitted if the numeric value is positive. Reject a missing or repeated option, signs, empty, zero, negative, fractional, nonnumeric, overflowing, or unrepresentable values before changing target data.

## Outcome

On success, return exit code 0, including when no eligible rows exist. On invalid input or a known failure before commit, print a clear error, return a nonzero exit code, and roll back any writes from the run. A database connection failure during commit may make the outcome unknown: report that uncertainty with a nonzero exit code rather than asserting rollback, and follow the operational recovery procedure in the plan. The amended FR-017 explicitly covers an unknown outcome. Never print credentials or record values in errors.

Database connection details are supplied separately through secure deployment configuration, not command-line credentials. There is no HTTP interface.
