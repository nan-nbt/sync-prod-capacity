# Manual Transfer CLI Contract

**Status**: Training/examination CLI contract for manual use with the configured lab database. Requirements are in [spec.md](../spec.md).

## Invocation

Launch the CLI manually with `--days=<positive integer>` to run the transfer against the configured lab/test database. The argument is required on every invocation; the job does not schedule itself. One day includes only the run date at fixed UTC+08:00; larger values include that date and the preceding `days - 1` calendar dates. The window is `[start of first day, start of day after run date)` and is fixed once per run.

Accept exactly one `--days` argument whose value contains decimal digits only; leading zeros are permitted if the numeric value is positive. Reject a missing or repeated option, signs, empty, zero, negative, fractional, nonnumeric, or unrepresentable values before changing target data.

## Behavior and outcome

Demonstrate selecting eligible source rows and inserting missing target rows, updating changed matches, or performing no write for identical rows. A repeated run with unchanged source data leaves identical target rows unchanged.

Return exit code 0 on a successful run, including when no eligible rows exist. Print a success message with the total number of rows inserted or updated. On invalid input or a basic operation error, print a clear error and return a nonzero exit code. Never print secrets or record values in errors.

The contract supports manual examination use on the configured lab/test database. Automated tests in this project do not open lab database connections. This utility is not intended for production deployment, and it does not specify advanced operational recovery procedures. Runtime credentials are supplied through `.env`, never on the command line.
