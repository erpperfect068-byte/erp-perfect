import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, userHasPermission, forbiddenResponse } from '@/lib/supabase-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function canReadClientItems(user: { permissions: string[]; role: string }) {
  return (
    userHasPermission(user as any, 'clients.view') ||
    userHasPermission(user as any, 'clients.create') ||
    userHasPermission(user as any, 'shipments.view') ||
    userHasPermission(user as any, 'shipments.create')
  );
}

/** GET /api/clients/[id]/items — items only from client_items for the given client. */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }
    if (!canReadClientItems(user as any)) {
      return forbiddenResponse('غير مصرح لك بعرض أصناف العميل');
    }

    const { id: clientId } = await context.params;
    const companyId = (user as any).company_id || null;

    let clientQuery = supabase.from('clients').select('id').eq('id', clientId);
    if (companyId) clientQuery = clientQuery.eq('company_id', companyId);

    const { data: client, error: clientErr } = await clientQuery.maybeSingle();
    if (clientErr) throw clientErr;
    if (!client) {
      return NextResponse.json({ error: 'العميل غير موجود' }, { status: 404 });
    }

    const { data: items, error: itemsErr } = await supabase
      .from('client_items')
      .select('id, name, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (itemsErr) throw itemsErr;

    return NextResponse.json(
      (items || []).map((it: { id: string; name: string }) => ({
        id: it.id,
        name: it.name,
      }))
    );
  } catch (err: any) {
    console.error('Failed to list client items:', err);
    return NextResponse.json({ error: err.message || 'فشل جلب أصناف العميل' }, { status: 500 });
  }
}
