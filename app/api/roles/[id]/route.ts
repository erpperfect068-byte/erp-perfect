import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: existingRole, error: fetchErr } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existingRole) {
      return NextResponse.json({ error: 'الدور المطلوب غير موجود' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, permissionCodes } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name && typeof name === 'string' && !existingRole.is_system) {
      updatePayload.name = name.trim();
    }
    if (description !== undefined) {
      updatePayload.description = description ? description.trim() : null;
    }

    const { data: updatedRole, error: updateErr } = await supabase
      .from('roles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    if (Array.isArray(permissionCodes)) {
      const { error: deleteErr } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', id);

      if (deleteErr) throw deleteErr;

      if (permissionCodes.length > 0) {
        const { data: perms, error: permsErr } = await supabase
          .from('permissions')
          .select('id, code')
          .in('code', permissionCodes);

        if (permsErr) throw permsErr;

        if (perms && perms.length > 0) {
          const inserts = perms.map((p: any) => ({
            role_id: id,
            permission_id: p.id,
          }));
          const { error: insertErr } = await supabase
            .from('role_permissions')
            .insert(inserts);

          if (insertErr) throw insertErr;
        }
      }
    }

    return NextResponse.json({
      ...updatedRole,
      isSystem: updatedRole.is_system,
      permissionCodes: permissionCodes || [],
    });
  } catch (error: any) {
    console.error('Failed to update role:', error);
    return NextResponse.json({ error: error.message || 'فشل في تحديث الدور' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: existingRole } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingRole) {
      return NextResponse.json({ error: 'الدور المطلوب غير موجود' }, { status: 404 });
    }

    if (existingRole.is_system) {
      return NextResponse.json({ error: 'لا يمكن حذف أدوار النظام الأساسية' }, { status: 400 });
    }

    const { count: assignedCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id);

    if (assignedCount && assignedCount > 0) {
      return NextResponse.json(
        { error: `لا يمكن حذف هذا الدور لوجود ${assignedCount} موظف مرتبطين به حالياً. يرجى نقلهم لدور آخر أولاً.` },
        { status: 400 }
      );
    }

    await supabase.from('role_permissions').delete().eq('role_id', id);
    await supabase.from('roles').delete().eq('id', id);

    return NextResponse.json({ success: true, message: 'تم حذف الدور بنجاح' });
  } catch (error: any) {
    console.error('Failed to delete role:', error);
    return NextResponse.json({ error: error.message || 'فشل في حذف الدور' }, { status: 500 });
  }
}
