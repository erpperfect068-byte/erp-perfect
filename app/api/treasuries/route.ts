import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

// GET /api/treasuries - List all treasuries for the user's company with independent balances
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'لم يتم تحديد الشركة الخاصة بالمستخدم' }, { status: 400 });
    }

    // 1. Fetch treasuries for THIS company only
    const { data: treasuriesList, error: tErr } = await supabase
      .from('treasuries')
      .select('*')
      .eq('company_id', user.company_id)
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true });

    if (tErr) throw tErr;

    // 2. Fetch all valid transactions for THIS company only
    const { data: transactions, error: txErr } = await supabase
      .from('treasury_transactions')
      .select('treasury_id, amount, currency, transaction_type, is_reversed')
      .eq('company_id', user.company_id)
      .eq('is_reversed', false);

    if (txErr) throw txErr;

    // Map balances per treasury: { [treasuryId]: { EGP: 0, USD: 0, EUR: 0 } }
    const balancesByTreasury: Record<string, { EGP: number; USD: number; EUR: number }> = {};
    const overallBalances = { EGP: 0, USD: 0, EUR: 0 };

    (treasuriesList || []).forEach((t: any) => {
      balancesByTreasury[t.id] = { EGP: 0, USD: 0, EUR: 0 };
    });

    (transactions || []).forEach((tx: any) => {
      const tid = tx.treasury_id;
      const cur = (tx.currency || 'EGP').toUpperCase() as 'EGP' | 'USD' | 'EUR';
      const amt = parseFloat(Number(tx.amount || 0).toFixed(2));
      const type = tx.transaction_type;

      if (!balancesByTreasury[tid]) {
        balancesByTreasury[tid] = { EGP: 0, USD: 0, EUR: 0 };
      }

      if (['deposit', 'transfer_in'].includes(type)) {
        balancesByTreasury[tid][cur] = (balancesByTreasury[tid][cur] || 0) + amt;
        if (cur in overallBalances) {
          overallBalances[cur] += amt;
        }
      } else if (['withdraw', 'transfer_out'].includes(type)) {
        balancesByTreasury[tid][cur] = (balancesByTreasury[tid][cur] || 0) - amt;
        if (cur in overallBalances) {
          overallBalances[cur] -= amt;
        }
      }
    });

    // Format output
    const formattedTreasuries = (treasuriesList || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      type: t.type,
      isMain: t.is_main,
      isActive: t.is_active,
      notes: t.notes,
      createdAt: t.created_at,
      balances: {
        EGP: parseFloat((balancesByTreasury[t.id]?.EGP || 0).toFixed(2)),
        USD: parseFloat((balancesByTreasury[t.id]?.USD || 0).toFixed(2)),
        EUR: parseFloat((balancesByTreasury[t.id]?.EUR || 0).toFixed(2)),
      },
    }));

    return NextResponse.json({
      treasuries: formattedTreasuries,
      overallBalances: {
        EGP: parseFloat(overallBalances.EGP.toFixed(2)),
        USD: parseFloat(overallBalances.USD.toFixed(2)),
        EUR: parseFloat(overallBalances.EUR.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('Failed to list treasuries:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة الخزن' }, { status: 500 });
  }
}

// POST /api/treasuries - Create a new treasury for user's company
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    if (!user.company_id) {
      return NextResponse.json({ error: 'لم يتم تحديد الشركة الخاصة بالمستخدم' }, { status: 400 });
    }

    if (!userHasPermission(user, 'treasury.manage_safes') && !userHasPermission(user, 'treasury.create')) {
      return forbiddenResponse('غير مصرح لك بإنشاء خزنة جديدة');
    }

    const body = await req.json();
    const { name, code, type = 'cash', notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم الخزنة مطلوب' }, { status: 400 });
    }

    // Generate code if not provided
    let treasuryCode = code;
    if (!treasuryCode) {
      const { count } = await supabase
        .from('treasuries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.company_id);
      treasuryCode = `TR-0${(count || 0) + 1}`;
    }

    const { data: newTreasury, error: insertErr } = await supabase
      .from('treasuries')
      .insert({
        company_id: user.company_id,
        name: name.trim(),
        code: treasuryCode,
        type: type === 'bank' ? 'bank' : 'cash',
        is_main: false,
        is_active: true,
        notes: notes || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json(newTreasury);
  } catch (error: any) {
    console.error('Failed to create treasury:', error);
    return NextResponse.json({ error: error.message || 'فشل إنشاء الخزنة' }, { status: 500 });
  }
}
