import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function formatClient(c: any) {
  return {
    ...c,
    contactPerson: c.contact_person,
    taxNumber: c.tax_number,
    isActive: c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    items: c.items || c.client_items || [],
    pricing: ((c.pricing || c.client_pricing) || []).map((p: any) => ({
      ...p,
      serviceName: p.service_name,
      price: p.default_amount ?? p.price,
      isActive: p.is_active,
    })),
  };
}

async function getOwnedClient(supabase: any, id: string, companyId: string | null) {
  let query = supabase
    .from('clients')
    .select('*, items:client_items(*), pricing:client_pricing(*)')
    .eq('id', id);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query.maybeSingle();
  return { data, error };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }
    if (!userHasPermission(user, 'clients.view') && !userHasPermission(user, 'clients.create')) {
      return forbiddenResponse('غير مصرح لك بعرض بيانات العميل');
    }

    const { id } = await context.params;
    const { data: client, error: fetchErr } = await getOwnedClient(
      supabase,
      id,
      (user as any).company_id || null
    );

    if (fetchErr) throw fetchErr;
    if (!client) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    return NextResponse.json(formatClient(client));
  } catch (err: any) {
    console.error('Failed to get client:', err);
    return NextResponse.json({ error: err.message || 'فشل استرجاع العميل' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }
    if (!userHasPermission(user, 'clients.edit') && !userHasPermission(user, 'clients.update')) {
      return forbiddenResponse('غير مصرح لك بتعديل بيانات العملاء');
    }

    const { id } = await context.params;
    const companyId = (user as any).company_id || null;

    const { data: existing, error: fetchErr } = await getOwnedClient(supabase, id, companyId);
    if (fetchErr) throw fetchErr;
    if (!existing) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    const body = await req.json();
    const { name, contactPerson, phone, email, address, taxNumber, notes, items, pricing } = body;

    if (name !== undefined && (!name || !String(name).trim())) {
      return NextResponse.json({ error: 'اسم العميل لا يمكن أن يكون فارغاً' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    if (name !== undefined) updates.name = String(name).trim();
    if (contactPerson !== undefined) updates.contact_person = contactPerson ? String(contactPerson).trim() : null;
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (email !== undefined) updates.email = email ? String(email).trim() : null;
    if (address !== undefined) updates.address = address ? String(address).trim() : null;
    if (taxNumber !== undefined) updates.tax_number = taxNumber ? String(taxNumber).trim() : null;
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    let updateQuery = supabase.from('clients').update(updates).eq('id', id);
    if (companyId) updateQuery = updateQuery.eq('company_id', companyId);
    const { error: updateErr } = await updateQuery;

    if (updateErr) throw updateErr;

    // Sync items: keep referenced shipment items; replace the rest by name list
    if (Array.isArray(items)) {
      const desiredNames = items
        .map((n: any) => (typeof n === 'string' ? n.trim() : String(n?.name || '').trim()))
        .filter(Boolean);
      const desiredSet = new Set(desiredNames);
      const existingItems: any[] = existing.items || [];

      const { data: usedItemRows } = await supabase
        .from('shipments')
        .select('client_item_id')
        .eq('client_id', id)
        .not('client_item_id', 'is', null);

      const usedItemIds = new Set((usedItemRows || []).map((r: any) => r.client_item_id).filter(Boolean));

      for (const item of existingItems) {
        if (!desiredSet.has(item.name) && !usedItemIds.has(item.id)) {
          await supabase.from('client_items').delete().eq('id', item.id).eq('client_id', id);
        }
      }

      const remainingNames = new Set(
        existingItems
          .filter((item) => desiredSet.has(item.name) || usedItemIds.has(item.id))
          .map((item) => item.name)
      );

      const toInsert = desiredNames.filter((n: string) => !remainingNames.has(n));
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('client_items').insert(
          toInsert.map((name: string) => ({
            client_id: id,
            name,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          }))
        );
        if (insErr) throw insErr;
      }
    }

    // Sync pricing: full replace (no shipment FK)
    if (Array.isArray(pricing)) {
      const { error: delPriceErr } = await supabase.from('client_pricing').delete().eq('client_id', id);
      if (delPriceErr) throw delPriceErr;

      const priceRows = pricing
        .map((p: any) => ({
          client_id: id,
          service_name: String(p.serviceName || p.service_name || '').trim(),
          default_amount: Number(p.price ?? p.default_amount ?? 0),
          currency: p.currency || 'EGP',
          created_by: user.id,
          updated_at: new Date().toISOString(),
        }))
        .filter((p: any) => p.service_name && !Number.isNaN(p.default_amount));

      if (priceRows.length > 0) {
        const { error: insPriceErr } = await supabase.from('client_pricing').insert(priceRows);
        if (insPriceErr) throw insPriceErr;
      }
    }

    const { data: refreshed, error: refreshErr } = await getOwnedClient(supabase, id, companyId);
    if (refreshErr) throw refreshErr;

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات العميل بنجاح',
      client: formatClient(refreshed),
    });
  } catch (err: any) {
    console.error('Failed to update client:', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'بيانات مكررة لعميل موجود' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'فشل تحديث بيانات العميل' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }
    if (!userHasPermission(user, 'clients.delete')) {
      return forbiddenResponse('غير مصرح لك بحذف/تعطيل العملاء');
    }

    const { id } = await context.params;
    const companyId = (user as any).company_id || null;

    const { data: existing, error: fetchErr } = await getOwnedClient(supabase, id, companyId);
    if (fetchErr) throw fetchErr;
    if (!existing) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    // Soft delete — keep FK integrity with shipments/deposits
    let query = supabase
      .from('clients')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', id);

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { error: softErr } = await query;
    if (softErr) throw softErr;

    return NextResponse.json({
      success: true,
      message: 'تم تعطيل العميل بنجاح (لن يظهر في القوائم النشطة)',
    });
  } catch (err: any) {
    console.error('Failed to deactivate client:', err);
    return NextResponse.json({ error: err.message || 'فشل تعطيل العميل' }, { status: 500 });
  }
}
