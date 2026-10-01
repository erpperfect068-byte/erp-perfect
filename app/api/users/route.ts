import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// List Users and Roles
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: profilesList, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', (user as any).company_id)
      .order('created_at', { ascending: false });

    if (profErr) throw profErr;

    const { data: userRolesList } = await supabase
      .from('user_roles')
      .select('*, role:roles(*)');

    const userRoleMap = new Map<string, any>();
    (userRolesList || []).forEach((ur: any) => {
      userRoleMap.set(ur.user_id, ur);
    });

    const { data: rolesList } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });

    const formattedUsers = (profilesList || []).map((p: any) => {
      const userRoleObj = userRoleMap.get(p.id);
      return {
        id: p.id,
        uid: p.id,
        email: p.email,
        name: p.name,
        fingerprint: p.fingerprint || null,
        isActive: p.is_active ?? true,
        role: userRoleObj?.role?.name || 'data_entry',
        roleId: userRoleObj?.role_id || null,
        roleObj: userRoleObj?.role || null,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });

    return NextResponse.json({
      users: formattedUsers,
      roles: rolesList || [],
    });
  } catch (error: any) {
    console.error('Failed to list team:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة الموظفين' }, { status: 500 });
  }
}

// Direct Admin User Creation (No Email Invitation Waiting)
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { name, email, password, roleId } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'الاسم، البريد الإلكتروني، وكلمة المرور مطلوبة' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Create Auth User directly in Supabase Auth (Auto-confirmed)
    let authUserId: string | undefined;

    const { data: adminAuthData, error: adminAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (adminAuthErr || !adminAuthData.user) {
      console.warn('supabaseAdmin.auth.admin.createUser info:', adminAuthErr?.message);
      // Fallback: signUp via user client
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: { data: { name } },
      });

      if (signUpErr || !signUpData.user) {
        return NextResponse.json({ error: adminAuthErr?.message || signUpErr?.message || 'فشل إنشاء حساب المستخدم' }, { status: 400 });
      }
      authUserId = signUpData.user.id;
    } else {
      authUserId = adminAuthData.user.id;
    }

    // 2. Insert into profiles with auto-increment sequence fingerprint
    const { data: newProfile, error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: authUserId,
        company_id: (user as any).company_id || null,
        email: normalizedEmail,
        name: name.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (profileErr) throw profileErr;

    // 3. Assign Role in user_roles
    let assignedRoleId = roleId;
    if (!assignedRoleId) {
      const { data: defaultRole } = await supabase.from('roles').select('id').eq('name', 'data_entry').single();
      assignedRoleId = defaultRole?.id;
    }

    if (assignedRoleId) {
      await supabase
        .from('user_roles')
        .upsert({
          user_id: authUserId,
          role_id: assignedRoleId,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء حساب الموظف وتفعيله مباشرة بنجاح!',
      user: {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        fingerprint: newProfile.fingerprint,
        roleId: assignedRoleId,
      },
    });
  } catch (error: any) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: error.message || 'فشل إنشاء حساب الموظف' }, { status: 500 });
  }
}

// Update User Role / Status
export async function PATCH(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { userId, roleId, isActive } = body;

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    if (isActive !== undefined) {
      await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
    }

    if (roleId) {
      await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          role_id: roleId,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث حساب الموظف بنجاح',
    });
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: error.message || 'فشل تحديث بيانات الموظف' }, { status: 500 });
  }
}
