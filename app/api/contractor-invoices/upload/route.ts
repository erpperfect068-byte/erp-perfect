import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const { user, error, status, supabase } = await getAuthUser(req);
    if (error || !user) return NextResponse.json({ error: error || 'غير مصرح' }, { status });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم تحديد أي ملف للرفع' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `contractor-receipts/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { data, error: uploadErr } = await supabase.storage
      .from('contractor-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadErr) {
      // Fallback: return base64 data url if storage bucket is unreachable
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({
        success: true,
        url: dataUrl,
        fileName: file.name,
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('contractor-attachments')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
    });
  } catch (err: any) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: err.message || 'فشل رفع الملف' }, { status: 500 });
  }
}
