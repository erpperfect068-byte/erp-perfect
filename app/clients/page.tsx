'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import PermissionGuard from '../../components/PermissionGuard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { LoadingButton } from '../../components/LoadingButton';
import { motion } from 'motion/react';
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Receipt,
  MapPin,
  ClipboardList,
  DollarSign,
  Briefcase,
  X,
  PlusCircle,
  Trash2,
  Coins
} from 'lucide-react';

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

export default function ClientsPage() {
  const { getAuthToken, hasPermission } = useAuth();
  const { showToast } = useToast();

  const canCreateClient = hasPermission('clients.create');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Client Form States
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Form custom items
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState('');

  // Form pricing rules
  const [pricingRules, setPricingRules] = useState<Array<{ serviceName: string; price: number; currency: string }>>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');
  const [newServiceCurrency, setNewServiceCurrency] = useState('EGP');

  async function loadClients() {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
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

  const handleAddItem = () => {
    if (newItemInput.trim()) {
      setCustomItems([...customItems, newItemInput.trim()]);
      setNewItemInput('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setCustomItems(customItems.filter((_, idx) => idx !== index));
  };

  const handleAddPricing = () => {
    if (newServiceName.trim() && newServicePrice !== '') {
      setPricingRules([
        ...pricingRules,
        {
          serviceName: newServiceName.trim(),
          price: Number(newServicePrice),
          currency: newServiceCurrency
        }
      ]);
      setNewServiceName('');
      setNewServicePrice('');
    }
  };

  const handleRemovePricing = (index: number) => {
    setPricingRules(pricingRules.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast('اسم العميل مطلوب', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          contactPerson,
          phone,
          email,
          address,
          taxNumber,
          notes,
          items: customItems,
          pricing: pricingRules
        })
      });

      if (res.ok) {
        showToast('تم تسجيل العميل بنجاح', 'success');
        setIsModalOpen(false);
        // Reset form
        setName('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setAddress('');
        setTaxNumber('');
        setNotes('');
        setCustomItems([]);
        setPricingRules([]);
        // Reload list
        loadClients();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'فشل حفظ بيانات العميل', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم أثناء التسجيل', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <PermissionGuard requiredPermission={["clients.view", "clients.create"]} pageTitle="إدارة العملاء والأسعار">
      <SidebarLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة العملاء والأسعار</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              أضف العملاء وعرّف أصناف بضائعهم المسجلة في الجمارك واتفاقيات تسعير الخدمات المتفق عليها.
            </p>
          </div>
          {canCreateClient && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-5 rounded-2xl shadow-lg shadow-indigo-600/10 transition-colors shrink-0"
            >
              <Plus className="h-5 w-5" />
              إضافة عميل جديد
            </button>
          )}
        </div>

        {/* Filter Bar */}
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

        {/* Clients List Workspace */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-white border border-slate-200 animate-pulse rounded-2xl p-6 space-y-4">
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                <div className="h-20 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">لا يوجد عملاء مسجلين</h3>
            <p className="text-sm text-slate-500 mt-2">ابدأ بإدخال أول عميل وتخصيص أسعاره المعتمدة لمكتبك.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 font-bold px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100/60"
            >
              تسجيل عميل الآن <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-200"
              >
                {/* Client Meta card */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{client.name}</h3>
                        {client.contactPerson && (
                          <p className="text-xs text-slate-500 mt-0.5">الشخص المسؤول: {client.contactPerson}</p>
                        )}
                      </div>
                    </div>
                    {client.taxNumber && (
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-indigo-100">
                        بطاقة ضريبية: {client.taxNumber}
                      </span>
                    )}
                  </div>

                  {/* Basic Contacts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-50 text-xs text-slate-600">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  {client.items.length > 0 && (
                    <div className="mt-5">
                      <span className="text-xs font-bold text-slate-500 block">أصناف بضائع المستورد:</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {client.items.map((item) => (
                          <span
                            key={item.id}
                            className="bg-slate-100/80 border border-slate-200 text-slate-800 text-[11px] px-2.5 py-1 rounded-lg font-medium"
                          >
                            {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tariffs List */}
                  {client.pricing.length > 0 && (
                    <div className="mt-5">
                      <span className="text-xs font-bold text-slate-500 block">اتفاقيات التسعير المخصصة:</span>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {client.pricing.map((priceRule) => (
                          <div
                            key={priceRule.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/60 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs text-slate-700 font-medium truncate">{priceRule.serviceName}</span>
                            <span className="text-xs font-black text-indigo-600 shrink-0">
                              {parseFloat(priceRule.price).toLocaleString()} {priceRule.currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {client.notes && (
                  <div className="mt-5 p-3 rounded-xl bg-amber-50/40 border border-amber-100/60 text-xs text-amber-800 leading-relaxed font-light">
                    {client.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Client Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-xl font-bold text-slate-900">تسجيل بيانات عميل جديد</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {/* Basic Details */}
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

                {/* Custom Items adding section */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <span className="text-sm font-bold text-slate-900 block">إضافة أصناف بضائع العميل (dropdown في الشحنات):</span>
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
                        key={idx}
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

                {/* Custom pricing agreements section */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <span className="text-sm font-bold text-slate-900 block">اتفاقية تسعير رسوم الخدمات (اختياري):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="اسم الخدمة (مثال: أتعاب التخليص)"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        placeholder="السعر"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value !== '' ? Number(e.target.value) : '')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={newServiceCurrency}
                        onChange={(e) => setNewServiceCurrency(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddPricing}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1"
                      >
                        <PlusCircle className="h-4 w-4" /> أضف
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    {pricingRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold">{rule.serviceName}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-indigo-600">
                            {rule.price.toLocaleString()} {rule.currency}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePricing(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    loadingText="جاري حفظ وتسجيل العميل..."
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/10"
                  >
                    حفظ وتسجيل
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
