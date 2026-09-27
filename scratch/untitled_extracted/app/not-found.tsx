import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-950/60 p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black">٤٠٤ - الصفحة غير موجودة</h1>
          <p className="text-sm text-slate-400 font-light">
            عذراً، لم نتمكن من العثور على الصفحة المطلوبة. ربما تم نقلها أو حذفها من النظام.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20"
        >
          <span>العودة للوحة القيادة</span>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
