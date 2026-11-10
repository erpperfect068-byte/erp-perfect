'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Receipt,
  Plus,
  Trash2,
  UploadCloud,
  ExternalLink,
  CreditCard,
  Wallet,
  Layers,
} from 'lucide-react';

export interface InvoiceSheetItem {
  id?: string;
  itemType: string;
  description: string;
  amount: number;
  attachmentUrl?: string | null;
}

export interface InvoiceSheetInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: 'pending' | 'approved' | 'partially_paid' | 'paid' | 'cancelled' | string;
  notes?: string | null;
  contractorId: string;
  contractor?: {
    id: string;
    name: string;
    phone?: string;
    tax_number?: string;
    bank_accounts?: Array<{
      id: string;
      bank_name: string;
      account_number: string;
      account_holder?: string | null;
    }>;
  };
  shipmentId: string;
  shipment?: {
    id: string;
    bol_number?: string;
    bill_of_lading_number?: string;
    declaration_number_46?: string;
    client?: { name: string } | null;
  };
  items?: InvoiceSheetItem[];
  createdAt?: string;
}

type DraftItem = {
  itemType: string;
  description: string;
  amount: string;
  attachmentUrl: string;
};

const ITEM_TYPE_LABELS: Record<string, string> = {
  transport: 'نقل وتوصيل',
  demurrage: 'مبيت سيارات',
  weighing: 'رسوم ميزان',
  toll: 'كارتة طريق',
  loading: 'تعتيق وتفريغ',
  other: 'مصروفات أخرى',
};

const EMPTY_DRAFT: DraftItem = {
  itemType: 'transport',
  description: '',
  amount: '',
  attachmentUrl: '',
};

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'قيد المراجعة (لم تُعتمد كدين بعد)';
    case 'approved':
      return 'معتمدة - دين مستحق على الشركة';
    case 'partially_paid':
      return 'مدفوعة جزئياً';
    case 'paid':
      return 'مدفوعة بالكامل';
    default:
      return status;
  }
}

function bolLabel(shipment?: InvoiceSheetInvoice['shipment']) {
  if (!shipment) return 'بدون';
  return (
    shipment.bol_number ||
    shipment.bill_of_lading_number ||
    shipment.declaration_number_46 ||
    'بدون'
  );
}

export interface InvoicePayoutContext {
  fromTreasuryName?: string | null;
  toBankName?: string | null;
  toAccountNumber?: string | null;
  toAccountHolder?: string | null;
  paidAmount?: number | null;
  currency?: string | null;
  referenceNumber?: string | null;
}

