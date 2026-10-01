import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// List Statements & Items
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { data: statementsList, error: dbError } = await supabase
      .from('statements')
      .select('*, shipment:shipments(*, client:clients(*)), items:statement_items(*)')
      .eq('company_id', (user as any).company_id)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    const formattedStatements = (statementsList || []).map((stmt: any) => {
      const shipment = stmt.shipment ? {
        ...stmt.shipment,
        clientId: stmt.shipment.client_id,
        invoiceNumber: stmt.shipment.invoice_number,
        acid: stmt.shipment.acid,
        declarationNumber46: stmt.shipment.declaration_number_46,
      } : null;

      const client = stmt.shipment?.client ? {
        ...stmt.shipment.client,
        contactPerson: stmt.shipment.client.contact_person,
        taxNumber: stmt.shipment.client.tax_number,
      } : null;

      const items = (stmt.items || []).map((item: any) => ({
        ...item,
        statementId: item.statement_id,
        itemType: item.item_type,
        amount: parseFloat(Number(item.amount || 0).toFixed(2)),
        currency: item.currency || 'EGP',
        exchangeRateAtTransaction: item.exchange_rate_at_transaction,
        externalReceiptNumber: item.external_receipt_number,
        attachmentPath: item.attachment_path,
        isReversed: item.is_reversed || false,
        reversedByItemId: item.reversed_by_item_id,
        reversalReason: item.reversal_reason,
        createdAt: item.created_at,
      }));

      return {
        ...stmt,
        shipmentId: stmt.shipment_id,
        statementDate: stmt.statement_date,
        totalAmount: parseFloat(Number(stmt.total_amount || 0).toFixed(2)),
        currency: stmt.currency || 'EGP',
        createdAt: stmt.created_at,
        shipment,
        client,
        items,
      };
    });

    return NextResponse.json(formattedStatements);
  } catch (error: any) {
    console.error('Failed to list statements:', error);
    return NextResponse.json({ error: error.message || 'فشل جلب كشوف الحسابات' }, { status: 500 });
  }
}

