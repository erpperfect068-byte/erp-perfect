import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { clientDeposits, clients, statements, shipments, treasuryTransactions } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { verifyAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const depositsList = await db.select().from(clientDeposits).orderBy(desc(clientDeposits.createdAt));

    const fullDeposits = await Promise.all(
      depositsList.map(async (dep) => {
        const client = await db.select().from(clients).where(eq(clients.id, dep.clientId)).then(res => res[0]);
        const statement = dep.statementId ? await db.select().from(statements).where(eq(statements.id, dep.statementId)).then(res => res[0]) : null;
        const shipment = statement ? await db.select().from(shipments).where(eq(shipments.id, statement.shipmentId)).then(res => res[0]) : null;

        return {
          ...dep,
          client,
          statement: statement ? { ...statement, shipment } : null,
        };
      })
    );

    return NextResponse.json(fullDeposits);
  } catch (error) {
    console.error('Failed to list deposits:', error);
    return NextResponse.json({ error: 'Failed to retrieve deposits list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body = await req.json();
    const { clientId, statementId, amount, currency, exchangeRateAtTransaction, receiptNumber, notes } = body;

    if (!clientId || !amount) {
      return NextResponse.json({ error: 'Client and amount are required' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Insert Deposit
      const [newDeposit] = await tx.insert(clientDeposits).values({
        clientId,
        statementId: statementId || null,
        amount: amount.toString(),
        currency: currency || 'EGP',
        exchangeRateAtTransaction: exchangeRateAtTransaction ? exchangeRateAtTransaction.toString() : '1.0000',
        receiptNumber: receiptNumber || null,
        notes: notes || null,
        createdBy: user.id,
      }).returning();

      // 2. To update treasury with client's general cash injection (deposit is a positive treasury receipt)
      await tx.insert(treasuryTransactions).values({
        statementId: statementId || null,
        clientId,
        transactionType: 'deposit',
        amount: amount.toString(),
        currency: currency || 'EGP',
        exchangeRateAtTransaction: exchangeRateAtTransaction ? exchangeRateAtTransaction.toString() : '1.0000',
        referenceNumber: receiptNumber || null,
        notes: `إيداع أمانة عميل: ${notes || ''}`,
        createdBy: user.id,
      });

      // 3. Log Audit
      await logAudit({
        tableName: 'client_deposits',
        recordId: newDeposit.id,
        action: 'INSERT',
        newData: newDeposit,
        userEmail: user.email,
        req,
      });

      return newDeposit;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to create deposit:', error);
    return NextResponse.json({ error: 'Failed to record custody deposit' }, { status: 500 });
  }
}
