import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, checkPermission } from '@/lib/auth-server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const { user, error: authError, status } = await verifyAuth(req);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'suspend') {
      if (!checkPermission(user, 'users.delete')) {
        return NextResponse.json({ error: 'صلاحيات غير كافية لحظر الموظف' }, { status: 403 });
      }

      // Step 1: Ban user in Auth via Service Role Key (876000 hours)
      const { error: banAuthError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: '876000h',
      });

      if (banAuthError) {
        console.error('Auth ban error:', banAuthError);
        return NextResponse.json({ error: 'فشل إيقاف حساب الموظف في نظام المصادقة' }, { status: 500 });
      }

      // Step 2: Call soft_delete_user RPC
      const { error: rpcError } = await supabaseAdmin.rpc('soft_delete_user', {
        target_user_id: targetUserId,
      });

      if (rpcError) {
        console.error('RPC soft_delete_user failed, rolling back Auth ban:', rpcError);
        // TRANSACTIONAL ROLLBACK: Revert Auth Ban if DB update fails!
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          ban_duration: 'none',
        });
        return NextResponse.json(
          { error: 'فشل تعطيل حساب الموظف في قاعدة البيانات، تم إلغاء حظر المصادقة لضمان الاتساق' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'تم إيقاف حساب الموظف وحظره بنجاح' });
    } else if (action === 'restore') {
      if (!checkPermission(user, 'users.update')) {
        return NextResponse.json({ error: 'صلاحيات غير كافية لتفعيل الموظف' }, { status: 403 });
      }

      // Step 1: Unban user in Auth via Service Role Key
      const { error: unbanAuthError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        ban_duration: 'none',
      });

      if (unbanAuthError) {
        console.error('Auth unban error:', unbanAuthError);
        return NextResponse.json({ error: 'فشل إلغاء حظر الموظف في نظام المصادقة' }, { status: 500 });
      }

      // Step 2: Call restore_user RPC
      const { error: rpcError } = await supabaseAdmin.rpc('restore_user', {
        target_user_id: targetUserId,
      });

      if (rpcError) {
        console.error('RPC restore_user failed, rolling back Auth unban:', rpcError);
        // TRANSACTIONAL ROLLBACK: Re-apply Auth Ban if DB update fails!
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          ban_duration: '876000h',
        });
        return NextResponse.json(
          { error: 'فشل إعادة تفعيل حساب الموظف في قاعدة البيانات، تم إعادة الحظر لضمان الاتساق' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'تم إعادة تفعيل حساب الموظف بنجاح' });
    } else {
      return NextResponse.json({ error: 'الإجراء المحدد غير صالح' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('User status management error:', err);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء تغيير حالة الحساب' }, { status: 500 });
  }
}
