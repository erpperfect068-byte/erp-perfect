import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// Get Roles & Permissions
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: rolesList, error: rolesErr } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    if (rolesErr) throw rolesErr;

    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('role_id, permission:permissions(code)');

    const permsMap = new Map<string, string[]>();
    (rolePerms || []).forEach((rp: any) => {
      const code = rp.permission?.code;
      if (code) {
        const list = permsMap.get(rp.role_id) || [];
        list.push(code);
        permsMap.set(rp.role_id, list);
      }
    });

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id');

    const userCountMap = new Map<string, number>();
    (userRoles || []).forEach((ur: any) => {
      userCountMap.set(ur.role_id, (userCountMap.get(ur.role_id) || 0) + 1);
    });

    const formattedRoles = (rolesList || []).map((r: any) => ({
      ...r,
      isSystem: r.is_system,
      permissionCodes: permsMap.get(r.id) || [],
      userCount: userCountMap.get(r.id) || 0,
    }));

    return NextResponse.json({ roles: formattedRoles });
  } catch (error: any) {
    console.error('Failed to get roles:', error);
    return NextResponse.json({ error: error.message || 'فشل استرجاع الأدوار والصلاحيات' }, { status: 500 });
  }
}

// Create New Role
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { name, description, permissionCodes = [] } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'اسم الدور مطلوب' }, { status: 400 });
    }

    const { data: newRole, error: insertErr } = await supabase
      .from('roles')
      .insert({
        name: name.trim(),
        description: description ? description.trim() : null,
        is_system: false,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Attach permissions
    if (Array.isArray(permissionCodes) && permissionCodes.length > 0) {
      const { data: perms } = await supabase
        .from('permissions')
        .select('id, code')
        .in('code', permissionCodes);

      if (perms && perms.length > 0) {
        const inserts = perms.map((p: any) => ({
          role_id: newRole.id,
          permission_id: p.id,
        }));
        await supabase.from('role_permissions').insert(inserts);
      }
    }

    return NextResponse.json(
      {
        ...newRole,
        isSystem: false,
        permissionCodes,
        userCount: 0,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create role:', error);
    return NextResponse.json({ error: error.message || 'فشل إنشاء الدور الجديد' }, { status: 500 });
  }
}
