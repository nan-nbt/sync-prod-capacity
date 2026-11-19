# Data Model: Production Capacity Transfer

**Status:** Proposed design based on [spec.md](spec.md), [source DBML](../../docs/db_schema/production_capacity.dbml.md), and [target DBML](../../docs/db_schema/production_capacity_anan.dbml.md). Verify the deployed schema; these documents describe tables, not a migration.

## Production capacity record

Both `devuser.production_capacity` and `devuser.production_capacity_anan` have the following columns. Source `id` is generated always as identity; target `id` is an explicitly supplied primary key. No source writes are required.

| Field | PostgreSQL type | Null? | Transfer meaning |
|---|---|---|---|
| `id` | bigint | No | Copy; not part of match key; an ID collision fails the run |
| `plant_code` | varchar(10) | No | Copy; match key |
| `line_code` | varchar(20) | No | Copy; match key |
| `record_date` | date | No | Copy; match key, not the window selection field |
| `shift_type` | varchar(10) | Yes | Copy; match key; null matches null |
| `target_qty` | integer | No | Copy |
| `actual_qty` | integer | No | Copy |
| `defect_rate` | numeric(5,2) | Yes | Copy |
| `line_status` | varchar(15) | No | Copy |
| `remarks` | text | Yes | Copy; preserve empty separately from null |
| `created_at` | timestamptz | No | Copy; source selection field |
| `updated_at` | timestamptz | No | Do not compare or copy source; set target to actual write time on insert/update, truncated to milliseconds; preserve target value otherwise |

Use null-safe equality for match and comparison. The ordinary four-column PostgreSQL unique constraints shown in the documented DDL treat null shifts as distinct: they neither guarantee a single null-shift match nor prevent concurrent null-shift duplicates. Explicitly detect duplicate eligible source keys and multiple target matches for eligible keys; unrelated duplicates do not fail the run. Database constraints still reject conflicting IDs and invalid or unstoreable values. A uniqueness violation fails the complete run; no deletes occur.

## Transfer run

| Attribute | Rule |
|---|---|
| `days` | Exactly one argument with positive decimal digits; leading zeros allowed; date and database timestamp bounds must be representable before any target write |
| Run date | Evaluated once at startup using fixed UTC+08:00 |
| Window | Inclusive midnight `run date - (days - 1)` through exclusive midnight `run date + 1`, both at UTC+08:00 |
| Source view | One consistent snapshot of eligible source rows based on `created_at` |
| Lifecycle | Validate → establish fixed window → start transaction and wait for target table lock → establish snapshot → check and transfer → commit, or roll back known pre-commit failures. A lost commit acknowledgement is operationally indeterminate. Lock-and-wait and unknown outcome are reflected in the amended specification; see [plan.md](plan.md). |

Only records with unambiguous eligible keys participate. Identical target rows are not written; inserts and changed rows get a fresh last-written timestamp. The run and window are in-memory concepts, not new persisted entities or schema additions. The owner selected lock-and-wait and millisecond truncation; verify the deployed database conditions described in [plan.md](plan.md).
