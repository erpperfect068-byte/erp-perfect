'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import Link from 'next/link';
import {
  Ship,
  Plus,
  Search,
  Calendar,
  Layers,
  Anchor,
  Compass,
  Briefcase,
  AlertCircle,
  FileSpreadsheet,
  X,
  FileText,
  Clock,
  Trash2,
  Truck
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  items: Array<{ id: string; name: string }>;
}

interface Port { id: string; name: string }
interface Agency { id: string; name: string }
interface Contractor { id: string; name: string }
interface Status { id: string; name: string; color: string }

interface ShipmentInvoice {
  invoiceNumber: string;
  supplierName: string;
  amount: string;
  currency: string;
}

interface Shipment {
  id: string;
  clientId: string;
  invoiceValue: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  acid: string | null;
  declarationNumber46: string | null;
  containerCount: number | null;
  bolNumber: string | null;
  arrivalDate: string | null;
  documentReceiptDate: string | null;
  portId: string | null;
  statusId: string | null;
  contractorId: string | null;
  agencyId: string | null;
  currency: string;
  invoices?: ShipmentInvoice[];
  notes: string | null;
  createdAt: string;
  client: Client;
  clientItem: { id: string; name: string } | null;
  port: Port | null;
  status: Status | null;
  contractor: Contractor | null;
  agency: Agency | null;
}

