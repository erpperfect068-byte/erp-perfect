import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // 1. Get counts
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', (user as any).company_id)
      .eq('is_active', true);

    const { count: shipmentsCount } = await supabase
      .from('shipments')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', (user as any).company_id);

    // 2. Get deposits aggregate per currency
    const { data: depositsData } = await supabase
      .from('client_deposits')
      .select('amount, currency')
      .eq('company_id', (user as any).company_id);

    const depositsSummary: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
    (depositsData || []).forEach((item: any) => {
      const cur = item.currency || 'EGP';
      depositsSummary[cur] = (depositsSummary[cur] || 0) + Number(item.amount || 0);
    });

    // 3. Get treasury balances per currency
    const { data: treasuryData } = await supabase
      .from('treasury_transactions')
      .select('amount, currency, transaction_type, is_reversed')
      .eq('company_id', (user as any).company_id)
      .eq('is_reversed', false);

    const treasuryBalances: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
    (treasuryData || []).forEach((item: any) => {
      const cur = item.currency || 'EGP';
      const val = Number(item.amount || 0);
      if (item.transaction_type === 'deposit') {
        treasuryBalances[cur] = (treasuryBalances[cur] || 0) + val;
      } else if (item.transaction_type === 'withdraw' || item.transaction_type === 'reversal') {
        treasuryBalances[cur] = (treasuryBalances[cur] || 0) - val;
      }
    });

    return NextResponse.json({
      clientsCount: clientsCount || 0,
      shipmentsCount: shipmentsCount || 0,
      treasury: treasuryBalances,
      deposits: depositsSummary,
    });
  } catch (error: any) {
    console.error('Failed to load dashboard stats:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب إحصائيات لوحة التحكم' }, { status: 500 });
  }
}
