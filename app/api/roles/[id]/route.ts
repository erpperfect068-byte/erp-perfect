import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { roles, rolePermissions, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth, checkPermission } from '@/lib/auth-server';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!checkPermission(user, 'roles.manage')) {
      return NextResponse.json({ error: 'صلاحيات غير كافية لتعديل الأدوار والصلاحيات' }, { status: 403 });
    }

    const existingRole = await db.select().from(roles).where(eq(roles.id, id)).then((r) => r[0]);
    if (!existingRole) {
      return NextResponse.json({ error: 'الدور المطلوب غير موجود' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, permissionCodes } = body;

    const existingPerms = await db
      .select({ code: rolePermissions.permissionCode })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));

    const oldData = {
      ...existingRole,
      permissionCodes: existingPerms.map((p) => p.code),
    };

    const updatePayload: any = {
      updatedAt: new Date(),
    };
    if (name && typeof name === 'string' && !existingRole.isSystem) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;

    const [updatedRole] = await db
      .update(roles)
      .set(updatePayload)
      .where(eq(roles.id, id))
      .returning();

    if (Array.isArray(permissionCodes)) {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

      if (permissionCodes.length > 0) {
        await db.insert(rolePermissions).values(
          permissionCodes.map((code: string) => ({
            roleId: id,
            permissionCode: code,
          }))
        );
      }
    }

    const newData = {
      ...updatedRole,
      permissionCodes: Array.isArray(permissionCodes) ? permissionCodes : oldData.permissionCodes,
    };

    await logAudit({
      tableName: 'roles',
      recordId: id,
      action: 'UPDATE',
      oldData,
      newData,
      userEmail: user.email,
      req,
    });

    return NextResponse.json(newData);
  } catch (error: any) {
    console.error('Failed to update role:', error);
    return NextResponse.json({ error: 'فشل في تحديث الدور' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!checkPermission(user, 'roles.manage')) {
      return NextResponse.json({ error: 'صلاحيات غير كافية لحذف الأدوار' }, { status: 403 });
    }

    const existingRole = await db.select().from(roles).where(eq(roles.id, id)).then((r) => r[0]);
    if (!existingRole) {
      return NextResponse.json({ error: 'الدور المطلوب غير موجود' }, { status: 404 });
    }

    if (existingRole.isSystem) {
      return NextResponse.json({ error: 'لا يمكن حذف أدوار النظام الأساسية' }, { status: 400 });
    }

    const assignedUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.roleId, id));
    if (assignedUsers.length > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف هذا الدور لوجود ${assignedUsers.length} موظف مرتبطين به حالياً. يرجى نقلهم لدور آخر أولاً.`,
        },
        { status: 400 }
      );
    }

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await db.delete(roles).where(eq(roles.id, id));

    await logAudit({
      tableName: 'roles',
      recordId: id,
      action: 'DELETE',
      oldData: existingRole,
      userEmail: user.email,
      req,
    });

    return NextResponse.json({ success: true, message: 'تم حذف الدور بنجاح' });
  } catch (error: any) {
    console.error('Failed to delete role:', error);
    return NextResponse.json({ error: 'فشل في حذف الدور' }, { status: 500 });
  }
}