export default function ShipmentsPage() {
  const { getAuthToken, dbUser } = useAuth();
  const { showToast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // New Shipment Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientItemId, setSelectedClientItemId] = useState('');
  const [acid, setAcid] = useState('');
  const [declarationNumber46, setDeclarationNumber46] = useState('');
  const [containerCount, setContainerCount] = useState('');
  const [bolNumber, setBolNumber] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [docReceiptDate, setDocReceiptDate] = useState('');
  const [portId, setPortId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [notes, setNotes] = useState('');

  // Multi-Currency Invoices State
  const [invoices, setInvoices] = useState<ShipmentInvoice[]>([
    { invoiceNumber: '', supplierName: '', amount: '', currency: 'USD' }
  ]);

  // Update status modal forms
  const [updateStatusId, setUpdateStatusId] = useState('');
  const [updateDecl46, setUpdateDecl46] = useState('');
  const [updateContractorId, setUpdateContractorId] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  async function loadCoreData() {
    try {
      const token = await getAuthToken();
      // Load shipments
      const shipRes = await fetch('/api/shipments', { headers: { 'Authorization': `Bearer ${token}` } });
      if (shipRes.ok) setShipments(await shipRes.json());

      // Load clients
      const clientRes = await fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } });
      if (clientRes.ok) setClients(await clientRes.json());

      // Load settings
      const settingsRes = await fetch('/api/settings', { headers: { 'Authorization': `Bearer ${token}` } });
      if (settingsRes.ok) {
        const setts = await settingsRes.json();
        setPorts(setts.ports || []);
        setAgencies(setts.agencies || []);
        setContractors(setts.contractors || []);
        setStatuses(setts.statuses || []);
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ أثناء تحميل البيانات المرجعية', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoreData();
  }, [getAuthToken]);

  const handleAddInvoiceRow = () => {
    setInvoices(prev => [...prev, { invoiceNumber: '', supplierName: '', amount: '', currency: 'USD' }]);
  };

  const handleRemoveInvoiceRow = (index: number) => {
    if (invoices.length === 1) return;
    setInvoices(prev => prev.filter((_, i) => i !== index));
  };

  const handleInvoiceChange = (index: number, field: keyof ShipmentInvoice, value: string) => {
    setInvoices(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      showToast('يرجى تحديد العميل المستورد أولاً', 'warning');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          clientItemId: selectedClientItemId || undefined,
          invoices,
          acid: acid || undefined,
          declarationNumber46: declarationNumber46 || undefined,
          containerCount: containerCount || undefined,
          bolNumber: bolNumber || undefined,
          arrivalDate: arrivalDate || undefined,
          documentReceiptDate: docReceiptDate || undefined,
          portId: portId || undefined,
          statusId: statusId || undefined,
          contractorId: contractorId || undefined,
          agencyId: agencyId || undefined,
          notes: notes || undefined
        })
      });

      if (res.ok) {
        showToast('تم تسجيل الشحنة وفتح كشف حسابها بنجاح', 'success');
        setIsCreateOpen(false);
        // Clear form
        setSelectedClientId('');
        setSelectedClientItemId('');
        setInvoices([{ invoiceNumber: '', supplierName: '', amount: '', currency: 'USD' }]);
        setAcid('');
        setDeclarationNumber46('');
        setContainerCount('');
        setBolNumber('');
        setArrivalDate('');
        setDocReceiptDate('');
        setPortId('');
        setStatusId('');
        setContractorId('');
        setAgencyId('');
        setNotes('');
        // Reload
        loadCoreData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل فتح ملف الشحنة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالشبكة أو الخادم', 'error');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/shipments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedShipment.id,
          statusId: updateStatusId || undefined,
          declarationNumber46: updateDecl46 || undefined,
          contractorId: updateContractorId || undefined,
          notes: updateNotes || undefined
        })
      });

      if (res.ok) {
        showToast('تم تحديث حالة بوليصة التخليص بنجاح', 'success');
        setIsUpdateStatusOpen(false);
        loadCoreData();
      } else {
        showToast('فشل تحديث الحالة الجمركية', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  const openStatusModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setUpdateStatusId(shipment.statusId || '');
    setUpdateDecl46(shipment.declarationNumber46 || '');
    setUpdateContractorId(shipment.contractorId || '');
    setUpdateNotes(shipment.notes || '');
    setIsUpdateStatusOpen(true);
  };

  const selectedClientObject = clients.find(c => c.id === selectedClientId);

  const filteredShipments = shipments.filter((s) =>
    (s.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.bolNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.acid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.declarationNumber46 || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">متابعة شحنات الجمرك</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              راقب حركة الشحنات، سجل بيانات بوالص الشحن الـ ACID وأرقام الإقرار 46، وحدّث حالات التخليص وفواتير العملات المختلفة.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-5 rounded-2xl shadow-lg shadow-indigo-600/10 transition-colors shrink-0"
          >
            <Plus className="h-5 w-5" />
            فتح ملف شحنة جديدة
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالعميل، رقم بوليصة الشحن (BOL)، رقم الـ ACID، أو رقم إقرار 46..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Workspace List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-32 bg-white border border-slate-200 animate-pulse rounded-2xl"></div>
            ))}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <Ship className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">لا توجد بوالص شحن مسجلة</h3>
            <p className="text-sm text-slate-500 mt-2">افتح أول بوليصة شحن واستكمل تتبعها من هنا.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredShipments.map((shipment) => {
              const formattedDate = (dateStr: string | null) => {
                if (!dateStr) return 'غير محدد';
                return new Date(dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
              };

              return (
                <div
                  key={shipment.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6"
                >
                  {/* General Block */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-xl font-bold border border-slate-200 flex items-center gap-1.5">
                        <Ship className="h-3.5 w-3.5 text-slate-500" />
                        بوليصة: {shipment.bolNumber || 'غير متوفر'}
                      </span>
                      {shipment.status ? (
                        <span
                          className="px-2.5 py-1 rounded-xl text-xs font-bold border"
                          style={{
                            backgroundColor: `${shipment.status.color}08`,
                            borderColor: `${shipment.status.color}25`,
                            color: shipment.status.color
                          }}
                        >
                          {shipment.status.name}
                        </span>
                      ) : (
                        <span className="bg-slate-50 text-slate-400 border border-slate-100 px-2.5 py-1 rounded-xl text-xs">
                          بدون حالة جمركية
                        </span>
                      )}
                      {shipment.containerCount && (
                        <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-xl font-bold border border-indigo-100">
                          {shipment.containerCount} حاويات
                        </span>
                      )}
                      {shipment.contractor && (
                        <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-xl font-bold border border-amber-100 flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {shipment.contractor.name}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900">{shipment.client?.name}</h3>
                      {shipment.clientItem && (
                        <p className="text-xs text-indigo-600 font-bold mt-0.5">البضاعة المستوردة: {shipment.clientItem.name}</p>
                      )}
                    </div>

                    {/* Meta numbers block */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-50 text-[11px] text-slate-500 font-medium">
                      <div>
                        <span className="block text-slate-400 font-light">رقم الـ ACID الجمركي:</span>
                        <span className="font-bold text-slate-800">{shipment.acid || 'لم يسجل'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-light">بيان جمركي (إقرار 46):</span>
                        <span className="font-bold text-slate-800">{shipment.declarationNumber46 || 'بانتظار الإدراج'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-light">ميناء الوصول:</span>
                        <span className="font-bold text-slate-800">{shipment.port?.name || 'لم يحدد'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 font-light">تاريخ الوصول:</span>
                        <span className="font-bold text-slate-800">{formattedDate(shipment.arrivalDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-currency Invoices Display */}
                  <div className="flex flex-col sm:flex-row items-stretch xl:items-center gap-3 shrink-0 xl:border-r xl:border-slate-100 xl:pr-6 xl:mr-2">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-slate-400 block font-light">فواتير الشحنة:</span>
                      {shipment.invoices && shipment.invoices.length > 0 ? (
                        <div className="space-y-0.5">
                          {shipment.invoices.map((inv, idx) => (
                            <div key={idx} className="text-xs font-black text-slate-800">
                              {inv.amount ? parseFloat(inv.amount).toLocaleString() : '0.00'} {inv.currency}
                              {inv.invoiceNumber && <span className="text-[10px] text-slate-400 font-normal mr-1">({inv.invoiceNumber})</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-black text-slate-800 block">
                          {shipment.invoiceValue ? parseFloat(shipment.invoiceValue).toLocaleString() : '0.00'} {shipment.currency || 'USD'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => openStatusModal(shipment)}
                      className="px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Clock className="h-4 w-4" />
                      تحديث الحالة والبيان 46
                    </button>
                    {['admin', 'accountant'].includes(dbUser?.role || '') && (
                      <Link
                        href="/statements"
                        className="px-4 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FileText className="h-4 w-4" />
                        دفتر الحسابات
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Shipment Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Ship className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-slate-900">تسجيل بوليصة شحن وتخليص جديدة</h3>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateShipment} className="space-y-6 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client Select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">العميل المستورد *</label>
                    <select
                      required
                      value={selectedClientId}
                      onChange={(e) => {
                        setSelectedClientId(e.target.value);
                        setSelectedClientItemId('');
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    >
                      <option value="">-- اختر عميل مستورد --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Client Item select based on clients list */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نوع البضاعة (بأصناف العميل المخصصة)</label>
                    <select
                      value={selectedClientItemId}
                      onChange={(e) => setSelectedClientItemId(e.target.value)}
                      disabled={!selectedClientId}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-50"
                    >
                      <option value="">-- اختر صنف مستورد مخصص --</option>
                      {selectedClientObject?.items.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">رقم بوليصة الشحن (BOL Number)</label>
                    <input
                      type="text"
                      placeholder="مثال: MSCU1234567"
                      value={bolNumber}
                      onChange={(e) => setBolNumber(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">رقم الـ ACID الجمركي الموحد</label>
                    <input
                      type="text"
                      placeholder="تراخيص النافذة الموحدة"
                      value={acid}
                      onChange={(e) => setAcid(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Missing Field 1: Declaration 46 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">رقم البيان الجمركي (إقرار 46) <span className="text-[10px] text-slate-400 font-normal">(اختياري)</span></label>
                    <input
                      type="text"
                      placeholder="مثال: 46019283"
                      value={declarationNumber46}
                      onChange={(e) => setDeclarationNumber46(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Missing Field 2: Transport Contractor Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">مقاول النقل (Transport Contractor)</label>
                    <select
                      value={contractorId}
                      onChange={(e) => setContractorId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    >
                      <option value="">-- اختر مقاول النقل --</option>
                      {contractors.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multi-Currency Invoices Section */}
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">فواتير الشحنة (تعدد العملات)</h4>
                      <p className="text-[11px] text-slate-500">أضف فواتير البضاعة ومبالغها بالعملات المختلفة لنفس الشحنة.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddInvoiceRow}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة فاتورة/عملة
                    </button>
                  </div>

                  <div className="space-y-2">
                    {invoices.map((inv, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-slate-200">
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="رقم الفاتورة"
                            value={inv.invoiceNumber}
                            onChange={(e) => handleInvoiceChange(index, 'invoiceNumber', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="اسم المورد"
                            value={inv.supplierName}
                            onChange={(e) => handleInvoiceChange(index, 'supplierName', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            placeholder="قيمة الفاتورة"
                            value={inv.amount}
                            onChange={(e) => handleInvoiceChange(index, 'amount', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-left"
                            dir="ltr"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            value={inv.currency}
                            onChange={(e) => handleInvoiceChange(index, 'currency', e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="EGP">EGP (ج.م)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="SAR">SAR (ر.س)</option>
                            <option value="AED">AED (د.إ)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1 text-center">
                          {invoices.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInvoiceRow(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="h-4 w-4 mx-auto" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">تاريخ وصول الباخرة المتوقع</label>
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">تاريخ استلام مستندات العميل</label>
                    <input
                      type="date"
                      value={docReceiptDate}
                      onChange={(e) => setDocReceiptDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">ميناء المنفذ والوصول</label>
                    <select
                      value={portId}
                      onChange={(e) => setPortId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    >
                      <option value="">-- اختر ميناء الوصول --</option>
                      {ports.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">الحالة الجمركية الابتدائية</label>
                    <select
                      value={statusId}
                      onChange={(e) => setStatusId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    >
                      <option value="">-- اختر حالة بوليصة التخليص --</option>
                      {statuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">الخط الملاحي والتوكيل</label>
                    <select
                      value={agencyId}
                      onChange={(e) => setAgencyId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    >
                      <option value="">-- اختر الخط الملاحي --</option>
                      {agencies.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عدد الحاويات الكلي (Containers Count)</label>
                    <input
                      type="number"
                      placeholder="عدد الحاويات"
                      value={containerCount}
                      onChange={(e) => setContainerCount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ملاحظات تشغيل مخصصة</label>
                  <textarea
                    rows={2}
                    placeholder="تعليمات أو ملاحظات للمخلصين الجمركيين الميدانيين..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg"
                  >
                    فتح ملف الشحنة جمركياً
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Shipment Status Modal */}
        {isUpdateStatusOpen && selectedShipment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-slate-900">تحديث تفاصيل تخليص الشحنة يدوياً</h3>
                <button onClick={() => setIsUpdateStatusOpen(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">المستورد (للإعلام):</label>
                  <p className="text-sm font-bold text-slate-900">{selectedShipment.client?.name}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">حالة التخليص الجمركي المحدثة</label>
                  <select
                    value={updateStatusId}
                    onChange={(e) => setUpdateStatusId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="">-- اختر حالة بوليصة التخليص --</option>
                    {statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">إدراج رقم البيان الجمركي 46 (عند الصدور)</label>
                  <input
                    type="text"
                    placeholder="رقم بيان 46"
                    value={updateDecl46}
                    onChange={(e) => setUpdateDecl46(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">تعديل مقاول النقل</label>
                  <select
                    value={updateContractorId}
                    onChange={(e) => setUpdateContractorId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="">-- اختر مقاول النقل --</option>
                    {contractors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ملاحظات وآخر مستجدات جمركية</label>
                  <textarea
                    rows={2}
                    placeholder="تم استلام الفحص، جاهز للنقل، إلخ..."
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsUpdateStatusOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
                  >
                    تحديث الملف واللوحة
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
