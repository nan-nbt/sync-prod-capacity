# XXX System Permission Description

## Operational Roles

**Distinguish 2 types of roles**

- System Administrator
- Department Leader


### System Administrator

- Role Code: admin
- English Name: Admin

Based on the login user's G2FW ACL information, obtain the user's assigned role. If the role matches `APPADMIN` or `SUPERUSER`, they are system administrators.

### (This is an example) Department Leader

- Role Code: deptLeader
- English Name: DeptLeader

Query the database using the login user's PCCUID to check if they are a department leader. The query syntax is as follows:

```
select count(dm) FROM xxx dm where dm.id.managerPccuid = :sso and dm.isActive = true
```

If the count is 1 or more, they are a department leader.