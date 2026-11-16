# global_users

```dbml
Table global_sync.global_users {
  pccuid          numeric(20) [not null, pk]
  sso_acct        varchar(50) [not null]
  fact_no         varchar(10)
  local_fact_no   varchar(10)
  chinese_nm      varchar(300)
  local_pnl_nm    varchar(300)
  english_nm      varchar(200)
  contact_mail    varchar(200) [not null]
  sex             varchar(1)
  lo_posi_nm      varchar(60)
  disabled        varchar(1) [not null]
  disabled_date   timestamp
  update_date     timestamp   [not null]
  lo_dept_nm      varchar(60)
  tel             varchar(100) [not null]
  leave_mk        varchar(20)
  id              numeric(20)

  Note: 'SSO User table'
}
```