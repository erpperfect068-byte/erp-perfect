'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Printer, Plus, Undo2, X } from 'lucide-react';
import { lineAmountInEgp, type StatementFxMeta } from '@/lib/statement-fx';

export type SheetClientItem = { id: string; name: string };

export type SheetStatementItem = {
  id: string;
  itemType: 'expense' | 'fee' | 'deposit_deduction' | 'reversal' | string;
  description: string;
  amount: string | number;
  currency: string;
  exchangeRateAtTransaction: string | number;
  externalReceiptNumber: string | null;
  isReversed: boolean;
  createdAt?: string;
  notes?: string | null;
  fx?: StatementFxMeta | null;
};

export type SheetDeposit = {
  id: string;
  amount: number | string;
  currency: string;
  exchangeRateAtTransaction?: number | string;
  depositDate?: string | null;
  receiptNumber?: string | null;
};

export type SheetStatement = {
  id: string;
  statementDate: string;
  statementNumber?: number | null;
  totalAmount?: string | number;
  client: { id: string; name: string } | null;
  shipment: {
    id: string;
    bolNumber?: string | null;
    containerCount?: number | null;
    supplierName?: string | null;
    declarationNumber46?: string | null;
    arrivalDate?: string | null;
    invoiceNumber?: string | null;
    port?: { id: string; name: string } | null;
    clientItem?: { id: string; name: string } | null;
  } | null;
  items: SheetStatementItem[];
};

export type NewSheetItemPayload = {
  itemType: 'expense' | 'fee' | 'deposit_deduction';
  description: string;
  amount: number;
  currency: string;
  exchangeRateAtTransaction: number;
  externalReceiptNumber?: string;
  convertToEgp?: boolean;
  sourceAmount?: number;
  sourceCurrency?: string;
};

interface Props {
  statement: SheetStatement;
  clientItems: SheetClientItem[];
  deposits: SheetDeposit[];
  accountantName?: string | null;
  usdRate?: string;
  eurRate?: string;
  canAddItems?: boolean;
  transportUnitKey?: string;
  onTransportUnitChange?: (unit: string) => void;
  applyingPricing?: boolean;
  onSuggestPricing?: () => void;
  onReverseItem?: (item: SheetStatementItem) => void;
  onClose: () => void;
  onAddItem?: (payload: NewSheetItemPayload) => Promise<boolean>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

function fmtDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    // already yyyy-mm-dd
    const parts = String(value).slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return String(value);
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function toEgp(amount: number | string, rate: number | string) {
  return Number(amount || 0) * Number(rate || 1);
}

function currencyMark(currency?: string) {
  if (currency === 'USD') return '$';
  if (currency === 'EUR') return '€';
  if (currency === 'EGP') return 'ج.م';
  return currency || 'ج.م';
}

function formatMoney(n: number, digits = 2) {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Trim trailing zeros (48.50 → 48.5, 100.00 → 100). */
function formatTrimmed(n: number, maxDigits = 4) {
  if (!Number.isFinite(n)) return '0';
  return String(parseFloat(n.toFixed(maxDigits)));
}

/** Currency mark in the currency column (ج.م when FX-converted). */
function rowCurrencyMark(item: SheetStatementItem) {
  if (item.fx?.convertedToEgp) return 'ج.م';
  return currencyMark(item.currency);
}

function renderAmountCell(item: SheetStatementItem) {
  const fx = item.fx;
  const rate = Number(item.exchangeRateAtTransaction || 1);
  const currency = (item.currency || 'EGP').toUpperCase();

  // FX convert: EGP total on top; foreign amount + symbol × rate below
  // New storage: amount is foreign. Legacy: amount is EGP, source in notes.
  if (fx?.convertedToEgp) {
    const isForeignStored = currency !== 'EGP';
    const foreign = isForeignStored ? Number(item.amount || 0) : Number(fx.sourceAmount || 0);
    const foreignCur = isForeignStored ? currency : String(fx.sourceCurrency || 'USD').toUpperCase();
    const egp = isForeignStored ? foreign * rate : Number(item.amount || 0);
    const foreignMark = currencyMark(foreignCur);

    return (
      <span dir="ltr" className="inline-block text-left">
        <span className="block">{formatMoney(egp)}</span>
        <span className="block text-[10px] font-semibold text-slate-500">
          ({formatTrimmed(foreign)} {foreignMark} × {formatTrimmed(rate)})
        </span>
      </span>
    );
  }

  // No FX: amount only — currency symbol lives in the currency column
  return (
    <span dir="ltr" className="inline-block text-left">
      {formatMoney(Number(item.amount || 0))}
    </span>
  );
}

function normalizeReceipt(value?: string | null) {
  const t = (value ?? '').trim();
  return t.length ? t : null;
}

/**
 * Merge ALL rows sharing the same non-empty receipt (anywhere in the list).
 * span>0 on first occurrence = total count; 0 on later rows with that receipt; empty → 1.
 * Callers should pass items already grouped so same receipts are contiguous (HTML rowspan).
 */
function receiptRowSpans(items: SheetStatementItem[]): number[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = normalizeReceipt(item.externalReceiptNumber);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const seen = new Set<string>();
  return items.map((item) => {
    const key = normalizeReceipt(item.externalReceiptNumber);
    if (!key) return 1;
    if (seen.has(key)) return 0;
    seen.add(key);
    return counts.get(key) || 1;
  });
}

/** Oldest→newest, then pull every later row with the same receipt next to its first appearance. */
function groupItemsByReceipt(items: SheetStatementItem[]): SheetStatementItem[] {
  const chronological = [...items].sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return ta - tb;
  });
  const used = new Set<string>();
  const result: SheetStatementItem[] = [];

