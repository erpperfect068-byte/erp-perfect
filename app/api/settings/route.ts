import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    // Fetch all lookup tables via user-authenticated Supabase client (RLS enforced)
    const [portsRes, agenciesRes, contractorsRes, statusesRes] = await Promise.all([
      supabase.from('ports').select('*').eq('company_id', (user as any).company_id).order('name'),
      supabase.from('agencies').select('*').eq('company_id', (user as any).company_id).order('name'),
      supabase.from('contractors').select('*').eq('company_id', (user as any).company_id).order('name'),
      supabase.from('statuses').select('*').eq('company_id', (user as any).company_id).order('name'),
    ]);

    if (portsRes.error) throw portsRes.error;
    if (agenciesRes.error) throw agenciesRes.error;
    if (contractorsRes.error) throw contractorsRes.error;
    if (statusesRes.error) throw statusesRes.error;

    return NextResponse.json({
      ports: portsRes.data || [],
      agencies: agenciesRes.data || [],
      contractors: contractorsRes.data || [],
      statuses: statusesRes.data || [],
    });
  } catch (error: any) {
    console.error('Failed to load settings from Supabase:', error);
    return NextResponse.json(
      { error: error.message || 'فشل جلب إعدادات النظام من قاعدة البيانات' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const body = await req.json();
    const { type, name, color } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'النوع والاسم مطلوبة' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'port': {
        const { data, error: err } = await supabase.from('ports').insert([{ name, company_id: (user as any).company_id || null }]).select().single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'agency': {
        const { data, error: err } = await supabase.from('agencies').insert([{ name, company_id: (user as any).company_id || null }]).select().single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'contractor': {
        const { data, error: err } = await supabase.from('contractors').insert([{ name, company_id: (user as any).company_id || null }]).select().single();
        if (err) throw err;
        result = data;
        break;
      }
      case 'status': {
        const { data, error: err } = await supabase.from('statuses').insert([{ name, color: color || '#6b7280', company_id: (user as any).company_id || null }]).select().single();
        if (err) throw err;
        result = data;
        break;
      }
      default:
        return NextResponse.json({ error: 'نوع الإعداد غير صالح' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to add setting to Supabase:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'هذا السجل متواجد بالفعل بقاعدة البيانات' }, { status: 400 });
    }
    if (error.code === '42501' || error.message?.includes('violates row-level security')) {
      return NextResponse.json({ error: 'غير مصرح لك بإضافة هذا السجل' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'فشل إضافة السجل لقاعدة البيانات' },
      { status: 500 }
    );
  }
}
