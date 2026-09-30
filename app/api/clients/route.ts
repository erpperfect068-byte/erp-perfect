import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

// List Clients
export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // Query clients with nested client_items and client_pricing using Supabase foreign keys
    const { data: clientsList, error: dbError } = await supabase
      .from('clients')
      .select('*, items:client_items(*), pricing:client_pricing(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (dbError) throw dbError;

    // Map properties for camelCase frontend compatibility
    const formattedClients = (clientsList || []).map((c: any) => ({
      ...c,
      contactPerson: c.contact_person,
      taxNumber: c.tax_number,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      pricing: (c.pricing || []).map((p: any) => ({
        ...p,
        serviceName: p.service_name,
        price: p.default_amount,
        isActive: p.is_active,
      })),
    }));

    return NextResponse.json(formattedClients);
  } catch (error: any) {
    console.error('Failed to list clients:', error);
    if (error.code === '42501' || error.message?.includes('violates row-level security')) {
      return NextResponse.json({ error: 'غير مصرح لك بقراءة بيانات العملاء' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل جلب قائمة العملاء' }, { status: 500 });
  }
}

// Create Client (Atomic RPC Execution)
export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { name, contactPerson, phone, email, address, taxNumber, notes, items = [], pricing = [] } = body;

    if (!name) {
      return NextResponse.json({ error: 'اسم العميل مطلوب' }, { status: 400 });
    }

    // Call atomic RPC function create_client_with_details
    const { data: createdClient, error: rpcError } = await supabase.rpc('create_client_with_details', {
      p_name: name,
      p_contact_person: contactPerson || null,
      p_phone: phone || null,
      p_email: email || null,
      p_address: address || null,
      p_tax_number: taxNumber || null,
      p_notes: notes || null,
      p_items: items,
      p_pricing: pricing,
    });

    if (rpcError) throw rpcError;

    // Format response for frontend compatibility
    const formattedResult = {
      ...createdClient,
      contactPerson: createdClient.contact_person,
      taxNumber: createdClient.tax_number,
      isActive: createdClient.is_active,
      createdAt: createdClient.created_at,
      pricing: (createdClient.pricing || []).map((p: any) => ({
        ...p,
        serviceName: p.service_name,
        price: p.default_amount,
      })),
    };

    return NextResponse.json(formattedResult);
  } catch (error: any) {
    console.error('Failed to create client:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'هذا العميل متواجد بالفعل بقاعدة البيانات' }, { status: 400 });
    }
    if (error.code === '42501' || error.message?.includes('غير مصرح') || error.message?.includes('violates row-level security')) {
      return NextResponse.json({ error: 'غير مصرح لك بإضافة عملاء جدد' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل إضافة العميل' }, { status: 500 });
  }
}
