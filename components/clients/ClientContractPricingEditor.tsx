'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  buildEmptyClearanceTemplate,
  buildEmptyOfferTemplate,
  buildEmptyTransportTemplate,
} from '@/lib/client-contract-pricing';

type MetaState = {
  effectiveDate: string;
  durationLabel: string;
  contractType: string;
  coveredPorts: string;
};

type ClearanceRow = {
  tierKey: string;
  label: string;
  amount: string | number;
  currency: string;
  isActive: boolean;
};

type OfferRow = {
  offerKey: string;
  label: string;
  customLabel: string;
  amount: string | number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  isCustom?: boolean;
};

type TransportRow = {
  portKey: string;
  unitKey: string;
  label: string;
  customLabel: string;
  amount: string | number;
  currency: string;
  isActive: boolean;
  isCustom?: boolean;
};

export type ContractPricingDraft = {
  meta: MetaState;
  clearance: ClearanceRow[];
  offers: OfferRow[];
  transport: TransportRow[];
};

const EMPTY_META: MetaState = {
  effectiveDate: '',
  durationLabel: 'عام من تاريخه',
  contractType: 'clearance_transport',
  coveredPorts: 'الإسكندرية / السخنة',
};

export function emptyContractDraft(): ContractPricingDraft {
  return {
    meta: { ...EMPTY_META },
    clearance: buildEmptyClearanceTemplate(),
    offers: buildEmptyOfferTemplate().map((o) => ({ ...o, customLabel: '' })),
    transport: buildEmptyTransportTemplate().map((t) => ({ ...t, customLabel: '' })),
  };
}

interface Props {
  clientId?: string | null;
  getAuthToken: () => Promise<string | null>;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  /** Controlled draft for create flow (no clientId yet) */
  value?: ContractPricingDraft;
  onChange?: (draft: ContractPricingDraft) => void;
  readOnly?: boolean;
}

