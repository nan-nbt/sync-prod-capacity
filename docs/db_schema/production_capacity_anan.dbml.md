# production_capacity_anan

```dbml
Table devuser.production_capacity_anan {
  id            bigint [pk, not null]
  plant_code    varchar(10) [not null]
  line_code     varchar(20) [not null]
  record_date   date [not null]
  shift_type    varchar(10) [default: 'DAY']
  target_qty    integer [not null, default: 0]
  actual_qty    integer [not null, default: 0]
  defect_rate   numeric(5, 2) [default: 0.00]
  line_status   varchar(15) [not null, default: 'ACTIVE']
  remarks       text
  created_at    timestamptz [not null, default: `now()`]
  updated_at    timestamptz [not null, default: `now()`]

  indexes {
    (plant_code, line_code, record_date, shift_type) [unique, name: 'uq_plant_line_date_shift_anan']
    updated_at [name: 'idx_prod_cap_updated_at_anan', type: btree]
  }
}
```
