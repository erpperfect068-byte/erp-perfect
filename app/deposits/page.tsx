'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { motion } from 'motion/react';
import {
  PiggyBank,
  Plus,
  Coins,
  Building2,
  Receipt,
  FileText,
  Search,
  X,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Layers,
  Ship,
  Info
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

interface Shipment {
  id: string;
  clientId: string;
  bolNumber: string | null;
  acid: string | null;
  declarationNumber46: string | null;
  supplierName: string | null;
  port?: { name: string } | null;
  clientItem?: { name: string } | null;
}

interface Statement {
  id: string;
  shipment: {
    id: string;
    bolNumber: string | null;
    acid: string | null;
    declarationNumber46: string | null;
    clientItem?: { name: string } | null;
  } | null;
}

interface Deposit {
  id: string;
  statementId: string | null;
  amount: string;
  currency: string;
  exchangeRateAtTransaction: string;
  depositDate: string;
  receiptNumber: string | null;
  notes: string | null;
  client: Client | null;
  statement: Statement | null;
}

export default function DepositsPage() {
  const { getAuthToken, hasPermission } = useAuth();
  const { showToast } = useToast();

  const canCreateDeposit = hasPermission('deposits.create');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'general' | 'linked'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [depositType, setDepositType] = useState<'general' | 'linked'>('general');
  const [clientId, setClientId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [rate, setRate] = useState('1.0000');
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      // Load deposits
      const depRes = await fetch('/api/deposits', { headers: { 'Authorization': `Bearer ${token}` } });
      if (depRes.ok) setDeposits(await depRes.json());

      // Load clients
      const cliRes = await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } });
      if (cliRes.ok) setClients(await cliRes.json());

      // Load shipments
      const shipRes = await fetch('/api/shipments', { headers: { 'Authorization': `Bearer ${token}` } });
      if (shipRes.ok) setShipments(await shipRes.json());
    } catch (err) {
      console.error(err);
      showToast('فشل تحميل بيانات الأمانات والودائع', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [getAuthToken]);

  useEffect(() => {
    if (currency === 'EGP') setRate('1.0000');
    else if (currency === 'USD') setRate('48.5000');
    else if (currency === 'EUR') setRate('52.3000');
  }, [currency]);

  // Client shipments filtered
  const clientShipments = shipments.filter((s) => s.clientId === clientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amount) {
      showToast('يرجى تحديد العميل والمبلغ لتسجيل الإيداع', 'warning');
      return;
    }

    if (depositType === 'linked' && !selectedShipmentId) {
      showToast('يرجى اختيار الشحنة المربوط بها الأمانة', 'warning');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          shipmentId: depositType === 'linked' ? selectedShipmentId : undefined,
          amount: parseFloat(amount),
          currency,
          exchangeRateAtTransaction: parseFloat(rate),
          receiptNumber: receiptNo || undefined,
          notes: notes || undefined
        })
      });

      if (res.ok) {
        showToast(
          depositType === 'linked'
            ? 'تم تقييد الأمانة المخصصة للشحنة بنجاح!'
            : 'تم تقييد الأمانة العامة لحساب العميل بنجاح!',
          'success'
        );
        setIsModalOpen(false);
        // Reset form
        setClientId('');
        setSelectedShipmentId('');
        setDepositType('general');
        setAmount('');
        setReceiptNo('');
        setNotes('');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل تسجيل الوديعة في الخزينة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم عند معالجة الإيداع', 'error');
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    const matchesSearch =
      (d.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.receiptNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.statement?.shipment?.bolNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.statement?.shipment?.acid || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isGeneral = !d.statementId;
    if (filterType === 'general') return matchesSearch && isGeneral;
    if (filterType === 'linked') return matchesSearch && !isGeneral;
    return matchesSearch;
  });

  // Calculate currency summaries
  const totals: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
  let generalCount = 0;
  let linkedCount = 0;

  deposits.forEach((d) => {
    totals[d.currency] = (totals[d.currency] || 0) + parseFloat(d.amount);
    if (!d.statementId) generalCount++;
    else linkedCount++;
  });

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إيداعات وأمانات العملاء (العهد الجمركية)</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              إدارة الأمانات العامة (رصيد مفتوح يُخصم منه لأي شحنة) والأمانات المخصصة (مربوطة ببوليصة شحن أو بيان جمركي محدد).
            </p>
          </div>
          {canCreateDeposit && (
            <button
              onClick={() => {
                setDepositType('general');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors shrink-0"
            >
              <Plus className="h-5 w-5" />
              استلام أمانة / عهدة جديدة
            </button>
          )}
        </div>

        {/* Explanatory Banner: The difference between General and Linked deposits */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-bold text-slate-900">الفرق بين نوعي الأمانات في النظام الجمركي:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-slate-600 font-light mt-2">
              <div className="bg-white p-3 rounded-xl border border-indigo-100/60 flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <div>
                  <strong className="text-slate-800 font-bold block mb-0.5">أمانة عامة (General Custody):</strong>
                  رصيد دائن مفتوح لحساب العميل بالمكتب، غير مرتبط بشحنة واحدة. يُستخدم ويُخصم منه لتخليص أي شحنة قادمة للعميل.
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-indigo-100/60 flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                <div>
                  <strong className="text-slate-800 font-bold block mb-0.5">أمانة مخصصة (Linked Custody):</strong>
                  مربوطة ببوليصة شحن (BOL) أو رقم ACID محدد، وتُخصم وتُسوى حصراً من كشف حساب تلك الشحنة ومصاريفها الجمركية.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency & Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">إجمالي الأمانات بالجنيه</span>
              <Coins className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {totals.EGP.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs font-medium text-slate-400 mr-1.5">ج.م</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">إجمالي الأمانات بالدولار</span>
              <Coins className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              ${totals.USD.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
              <span className="text-xs font-medium text-slate-400 mr-1.5">USD</span>
            </div>
          </div>

          <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-white to-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">أمانات عامة (مفتوحة)</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">
              {generalCount}
              <span className="text-xs font-medium text-emerald-600 mr-1.5">سند أمانة عام</span>
            </div>
          </div>

          <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-white to-blue-50/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">أمانات مخصصة (لبوالص)</span>
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2">
              {linkedCount}
              <span className="text-xs font-medium text-blue-600 mr-1.5">سند لشحنة محددة</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث باسم العميل، رقم الإيصال، أو رقم البوليصة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterType === 'all'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع الأمانات ({deposits.length})
            </button>
            <button
              onClick={() => setFilterType('general')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                filterType === 'general'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300"></span>
              أمانات عامة ({generalCount})
            </button>
            <button
              onClick={() => setFilterType('linked')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                filterType === 'linked'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-300"></span>
              أمانات مخصصة ({linkedCount})
            </button>
          </div>
        </div>

        {/* Deposits List */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-3 text-slate-500 text-xs font-medium">جاري جلب سجلات الأمانات والعهد...</p>
          </div>
        ) : filteredDeposits.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <PiggyBank className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">لا توجد سندات أمانة تطابق البحث</h3>
            <p className="text-xs text-slate-400 mt-1">سجل أي مبلغ أمانة مستلم لتسهيل استخدامه في خصومات وتخفيضات فواتير الشحنة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDeposits.map((deposit) => {
              const isGeneral = !deposit.statementId;
              const shipment = deposit.statement?.shipment;

              return (
                <div
                  key={deposit.id}
                  className={`bg-white border rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200 ${
                    isGeneral ? 'border-slate-200 hover:border-emerald-300' : 'border-blue-100 hover:border-blue-300'
                  }`}
                >
                  <div>
                    {/* Card Top Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm ${
                            isGeneral
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}
                        >
                          {isGeneral ? <PiggyBank className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{deposit.client?.name}</h4>
                          <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                            تاريخ الاستلام: {new Date(deposit.depositDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Deposit Type Badge */}
                      <div>
                        {isGeneral ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            أمانة عامة (حساب مفتوح)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            أمانة مخصصة لشحنة
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount & Shipment Link Details */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-light">المبلغ المستلم:</span>
                        <span className="text-xl font-black text-indigo-600 block mt-0.5">
                          {parseFloat(deposit.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {deposit.currency}
                        </span>
                        {deposit.currency !== 'EGP' && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            سعر الصرف المثبت: {deposit.exchangeRateAtTransaction} ج.م
                          </span>
                        )}
                      </div>

                      {/* Shipment link info if linked */}
                      {!isGeneral && shipment && (
                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-right">
                          <span className="text-[10px] text-blue-600 block font-bold mb-0.5">مربوطة بملف الشحنة:</span>
                          <div className="text-xs font-bold text-slate-800">
                            بوليصة: <span className="font-mono text-indigo-600">{shipment.bolNumber || 'غير محدد'}</span>
                          </div>
                          {shipment.acid && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              رقم الـ ACID: <span className="font-mono">{shipment.acid}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {isGeneral && (
                        <div className="bg-emerald-50/50 border border-emerald-100/70 rounded-xl p-2.5 text-right">
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            ✓ رصيد متاح للخصم لأي شحنة مستقبلية
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer details: Receipt number and notes */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      {deposit.receiptNumber ? (
                        <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-bold">
                          إيصال استلام: {deposit.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">بدون رقم إيصال</span>
                      )}
                    </div>

                    {deposit.notes && (
                      <p className="text-[11px] text-slate-500 leading-relaxed font-light bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                        {deposit.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Deposit Creation Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 shadow-2xl my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <PiggyBank className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">سند استلام وقبض أمانة عميل</h3>
                    <p className="text-xs text-slate-400">إثبات عهدة نقدية لدفع مصاريف الجمارك والتخليص</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 mt-5">
                {/* 1. Client Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">العميل المستورد *</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setSelectedShipmentId('');
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- اختر العميل من القائمة --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Deposit Type Selector (General vs Linked) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">نوع الأمانة *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDepositType('general')}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        depositType === 'general'
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-900">أمانة عامة</span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            depositType === 'general'
                              ? 'border-emerald-600 bg-emerald-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {depositType === 'general' && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-light mt-1.5 block">
                        رصيد مفتوح يُخصم منه لأي شحنة لاحقاً
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositType('linked')}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        depositType === 'linked'
                          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-900">أمانة مخصصة لشحنة</span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            depositType === 'linked'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {depositType === 'linked' && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-light mt-1.5 block">
                        مربوطة ببوليصة شحن أو بيان جمركي
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. If Linked: Shipment Selection */}
                {depositType === 'linked' && (
                  <div className="space-y-1.5 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100 animate-in fade-in">
                    <label className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Ship className="h-4 w-4 text-blue-600" />
                      اختر الشحنة المربوطة بالأمانة *
                    </label>

                    {!clientId ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-light">
                        يرجى اختيار العميل أولاً لعرض الشحنات المتاحة له.
                      </p>
                    ) : clientShipments.length === 0 ? (
                      <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-slate-600 font-light space-y-1">
                        <p className="font-bold text-amber-800">لا توجد شحنات مسجلة لهذا العميل حالياً.</p>
                        <p className="text-[11px] text-slate-500">
                          يمكنك تسجيل الأمانة كـ <strong>&quot;أمانة عامة&quot;</strong> الآن، وسيتمكن المحاسب من خصمها عند فتح ملف الشحنة لاحقاً.
                        </p>
                      </div>
                    ) : (
                      <select
                        required
                        value={selectedShipmentId}
                        onChange={(e) => setSelectedShipmentId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- اختر البوليصة / الشحنة --</option>
                        {clientShipments.map((s) => (
                          <option key={s.id} value={s.id}>
                            بوليصة: {s.bolNumber || 'بدون رقم'} {s.acid ? `| ACID: ${s.acid}` : ''} {s.port ? `(${s.port.name})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* 4. Amount and Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ المقبوض *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عملة الإيداع</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="EGP">EGP (جنيه مصري)</option>
                      <option value="USD">USD (دولار أمريكي)</option>
                      <option value="EUR">EUR (يورو)</option>
                    </select>
                  </div>
                </div>

                {/* Foreign Currency Rate */}
                {currency !== 'EGP' && (
                  <div className="space-y-1.5 bg-amber-50/60 border border-amber-200 p-3 rounded-2xl animate-in fade-in">
                    <label className="text-xs font-bold text-amber-900">سعر الصرف المعتمد بالجنيه (للخزينة) *</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-sm text-left font-mono font-bold text-amber-900"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* Receipt Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم إيصال / سند القبض</label>
                  <input
                    type="text"
                    placeholder="مثال: REC-2026-9901"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ملاحظات المستند</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب أي توضيحات إضافية تخص سند القبض..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-colors"
                  >
                    تسجيل وقيد الأمانة في الخزينة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
