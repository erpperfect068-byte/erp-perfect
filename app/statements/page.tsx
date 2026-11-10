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
  TrendingDown,
} from 'lucide-react';
import ClientStatementSheet, {
  type SheetDeposit,
} from '../../components/statements/ClientStatementSheet';

interface Client {
  id: string;
  name: string;
}

interface ClientGoodsItem {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  bolNumber: string | null;
  containerCount: number | null;
  portId?: string | null;
  acid: string | null;
  supplierName?: string | null;
  declarationNumber46?: string | null;
  arrivalDate?: string | null;
  documentReceiptDate?: string | null;
  invoiceNumber?: string | null;
  clientItemId?: string | null;
  port?: { id: string; name: string } | null;
  clientItem?: ClientGoodsItem | null;
}

interface PricingPickOption {
  source: 'clearance' | 'offer' | 'transport';
  key: string;
  label: string;
  amount: number;
  currency: string;
  itemType: 'fee' | 'expense';
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
  clientItemId?: string | null;
  clientItem?: ClientGoodsItem | null;
}

interface Statement {
  id: string;
  shipmentId: string;
  statementDate: string;
  statementNumber?: number | null;
  currency: string;
  totalAmount: string;
  shipment: Shipment | null;
  client: Client | null;
  items: StatementItem[];
}

