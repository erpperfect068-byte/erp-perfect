import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { users, userInvitations, roles } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { verifyAuth, checkPermission } from '@/lib/auth-server';
import { ensurePermissionsAndRoles } from '@/lib/roles-service';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    if (!checkPermission(user, 'users.view')) {
      return NextResponse.json({ error: 'صلاحيات غير كافية لزيارة صفحة الموظفين' }, { status: 403 });
    }

    await ensurePermissionsAndRoles();

    const activeUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    const pendingInvites = await db.select().from(userInvitations).where(eq(userInvitations.status, 'pending')).orderBy(desc(userInvitations.invitedAt));
    const allRoles = await db.select().from(roles).orderBy(desc(roles.createdAt));

    return NextResponse.json({
      users: activeUsers,
      invitations: pendingInvites,
      roles: allRoles,
    });
  } catch (error) {
    console.error('Failed to list team:', error);
    return NextResponse.json({ error: 'Failed to retrieve team members list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    if (!checkPermission(user, 'users.invite')) {
      return NextResponse.json({ error: 'صلاحيات غير كافية لإرسال الدعوات' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role, roleId } = body;

    if (!email) {
      return NextResponse.json({ error: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'هذا البريد الإلكتروني مسجل بالفعل كموظف نشط في النظام' }, { status: 400 });
    }

    const existingInvite = await db.select().from(userInvitations).where(eq(userInvitations.email, email.toLowerCase()));
    const pendingInvite = existingInvite.find((i) => i.status === 'pending');
    if (pendingInvite) {
      return NextResponse.json({ error: 'هناك دعوة معلقة قيد الانتظار مرسلة بالفعل لهذا البريد الإلكتروني' }, { status: 400 });
    }

    const [newInvitation] = await db
      .insert(userInvitations)
      .values({
        email: email.toLowerCase(),
        role: role || 'data_entry',
        invitedBy: user.name || user.email,
        invitedByEmail: user.email,
        status: 'pending',
        invitedAt: new Date(),
      })
      .returning();

    await logAudit({
      tableName: 'user_invitations',
      recordId: newInvitation.id,
      action: 'INSERT',
      newData: newInvitation,
      userEmail: user.email,
      req,
    });

    return NextResponse.json(newInvitation);
  } catch (error) {
    console.error('Failed to invite user:', error);
    return NextResponse.json({ error: 'Failed to record user invitation' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    if (!checkPermission(user, 'users.manage_roles') && !checkPermission(user, 'roles.manage')) {
      return NextResponse.json({ error: 'صلاحيات غير كافية لتغيير أدوار الموظفين' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, roleId } = body;

    if (!userId || !roleId) {
      return NextResponse.json({ error: 'معرف المستخدم ومعرف الدور مطلوبان' }, { status: 400 });
    }

    const targetUser = await db.select().from(users).where(eq(users.id, userId)).then((r) => r[0]);
    if (!targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const targetRole = await db.select().from(roles).where(eq(roles.id, roleId)).then((r) => r[0]);
    if (!targetRole) {
      return NextResponse.json({ error: 'الدور المحدد غير موجود' }, { status: 404 });
    }

    let roleSlug = targetUser.role;
    if (targetRole.name.includes('Admin') || targetRole.name.includes('مدير')) roleSlug = 'admin';
    else if (targetRole.name.includes('محاسب')) roleSlug = 'accountant';
    else if (targetRole.name.includes('مخلص')) roleSlug = 'clearance_officer';
    else if (targetRole.name.includes('مدخل')) roleSlug = 'data_entry';

    const [updatedUser] = await db
      .update(users)
      .set({
        roleId: targetRole.id,
        role: roleSlug,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    await logAudit({
      tableName: 'users',
      recordId: userId,
      action: 'UPDATE',
      oldData: { roleId: targetUser.roleId, role: targetUser.role },
      newData: { roleId: updatedUser.roleId, role: updatedUser.role },
      userEmail: user.email,
      req,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      role: targetRole,
    });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ error: 'فشل في تحديث دور الموظف' }, { status: 500 });
  }
}
