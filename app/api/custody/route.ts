import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// Get Custodies (List for current user or all if custody.read permission)
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // Fetch custodies with nested employee profile & expenses via RLS
    const { data: custodies, error: dbError } = await supabase
      .from('employee_custodies')
      .select('*, employee:profiles!employee_custodies_employee_id_fkey(id, name, email), expenses:custody_expenses(*)')
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    return NextResponse.json(custodies || []);
  } catch (error: any) {
    console.error('Failed to list employee custodies:', error);
    if (error.code === '42501' || error.message?.includes('violates row-level security')) {
      return NextResponse.json({ error: 'غير مصرح لك بقراءة بيانات العهد' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة العهد' }, { status: 500 });
  }
}

// Issue New Custody (Calls issue_custody RPC)
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { employeeId, amount, currency = 'EGP', exchangeRate = null } = body;

    if (!employeeId || !amount) {
      return NextResponse.json({ error: 'معرف الموظف والمبلغ مطلوبين' }, { status: 400 });
    }

    const { data, error: rpcError } = await supabase.rpc('issue_custody', {
      p_employee_id: employeeId,
      p_amount: amount,
      p_currency: currency,
      p_exchange_rate: exchangeRate,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to issue custody:', error);
    if (error.code === '42501' || error.message?.includes('غير مصرح')) {
      return NextResponse.json({ error: 'غير مصرح لك بصرف عهد جديدة' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل صرف العهدة' }, { status: 500 });
  }
}