interface ContractorInvoiceSheetProps {
  invoice: InvoiceSheetInvoice;
  getAuthToken: () => Promise<string | null>;
  canEdit: boolean;
  canApprove: boolean;
  canPay: boolean;
  /** ledger = opened from treasury payout row: items + transfer path only */
  variant?: 'default' | 'ledger';
  payoutContext?: InvoicePayoutContext | null;
  onClose: () => void;
  onUpdated: (invoice: InvoiceSheetInvoice) => void;
  onApprove: (invoice: InvoiceSheetInvoice) => void;
  onPay: (invoice: InvoiceSheetInvoice) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function ContractorInvoiceSheet({
  invoice: initialInvoice,
  getAuthToken,
  canEdit,
  canApprove,
  canPay,
  variant = 'default',
  payoutContext = null,
  onClose,
  onUpdated,
  onApprove,
  onPay,
  showToast,
}: ContractorInvoiceSheetProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [draft, setDraft] = useState<DraftItem>({ ...EMPTY_DRAFT });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setInvoice(initialInvoice);
  }, [initialInvoice]);

  const isLedger = variant === 'ledger';
  const canManageItems = !isLedger && canEdit && invoice.status === 'pending';
  const items = invoice.items || [];

  const persistItems = async (nextItems: InvoiceSheetItem[]) => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/contractor-invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: nextItems.map((it) => ({
            itemType: it.itemType,
            description: it.description,
            amount: it.amount,
            attachmentUrl: it.attachmentUrl || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث بنود الفاتورة');

      const updated = data.invoice as InvoiceSheetInvoice;
      setInvoice(updated);
      onUpdated(updated);
      showToast(data.message || 'تم تحديث البنود', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث البنود', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!draft.description.trim()) {
      showToast('وصف البند مطلوب', 'warning');
      return;
    }
    if (draft.amount === '' || Number(draft.amount) < 0) {
      showToast('أدخل مبلغًا صحيحًا للبند', 'warning');
      return;
    }

    const nextItems: InvoiceSheetItem[] = [
      ...items,
      {
        itemType: draft.itemType,
        description: draft.description.trim(),
        amount: Number(draft.amount) || 0,
        attachmentUrl: draft.attachmentUrl || null,
      },
    ];

    const ok = await persistItems(nextItems);
    if (ok) setDraft({ ...EMPTY_DRAFT });
  };

  const handleRemoveItem = async (idx: number) => {
    if (!confirm('حذف هذا البند من الفاتورة؟')) return;
    const nextItems = items.filter((_, i) => i !== idx);
    await persistItems(nextItems);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      showToast('جاري رفع الإيصال/المرفق...', 'info');
      const token = await getAuthToken();
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/contractor-invoices/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل رفع الملف');

      setDraft((prev) => ({ ...prev, attachmentUrl: data.url }));
      showToast('تم رفع المرفق بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Document header */}
        <div className="shrink-0 border-b border-slate-200 px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-indigo-600 tracking-wide">فاتورة مصروفات مقاول</p>
                <h3 className="text-lg font-black text-slate-900 font-mono truncate">
                  {invoice.invoiceNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  التاريخ: {invoice.invoiceDate}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-slate-500 block text-[11px]">المقاول</span>
              <span className="font-bold text-slate-900 mt-0.5 block truncate">
                {invoice.contractor?.name || '—'}
              </span>
              {invoice.contractor?.tax_number && (
                <span className="text-[10px] text-slate-400 font-mono">ضريبي: {invoice.contractor.tax_number}</span>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
              <span className="text-slate-500 block text-[11px]">البوليصة / الشحنة</span>
              <span className="font-bold text-slate-900 mt-0.5 block font-mono">
                {bolLabel(invoice.shipment)}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                عميل: {invoice.shipment?.client?.name || 'غير محدد'}
              </span>
            </div>
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
              <span className="text-indigo-700/70 block text-[11px]">الحالة / الإجمالي</span>
              <span className="font-bold text-indigo-950 mt-0.5 block text-[11px] leading-snug">
                {statusLabel(invoice.status)}
              </span>
              <span className="font-black text-indigo-700 font-mono text-sm mt-1 block">
                {invoice.totalAmount.toLocaleString('ar-EG')} ج.م
              </span>
              {invoice.remainingAmount > 0 && (
                <span className="text-rose-600 font-bold text-[10px]">
                  متبقي: {invoice.remainingAmount.toLocaleString('ar-EG')} ج.م
                </span>
              )}
            </div>
          </div>

          {invoice.notes && (
            <p className="mt-3 text-[11px] text-slate-600 bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2">
              ملاحظات: {invoice.notes}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                بنود المصروفات
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">{items.length} بند</span>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-slate-400">
                لا توجد بنود بعد — أضف أول بند أدناه
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 font-bold">#</th>
                      <th className="px-3 py-2 font-bold">النوع</th>
                      <th className="px-3 py-2 font-bold">الوصف</th>
                      <th className="px-3 py-2 font-bold">المبلغ</th>
                      <th className="px-3 py-2 font-bold">مرفق</th>
                      {canManageItems && <th className="px-3 py-2 font-bold w-10" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => (
                      <tr key={it.id || idx} className="bg-white">
                        <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                            {ITEM_TYPE_LABELS[it.itemType] || it.itemType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-800">{it.description}</td>
                        <td className="px-3 py-2.5 font-mono font-black text-slate-900 whitespace-nowrap">
                          {Number(it.amount).toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="px-3 py-2.5">
                          {it.attachmentUrl ? (
                            <a
                              href={it.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-indigo-600 font-bold hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              معاينة
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {canManageItems && (
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="حذف البند"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {canManageItems && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center gap-1.5 font-black text-indigo-950">
                <Plus className="h-4 w-4 text-indigo-600" />
                إضافة بند جديد
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={draft.itemType}
                  onChange={(e) => setDraft({ ...draft, itemType: e.target.value })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="transport">نقل وتوصيل</option>
                  <option value="demurrage">مبيت سيارات</option>
                  <option value="weighing">رسوم ميزان</option>
                  <option value="toll">كارتة طريق</option>
                  <option value="loading">تعتيق وتفريغ</option>
                  <option value="other">مصروفات أخرى</option>
                </select>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="وصف البند التفصيلي..."
                  className="sm:col-span-2 w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  placeholder="المبلغ بالجنيه *"
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-500 cursor-pointer w-full transition-all">
                    <UploadCloud className="h-3.5 w-3.5 text-indigo-500" />
                    <span>
                      {uploading ? 'جاري الرفع...' : draft.attachmentUrl ? 'تغيير المرفق' : 'رفع إيصال / صورة'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploading}
                      onChange={handleFileUpload}
                    />
                  </label>
                  {draft.attachmentUrl && (
                    <a
                      href={draft.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 shrink-0"
                      title="معاينة المرفق"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={saving || uploading}
                onClick={handleAddItem}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {saving ? 'جاري الحفظ...' : 'إضافة البند للفاتورة'}
              </button>
            </div>
          )}

          {isLedger && payoutContext && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1.5">
              <h4 className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                تفاصيل التحويل لهذه الحركة
              </h4>
              <div className="text-[11px] text-slate-700">
                <span className="text-slate-500">من الخزنة: </span>
                <span className="font-bold text-slate-900">
                  {payoutContext.fromTreasuryName || 'غير محدد'}
                </span>
              </div>
              <div className="text-[11px] text-slate-700">
                <span className="text-slate-500">إلى حساب المقاول: </span>
                <span className="font-bold text-slate-900">
                  {payoutContext.toBankName || 'غير محدد'}
                  {payoutContext.toAccountNumber
                    ? ` — رقم: ${payoutContext.toAccountNumber}`
                    : ''}
                  {payoutContext.toAccountHolder
                    ? ` (باسم: ${payoutContext.toAccountHolder})`
                    : ''}
                </span>
              </div>
              {(payoutContext.paidAmount != null || payoutContext.referenceNumber) && (
                <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-1 pt-0.5">
                  {payoutContext.paidAmount != null && (
                    <span>
                      المبلغ المحوّل:{' '}
                      <span className="font-mono font-black text-emerald-700">
                        {Number(payoutContext.paidAmount).toLocaleString('ar-EG')}{' '}
                        {payoutContext.currency || 'EGP'}
                      </span>
                    </span>
                  )}
                  {payoutContext.referenceNumber && (
                    <span>
                      المرجع:{' '}
                      <span className="font-mono font-bold">{payoutContext.referenceNumber}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {!isLedger &&
            invoice.contractor?.bank_accounts &&
            invoice.contractor.bank_accounts.length > 0 && (
              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                <h4 className="font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                  الحسابات البنكية للمقاول
                </h4>
                {invoice.contractor.bank_accounts.map((b) => (
                  <div key={b.id} className="text-[11px] text-slate-600 mt-1">
                    • <span className="font-bold text-slate-800">{b.bank_name}</span> - رقم:{' '}
                    <span className="font-mono text-slate-800">{b.account_number}</span>
                    {b.account_holder ? ` (باسم: ${b.account_holder})` : ''}
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 border-t border-slate-100 px-6 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            إغلاق
          </button>

          {!isLedger && (
            <div className="flex items-center gap-2">
              {invoice.status === 'pending' && canApprove && (
                <button
                  type="button"
                  onClick={() => onApprove(invoice)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100"
                >
                  اعتماد الفاتورة كدين
                </button>
              )}

              {['approved', 'partially_paid'].includes(invoice.status) && canPay && (
                <button
                  type="button"
                  onClick={() => onPay(invoice)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1"
                >
                  <Wallet className="h-4 w-4" />
                  سداد وتحويل من الخزينة
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
