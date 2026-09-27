import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { treasuryTransactions, clients, statements, shipments } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { verifyAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const txList = await db.select().from(treasuryTransactions).orderBy(desc(treasuryTransactions.transactionDate));

    const fullTransactions = await Promise.all(
      txList.map(async (txItem) => {
        const client = txItem.clientId ? await db.select().from(clients).where(eq(clients.id, txItem.clientId)).then(res => res[0]) : null;
        const statement = txItem.statementId ? await db.select().from(statements).where(eq(statements.id, txItem.statementId)).then(res => res[0]) : null;
        const shipment = statement ? await db.select().from(shipments).where(eq(shipments.id, statement.shipmentId)).then(res => res[0]) : null;

        return {
          ...txItem,
          client,
          statement: statement ? { ...statement, shipment } : null,
        };
      })
    );

    return NextResponse.json(fullTransactions);
  } catch (error) {
    console.error('Failed to list treasury transactions:', error);
    return NextResponse.json({ error: 'Failed to retrieve treasury ledger' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body = await req.json();
    const { transactionType, amount, currency, exchangeRateAtTransaction, referenceNumber, notes, clientId } = body;

    if (!transactionType || !amount) {
      return NextResponse.json({ error: 'Transaction type and amount are required' }, { status: 400 });
    }

    const [newTransaction] = await db.insert(treasuryTransactions).values({
      clientId: clientId || null,
      transactionType,
      amount: amount.toString(),
      currency: currency || 'EGP',
      exchangeRateAtTransaction: exchangeRateAtTransaction ? exchangeRateAtTransaction.toString() : '1.0000',
      referenceNumber: referenceNumber || null,
      notes: notes || null,
      createdBy: user.id,
    }).returning();

    // Log Audit
    await logAudit({
      tableName: 'treasury_transactions',
      recordId: newTransaction.id,
      action: 'INSERT',
      newData: newTransaction,
      userEmail: user.email,
      req,
    });

    return NextResponse.json(newTransaction);
  } catch (error) {
    console.error('Failed to create treasury transaction:', error);
    return NextResponse.json({ error: 'Failed to record money movement' }, { status: 500 });
  }
}
