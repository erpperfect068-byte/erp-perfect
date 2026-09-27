import { db } from '@/src/db/index';
import { roles, permissions, rolePermissions, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { SYSTEM_PERMISSIONS, DEFAULT_ROLES } from './permissions';

export async function ensurePermissionsAndRoles() {
  try {
    // 1. Ensure permissions are in the DB
    const existingPerms = await db.select({ code: permissions.code }).from(permissions);
    const existingCodeSet = new Set(existingPerms.map((p) => p.code));

    const missingPerms = SYSTEM_PERMISSIONS.filter((p) => !existingCodeSet.has(p.code));
    if (missingPerms.length > 0) {
      await db.insert(permissions).values(
        missingPerms.map((p) => ({
          code: p.code,
          module: p.module,
          labelAr: p.labelAr,
          descriptionAr: p.descriptionAr || null,
        }))
      ).onConflictDoNothing();
    }

    // 2. Ensure default roles are in the DB
    const existingRoles = await db.select().from(roles);
    const existingRoleMap = new Map(existingRoles.map((r) => [r.name, r]));

    for (const defRole of DEFAULT_ROLES) {
      let roleRecord = existingRoleMap.get(defRole.name);
      if (!roleRecord) {
        const [inserted] = await db
          .insert(roles)
          .values({
            name: defRole.name,
            description: defRole.description,
            isSystem: defRole.isSystem,
          })
          .returning();
        roleRecord = inserted;
        existingRoleMap.set(inserted.name, inserted);
      }

      // Ensure role_permissions
      const currentRolePerms = await db
        .select({ code: rolePermissions.permissionCode })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleRecord.id));
      const currentPermSet = new Set(currentRolePerms.map((cp) => cp.code));

      const neededPerms = defRole.permissions.filter((p) => !currentPermSet.has(p));
      if (neededPerms.length > 0) {
        await db.insert(rolePermissions).values(
          neededPerms.map((code) => ({
            roleId: roleRecord!.id,
            permissionCode: code,
          }))
        );
      }
    }
  } catch (error) {
    console.error('Failed to ensure permissions and roles:', error);
  }
}

export async function getUserPermissions(roleId?: string | null, legacyRole?: string | null): Promise<string[]> {
  // If user is admin (legacy role or name), grant all permissions
  if (legacyRole === 'admin') {
    return SYSTEM_PERMISSIONS.map((p) => p.code);
  }

  if (!roleId) {
    const fallback = DEFAULT_ROLES.find((r) => r.key === legacyRole);
    return fallback ? fallback.permissions : [];
  }

  const roleRecord = await db.select().from(roles).where(eq(roles.id, roleId)).then((r) => r[0]);
  if (!roleRecord) {
    return [];
  }

  if (roleRecord.name.includes('Admin') || roleRecord.name.includes('مدير النظام')) {
    return SYSTEM_PERMISSIONS.map((p) => p.code);
  }

  const userPerms = await db
    .select({ code: rolePermissions.permissionCode })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  return userPerms.map((p) => p.code);
}
