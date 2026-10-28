# Permissions & RBAC Architecture Rule

## Mandatory Policy for Actions, Buttons, and Tabs

Whenever adding any new feature, page, tab, action button, or modal:
1. **Database Registration First**:
   - Every single action (button, tab, modal action) MUST have a corresponding permission code registered in the Supabase `permissions` table (`code`, `module`, `description`).
   - Never guard UI elements or API routes with permission codes that do not exist in the database.
2. **Sync in lib/permissions.ts**:
   - The permission code must be added to `SYSTEM_PERMISSIONS`, `PERMISSION_LABELS` (Arabic label), and the module to `MODULE_LABELS`.
3. **Role Permission Binding**:
   - Admin roles bypass checks, but all other roles depend on explicit `role_permissions` rows.
   - When introducing new permissions, decide whether they belong to default roles (e.g. `accountant`, `clearance_officer`, `data_entry`) and ensure they are manageable in the Role Management screen.
4. **Consistency Between Frontend and Backend**:
   - Frontend UI guards (`PermissionGuard`, `hasPermission`) must match the backend API permission checks (`userHasPermission`).
