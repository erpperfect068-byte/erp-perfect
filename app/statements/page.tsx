'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { LoadingButton } from '../../components/LoadingButton';
import { motion } from 'motion/react';
import {
  FileText,
  Plus,
  Coins,
  ArrowRightLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Eye,
  X,
  FileSpreadsheet,
  Calendar,
  Layers,
  Undo2,
  Trash2,
  Paperclip,
  CheckCircle2,
  XCircle,
  TrendingDown
} from 'lucide-react';

interface Shipment {
  id: string;
  bolNumber: string | null;
  containerCount: number | null;
  acid: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface StatementItem {
  id: string;
  itemType: 'expense' | 'fee' | 'deposit_deduction' | 'reversal';
  description: string;
  amount: string;
  currency: string;
  exchangeRateAtTransaction: string;
  externalReceiptNumber: string | null;
  attachmentPath: string | null;
  isReversed: boolean;
  reversalReason: string | null;
  createdAt: string;
}

interface Statement {
  id: string;
  shipmentId: string;
  statementDate: string;
  currency: string;
  totalAmount: string;
  shipment: Shipment | null;
  client: Client | null;
  items: StatementItem[];
}

export default function StatementsPage() {
  const { getAuthToken } = useAuth();
  const { showToast } = useToast();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);

