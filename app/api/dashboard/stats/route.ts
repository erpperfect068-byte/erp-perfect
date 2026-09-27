import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { clients, shipments, clientDeposits, treasuryTransactions } from '@/src/db/schema';
import { sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    // 1. Get counts
    const clientCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(clients);
    const shipmentCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(shipments);

    // 2. Get deposits aggregate per currency
    const depositsResult = await db.select({
      currency: clientDeposits.currency,
      total: sql<string>`sum(amount)::text`
    }).from(clientDeposits).groupBy(clientDeposits.currency);

    // 3. Get treasury balances per currency (deposits - withdraws)
    const treasuryResult = await db.select({
      currency: treasuryTransactions.currency,
      type: treasuryTransactions.transactionType,
      total: sql<string>`sum(amount)::text`
    }).from(treasuryTransactions)
      .where(sql`is_reversed = false`)
      .groupBy(treasuryTransactions.currency, treasuryTransactions.transactionType);

    // Calculate balances per currency
    const treasuryBalances: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
    treasuryResult.forEach((item) => {
      const cur = item.currency || 'EGP';
      const val = parseFloat(item.total || '0');
      if (item.type === 'deposit') {
        treasuryBalances[cur] = (treasuryBalances[cur] || 0) + val;
      } else if (item.type === 'withdraw' || item.type === 'reversal') {
        treasuryBalances[cur] = (treasuryBalances[cur] || 0) - val;
      }
    });

    const depositsSummary: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
    depositsResult.forEach((item) => {
      const cur = item.currency || 'EGP';
      depositsSummary[cur] = parseFloat(item.total || '0');
    });

    return NextResponse.json({
      clientsCount: clientCountResult[0]?.count || 0,
      shipmentsCount: shipmentCountResult[0]?.count || 0,
      treasury: treasuryBalances,
      deposits: depositsSummary,
    });
  } catch (error) {
    console.error('Failed to load dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to retrieve stats' }, { status: 500 });
  }
}
