'use client';

import React, { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { LoadingButton } from '../../components/LoadingButton';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  PlusCircle,
  Trash2,
  Pencil,
} from 'lucide-react';
import ClientContractPricingEditor, {
  emptyContractDraft,
  saveContractPricing,
  type ContractPricingDraft,
} from '@/components/clients/ClientContractPricingEditor';

interface ClientItem {
  id: string;
  name: string;
}

interface ClientPricing {
  id: string;
  serviceName: string;
  price: string;
  currency: string;
}

interface Client {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  items: ClientItem[];
  pricing: ClientPricing[];
}

const EMPTY_PRICING_INPUT = {
  newItemInput: '',
};

export default function ClientsPage() {
  const { getAuthToken, hasPermission } = useAuth();
  const { showToast } = useToast();

  const canCreateClient = hasPermission('clients.create');
  const canEditClient = hasPermission('clients.edit') || hasPermission('clients.update');
  const canDeleteClient = hasPermission('clients.delete');

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientDraftKey, setClientDraftKey] = useState<string | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');

  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState('');

  const [contractDraft, setContractDraft] = useState<ContractPricingDraft>(emptyContractDraft());

  async function loadClients() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      } else {
        showToast('فشل تحميل قائمة العملاء', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ غير متوقع', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, [getAuthToken]);

  const resetDraftInputs = () => {
    setNewItemInput(EMPTY_PRICING_INPUT.newItemInput);
  };

  const fillFormFromClient = (c: Client) => {
    setName(c.name || '');
    setContactPerson(c.contactPerson || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setTaxNumber(c.taxNumber || '');
    setNotes(c.notes || '');
    setCustomItems((c.items || []).map((i) => i.name));
    setContractDraft(emptyContractDraft());
    resetDraftInputs();
  };

  const clearCreateForm = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTaxNumber('');
    setNotes('');
    setCustomItems([]);
    setContractDraft(emptyContractDraft());
    resetDraftInputs();
  };

  const handleOpenCreateModal = () => {
    const nextKey = 'create';
    if (clientDraftKey !== nextKey) {
      setEditingClient(null);
      clearCreateForm();
      setClientDraftKey(nextKey);
    } else {
      setEditingClient(null);
    }
    setIsModalOpen(true);
  };

  const loadContractDraftForClient = async (clientId: string) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/clients/${clientId}/contract-pricing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحميل التسعير');
      setContractDraft({
        meta: {
          effectiveDate: data.meta?.effectiveDate ? String(data.meta.effectiveDate).slice(0, 10) : '',
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
      showToast(err.message || 'تعذر تحميل تعاقد التسعير', 'warning');
      setContractDraft(emptyContractDraft());
    }
  };

  const handleOpenEditModal = async (c: Client) => {
    if (clientDraftKey !== c.id) {
      setEditingClient(c);
      fillFormFromClient(c);
      setClientDraftKey(c.id);
      await loadContractDraftForClient(c.id);
    } else {
      setEditingClient(c);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleAddItem = () => {
    if (newItemInput.trim()) {
      setCustomItems([...customItems, newItemInput.trim()]);
      setNewItemInput('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setCustomItems(customItems.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('اسم العميل مطلوب', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى');

      const payload = {
        name: name.trim(),
        contactPerson,
        phone,
        email,
        address,
        taxNumber,
        notes,
        items: customItems,
        pricing: [],
      };

      const res = editingClient
        ? await fetch(`/api/clients/${editingClient.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/clients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

      const errData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errData.error || 'فشل حفظ بيانات العميل');

      const savedId = editingClient?.id || errData.id || errData.client?.id;
      if (savedId) {
        await saveContractPricing(savedId, contractDraft, token);
      }

      showToast(editingClient ? 'تم تحديث بيانات العميل والتعاقد بنجاح' : 'تم تسجيل العميل والتعاقد بنجاح', 'success');
      setIsModalOpen(false);
      setClientDraftKey(null);
      setEditingClient(null);
      clearCreateForm();
      loadClients();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'خطأ بالخادم أثناء الحفظ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateClient = async (c: Client) => {
    if (!confirm(`تعطيل العميل (${c.name})؟ لن يظهر في القوائم النشطة، وستبقى شحناته وأماناته المرتبطة.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const token = await getAuthToken();
      if (!token) throw new Error('جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى');

      const res = await fetch(`/api/clients/${c.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل تعطيل العميل');

      showToast(data.message || 'تم تعطيل العميل بنجاح', 'success');
      if (clientDraftKey === c.id) {
        setClientDraftKey(null);
        setEditingClient(null);
        clearCreateForm();
        setIsModalOpen(false);
      }
      if (viewingClient?.id === c.id) setViewingClient(null);
      setClients((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const clientColumns = useMemo<DataTableColumn<Client>[]>(
    () => [
      {
        id: 'name',
        header: 'اسم العميل',
        isPrimary: true,
        className: 'min-w-[180px]',
        cell: (row) => <span className="truncate block max-w-[260px]">{row.name}</span>,
      },
      {
        id: 'contact',
        header: 'المسؤول',
        cell: (row) => (
          <span className="text-slate-600 text-xs">{row.contactPerson || '—'}</span>
        ),
      },
      {
        id: 'phone',
        header: 'الهاتف',
        cell: (row) => (
          <span className="text-slate-600 text-xs font-mono" dir="ltr">
            {row.phone || '—'}
          </span>
        ),
      },
      {
        id: 'tax',
        header: 'البطاقة الضريبية',
        cell: (row) =>
          row.taxNumber ? (
            <span className="inline-flex bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-indigo-100">
              {row.taxNumber}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        id: 'items',
        header: 'أصناف',
        className: 'w-16 text-center',
        cell: (row) => (
          <span className="text-xs font-bold text-slate-700 tabular-nums">
            {(row.items || []).length}
          </span>
        ),
      },
      {
        id: 'pricing',
        header: 'تعاقد',
        className: 'w-20 text-center',
        cell: () => (
          <span className="text-[10px] font-bold text-indigo-600">تخليص / نقل</span>
        ),
      },
    ],
    []
  );

  return (
    <PermissionGuard requiredPermission={['clients.view', 'clients.create']} pageTitle="إدارة العملاء والأسعار">
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">إدارة العملاء والأسعار</h1>
              <p className="text-sm text-slate-500 font-light mt-1">
                أضف العملاء وعرّف أصناف بضائعهم المسجلة في الجمارك واتفاقيات تسعير الخدمات المتفق عليها.
              </p>
            </div>
            {canCreateClient && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-5 rounded-2xl shadow-lg shadow-indigo-600/10 transition-colors shrink-0"
              >
                <Plus className="h-5 w-5" />
                إضافة عميل جديد
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن العميل بالاسم أو الشخص المسؤول..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <DataTable
            columns={clientColumns}
            data={filteredClients}
            getRowId={(row) => row.id}
            loading={loading}
            onPrimaryClick={(row) => setViewingClient(row)}
            actions={(row) => (
              <>
                {canEditClient && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(row)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="تعديل بيانات العميل"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {canDeleteClient && (
                  <button
                    type="button"
                    onClick={() => handleDeactivateClient(row)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    title="تعطيل العميل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
            emptyState={
              <div className="p-12 text-center max-w-lg mx-auto">
                <Building2 className="h-12 w-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-800 mt-4">لا يوجد عملاء مسجلين</h3>
                <p className="text-sm text-slate-500 mt-2">ابدأ بإدخال أول عميل وتخصيص أسعاره المعتمدة لمكتبك.</p>
                {canCreateClient && (
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="mt-4 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100/60"
                  >
                    تسجيل عميل الآن <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            }
          />

          <Drawer
            open={Boolean(viewingClient)}
            onClose={() => setViewingClient(null)}
            title={viewingClient?.name || 'تفاصيل العميل'}
            description={
              viewingClient?.contactPerson
                ? `الشخص المسؤول: ${viewingClient.contactPerson}`
                : 'بيانات الاتصال والتسعير والأصناف'
            }
            footer={
              viewingClient ? (
                <div className="flex items-center justify-end gap-2">
                  {canEditClient && (
                    <button
                      type="button"
                      onClick={() => {
                        const c = viewingClient;
                        setViewingClient(null);
                        handleOpenEditModal(c);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      تعديل
                    </button>
                  )}
                  {canDeleteClient && (
                    <button
                      type="button"
                      onClick={() => handleDeactivateClient(viewingClient)}
                      disabled={isSubmitting}
                      className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      تعطيل
                    </button>
                  )}
                </div>
              ) : null
            }
          >
            {viewingClient && (
              <div className="space-y-5">
                {viewingClient.taxNumber && (
                  <span className="inline-flex bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                    بطاقة ضريبية: {viewingClient.taxNumber}
                  </span>
                )}

                <div className="space-y-2.5 text-xs text-slate-600">
                  {viewingClient.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span dir="ltr">{viewingClient.phone}</span>
                    </div>
                  )}
                  {viewingClient.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span dir="ltr" className="truncate">
                        {viewingClient.email}
                      </span>
                    </div>
                  )}
                  {viewingClient.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{viewingClient.address}</span>
                    </div>
                  )}
                  {!viewingClient.phone && !viewingClient.email && !viewingClient.address && (
                    <p className="text-slate-400">لا توجد بيانات اتصال مسجلة</p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-2">أصناف بضائع المستورد</span>
                  {(viewingClient.items || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewingClient.items.map((item) => (
                        <span
                          key={item.id}
                          className="bg-slate-100 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1 rounded-lg font-medium"
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">لا توجد أصناف مسجلة</p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-2">تعاقد التسعير</span>
                  <ClientContractPricingEditor
                    clientId={viewingClient.id}
                    getAuthToken={getAuthToken}
                    showToast={showToast}
                    readOnly
                  />
                </div>

                {viewingClient.notes && (
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-100/60 text-xs text-amber-800 leading-relaxed">
                    {viewingClient.notes}
                  </div>
                )}
              </div>
            )}
          </Drawer>

          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-indigo-600" />
                    <h3 className="text-xl font-bold text-slate-900">
                      {editingClient ? 'تعديل بيانات العميل' : 'تسجيل بيانات عميل جديد'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">اسم الشركة/العميل *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: شركة النيل للاستيراد والتصدير"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">الشخص المسؤول (جهة الاتصال)</label>
                      <input
                        type="text"
                        placeholder="مثال: أ. محمد أحمد"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">رقم الهاتف للاتصال</label>
                      <input
                        type="tel"
                        placeholder="مثال: 01000000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">البريد الإلكتروني للشركة</label>
                      <input
                        type="email"
                        placeholder="مثال: info@nile-import.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">رقم البطاقة الضريبية</label>
                      <input
                        type="text"
                        placeholder="مثال: 123-456-789"
                        value={taxNumber}
                        onChange={(e) => setTaxNumber(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">عنوان مقر الشركة</label>
                      <input
                        type="text"
                        placeholder="العنوان التفصيلي"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-5">
                    <span className="text-sm font-bold text-slate-900 block">
                      إضافة أصناف بضائع العميل (dropdown في الشحنات):
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="مثال: قطع غيار سيارات، مستلزمات طبية..."
                        value={newItemInput}
                        onChange={(e) => setNewItemInput(e.target.value)}
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1 shrink-0"
                      >
                        <PlusCircle className="h-4 w-4" /> إضافة صنف
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {customItems.map((item, idx) => (
                        <span
                          key={`${item}-${idx}`}
                          className="bg-indigo-50 text-indigo-800 border border-indigo-100 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1 font-semibold"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="hover:text-red-500 p-0.5 rounded-full"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-5">
                    <span className="text-sm font-bold text-slate-900 block">
                      تعاقد التسعير الموحّد (تخليص / عروض / نقل)
                    </span>
                    <ClientContractPricingEditor
                      key={editingClient?.id || 'create'}
                      getAuthToken={getAuthToken}
                      showToast={showToast}
                      value={contractDraft}
                      onChange={setContractDraft}
                    />
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-5">
                    <label className="text-xs font-bold text-slate-700">ملاحظات إضافية</label>
                    <textarea
                      rows={2}
                      placeholder="ملاحظات مخصصة عن شروط سداد العميل أو حساباته..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold"
                    >
                      إلغاء
                    </button>
                    <LoadingButton
                      type="submit"
                      isLoading={isSubmitting}
                      loadingText={editingClient ? 'جاري تحديث بيانات العميل...' : 'جاري حفظ وتسجيل العميل...'}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/10"
                    >
                      {editingClient ? 'حفظ التعديلات' : 'حفظ وتسجيل'}
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