  // Modal controls
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isReverseOpen, setIsReverseOpen] = useState(false);
  const [itemToReverse, setItemToReverse] = useState<StatementItem | null>(null);

  // Form: Add Item
  const [itemType, setItemType] = useState<'expense' | 'fee' | 'deposit_deduction'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [rate, setRate] = useState('1.0000');
  const [receiptNo, setReceiptNo] = useState('');
  const [attachment, setAttachment] = useState('');

  // Form: Reverse Item
  const [reversalReason, setReversalReason] = useState('');

  // Submit loading states
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isSubmittingReverse, setIsSubmittingReverse] = useState(false);

  async function loadStatements() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/statements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatements(data);
        // Sync selected statement
        if (selectedStatement) {
          const fresh = data.find((s: Statement) => s.id === selectedStatement.id);
          if (fresh) setSelectedStatement(fresh);
        }
      } else {
        showToast('فشل تحميل كشوفات الحساب المالي', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم عند تحميل الكشوفات', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatements();
  }, [getAuthToken]);

  // Adjust rate default based on currency
  useEffect(() => {
    if (currency === 'EGP') setRate('1.0000');
    else if (currency === 'USD') setRate('48.5000');
    else if (currency === 'EUR') setRate('52.3000');
  }, [currency]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatement || !description || !amount) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    setIsSubmittingItem(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          statementId: selectedStatement.id,
          itemType,
          description,
          amount: parseFloat(amount),
          currency,
          exchangeRateAtTransaction: parseFloat(rate),
          externalReceiptNumber: receiptNo || undefined,
          attachmentPath: attachment || undefined
        })
      });

      if (res.ok) {
        showToast('تم تسجيل المعاملة في الفاتورة بنجاح', 'success');
        setIsAddItemOpen(false);
        // Clear form
        setDescription('');
        setAmount('');
        setReceiptNo('');
        setAttachment('');
        // Reload
        loadStatements();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إدراج المعاملة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleReverseItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatement || !itemToReverse) return;

    setIsSubmittingReverse(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          statementId: selectedStatement.id,
          itemType: 'reversal',
          originalItemId: itemToReverse.id,
          reversalReason: reversalReason || 'خطأ إدخال محاسبي'
        })
      });

      if (res.ok) {
        showToast('تم إجراء العكس المحاسبي للعملية بنجاح بنجاح', 'success');
        setIsReverseOpen(false);
        setReversalReason('');
        loadStatements();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشلت عملية العكس', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    } finally {
      setIsSubmittingReverse(false);
    }
  };

  const triggerReverseModal = (item: StatementItem) => {
    setItemToReverse(item);
    setIsReverseOpen(true);
  };

  const filteredStatements = statements.filter((s) =>
    (s.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.shipment?.bolNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PermissionGuard requiredPermission={["statements.view", "statements.create"]} pageTitle="كشوف الحسابات والتسويات">
      <SidebarLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div>
          <h1 className="text-2xl font-black text-slate-900">المحاسبة الموحدة وكشوف الحساب</h1>
          <p className="text-sm text-slate-500 font-light mt-1">
            تسجيل رسوم أتعاب التخليص، تسويات الودائع المصروفة، وإثبات المدفوعات مع حظر التعديل المباشر كقيد محاسبي مزدوج.
          </p>
        </div>

        {/* Master Details Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left panel: Statements list */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <FolderOpen className="h-5 w-5 text-indigo-600" />
              <span>فواتير وكشوف الشحنات</span>
            </h3>

            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="البحث بالعميل أو بوليصة الشحن..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>

            {loading && statements.length === 0 ? (
              <div className="h-32 bg-slate-50 animate-pulse rounded-xl"></div>
            ) : filteredStatements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد سجلات مطابقة.</p>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[60vh] pr-1">
                {filteredStatements.map((st) => {
                  const isSel = selectedStatement?.id === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStatement(st)}
                      className={`w-full p-4 rounded-xl text-right border transition-all duration-200 flex items-center justify-between gap-4 ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                          : 'bg-slate-50/60 hover:bg-slate-50 text-slate-800 border-slate-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className={`text-[10px] font-bold block ${isSel ? 'text-indigo-200' : 'text-slate-400'}`}>
                          بوليصة: {st.shipment?.bolNumber || 'لم تحدد'}
                        </span>
                        <h4 className="font-bold text-sm truncate mt-1">{st.client?.name || 'عميل مجهول'}</h4>
                      </div>
                      <div className="text-left shrink-0">
                        <span className={`text-xs block font-bold ${isSel ? 'text-indigo-100' : 'text-slate-400'}`}>المستحق الكلي:</span>
                        <span className="text-sm font-black block mt-0.5">
                          {parseFloat(st.totalAmount).toLocaleString()} EGP
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Selected statement details */}
          <div className="lg:col-span-7 space-y-6">
            {selectedStatement ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-left-4 duration-200">
                {/* Invoice Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-xs text-indigo-600 font-bold block">مستند المطالبة المالية الموحد</span>
                    <h2 className="text-lg font-black text-slate-900 mt-0.5">{selectedStatement.client?.name}</h2>
                    <p className="text-[11px] text-slate-400 mt-1">بوليصة الشحن: {selectedStatement.shipment?.bolNumber}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsAddItemOpen(true)}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                    >
                      <Plus className="h-4.5 w-4.5" />
                      إدراج قيد مالي جديد
                    </button>
                  </div>
                </div>

                {/* Ledger Items Table */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">الحركات والبنود المسجلة بالبيان الجمركي:</h3>

                  {selectedStatement.items.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-2xl">
                      <p className="text-xs text-slate-400 font-light">لا توجد حركات محاسبية مسجلة في كشف حساب هذه الشحنة بعد.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                      {selectedStatement.items.map((item) => {
                        const isRev = item.isReversed;
                        const isReversalType = item.itemType === 'reversal';

                        const types: Record<string, { label: string; color: string }> = {
                          expense: { label: 'مصروفات جمركية', color: 'bg-red-50 text-red-700 border-red-100' },
                          fee: { label: 'أتعاب تخليص', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                          deposit_deduction: { label: 'خصم أمانة', color: 'bg-blue-50 text-blue-700 border-blue-100' },
                          reversal: { label: 'عكس محاسبي', color: 'bg-purple-50 text-purple-700 border-purple-100' },
                        };

                        const t = types[item.itemType] || { label: item.itemType, color: 'bg-slate-50 text-slate-700' };

                        return (
                          <div
                            key={item.id}
                            className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
                              isRev ? 'bg-slate-100/40 text-slate-400 line-through' : 'bg-white'
                            }`}
                          >
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${t.color}`}>
                                  {t.label}
                                </span>
                                {item.externalReceiptNumber && (
                                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-lg">
                                    وصل: {item.externalReceiptNumber}
                                  </span>
                                )}
                              </div>
                              <p className={`font-semibold ${isRev ? 'text-slate-400' : 'text-slate-800'}`}>
                                {item.description}
                              </p>
                              {item.reversalReason && (
                                <p className="text-[10px] text-purple-600 font-bold">سبب العكس: {item.reversalReason}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                              <div className="text-left">
                                <span className="text-[10px] text-slate-400 block font-light">القيمة بالعملة الأصلية:</span>
                                <span className="font-bold text-slate-800 block">
                                  {parseFloat(item.amount).toLocaleString()} {item.currency}
                                </span>
                                {item.currency !== 'EGP' && (
                                  <span className="text-[9px] text-slate-400 block font-medium">
                                    سعر الصرف: {parseFloat(item.exchangeRateAtTransaction).toFixed(2)} EGP
                                  </span>
                                )}
                              </div>

                              {/* Action buttons (Reverse logic) */}
                              {!isRev && !isReversalType && (
                                <button
                                  onClick={() => triggerReverseModal(item)}
                                  className="text-slate-400 hover:text-purple-600 p-2 hover:bg-purple-50 rounded-xl transition-all"
                                  title="عكس القيد ماليًا"
                                >
                                  <Undo2 className="h-4.5 w-4.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer totals */}
                <div className="p-5 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-indigo-600 font-bold block">إجمالي كشف الحساب المترجم:</span>
                    <span className="text-xs text-indigo-400 block font-light">مترجم بالكامل للجنيه المصري بسعر حركة الصرف</span>
                  </div>
                  <div className="text-left">
                    <span className="text-2xl font-black text-indigo-950">
                      {parseFloat(selectedStatement.totalAmount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-indigo-600 font-bold mr-1">جنيه مصري</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center h-[50vh] flex flex-col justify-center items-center">
                <FileText className="h-12 w-12 text-slate-300" />
                <h3 className="text-slate-800 font-bold mt-4">اختر ملف مطالبة مالية</h3>
                <p className="text-xs text-slate-400 font-light mt-1">اختر مطالبة من القائمة لاستعراض بنودها وتفاصيل قيود الخزينة المرتبطة بها.</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Statement Item Modal */}
        {isAddItemOpen && selectedStatement && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">إدراج حركة مالية جديدة في الكشف</h3>
                <button onClick={() => setIsAddItemOpen(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">نوع الحركة المالية</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="expense">مصروفات جمركية (تُصرف من الخزينة)</option>
                    <option value="fee">رسوم أتعاب تخليص (تُودع في الخزينة لصالح المكتب)</option>
                    <option value="deposit_deduction">خصم تسوية من أمانة العميل</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">بيان ووصف الحركة بالتفصيل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: رسوم الكشف الطبي بالميناء، رسم غرامات تأخير..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ والقيمة *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">العملة</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="EGP">EGP - جنيه مصري</option>
                      <option value="USD">USD - دولار أمريكي</option>
                      <option value="EUR">EUR - يورو</option>
                    </select>
                  </div>
                </div>

                {currency !== 'EGP' && (
                  <div className="space-y-1.5 animate-in fade-in duration-250">
                    <label className="text-xs font-bold text-slate-700">سعر التحويل والترجمة للجنيه المصري (سعر اليوم) *</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left font-bold text-indigo-600"
                      dir="ltr"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم الوصل الخارجي (لدمج البنود تحت إيصال موحد)</label>
                  <input
                    type="text"
                    placeholder="رقم الإيصال أو الشيك الخارجي"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left"
                    dir="ltr"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsAddItemOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isSubmittingItem}
                    loadingText="جاري تثبيت القيد..."
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
                  >
                    تثبيت القيد بالكشف
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reversal Confirmation Modal */}
        {isReverseOpen && itemToReverse && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                  <Undo2 className="h-5 w-5 text-purple-600" />
                  <span>عكس الحركة محاسبياً</span>
                </h3>
                <button onClick={() => setIsReverseOpen(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleReverseItem} className="space-y-4 mt-4">
                <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl text-xs space-y-1 text-purple-950">
                  <p className="font-bold">أنت تقوم بعكس الحركة المالية التالية:</p>
                  <p className="font-semibold">{itemToReverse.description}</p>
                  <p className="font-black text-purple-700 mt-1">
                    القيمة: {parseFloat(itemToReverse.amount).toLocaleString()} {itemToReverse.currency}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">سبب العكس والإلغاء *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تم إدخال مبلغ مغلوط، إلغاء معاملة، خطأ مدخل..."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsReverseOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isSubmittingReverse}
                    loadingText="جاري تثبيت العكس..."
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg"
                  >
                    تثبيت قيد العكس والموازنة
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
    </PermissionGuard>
  );
}
