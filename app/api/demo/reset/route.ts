import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import {
  statementItems,
  statements,
  clientDeposits,
  treasuryTransactions,
  shipments,
  clientPricing,
  clientItems,
  clients,
  auditLog,
} from '@/src/db/schema';
import { verifyAuth } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    // Delete all operational dummy records in foreign-key safe order
    await db.delete(statementItems);
    await db.delete(statements);
    await db.delete(clientDeposits);
    await db.delete(treasuryTransactions);
    await db.delete(shipments);
    await db.delete(clientPricing);
    await db.delete(clientItems);
    await db.delete(clients);
    await db.delete(auditLog);

    return NextResponse.json({
      success: true,
      message: 'تم تصفير النظام ومسح جميع البيانات التجريبية بنجاح! النظام الآن جاهز لإدخال بياناتكم الحقيقية.',
    });
  } catch (error: any) {
    console.error('Failed to reset demo data:', error);
    return NextResponse.json({ error: error.message || 'فشل مسح البيانات التجريبية' }, { status: 500 });
  }
}