export default function ClientContractPricingEditor({
  clientId,
  getAuthToken,
  showToast,
  value,
  onChange,
  readOnly = false,
}: Props) {
  const controlled = !!onChange && !!value;
  const [local, setLocal] = useState<ContractPricingDraft>(value || emptyContractDraft());
  const [loading, setLoading] = useState(false);
  const [customOfferLabel, setCustomOfferLabel] = useState('');
  const [customOfferAmount, setCustomOfferAmount] = useState('');
  const [customTransportLabel, setCustomTransportLabel] = useState('');
  const [customTransportPort, setCustomTransportPort] = useState('alexandria');
  const [customTransportAmount, setCustomTransportAmount] = useState('');

  const draft = controlled ? value! : local;
  const setDraft = (next: ContractPricingDraft) => {
    if (controlled) onChange!(next);
    else setLocal(next);
  };

  useEffect(() => {
    if (!clientId || controlled) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = await getAuthToken();
        const res = await fetch(`/api/clients/${clientId}/contract-pricing`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل تحميل التسعير');
        if (cancelled) return;
        setLocal({
          meta: {
            effectiveDate: data.meta?.effectiveDate
              ? String(data.meta.effectiveDate).slice(0, 10)
              : '',
            durationLabel: data.meta?.durationLabel || 'عام من تاريخه',
            contractType: data.meta?.contractType || 'clearance_transport',
            coveredPorts: data.meta?.coveredPorts || 'الإسكندرية / السخنة',
          },
          clearance: (data.clearance || []).map((r: any) => ({
            tierKey: r.tierKey,
            label: r.label,
            amount: r.amount ?? '',
            currency: r.currency || 'EGP',
            isActive: r.isActive !== false,
          })),
          offers: (data.offers || []).map((r: any) => ({
            offerKey: r.offerKey,
            label: r.label,
            customLabel: r.customLabel || '',
            amount: r.amount ?? '',
            currency: r.currency || 'EGP',
            isActive: !!r.isActive,
            sortOrder: r.sortOrder ?? 0,
            isCustom: !!r.isCustom,
          })),
          transport: (data.transport || []).map((r: any) => ({
            portKey: r.portKey,
            unitKey: r.unitKey,
            label: r.label,
            customLabel: r.customLabel || '',
            amount: r.amount ?? '',
            currency: r.currency || 'EGP',
            isActive: r.isActive !== false,
            isCustom: !!r.isCustom,
          })),
        });
      } catch (err: any) {
        showToast(err.message || 'فشل تحميل تسعير التعاقد', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const updateClearance = (idx: number, patch: Partial<ClearanceRow>) => {
    const clearance = draft.clearance.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setDraft({ ...draft, clearance });
  };

  const updateOffer = (idx: number, patch: Partial<OfferRow>) => {
    const offers = draft.offers.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setDraft({ ...draft, offers });
  };

  const updateTransport = (idx: number, patch: Partial<TransportRow>) => {
    const transport = draft.transport.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setDraft({ ...draft, transport });
  };

  const addCustomOffer = () => {
    if (!customOfferLabel.trim()) return;
    const key = `custom_${Date.now().toString(36)}`;
    setDraft({
      ...draft,
      offers: [
        ...draft.offers,
        {
          offerKey: key,
          label: customOfferLabel.trim(),
          customLabel: customOfferLabel.trim(),
          amount: customOfferAmount === '' ? '' : Number(customOfferAmount),
          currency: 'EGP',
          isActive: true,
          sortOrder: draft.offers.length + 10,
          isCustom: true,
        },
      ],
    });
    setCustomOfferLabel('');
    setCustomOfferAmount('');
  };

  const addCustomTransport = () => {
    if (!customTransportLabel.trim()) return;
    const unitKey = `custom_${Date.now().toString(36)}`;
    setDraft({
      ...draft,
      transport: [
        ...draft.transport,
        {
          portKey: customTransportPort,
          unitKey,
          label: customTransportLabel.trim(),
          customLabel: customTransportLabel.trim(),
          amount: customTransportAmount === '' ? '' : Number(customTransportAmount),
          currency: 'EGP',
          isActive: true,
          isCustom: true,
        },
      ],
    });
    setCustomTransportLabel('');
    setCustomTransportAmount('');
  };

  if (loading) {
    return <p className="text-xs text-slate-400 py-4">جاري تحميل تعاقد التسعير...</p>;
  }

  const clearanceRows = readOnly
    ? draft.clearance.filter((r) => r.isActive && r.amount !== '' && Number(r.amount) > 0)
    : draft.clearance;
  const offerRows = readOnly
    ? draft.offers.filter((r) => r.isActive && r.amount !== '' && Number(r.amount) > 0)
    : draft.offers;
  const transportRows = readOnly
    ? draft.transport.filter((r) => r.isActive && r.amount !== '' && Number(r.amount) > 0)
    : draft.transport;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-sm font-black text-slate-900">رأس التعاقد</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">تاريخ السريان</label>
            <input
              type="date"
              disabled={readOnly}
              value={draft.meta.effectiveDate}
              onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, effectiveDate: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">مدة التعاقد</label>
            <input
              type="text"
              disabled={readOnly}
              value={draft.meta.durationLabel}
              onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, durationLabel: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">نوع التعاقد</label>
            <select
              disabled={readOnly}
              value={draft.meta.contractType}
              onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, contractType: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="clearance_transport">تخليص ونقل</option>
              <option value="clearance">تخليص فقط</option>
              <option value="transport">نقل فقط</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">الموانئ المشمولة</label>
            <input
              type="text"
              disabled={readOnly}
              value={draft.meta.coveredPorts}
              onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, coveredPorts: e.target.value } })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-black text-slate-900">تعاقد التخليص (شرائح موحّدة)</h4>
        {clearanceRows.length === 0 && readOnly ? (
          <p className="text-xs text-slate-400">لا توجد شرائح تخليص مفعّلة</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">الشريحة</th>
                  <th className="px-3 py-2 font-bold">السعر</th>
                  {!readOnly && <th className="px-3 py-2 font-bold w-16">فعّال</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clearanceRows.map((row) => {
                  const idx = draft.clearance.findIndex((r) => r.tierKey === row.tierKey);
                  return (
                    <tr key={row.tierKey}>
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="font-mono font-black text-indigo-600">
                            {Number(row.amount).toLocaleString('ar-EG')} {row.currency || 'EGP'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateClearance(idx, { amount: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                            placeholder="0.00"
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) => updateClearance(idx, { isActive: e.target.checked })}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-black text-slate-900">العروض</h4>
        {offerRows.length === 0 && readOnly ? (
          <p className="text-xs text-slate-400">لا توجد عروض مفعّلة</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold">العرض</th>
                  <th className="px-3 py-2 font-bold">السعر</th>
                  {!readOnly && <th className="px-3 py-2 font-bold w-16">فعّال</th>}
                  {!readOnly && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {offerRows.map((row) => {
                  const idx = draft.offers.findIndex((r) => r.offerKey === row.offerKey);
                  return (
                    <tr key={row.offerKey}>
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="font-mono font-black text-indigo-600">
                            {Number(row.amount).toLocaleString('ar-EG')} {row.currency || 'EGP'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateOffer(idx, { amount: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) => updateOffer(idx, { isActive: e.target.checked })}
                          />
                        </td>
                      )}
                      {!readOnly && (
                        <td className="px-3 py-2">
                          {row.isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  offers: draft.offers.filter((_, i) => i !== idx),
                                })
                              }
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!readOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
            <input
              type="text"
              placeholder="عرض مخصص جديد..."
              value={customOfferLabel}
              onChange={(e) => setCustomOfferLabel(e.target.value)}
              className="sm:col-span-6 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              type="number"
              placeholder="السعر"
              value={customOfferAmount}
              onChange={(e) => setCustomOfferAmount(e.target.value)}
              className="sm:col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
            <button
              type="button"
              onClick={addCustomOffer}
              className="sm:col-span-3 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة عرض
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-black text-slate-900">تعاقد النقل</h4>
        {transportRows.length === 0 && readOnly ? (
          <p className="text-xs text-slate-400">لا توجد أسعار نقل مفعّلة</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 max-h-72 overflow-y-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-bold">البيان</th>
                  <th className="px-3 py-2 font-bold">السعر</th>
                  {!readOnly && <th className="px-3 py-2 font-bold w-16">فعّال</th>}
                  {!readOnly && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transportRows.map((row) => {
                  const idx = draft.transport.findIndex(
                    (r) => r.portKey === row.portKey && r.unitKey === row.unitKey
                  );
                  return (
                    <tr key={`${row.portKey}-${row.unitKey}`}>
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                      <td className="px-3 py-2">
                        {readOnly ? (
                          <span className="font-mono font-black text-indigo-600">
                            {Number(row.amount).toLocaleString('ar-EG')} {row.currency || 'EGP'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateTransport(idx, { amount: e.target.value })}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                          />
                        )}
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.isActive}
                            onChange={(e) => updateTransport(idx, { isActive: e.target.checked })}
                          />
                        </td>
                      )}
                      {!readOnly && (
                        <td className="px-3 py-2">
                          {row.isCustom && (
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  transport: draft.transport.filter((_, i) => i !== idx),
                                })
                              }
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!readOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
            <select
              value={customTransportPort}
              onChange={(e) => setCustomTransportPort(e.target.value)}
              className="sm:col-span-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="alexandria">الإسكندرية</option>
              <option value="sokhna">السخنة</option>
            </select>
            <input
              type="text"
              placeholder="بيان نقل مخصص..."
              value={customTransportLabel}
              onChange={(e) => setCustomTransportLabel(e.target.value)}
              className="sm:col-span-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <input
              type="number"
              placeholder="السعر"
              value={customTransportAmount}
              onChange={(e) => setCustomTransportAmount(e.target.value)}
              className="sm:col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
            <button
              type="button"
              onClick={addCustomTransport}
              className="sm:col-span-3 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة نقل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export async function saveContractPricing(
  clientId: string,
  draft: ContractPricingDraft,
  token: string | null
) {
  const res = await fetch(`/api/clients/${clientId}/contract-pricing`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(draft),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل حفظ تسعير التعاقد');
  return data;
}
