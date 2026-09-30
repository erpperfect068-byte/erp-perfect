import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) {
      return NextResponse.json({ error: error || 'غير مصرح' }, { status });
    }

    const { id: custodyId } = await params;
    const body = await req.json();
    const { returnedAmount = 0, discrepancyNote = null } = body;

    const { data, error: rpcError } = await supabase.rpc('close_custody', {
      p_custody_id: custodyId,
      p_returned_amount: returnedAmount,
      p_discrepancy_note: discrepancyNote,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Failed to close custody:', error);
    if (error.code === '42501' || error.message?.includes('غير مصرح')) {
      return NextResponse.json({ error: 'غير مصرح لك بقفل وتسوية العهد' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message || 'فشل تسوية وقفل العهدة' }, { status: 500 });
  }
}
