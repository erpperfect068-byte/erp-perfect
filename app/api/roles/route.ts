import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { roles, rolePermissions, users } from '@/src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { verifyAuth, checkPermission } from '@/lib/auth-server';
import { ensurePermissionsAndRoles } from '@/lib/roles-service';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    await ensurePermissionsAndRoles();

    const allRoles = await db.select().from(roles).orderBy(desc(roles.createdAt));
    const allRolePerms = await db.select().from(rolePermissions);

    const userCounts = await db
      .select({
        roleId: users.roleId,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .groupBy(users.roleId);

    const userCountMap = new Map(userCounts.map((uc) => [uc.roleId, uc.count]));

    const permsMap = new Map<string, string[]>();
    for (const rp of allRolePerms) {
      const existing = permsMap.get(rp.roleId) || [];
      existing.push(rp.permissionCode);
      permsMap.set(rp.roleId, existing);
    }

    const result = allRoles.map((r) => ({
      ...r,
      permissionCodes: permsMap.get(r.id) || [],
      userCount: userCountMap.get(r.id) || 0,
    }));

    return NextResponse.json({ roles: result });
  } catch (error: any) {
    console.error('Failed to get roles:', error);
    return NextResponse.json({ error: 'فشل في استرجاع قائمة الأدوار' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!checkPermission(user, 'roles.manage')) {
      return NextResponse.json({ error: 'صلاحيات غير كافية لإدارة وإنشاء الأدوار' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, permissionCodes } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'اسم الدور مطلوب' }, { status: 400 });
    }

    const [newRole] = await db
      .insert(roles)
      .values({
        name: name.trim(),
        description: description ? description.trim() : null,
        isSystem: false,
      })
      .returning();

    if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      await db.insert(rolePermissions).values(
        permissionCodes.map((code: string) => ({
          roleId: newRole.id,
          permissionCode: code,
        }))
      );
    }

    await logAudit({
      tableName: 'roles',
      recordId: newRole.id,
      action: 'INSERT',
      newData: {
        ...newRole,
        permissionCodes: permissionCodes || [],
      },
      userEmail: user.email,
      req,
    });

    return NextResponse.json(
      {
        ...newRole,
        permissionCodes: permissionCodes || [],
        userCount: 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create role:', error);
    return NextResponse.json({ error: 'فشل في إنشاء الدور الجديد' }, { status: 500 });
  }
}
