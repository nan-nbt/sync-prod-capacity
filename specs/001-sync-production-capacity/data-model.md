# Data Model: Production Capacity Transfer

**Status:** Training-demo reference based on [spec.md](spec.md) and documented source/target schema references. These references are not independent verification of the examiner-managed lab database.

## Production capacity record

The source and target tables are `devuser.production_capacity` and `devuser.production_capacity_anan` in the configured lab/test database. Use the documented fields as the transfer mapping; the table below is not an independent schema verification.

| Field | Documented type | Null? | Transfer meaning |
|---|---|---|---|
| `id` | bigint | No | Copy; not part of the match key |
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
| `updated_at` | timestamptz | No | Do not use source value to trigger or populate target updates; target write time is refreshed when a row is inserted or changed and otherwise left unchanged |

Use null-safe equality for business-key matching and synchronized-value comparison. Demonstrate duplicate/ambiguous-key errors only to the extent required by the core behavior. Do not treat this as an operational guarantee about database constraints.

## Transfer run

| Attribute | Rule |
|---|---|
| `days` | Exactly one argument with positive decimal digits; leading zeros allowed |
| Run date | Evaluated once using fixed UTC+08:00 |
| Window | Inclusive midnight `run date - (days - 1)` through exclusive midnight `run date + 1` |
| Source selection | Select source rows based on `created_at` within the fixed window |
| Target behavior | Insert missing rows, update changed rows, and leave identical rows untouched |
| Repeat behavior | An unchanged repeat run leaves identical target rows unchanged |
| Lifecycle | Validate input → establish fixed window → select source rows → demonstrate target behavior → report basic result/error |

The run and window are in-memory concepts, not new persisted entities or schema additions. Manual examiner use may execute the transfer against the configured lab/test database; automated project tests do not connect to the lab database. The model makes no claim about deployment.
