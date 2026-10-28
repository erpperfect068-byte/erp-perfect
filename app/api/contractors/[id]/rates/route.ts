import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.view')) return forbiddenResponse();

    const { id: contractorId } = await context.params;
    const { data: rates, error: err } = await supabase
      .from('contractor_rates')
      .select('*')
      .eq('contractor_id', contractorId)
      .order('zone_name', { ascending: true });

    if (err) throw err;
    return NextResponse.json({ success: true, rates: rates || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل استرجاع أسعار المناطق' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.pricing') && !userHasPermission(user, 'contractors.update')) {
      return forbiddenResponse('غير مصرح لك بإضافة أسعار ومناطق للمقاول');
    }

    const { id: contractorId } = await context.params;
    const body = await req.json();
    const { zoneName, containerType, price, currency, notes } = body;

    if (!zoneName || price === undefined) {
      return NextResponse.json({ error: 'اسم المنطقة والسعر مطلوبان' }, { status: 400 });
    }

    const { data: newRate, error: insErr } = await supabase
      .from('contractor_rates')
      .insert({
        contractor_id: contractorId,
        zone_name: zoneName.trim(),
        container_type: containerType || 'general',
        price: Number(price) || 0,
        currency: currency || 'EGP',
        notes: notes ? notes.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insErr) throw insErr;

    return NextResponse.json({ success: true, message: 'تم إضافة تسعيرة المنطقة بنجاح', rate: newRate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل إضافة التسعيرة' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.pricing') && !userHasPermission(user, 'contractors.update')) {
      return forbiddenResponse('غير مصرح لك بتعديل أسعار المقاول');
    }

    const { id: contractorId } = await context.params;
    const body = await req.json();
    const { rateId, zoneName, containerType, price, currency, notes } = body;

    if (!rateId) {
      return NextResponse.json({ error: 'معرف التسعيرة مطلوب' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (zoneName !== undefined) updates.zone_name = zoneName.trim();
    if (containerType !== undefined) updates.container_type = containerType;
    if (price !== undefined) updates.price = Number(price);
    if (currency !== undefined) updates.currency = currency;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;

    const { data: updatedRate, error: updateErr } = await supabase
      .from('contractor_rates')
      .update(updates)
      .eq('id', rateId)
      .eq('contractor_id', contractorId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, message: 'تم تحديث التسعيرة بنجاح', rate: updatedRate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل تحديث التسعيرة' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    if (!userHasPermission(user, 'contractors.pricing') && !userHasPermission(user, 'contractors.update')) {
      return forbiddenResponse('غير مصرح لك بحذف أسعار المقاول');
    }

    const { id: contractorId } = await context.params;
    const { searchParams } = new URL(req.url);
    const rateId = searchParams.get('rateId');

    if (!rateId) {
      return NextResponse.json({ error: 'معرف التسعيرة مطلوب' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('contractor_rates')
      .delete()
      .eq('id', rateId)
      .eq('contractor_id', contractorId);

    if (delErr) throw delErr;

    return NextResponse.json({ success: true, message: 'تم حذف تسعيرة المنطقة بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل حذف التسعيرة' }, { status: 500 });
  }
}