  for (const item of chronological) {
    if (used.has(item.id)) continue;
    const key = normalizeReceipt(item.externalReceiptNumber);
    if (!key) {
      result.push(item);
      used.add(item.id);
      continue;
    }
    for (const other of chronological) {
      if (used.has(other.id)) continue;
      if (normalizeReceipt(other.externalReceiptNumber) === key) {
        result.push(other);
        used.add(other.id);
      }
    }
  }

  return result;
}

function HeaderCell({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={className}>
      <th className="border border-slate-800 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-800 whitespace-nowrap w-[38%]">
        {label}
      </th>
      <td className="border border-slate-800 px-2 py-1.5 text-[11px] text-slate-900 font-semibold">
        {children}
      </td>
    </tr>
  );
}

export default function ClientStatementSheet({
  statement,
  clientItems,
  deposits,
  accountantName,
  usdRate = '',
  eurRate = '',
  canAddItems = true,
  transportUnitKey = '20ft',
  onTransportUnitChange,
  applyingPricing = false,
  onSuggestPricing,
  onReverseItem,
  onClose,
  onAddItem,
  showToast,
}: Props) {
  const declaration46 = statement.shipment?.declarationNumber46 || '';
  const [orderNumber, setOrderNumber] = useState(declaration46);
  const [selectedGoodsIds, setSelectedGoodsIds] = useState<string[]>(() => {
    const linked = statement.shipment?.clientItem?.id;
    return linked ? [linked] : [];
  });
  const [localUsd, setLocalUsd] = useState(usdRate);
  const [localEur, setLocalEur] = useState(eurRate);

  const [draftDesc, setDraftDesc] = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftCurrency, setDraftCurrency] = useState('EGP');
  const [draftRate, setDraftRate] = useState('1');
  const [draftReceipt, setDraftReceipt] = useState('');
  const [draftType, setDraftType] = useState<'expense' | 'fee' | 'deposit_deduction'>('expense');
  /** When foreign currency: false = keep as-is; true = enter EGP + rate. */
  const [draftConvertToEgp, setDraftConvertToEgp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrderNumber(declaration46);
  }, [declaration46, statement.id]);

  useEffect(() => {
    setLocalUsd(usdRate);
    setLocalEur(eurRate);
  }, [usdRate, eurRate]);

  useEffect(() => {
    if (draftCurrency === 'EGP') {
      setDraftRate('1');
      setDraftConvertToEgp(false);
    } else if (draftCurrency === 'USD') setDraftRate(localUsd || '48.5');
    else if (draftCurrency === 'EUR') setDraftRate(localEur || '52.3');
  }, [draftCurrency, localUsd, localEur]);

  const draftRateNum = Number(draftRate) || 0;
  const draftAmountNum = Number(draftAmount) || 0;
  /** Convert mode: amount field is foreign; EGP = foreign × rate. */
  const draftEgpFromForeign =
    draftConvertToEgp && draftRateNum > 0 ? draftAmountNum * draftRateNum : 0;

  const visibleItems = useMemo(
    () => groupItemsByReceipt(statement.items || []),
    [statement.items]
  );

  const receiptSpans = useMemo(() => receiptRowSpans(visibleItems), [visibleItems]);

  const existingReceiptOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    for (const item of statement.items || []) {
      const key = normalizeReceipt(item.externalReceiptNumber);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      options.push(key);
    }
    return options;
  }, [statement.items]);

  const expensesTotal = useMemo(() => {
    return visibleItems.reduce((sum, item) => {
      if (item.isReversed) return sum;
      if (item.itemType !== 'expense' && item.itemType !== 'fee') return sum;
      return sum + lineAmountInEgp(item.amount, item.currency, item.exchangeRateAtTransaction);
    }, 0);
  }, [visibleItems]);

  const paidFromDeposits = useMemo(() => {
    return (deposits || []).reduce(
      (sum, d) => sum + toEgp(d.amount, d.exchangeRateAtTransaction ?? 1),
      0
    );
  }, [deposits]);

  const paidFromDeductions = useMemo(() => {
    return visibleItems.reduce((sum, item) => {
      if (item.isReversed) return sum;
      if (item.itemType !== 'deposit_deduction') return sum;
      return (
        sum +
        Math.abs(lineAmountInEgp(item.amount, item.currency, item.exchangeRateAtTransaction))
      );
    }, 0);
  }, [visibleItems]);

  const paidTotal = paidFromDeposits + paidFromDeductions;
  const dueTotal = expensesTotal - paidTotal;

  const latestDepositDate = useMemo(() => {
    const dates = (deposits || [])
      .map((d) => d.depositDate)
      .filter(Boolean) as string[];
    if (!dates.length) return null;
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [deposits]);

  const toggleGoods = (id: string) => {
    setSelectedGoodsIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAdd = async () => {
    if (!onAddItem) return;
    if (!draftDesc.trim()) {
      showToast('وصف البند مطلوب', 'warning');
      return;
    }
    if (draftAmount === '' || Number(draftAmount) <= 0) {
      showToast('أدخل مبلغًا صحيحًا', 'warning');
      return;
    }

    const isForeign = draftCurrency !== 'EGP';
    const convert = isForeign && draftConvertToEgp;
    if (convert && (!(Number(draftRate) > 0))) {
      showToast('أدخل سعر صرف صالح للتحويل', 'warning');
      return;
    }

    const rate = convert ? Number(draftRate) : 1;
    const enteredAmount = Number(draftAmount);
    // Always store the entered amount in the selected currency (USD/EUR/EGP).
    // Convert mode only attaches FX rate + display meta; totals use amount × rate.

    setSaving(true);
    try {
      const ok = await onAddItem({
        itemType: draftType,
        description: draftDesc.trim(),
        amount: enteredAmount,
        currency: draftCurrency,
        exchangeRateAtTransaction: rate,
        externalReceiptNumber: draftReceipt.trim() || undefined,
        convertToEgp: convert || undefined,
        sourceAmount: convert ? parseFloat(enteredAmount.toFixed(4)) : undefined,
        sourceCurrency: convert ? draftCurrency : undefined,
      });
      if (ok) {
        setDraftDesc('');
        setDraftAmount('');
        setDraftReceipt('');
        setDraftType('expense');
        setDraftCurrency('EGP');
        setDraftConvertToEgp(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const money = (n: number) =>
    n.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:static print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full shadow-2xl max-h-[94vh] flex flex-col print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none print:h-auto">
        {/* Toolbar — hidden on print */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 print:hidden">
          <div>
            <p className="text-[11px] font-bold text-indigo-600">كشف حساب تخليص</p>
            <p className="text-sm font-black text-slate-900 truncate">
              {statement.client?.name || '—'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onSuggestPricing && (
              <div className="flex items-center gap-1.5">
                <select
                  value={transportUnitKey}
                  onChange={(e) => onTransportUnitChange?.(e.target.value)}
                  className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold"
                  title="نوع الحاوية لاقتراح النقل"
                >
                  <option value="20ft">نقل: 20 قدم</option>
                  <option value="40ft">نقل: 40 قدم</option>
                  <option value="2x20ft">نقل: 2×20</option>
                  <option value="jumbo">نقل: جامبو</option>
                  <option value="tanker">نقل: دبابة</option>
                </select>
                <button
                  type="button"
                  disabled={applyingPricing}
                  onClick={onSuggestPricing}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl"
                >
                  <Coins className="h-3.5 w-3.5" />
                  {applyingPricing ? 'جاري الاقتراح...' : 'تطبيق أسعار التعاقد'}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl"
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:p-2" id="client-statement-print-root">
          <h2 className="text-center text-xl sm:text-2xl font-black text-slate-900 mb-4 tracking-wide">
            كشف حساب تخليص
          </h2>

          {/* Dual header tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 print:grid-cols-2">
            {/* Right table (shipping) — first in RTL visual */}
            <table className="w-full border-collapse text-right">
              <tbody>
                <HeaderCell label="التاريخ">{fmtDate(statement.statementDate)}</HeaderCell>
                <HeaderCell label="كشف حساب رقم">
                  {statement.statementNumber ?? '—'}
                </HeaderCell>
                <HeaderCell label="المنشأ">
                  <span className="text-slate-400 font-normal">—</span>
                </HeaderCell>
                <HeaderCell label="اسم المورد">
                  {statement.shipment?.supplierName || '—'}
                </HeaderCell>
                <HeaderCell label="الصنف">
                  {statement.shipment?.clientItem?.name || '—'}
                </HeaderCell>
                <HeaderCell label="عدد الحاويات">
                  {statement.shipment?.containerCount ?? '—'}
                </HeaderCell>
                <HeaderCell label="رقم البوليصة">
                  <span className="font-mono">{statement.shipment?.bolNumber || '—'}</span>
                </HeaderCell>
                <HeaderCell label="رقم الشهادة">
                  <span className="font-mono">{declaration46 || '—'}</span>
                </HeaderCell>
                <HeaderCell label="تاريخ وصول السفينة">
                  {fmtDate(statement.shipment?.arrivalDate)}
                </HeaderCell>
                <HeaderCell label="تاريخ انتهاء التخزين">
                  <span className="text-slate-400 font-normal">—</span>
                </HeaderCell>
              </tbody>
            </table>

            {/* Left table (client) */}
            <table className="w-full border-collapse text-right">
              <tbody>
                <HeaderCell label="مطلوب من">
                  {statement.client?.name || '—'}
                </HeaderCell>
                <HeaderCell label="سعر تحويل الدولار">
                  <input
                    type="text"
                    value={localUsd}
                    onChange={(e) => setLocalUsd(e.target.value)}
                    className="w-full bg-transparent outline-none font-mono print:border-0"
                    placeholder="—"
                  />
                </HeaderCell>
                <HeaderCell label="سعر تحويل اليورو">
                  <input
                    type="text"
                    value={localEur}
                    onChange={(e) => setLocalEur(e.target.value)}
                    className="w-full bg-transparent outline-none font-mono print:border-0"
                    placeholder="—"
                  />
                </HeaderCell>
                <HeaderCell label="رقم الأوردر">
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full bg-transparent outline-none font-mono print:border-0"
                    placeholder="—"
                  />
                </HeaderCell>
                <HeaderCell label="نوع البضاعة">
                  {clientItems.length === 0 ? (
                    <span className="text-slate-400 font-normal">لا توجد أصناف</span>
                  ) : (
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {clientItems.map((it) => (
                        <label
                          key={it.id}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGoodsIds.includes(it.id)}
                            onChange={() => toggleGoods(it.id)}
                            className="accent-slate-900"
                          />
                          {it.name}
                        </label>
                      ))}
                    </div>
                  )}
                </HeaderCell>
                <HeaderCell label="ميناء المغادرة">
                  <span className="text-slate-400 font-normal">—</span>
                </HeaderCell>
                <HeaderCell label="ميناء الوصول">
                  {statement.shipment?.port?.name || '—'}
                </HeaderCell>
              </tbody>
            </table>
          </div>

          {/* Items table */}
          <table className="w-full border-collapse text-right mb-0">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-800 px-2 py-2 text-[11px] font-bold w-12">
                  مسلسل
                </th>
                <th className="border border-slate-800 px-2 py-2 text-[11px] font-bold">
                  الوصف
                </th>
                <th className="border border-slate-800 px-2 py-2 text-[11px] font-bold w-12">
                  العملة
                </th>
                <th className="border border-slate-800 px-2 py-2 text-[11px] font-bold w-28">
                  المبلغ
                </th>
                <th className="border border-slate-800 px-2 py-2 text-[11px] font-bold w-28">
                  رقم الإيصال
                </th>
                {onReverseItem && (
                  <th className="border border-slate-800 px-2 py-2 text-[11px] font-bold w-12 print:hidden">
                    عكس
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={onReverseItem ? 6 : 5}
                    className="border border-slate-800 px-3 py-6 text-center text-xs text-slate-400"
                  >
                    لا توجد بنود مسجلة بعد
                  </td>
                </tr>
              ) : (
                visibleItems.map((item, idx) => {
                  const receiptSpan = receiptSpans[idx];
                  return (
                    <tr
                      key={item.id}
                      className={item.isReversed || item.itemType === 'reversal' ? 'opacity-50' : ''}
                    >
                      <td className="border border-slate-800 px-2 py-1.5 text-center text-[11px] font-mono">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 px-2 py-1.5 text-[11px] font-semibold text-slate-800">
                        {item.description}
                        {item.itemType === 'deposit_deduction' && (
                          <span className="text-[10px] text-blue-600 mr-1">(خصم أمانة)</span>
                        )}
                        {item.isReversed && (
                          <span className="text-[10px] text-rose-600 mr-1">(معكوس)</span>
                        )}
                      </td>
                      <td className="border border-slate-800 px-2 py-1.5 text-center text-[11px] font-mono">
                        {rowCurrencyMark(item)}
                      </td>
                      <td className="border border-slate-800 px-2 py-1.5 text-left font-mono text-[11px] font-bold">
                        {renderAmountCell(item)}
                      </td>
                      {receiptSpan > 0 && (
                        <td
                          rowSpan={receiptSpan}
                          className="border border-slate-800 px-2 py-1.5 text-center text-[11px] font-mono align-middle"
                        >
                          {normalizeReceipt(item.externalReceiptNumber) || '—'}
                        </td>
                      )}
                      {onReverseItem && (
                        <td className="border border-slate-800 px-1 py-1 text-center print:hidden">
                          {!item.isReversed && item.itemType !== 'reversal' ? (
                            <button
                              type="button"
                              onClick={() => onReverseItem(item)}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                              title="عكس القيد"
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}

              {/* Static footer totals rows */}
              <tr className="bg-slate-50">
                <td
                  colSpan={3}
                  className="border border-slate-800 px-2 py-2 text-[11px] font-black text-slate-900"
                >
                  إجمالي مصاريف الشحنة بالجنيه المصري
                </td>
                <td className="border border-slate-800 px-2 py-2 text-left font-mono text-[12px] font-black">
                  {money(expensesTotal)}
                </td>
                <td
                  className="border border-slate-800 px-2 py-2"
                  colSpan={onReverseItem ? 2 : 1}
                />
              </tr>
              <tr>
                <td
                  colSpan={3}
                  className="border border-slate-800 px-2 py-2 text-[11px] font-black text-slate-900"
                >
                  إجمالي المبلغ المدفوع تحت حساب تخليص الشحنة
                </td>
                <td className="border border-slate-800 px-2 py-2 text-left font-mono text-[12px] font-black text-rose-700">
                  ({money(paidTotal)})
                </td>
                <td className="border border-slate-800 px-2 py-2 text-center text-[10px] font-mono text-slate-600">
                  {latestDepositDate ? fmtDate(latestDepositDate) : ''}
                </td>
                {onReverseItem && <td className="border border-slate-800 print:hidden" />}
              </tr>
              <tr className="bg-slate-100">
                <td
                  colSpan={3}
                  className="border border-slate-800 px-2 py-2 text-[11px] font-black text-slate-900"
                >
                  إجمالي المبلغ المستحق للشحنة
                </td>
                <td className="border border-slate-800 px-2 py-2 text-left font-mono text-[13px] font-black text-indigo-900">
                  {money(dueTotal)}
                </td>
                <td
                  className="border border-slate-800 px-2 py-2"
                  colSpan={onReverseItem ? 2 : 1}
                />
              </tr>
            </tbody>
          </table>

          {/* Signature */}
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 text-[11px]">
            <div>
              <span className="text-slate-500 block mb-1">امضاء المحاسب</span>
              <span className="font-bold text-slate-900 text-sm">
                {accountantName || '—'}
              </span>
            </div>
            <div className="text-left">
              <span className="text-slate-500 block mb-1">التاريخ</span>
              <span className="font-mono font-bold text-slate-900">
                {fmtDate(statement.statementDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Add item — pinned below scroll area (screen only) */}
        {canAddItems && onAddItem && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 sm:px-6 py-3 print:hidden">
            <div className="border border-dashed border-slate-300 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">إضافة بند جديد للكشف</p>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                <select
                  value={draftType}
                  onChange={(e) =>
                    setDraftType(e.target.value as 'expense' | 'fee' | 'deposit_deduction')
                  }
                  className="sm:col-span-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="expense">مصروف</option>
                  <option value="fee">أتعاب</option>
                  <option value="deposit_deduction">خصم أمانة</option>
                </select>
                <input
                  type="text"
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  placeholder="الوصف"
                  className="sm:col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  placeholder={
                    draftCurrency !== 'EGP' && draftConvertToEgp
                      ? `المبلغ بـ ${draftCurrency}`
                      : 'المبلغ'
                  }
                  className="sm:col-span-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
                <select
                  value={draftCurrency}
                  onChange={(e) => setDraftCurrency(e.target.value)}
                  className="sm:col-span-1 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  type="text"
                  list="client-statement-receipt-options"
                  value={draftReceipt}
                  onChange={(e) => setDraftReceipt(e.target.value)}
                  placeholder="رقم الإيصال"
                  className="sm:col-span-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  autoComplete="off"
                />
              </div>
              <datalist id="client-statement-receipt-options">
                {existingReceiptOptions.map((receipt) => (
                  <option key={receipt} value={receipt} />
                ))}
              </datalist>
              {draftCurrency !== 'EGP' && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-[10px] font-bold text-slate-600">التعامل مع العملة الأجنبية</p>
                  <div className="flex flex-wrap gap-3 text-[11px] font-bold text-slate-800">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="fx-mode"
                        checked={!draftConvertToEgp}
                        onChange={() => setDraftConvertToEgp(false)}
                        className="accent-indigo-600"
                      />
                      بدون تحويل — يُحفظ ويُعرض بـ {draftCurrency}
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="fx-mode"
                        checked={draftConvertToEgp}
                        onChange={() => setDraftConvertToEgp(true)}
                        className="accent-indigo-600"
                      />
                      تحويل إلى جنيه مصري
                    </label>
                  </div>
                  {draftConvertToEgp && (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-500">سعر الصرف</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={draftRate}
                          onChange={(e) => setDraftRate(e.target.value)}
                          className="w-32 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      {draftAmountNum > 0 && draftRateNum > 0 && (
                        <span className="text-[10px] font-semibold text-slate-600 font-mono" dir="ltr">
                          = {formatMoney(draftEgpFromForeign)} ج.م{' '}
                          ({formatTrimmed(draftAmountNum)} × {formatTrimmed(draftRateNum)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-2.5 rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" />
                {saving ? 'جاري الحفظ...' : 'إضافة البند'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #client-statement-print-root,
          #client-statement-print-root * {
            visibility: visible !important;
          }
          #client-statement-print-root {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 8mm !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