// Add Item or Reverse Item in Statement
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const {
      statementId,
      itemType, // 'expense', 'fee', 'deposit_deduction', 'reversal'
      description,
      amount,
      currency = 'EGP',
      exchangeRateAtTransaction = 1.0000,
      externalReceiptNumber,
      attachmentPath,
      percentage,
      originalItemId,
      reversalReason,
    } = body;

    if (!statementId) {
      return NextResponse.json({ error: 'معرف كشف الحساب مطلوب' }, { status: 400 });
    }

    // Fetch Statement and Shipment details
    const { data: statement, error: stmtErr } = await supabase
      .from('statements')
      .select('*, shipment:shipments(client_id)')
      .eq('id', statementId)
      .single();

    if (stmtErr || !statement) {
      return NextResponse.json({ error: 'كشف الحساب غير موجود' }, { status: 404 });
    }

    const clientId = statement.shipment?.client_id;
    let finalItem: any;

    if (itemType === 'reversal') {
      if (!originalItemId) {
        return NextResponse.json({ error: 'معرف البند المراد عكسه مطلوب' }, { status: 400 });
      }

      // Fetch original item
      const { data: originalItem, error: fetchErr } = await supabase
        .from('statement_items')
        .select('*')
        .eq('id', originalItemId)
        .single();

      if (fetchErr || !originalItem) {
        return NextResponse.json({ error: 'بند كشف الحساب غير موجود' }, { status: 404 });
      }

      if (originalItem.is_reversed) {
        return NextResponse.json({ error: 'تم إنشاء قيد عكسي لهذا البند بالفعل' }, { status: 400 });
      }

      const revAmount = parseFloat((Number(originalItem.amount) * -1).toFixed(2));

      // 1. Create reversal item in statement_items
      const { data: reversalItem, error: revItemErr } = await supabase
        .from('statement_items')
        .insert({
          company_id: (user as any).company_id || null,
          statement_id: statementId,
          item_type: 'reversal',
          description: `عكس عملية: ${originalItem.description}`,
          amount: revAmount,
          currency: originalItem.currency,
          exchange_rate_at_transaction: originalItem.exchange_rate_at_transaction,
          external_receipt_number: originalItem.external_receipt_number,
          reversal_reason: reversalReason || 'إلغاء/تعديل محاسبي',
          created_by: user.id,
        })
        .select()
        .single();

      if (revItemErr) throw revItemErr;

      // 2. Mark original item as reversed
      await supabase
        .from('statement_items')
        .update({
          is_reversed: true,
          reversed_by_item_id: reversalItem.id,
        })
        .eq('id', originalItemId);

      // 3. Create reversal in treasury if original item touched treasury
      if (clientId && (originalItem.item_type === 'fee' || originalItem.item_type === 'expense')) {
        const revTreasuryType = originalItem.item_type === 'fee' ? 'withdraw' : 'deposit';
        await supabase.from('treasury_transactions').insert({
          company_id: (user as any).company_id || null,
          statement_id: statementId,
          client_id: clientId,
          transaction_type: revTreasuryType,
          amount: Math.abs(revAmount),
          currency: originalItem.currency,
          exchange_rate_at_transaction: originalItem.exchange_rate_at_transaction,
          reference_number: originalItem.external_receipt_number || null,
          notes: `قيد عكسي لخزينة كشف الحساب: ${originalItem.description}`,
          created_by: user.id,
        });
      }

      finalItem = reversalItem;
    } else {
      // Standard item insertion
      if (!description || !amount || parseFloat(amount) <= 0) {
        return NextResponse.json({ error: 'وصف البند والمبلغ (أكبر من 0) مطلوبان' }, { status: 400 });
      }

      const numAmount = parseFloat(Number(amount).toFixed(2));
      const numRate = parseFloat(Number(exchangeRateAtTransaction).toFixed(4));

      const { data: newItem, error: insertErr } = await supabase
        .from('statement_items')
        .insert({
          company_id: (user as any).company_id || null,
          statement_id: statementId,
          item_type: itemType || 'expense',
          description,
          amount: numAmount,
          currency: currency || 'EGP',
          exchange_rate_at_transaction: numRate,
          external_receipt_number: externalReceiptNumber || null,
          attachment_path: attachmentPath || null,
          percentage: percentage ? parseFloat(percentage) : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Treasury integration for fees and expenses
      if (clientId && (itemType === 'fee' || itemType === 'expense')) {
        await supabase.from('treasury_transactions').insert({
          company_id: (user as any).company_id || null,
          statement_id: statementId,
          client_id: clientId,
          transaction_type: itemType === 'fee' ? 'deposit' : 'withdraw',
          amount: numAmount,
          currency: currency || 'EGP',
          exchange_rate_at_transaction: numRate,
          reference_number: externalReceiptNumber || null,
          notes: `${itemType === 'fee' ? 'أتعاب تخليص' : 'مصاريف جمركية'}: ${description}`,
          created_by: user.id,
        });
      }

      finalItem = newItem;
    }

    // Re-calculate Statement total Amount
    const { data: allItems } = await supabase
      .from('statement_items')
      .select('amount, exchange_rate_at_transaction')
      .eq('statement_id', statementId);

    let newTotal = 0;
    (allItems || []).forEach((it: any) => {
      const a = Number(it.amount || 0);
      const r = Number(it.exchange_rate_at_transaction || 1);
      newTotal += a * r;
    });

    await supabase
      .from('statements')
      .update({
        total_amount: parseFloat(newTotal.toFixed(2)),
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', statementId);

    const formattedItem = {
      ...finalItem,
      statementId: finalItem.statement_id,
      itemType: finalItem.item_type,
      amount: parseFloat(Number(finalItem.amount || 0).toFixed(2)),
      currency: finalItem.currency || 'EGP',
      externalReceiptNumber: finalItem.external_receipt_number,
      attachmentPath: finalItem.attachment_path,
      isReversed: finalItem.is_reversed || false,
      reversedByItemId: finalItem.reversed_by_item_id,
      createdAt: finalItem.created_at,
    };

    return NextResponse.json(formattedItem);
  } catch (error: any) {
    console.error('Failed to create statement item:', error);
    return NextResponse.json({ error: error.message || 'فشل إدخال بند كشف الحساب' }, { status: 500 });
  }
}
