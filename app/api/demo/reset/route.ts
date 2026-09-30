import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    // Delete operational dummy records in FK-safe order
    // NOTE: audit_log is EXCLUDED and NEVER deleted per system audit immutability rules.
    // profiles, roles, permissions, role_permissions, user_roles are PRESERVED.
    const tablesToDelete = [
      'custody_expenses',
      'employee_custodies',
      'statement_items',
      'statements',
      'client_deposits',
      'treasury_transactions',
      'shipments',
      'client_pricing',
      'client_items',
      'clients',
      'ports',
      'agencies',
      'contractors',
      'statuses',
    ];

    for (const table of tablesToDelete) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.error(`Error resetting table ${table}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تصفير النظام ومسح جميع البيانات التشغيلية بنجاح مع الحفاظ على الحسابات والإعدادات وسجل التدقيق.',
    });
  } catch (error: any) {
    console.error('Failed to reset demo data:', error);
    return NextResponse.json({ error: error.message || 'فشل مسح البيانات التشغيلية' }, { status: 500 });
  }
}