export default function StatementsPage() {
  const { getAuthToken, dbUser } = useAuth();
  const { showToast } = useToast();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetDeposits, setSheetDeposits] = useState<SheetDeposit[]>([]);
  const [sheetClientItems, setSheetClientItems] = useState<ClientGoodsItem[]>([]);
  const [sheetUsdRate, setSheetUsdRate] = useState('48.5');
  const [sheetEurRate, setSheetEurRate] = useState('52.3');
  const [loadingSheet, setLoadingSheet] = useState(false);

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
  const [clientItemId, setClientItemId] = useState('');
  const [clientGoodsItems, setClientGoodsItems] = useState<ClientGoodsItem[]>([]);
  const [loadingClientItems, setLoadingClientItems] = useState(false);
  const [pricingPicker, setPricingPicker] = useState<PricingPickOption[]>([]);
  const [selectedPricingKey, setSelectedPricingKey] = useState('');
  const [transportUnitKey, setTransportUnitKey] = useState('20ft');
  const [applyingPricing, setApplyingPricing] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<PricingPickOption[]>([]);
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState<string[]>([]);

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

  const openStatementSheet = async (stmt?: Statement | null) => {
    const target = stmt || selectedStatement;
    if (!target) return;
    setSelectedStatement(target);
    setIsSheetOpen(true);
    setSheetDeposits([]);
    setSheetClientItems([]);
    setLoadingSheet(true);
    try {
      const token = await getAuthToken();
      const tasks: Promise<void>[] = [];

      tasks.push(
        (async () => {
          try {
            const res = await fetch(`/api/deposits?statementId=${encodeURIComponent(target.id)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              setSheetDeposits(
                (Array.isArray(data) ? data : []).map((d: any) => ({
                  id: d.id,
                  amount: d.amount,
                  currency: d.currency || 'EGP',
                  exchangeRateAtTransaction: d.exchangeRateAtTransaction ?? 1,
                  depositDate: d.depositDate || null,
                  receiptNumber: d.receiptNumber || null,
                }))
              );
            }
          } catch {
            /* deposits permission may be missing — sheet still opens */
          }
        })()
      );

      if (target.client?.id) {
        tasks.push(
          (async () => {
            const res = await fetch(`/api/clients/${target.client!.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              const client = data.client || data;
              setSheetClientItems(
                (client.items || []).map((it: any) => ({ id: it.id, name: it.name }))
              );
            }
          })()
        );
      }

      await Promise.all(tasks);
    } catch (err) {
      console.error(err);
      showToast('تعذر تحميل بيانات ورقة الكشف', 'warning');
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleSheetAddItem = async (payload: {
    itemType: 'expense' | 'fee' | 'deposit_deduction';
    description: string;
    amount: number;
    currency: string;
    exchangeRateAtTransaction: number;
    externalReceiptNumber?: string;
  }) => {
    if (!selectedStatement) return false;
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/statements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          statementId: selectedStatement.id,
          ...payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إدراج البند');
      showToast('تم إضافة البند للكشف', 'success');
      await loadStatements();
      return true;
    } catch (err: any) {
      showToast(err.message || 'فشل إضافة البند', 'error');
      return false;
    }
  };

  const openAddItemModal = async () => {
    setIsAddItemOpen(true);
    setClientItemId('');
    setClientGoodsItems([]);
    setPricingPicker([]);
    setSelectedPricingKey('');

    const clientId = selectedStatement?.client?.id;
    if (!clientId) return;

    try {
      setLoadingClientItems(true);
      const token = await getAuthToken();
      const [clientRes, pricingRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/clients/${clientId}/contract-pricing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            containerCount: selectedStatement?.shipment?.containerCount,
            portId: selectedStatement?.shipment?.portId,
            portName: selectedStatement?.shipment?.port?.name,
            unitKey: transportUnitKey,
            includeClearance: false,
            includeTransport: false,
            includeActiveOffers: false,
          }),
        }),
      ]);

      if (clientRes.ok) {
        const data = await clientRes.json();
        const client = data.client || data;
        setClientGoodsItems(
          (client.items || []).map((it: any) => ({ id: it.id, name: it.name }))
        );
      }

      if (pricingRes.ok) {
        const pdata = await pricingRes.json();
        setPricingPicker(pdata.picker || []);
      }
    } catch (err) {
      console.error(err);
      showToast('تعذر تحميل بيانات العميل/التسعير', 'error');
    } finally {
      setLoadingClientItems(false);
    }
  };

  const applyPricingPick = (key: string) => {
    setSelectedPricingKey(key);
    const opt = pricingPicker.find((p) => `${p.source}:${p.key}` === key);
    if (!opt) return;
    setDescription(opt.label);
    setAmount(String(opt.amount));
    setCurrency(opt.currency || 'EGP');
    setItemType(opt.itemType === 'fee' ? 'fee' : 'expense');
  };

  const handleSuggestContractPricing = async () => {
    if (!selectedStatement?.client?.id) {
      showToast('لا يوجد عميل مرتبط بهذا الكشف', 'warning');
      return;
    }
    try {
      setApplyingPricing(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/clients/${selectedStatement.client.id}/contract-pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          containerCount: selectedStatement.shipment?.containerCount,
          portId: selectedStatement.shipment?.portId,
          portName: selectedStatement.shipment?.port?.name,
          unitKey: transportUnitKey,
          includeClearance: true,
          includeTransport: true,
          includeActiveOffers: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل اقتراح الأسعار');

      const suggestions: PricingPickOption[] = data.suggestions || [];
      if (suggestions.length === 0) {
        showToast('لا توجد أسعار تعاقد منطبقة على هذه الشحنة — راجع تسعير العميل', 'warning');
        return;
      }
      setPendingSuggestions(suggestions);
      setSelectedSuggestionKeys(suggestions.map((s) => `${s.source}:${s.key}`));
      setIsSuggestModalOpen(true);
    } catch (err: any) {
      showToast(err.message || 'فشل اقتراح أسعار التعاقد', 'error');
    } finally {
      setApplyingPricing(false);
    }
  };

  const confirmApplySuggestions = async () => {
    if (!selectedStatement) return;
    const toApply = pendingSuggestions.filter((s) =>
      selectedSuggestionKeys.includes(`${s.source}:${s.key}`)
    );
    if (toApply.length === 0) {
      showToast('اختر بندًا واحدًا على الأقل', 'warning');
      return;
    }

    try {
      setApplyingPricing(true);
      const token = await getAuthToken();
      for (const line of toApply) {
        const res = await fetch('/api/statements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            statementId: selectedStatement.id,
            itemType: line.itemType,
            description: line.label,
            amount: line.amount,
            currency: line.currency || 'EGP',
            exchangeRateAtTransaction: 1,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل إدراج أحد البنود المقترحة');
      }
      showToast(`تم إدراج ${toApply.length} بند من أسعار التعاقد`, 'success');
      setIsSuggestModalOpen(false);
      setPendingSuggestions([]);
      await loadStatements();
    } catch (err: any) {
      showToast(err.message || 'فشل تطبيق الأسعار', 'error');
    } finally {
      setApplyingPricing(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatement || !amount) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }
    if (!description.trim() && !clientItemId) {
      showToast('اختر صنف بضاعة العميل أو أدخل وصف الحركة', 'warning');
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
          attachmentPath: attachment || undefined,
          clientItemId: clientItemId || undefined,
        })
      });

      if (res.ok) {
        showToast('تم تسجيل المعاملة في الفاتورة بنجاح', 'success');
        setIsAddItemOpen(false);
        // Clear form
        setDescription('');
        setAmount('');
        setReceiptNo('');
        setClientItemId('');
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

        {/* Statements list — opens paper sheet on click */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 max-w-4xl">
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
            <div className="space-y-2.5 overflow-y-auto max-h-[70vh] pr-1">
              {filteredStatements.map((st) => {
                const isSel = selectedStatement?.id === st.id && isSheetOpen;
                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={loadingSheet}
                    onClick={() => openStatementSheet(st)}
                    className={`w-full p-4 rounded-xl text-right border transition-all duration-200 flex items-center justify-between gap-4 ${
                      isSel
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-50/60 hover:bg-slate-50 text-slate-800 border-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className={`text-[10px] font-bold block ${isSel ? 'text-indigo-200' : 'text-slate-400'}`}>
                        بوليصة: {st.shipment?.bolNumber || 'لم تحدد'}
                        {st.statementNumber != null ? ` · كشف #${st.statementNumber}` : ''}
                      </span>
                      <h4 className="font-bold text-sm truncate mt-1">{st.client?.name || 'عميل مجهول'}</h4>
                    </div>
                    <div className="text-left shrink-0">
                      <span className={`text-xs block font-bold ${isSel ? 'text-indigo-100' : 'text-slate-400'}`}>
                        المستحق الكلي:
                      </span>
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
                  <label className="text-xs font-bold text-slate-700">من أسعار تعاقد العميل (اختياري)</label>
                  <select
                    value={selectedPricingKey}
                    onChange={(e) => applyPricingPick(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">— اختر سعرًا جاهزًا لملء الوصف والمبلغ —</option>
                    {pricingPicker.map((p) => (
                      <option key={`${p.source}:${p.key}`} value={`${p.source}:${p.key}`}>
                        {p.label} — {p.amount.toLocaleString('ar-EG')} {p.currency}
                      </option>
                    ))}
                  </select>
                  {pricingPicker.length === 0 && (
                    <p className="text-[10px] text-slate-400">لا توجد أسعار محفوظة لهذا العميل بعد.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">صنف بضاعة العميل</label>
                  <select
                    value={clientItemId}
                    onChange={(e) => setClientItemId(e.target.value)}
                    disabled={loadingClientItems || !selectedStatement.client?.id}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-50"
                  >
                    <option value="">
                      {loadingClientItems
                        ? 'جاري تحميل الأصناف...'
                        : clientGoodsItems.length === 0
                          ? 'لا توجد أصناف مسجلة لهذا العميل'
                          : '— اختر صنف البضاعة —'}
                    </option>
                    {clientGoodsItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                  {!loadingClientItems && clientGoodsItems.length === 0 && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      لا توجد أصناف مسجلة لهذا العميل — يمكن الحفظ بالوصف فقط، أو أضف أصنافًا من صفحة العملاء.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">بيان ووصف الحركة بالتفصيل</label>
                  <input
                    type="text"
                    placeholder="مثال: رسوم الكشف الطبي بالميناء، رسم غرامات تأخير..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    اختياري إذا اخترت صنفًا — يُستخدم اسم الصنف كوصف عند ترك الحقل فارغًا.
                  </p>
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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

        {isSuggestModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">بنود مقترحة من تعاقد العميل</h3>
                <button type="button" onClick={() => setIsSuggestModalOpen(false)} className="text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 mb-3">
                اختر البنود المراد إدراجها في الكشف (حسب عدد الحاويات والميناء ونوع النقل المحدد).
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pendingSuggestions.map((s) => {
                  const k = `${s.source}:${s.key}`;
                  return (
                    <label
                      key={k}
                      className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedSuggestionKeys.includes(k)}
                        onChange={(e) => {
                          setSelectedSuggestionKeys((prev) =>
                            e.target.checked ? [...prev, k] : prev.filter((x) => x !== k)
                          );
                        }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 block">{s.label}</span>
                        <span className="text-[11px] font-mono font-black text-indigo-600">
                          {s.amount.toLocaleString('ar-EG')} {s.currency}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={applyingPricing}
                  onClick={confirmApplySuggestions}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60"
                >
                  {applyingPricing ? 'جاري الإدراج...' : 'تثبيت البنود في الكشف'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isSheetOpen && selectedStatement && (
          <ClientStatementSheet
            statement={selectedStatement}
            clientItems={sheetClientItems}
            deposits={sheetDeposits}
            accountantName={dbUser?.name || dbUser?.email || null}
            usdRate={sheetUsdRate}
            eurRate={sheetEurRate}
            canAddItems
            transportUnitKey={transportUnitKey}
            onTransportUnitChange={setTransportUnitKey}
            applyingPricing={applyingPricing}
            onSuggestPricing={handleSuggestContractPricing}
            onReverseItem={(item) => {
              const full = selectedStatement.items.find((i) => i.id === item.id);
              if (full) triggerReverseModal(full);
            }}
            onClose={() => setIsSheetOpen(false)}
            onAddItem={handleSheetAddItem}
            showToast={showToast}
          />
        )}
      </div>
    </SidebarLayout>
    </PermissionGuard>
  );
}
