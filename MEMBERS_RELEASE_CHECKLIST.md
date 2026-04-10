# Members Release Checklist

## 1) Apply SQL migrations (in order)

Run both scripts in Supabase SQL Editor:

1. `supabase-migration-project-members-detailed.sql`
   - Adds RPC `list_project_members_detailed(p_project_id uuid)`
   - Returns participant list with `full_name` and `email`
2. `supabase-migration-remove-project-member.sql`
   - Adds RPC `remove_project_member(p_project_id uuid, p_user_id uuid)`
   - Allows admin-only member removal and blocks owner removal

After running both files, execute:

```sql
notify pgrst, 'reload schema';
```

## 2) Quick SQL sanity checks

```sql
select proname
from pg_proc
where proname in ('list_project_members_detailed', 'remove_project_member');
```

Expected: both function names are present.

## 3) Smoke test (roles)

Use two users:
- `admin_user` - project admin
- `member_user` - regular member

### Admin scenario

1. Login as `admin_user`, open project sidebar -> `Участники`.
2. Verify members list is visible (name/email, not only UUID).
3. Click `+ Участник`, add a valid email as `member`.
4. Change role for that member (`member <-> admin`).
5. Remove that member (non-owner) and verify they disappear after reload.
6. Try to remove project owner and verify error text:
   - "Нельзя удалить владельца проекта из участников".

### Member scenario

1. Login as `member_user`, open same project.
2. Open `Участники`.
3. Verify members list is readable.
4. Verify member cannot add/remove/change roles (no privileged actions or forbidden errors).
5. Confirm import button is hidden for member in sidebar.

## 4) Regression checks

- Create/edit/move task still works for member.
- Delete task/column/project remains admin-only.
- Invite by email still works for admin.
