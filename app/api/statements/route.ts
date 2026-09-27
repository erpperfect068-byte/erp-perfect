import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db/index';
import { statements, statementItems, shipments, clients, treasuryTransactions } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';
import { verifyAuth } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const statementsList = await db.select().from(statements).orderBy(desc(statements.createdAt));

    const fullStatements = await Promise.all(
      statementsList.map(async (statement) => {
        const shipment = await db.select().from(shipments).where(eq(shipments.id, statement.shipmentId)).then(res => res[0]);
        const client = shipment ? await db.select().from(clients).where(eq(clients.id, shipment.clientId)).then(res => res[0]) : null;
        const items = await db.select().from(statementItems).where(eq(statementItems.statementId, statement.id)).orderBy(statementItems.createdAt);

        return {
          ...statement,
          shipment,
          client,
          items,
        };
      })
    );

    return NextResponse.json(fullStatements);
  } catch (error) {
    console.error('Failed to list statements:', error);
    return NextResponse.json({ error: 'Failed to retrieve statements list' }, { status: 500 });
  }
}

// Add Item or Reverse Item
export async function POST(req: NextRequest) {
  try {
    const { user, error, status } = await verifyAuth(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status });
    }

    const body = await req.json();
    const {
      statementId,
      itemType, // expense, fee, deposit_deduction, reversal
      description,
      amount,
      currency,
      exchangeRateAtTransaction,
      externalReceiptNumber,
      attachmentPath,
      percentage,
      // For Reversal:
      originalItemId,
      reversalReason,
    } = body;

    if (!statementId) {
      return NextResponse.json({ error: 'Statement ID is required' }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Fetch Statement and Shipment details
      const [statement] = await tx.select().from(statements).where(eq(statements.id, statementId));
      if (!statement) {
        throw new Error('Statement not found');
      }
      const [shipment] = await tx.select().from(shipments).where(eq(shipments.id, statement.shipmentId));

      let finalItem: any;

      if (itemType === 'reversal') {
        if (!originalItemId) {
          throw new Error('Original item ID is required for reversals');
        }

        // Fetch original item
        const [originalItem] = await tx.select().from(statementItems).where(eq(statementItems.id, originalItemId));
        if (!originalItem) {
          throw new Error('Original statement item not found');
        }

        if (originalItem.isReversed) {
          throw new Error('This item has already been reversed');
        }

        // Create reversal item in database
        const [reversalItem] = await tx.insert(statementItems).values({
          statementId,
          itemType: 'reversal',
          description: `عكس عملية: ${originalItem.description}`,
          amount: (parseFloat(originalItem.amount) * -1).toString(),
          currency: originalItem.currency,
          exchangeRateAtTransaction: originalItem.exchangeRateAtTransaction,
          externalReceiptNumber: originalItem.externalReceiptNumber,
          reversalReason: reversalReason || 'خطأ إدخال محاسبي',
          createdBy: user.id,
        }).returning();

        // Mark original item as reversed
        await tx.update(statementItems)
          .set({
            isReversed: true,
            reversedByItemId: reversalItem.id,
          })
          .where(eq(statementItems.id, originalItemId));

        // If the original transaction had a treasury counterpart, reverse that too!
        const treasuryMatches = await tx.select().from(treasuryTransactions).where(eq(treasuryTransactions.statementId, statementId));
        const matchingTreasury = treasuryMatches.find(t => t.amount === originalItem.amount && t.currency === originalItem.currency && !t.isReversed);

        if (matchingTreasury) {
          const [reversalTreasury] = await tx.insert(treasuryTransactions).values({
            statementId,
            clientId: shipment.clientId,
            transactionType: 'reversal',
            amount: (parseFloat(matchingTreasury.amount) * -1).toString(),
            currency: matchingTreasury.currency,
            exchangeRateAtTransaction: matchingTreasury.exchangeRateAtTransaction,
            referenceNumber: matchingTreasury.referenceNumber,
            notes: `عكس قيد الخزينة: ${matchingTreasury.notes || ''}`,
            createdBy: user.id,
          }).returning();

          await tx.update(treasuryTransactions)
            .set({
              isReversed: true,
              reversedByTransactionId: reversalTreasury.id,
            })
            .where(eq(treasuryTransactions.id, matchingTreasury.id));
        }

        finalItem = reversalItem;
      } else {
        // Standard item insertion
        const [newItem] = await tx.insert(statementItems).values({
          statementId,
          itemType,
          description,
          amount: amount.toString(),
          currency: currency || 'EGP',
          exchangeRateAtTransaction: exchangeRateAtTransaction ? exchangeRateAtTransaction.toString() : '1.0000',
          externalReceiptNumber: externalReceiptNumber || null,
          attachmentPath: attachmentPath || null,
          percentage: percentage ? percentage.toString() : null,
          createdBy: user.id,
        }).returning();

        // If it touches the treasury (e.g., fee paid directly in cash or expense withdrawn from treasury)
        if (itemType === 'fee' || itemType === 'expense') {
          await tx.insert(treasuryTransactions).values({
            statementId,
            clientId: shipment.clientId,
            transactionType: itemType === 'fee' ? 'deposit' : 'withdraw',
            amount: amount.toString(),
            currency: currency || 'EGP',
            exchangeRateAtTransaction: exchangeRateAtTransaction ? exchangeRateAtTransaction.toString() : '1.0000',
            referenceNumber: externalReceiptNumber || null,
            notes: `${itemType === 'fee' ? 'أتعاب تخليص' : 'مصاريف جمركية'}: ${description}`,
            createdBy: user.id,
          });
        }

        finalItem = newItem;
      }

      // Re-calculate Statement total Amount
      const statementItemsList = await tx.select().from(statementItems).where(eq(statementItems.statementId, statementId));
      let newTotal = 0;
      statementItemsList.forEach((item) => {
        const itemAmount = parseFloat(item.amount);
        const rate = parseFloat(item.exchangeRateAtTransaction);
        newTotal += itemAmount * rate;
      });

      await tx.update(statements)
        .set({
          totalAmount: newTotal.toFixed(2),
          updatedAt: new Date(),
          updatedBy: user.id,
        })
        .where(eq(statements.id, statementId));

      // Audit Log
      await logAudit({
        tableName: 'statement_items',
        recordId: finalItem.id,
        action: 'INSERT',
        newData: finalItem,
        userEmail: user.email,
        req,
      });

      return finalItem;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create statement item:', error);
    return NextResponse.json({ error: error.message || 'Failed to record statement transaction' }, { status: 500 });
  }
}
