'use client';

import React, { useEffect, useRef, useState } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import PermissionGuard from '@/components/PermissionGuard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import {
  MetricCardSkeleton,
  CardSkeleton,
  TableSkeleton,
} from '@/components/ui/Skeleton';
import ContractorInvoiceSheet from '@/components/contractors/ContractorInvoiceSheet';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Pencil,
  Eye,
  X,
  FileCheck,
  ArrowRight,
  FileUp,
  ShieldAlert,
  Wallet,
  Receipt,
  Check,
  Filter,
  ChevronDown,
} from 'lucide-react';

interface BankAccount {
  id: string;
  contractor_id: string;
  bank_name: string;
  account_number: string;
  iban?: string | null;
  account_holder?: string | null;
  is_default: boolean;
  notes?: string | null;
}

interface ContractorRate {
  id: string;
  contractor_id: string;
  zone_name: string;
  container_type: string;
  price: number;
  currency: string;
  notes?: string | null;
}

interface Contractor {
  id: string;
  name: string;
  tax_number?: string | null;
  taxNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  bankAccounts?: BankAccount[];
  rates?: ContractorRate[];
  unpaidInvoicesCount?: number;
  totalOutstandingDebt?: number;
}

interface ShipmentOption {
  id: string;
  clientId?: string;
  bolNumber?: string | null;
  bol_number?: string;
  billOfLadingNumber?: string;
  bill_of_lading_number?: string;
  acid?: string | null;
  declarationNumber46?: string | null;
  declaration_number_46?: string;
  certificateNumber?: string;
  certificate_number?: string;
  client?: { id?: string; name: string } | null;
}

interface InvoiceItem {
  id?: string;
  itemType: string;
  description: string;
  amount: number;
  attachmentUrl?: string | null;
}

interface ContractorInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  status: 'pending' | 'approved' | 'partially_paid' | 'paid' | 'cancelled';
  approvedAt?: string | null;
  approvedBy?: string | null;
  notes?: string | null;
  contractorId: string;
  contractor?: {
    id: string;
    name: string;
    phone?: string;
    tax_number?: string;
    bank_accounts?: BankAccount[];
  };
  shipmentId: string;
  shipment?: {
    id: string;
    bol_number?: string;
    bill_of_lading_number?: string;
    declaration_number_46?: string;
    certificate_number?: string;
    client?: { name: string };
  };
  items?: InvoiceItem[];
  createdAt: string;
}

interface TreasuryOption {
  id: string;
  name: string;
  type: string;
  balances?: { EGP: number; USD: number; EUR: number };
}

/** Module-level so Date.now is not called during component render (React purity). */
function createTimedRef(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

const EMPTY_CONTRACTOR_FORM = {
  name: '',
  taxNumber: '',
  phone: '',
  address: '',
  notes: '',
};

const EMPTY_BANK_FORM = {
  bankName: '',
  accountNumber: '',
  iban: '',
  accountHolder: '',
  isDefault: false,
  notes: '',
};

const EMPTY_RATE_FORM = {
  zoneName: '',
  containerType: 'general',
  price: '',
  notes: '',
};

const EMPTY_PAY_FORM = {
  treasuryId: '',
  bankAccountId: '',
  amount: '',
  referenceNumber: '',
  notes: '',
};

export default function ContractorsPage() {
  const { getAuthToken, hasPermission, dbUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'contractors' | 'invoices' | 'debts'>('contractors');
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [treasuries, setTreasuries] = useState<TreasuryOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state — draft keys keep form data across close/reopen of the same context
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [contractorDraftKey, setContractorDraftKey] = useState<string | null>(null);
  const [contractorFormData, setContractorFormData] = useState({ ...EMPTY_CONTRACTOR_FORM });

  // Bank Accounts Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [selectedContractorForBank, setSelectedContractorForBank] = useState<Contractor | null>(null);
  const [bankDraftKey, setBankDraftKey] = useState<string | null>(null);
  const [bankFormData, setBankFormData] = useState({ ...EMPTY_BANK_FORM });

  // Rates Modal
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [selectedContractorForRates, setSelectedContractorForRates] = useState<Contractor | null>(null);
  const [ratesDraftKey, setRatesDraftKey] = useState<string | null>(null);
  const [rateFormData, setRateFormData] = useState({ ...EMPTY_RATE_FORM });

  // Invoices Modal (create header only)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceDraftKey, setInvoiceDraftKey] = useState<string | null>(null);
  const [invoiceFormData, setInvoiceFormData] = useState({
    contractorId: '',
    shipmentId: '',
    invoiceNumber: '',
    invoiceDate: '',
    notes: '',
  });

  // Invoice paper sheet
  const [viewingInvoice, setViewingInvoice] = useState<ContractorInvoice | null>(null);

  // Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<ContractorInvoice | null>(null);
  const [payDraftKey, setPayDraftKey] = useState<string | null>(null);
  const [payFormData, setPayFormData] = useState({ ...EMPTY_PAY_FORM });

  const [submitting, setSubmitting] = useState(false);

  // Card accordion: one open bank section and one open rates section at a time
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [expandedRatesId, setExpandedRatesId] = useState<string | null>(null);
  const bankAccordionRef = useRef<HTMLDivElement | null>(null);
  const ratesAccordionRef = useRef<HTMLDivElement | null>(null);

  // Permissions
  const canCreateContractor = hasPermission('contractors.create');
  const canUpdateContractor = hasPermission('contractors.update');
  const canDeleteContractor = hasPermission('contractors.delete');
  const canManageRates = hasPermission('contractors.pricing') || canUpdateContractor;
  const canCreateInvoice = hasPermission('contractors.invoices_create');
  const canEditInvoice = hasPermission('contractors.invoices_edit');
  const canDeleteInvoice = hasPermission('contractors.invoices_delete');
  const canApproveInvoice = hasPermission('contractors.invoices_approve');
  const canPay = hasPermission('contractors.pay');

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [resCont, resInv, resShip, resTreas] = await Promise.all([
        fetch('/api/contractors', { headers }),
        fetch('/api/contractor-invoices', { headers }),
        fetch('/api/shipments', { headers }),
        fetch('/api/treasuries', { headers }),
      ]);

      if (resCont.ok) {
        const d = await resCont.json();
        setContractors(d.contractors || []);
      }
      if (resInv.ok) {
        const d = await resInv.json();
        setInvoices(d.invoices || []);
      }
      if (resShip.ok) {
        const d = await resShip.json();
        setShipments(Array.isArray(d) ? d : d.shipments || []);
      }
      if (resTreas.ok) {
        const d = await resTreas.json();
        setTreasuries(d.treasuries || []);
      }
    } catch (err: any) {
      console.error(err);
      showToast('خطأ أثناء تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!expandedBankId && !expandedRatesId) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (expandedBankId && bankAccordionRef.current && !bankAccordionRef.current.contains(target)) {
        setExpandedBankId(null);
      }
      if (expandedRatesId && ratesAccordionRef.current && !ratesAccordionRef.current.contains(target)) {
        setExpandedRatesId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [expandedBankId, expandedRatesId]);

  // --- Contractor CRUD Handlers ---
  const handleOpenContractorModal = (c?: Contractor) => {
    const nextKey = c ? c.id : 'create';
    if (contractorDraftKey !== nextKey) {
      if (c) {
        setEditingContractor(c);
        setContractorFormData({
          name: c.name || '',
          taxNumber: c.tax_number || c.taxNumber || '',
          phone: c.phone || '',
          address: c.address || '',
          notes: c.notes || '',
        });
      } else {
        setEditingContractor(null);
        setContractorFormData({ ...EMPTY_CONTRACTOR_FORM });
      }
      setContractorDraftKey(nextKey);
    } else if (c) {
      setEditingContractor(c);
    }
    setIsContractorModalOpen(true);
  };

  const handleSaveContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorFormData.name.trim()) {
      showToast('اسم المقاول مطلوب', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const url = editingContractor ? `/api/contractors/${editingContractor.id}` : '/api/contractors';
      const method = editingContractor ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contractorFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشلت العملية');

      showToast(data.message || 'تم حفظ المقاول بنجاح', 'success');
      setIsContractorModalOpen(false);
      setContractorDraftKey(null);
      setEditingContractor(null);
      setContractorFormData({ ...EMPTY_CONTRACTOR_FORM });
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContractor = async (c: Contractor) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف المقاول (${c.name})؟`)) return;

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/contractors/${c.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف المقاول');

      showToast(data.message || 'تم حذف المقاول بنجاح', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Bank Accounts CRUD ---
  const handleOpenBankModal = (c: Contractor) => {
    setSelectedContractorForBank(c);
    if (bankDraftKey !== c.id) {
      setBankFormData({
        ...EMPTY_BANK_FORM,
        isDefault: (c.bankAccounts || []).length === 0,
      });
      setBankDraftKey(c.id);
    }
    setIsBankModalOpen(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractorForBank) return;
    if (!bankFormData.bankName.trim() || !bankFormData.accountNumber.trim()) {
      showToast('اسم البنك ورقم الحساب مطلوبان', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/contractors/${selectedContractorForBank.id}/bank-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bankFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة الحساب البنكي');

      showToast('تمت إضافة الحساب البنكي بنجاح', 'success');
      setBankFormData({ ...EMPTY_BANK_FORM });
      // Refresh
      const refCont = await fetch(`/api/contractors/${selectedContractorForBank.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refCont.ok) {
        const d = await refCont.json();
        setSelectedContractorForBank(d.contractor);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshSelectedBankContractor = async (token: string) => {
    if (!selectedContractorForBank) return;
    const refCont = await fetch(`/api/contractors/${selectedContractorForBank.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (refCont.ok) {
      const d = await refCont.json();
      setSelectedContractorForBank(d.contractor);
    }
    loadData();
  };

  const handleSetDefaultBankAccount = async (accountId: string) => {
    if (!selectedContractorForBank) return;

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      if (!token) throw new Error('جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى');

      const res = await fetch(`/api/contractors/${selectedContractorForBank.id}/bank-accounts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accountId, isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تعيين الحساب الرئيسي');

      showToast('تم تعيين الحساب الرئيسي بنجاح', 'success');
      await refreshSelectedBankContractor(token);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    if (!selectedContractorForBank) return;
    if (!confirm('هل أنت متأكد من حذف هذا الحساب البنكي؟')) return;

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('جلسة غير صالحة، يرجى تسجيل الدخول مرة أخرى');

      const res = await fetch(
        `/api/contractors/${selectedContractorForBank.id}/bank-accounts?accountId=${accountId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الحساب');

      showToast('تم حذف الحساب البنكي', 'success');
      await refreshSelectedBankContractor(token);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // --- Rates CRUD ---
  const handleOpenRateModal = (c: Contractor) => {
    setSelectedContractorForRates(c);
    if (ratesDraftKey !== c.id) {
      setRateFormData({ ...EMPTY_RATE_FORM });
      setRatesDraftKey(c.id);
    }
    setIsRateModalOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractorForRates) return;
    if (!rateFormData.zoneName.trim() || !rateFormData.price) {
      showToast('يرجى تحديد المنطقة وسعر النقل', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/contractors/${selectedContractorForRates.id}/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(rateFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة التسعيرة');

      showToast('تم إضافة تسعيرة المنطقة بنجاح', 'success');
      setRateFormData({ ...EMPTY_RATE_FORM });
      // Refresh
      const refCont = await fetch(`/api/contractors/${selectedContractorForRates.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refCont.ok) {
        const d = await refCont.json();
        setSelectedContractorForRates(d.contractor);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!selectedContractorForRates) return;
    if (!confirm('هل تريد حذف تسعيرة هذه المنطقة؟')) return;

    try {
      const token = await getAuthToken();
      const res = await fetch(
        `/api/contractors/${selectedContractorForRates.id}/rates?rateId=${rateId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف التسعيرة');

      showToast('تم حذف التسعيرة', 'success');
      const refCont = await fetch(`/api/contractors/${selectedContractorForRates.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refCont.ok) {
        const d = await refCont.json();
        setSelectedContractorForRates(d.contractor);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // --- Invoices Handlers ---
  const handleOpenInvoiceModal = () => {
    const nextKey = 'create';
    if (invoiceDraftKey !== nextKey) {
      setInvoiceFormData({
        contractorId: contractors[0]?.id || '',
        shipmentId: shipments[0]?.id || '',
        invoiceNumber: createTimedRef('INV'),
        invoiceDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setInvoiceDraftKey(nextKey);
    }
    setIsInvoiceModalOpen(true);
  };

  const handleInvoiceSheetUpdated = (updated: ContractorInvoice) => {
    setViewingInvoice(updated);
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? { ...inv, ...updated } : inv)));
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.contractorId) return showToast('يرجى تحديد المقاول', 'warning');
    if (!invoiceFormData.shipmentId) return showToast('يرجى ربط الشحنة بالبوليصة', 'warning');
    if (!invoiceFormData.invoiceNumber.trim()) return showToast('رقم الفاتورة مطلوب', 'warning');

    try {
      setSubmitting(true);
      const token = await getAuthToken();

      const res = await fetch('/api/contractor-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...invoiceFormData, items: [] }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الفاتورة');

      showToast(data.message || 'تم تسجيل الفاتورة — أضف البنود من ورقة الفاتورة', 'success');
      setIsInvoiceModalOpen(false);
      setInvoiceDraftKey(null);
      await loadData();

      if (data.invoice) {
        setViewingInvoice(data.invoice as ContractorInvoice);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Invoice (Locks and registers as company debt)
  const handleApproveInvoice = async (inv: ContractorInvoice) => {
    if (!confirm(`هل أنت متأكد من اعتماد وإقفال فاتورة المقاول (${inv.invoiceNumber}) بقيمة (${inv.totalAmount.toLocaleString('ar-EG')} ج.م)؟\nسيتم إدراجها كدين مستحق واجب السداد في الخزينة.`)) {
      return;
    }

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/contractor-invoices/${inv.id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل اعتماد الفاتورة');

      showToast(data.message || 'تم اعتماد الفاتورة وإدراجها كدين', 'success');
      loadData();
      if (viewingInvoice?.id === inv.id) setViewingInvoice(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (inv: ContractorInvoice) => {
    if (!confirm(`هل أنت متأكد من حذف فاتورة المقاول رقم (${inv.invoiceNumber})؟`)) return;

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/contractor-invoices/${inv.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الفاتورة');

      showToast('تم حذف الفاتورة بنجاح', 'success');
      loadData();
      if (viewingInvoice?.id === inv.id) setViewingInvoice(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Pay Modal Handlers ---
  const handleOpenPayModal = (inv: ContractorInvoice) => {
    setPayingInvoice(inv);
    if (payDraftKey !== inv.id) {
      const contractor = contractors.find((c) => c.id === inv.contractorId);
      const defaultAcc = (contractor?.bankAccounts || []).find((b) => b.is_default) || contractor?.bankAccounts?.[0];

      setPayFormData({
        treasuryId: treasuries[0]?.id || '',
        bankAccountId: defaultAcc?.id || '',
        amount: String(inv.remainingAmount || inv.totalAmount),
        referenceNumber: createTimedRef('TRF'),
        notes: `تحويل مستحقات مقاول - فاتورة رقم ${inv.invoiceNumber}`,
      });
      setPayDraftKey(inv.id);
    }
    setIsPayModalOpen(true);
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    if (!payFormData.treasuryId) return showToast('يرجى تحديد الخزنة', 'warning');
    if (!payFormData.bankAccountId) return showToast('يرجى اختيار الحساب البنكي للمقاول', 'warning');
    if (!payFormData.amount || Number(payFormData.amount) <= 0) return showToast('المبلغ غير صالح', 'warning');

    try {
      setSubmitting(true);
      const token = await getAuthToken();
      const res = await fetch(`/api/contractor-invoices/${payingInvoice.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل سداد الفاتورة');

      showToast(data.message || 'تم سداد الفاتورة بنجاح', 'success');
      setIsPayModalOpen(false);
      setPayingInvoice(null);
      setPayDraftKey(null);
      setPayFormData({ ...EMPTY_PAY_FORM });
      if (viewingInvoice?.id === payingInvoice.id) setViewingInvoice(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtering
  const filteredContractors = contractors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.taxNumber || '').includes(searchQuery) ||
      (c.phone || '').includes(searchQuery)
  );

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.contractor?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.shipment?.bol_number || inv.shipment?.bill_of_lading_number || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const approvedDebts = invoices.filter((inv) => ['approved', 'partially_paid'].includes(inv.status));
  const totalOutstandingDebts = approvedDebts.reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0);

  return (
    <PermissionGuard
      requiredPermission={['contractors.view', 'contractors.create', 'contractors.invoices_view']}
      pageTitle="مقـاولو النقل والتفريغ"
    >
      <SidebarLayout>
        <div className="space-y-6 pb-12" dir="rtl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                  <Truck className="h-5 w-5" />
                </div>
                إدارة مقاولي النقل والخدمات
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                تسجيل بيانات المقاولين، الحسابات البنكية المتعددة، عروض أسعار المناطق، وفواتير المصروفات المرتبطة بالشحنات مع دورة الديون والخزينة.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {canCreateContractor && (
                <button
                  type="button"
                  onClick={() => handleOpenContractorModal()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  إضافة مقاول جديد
                </button>
              )}

              {canCreateInvoice && (
                <button
                  type="button"
                  onClick={() => handleOpenInvoiceModal()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  <FileUp className="h-4 w-4" />
                  تسجيل فاتورة مقاول
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {loading ? (
              <>
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
              </>
            ) : (
              <>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block">إجمالي المقاولين المسجلين</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1">{contractors.length}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Truck className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block">فواتير قيد المراجعة</span>
                    <span className="text-2xl font-black text-amber-600 block mt-1">
                      {invoices.filter((i) => i.status === 'pending').length}
                    </span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-700 block">إجمالي الديون المعتمدة المستحقة</span>
                    <span className="text-xl font-black text-rose-700 block mt-1">
                      {totalOutstandingDebts.toLocaleString('ar-EG')} ج.م
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">على {approvedDebts.length} فواتير معتمدة</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-md shadow-rose-200">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('contractors')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'contractors'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Truck className="h-4 w-4" />
              دليل المقاولين والحسابات ({contractors.length})
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'invoices'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <Receipt className="h-4 w-4" />
              سجل فواتير المصروفات ({invoices.length})
            </button>

            <button
              onClick={() => setActiveTab('debts')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'debts'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              الديون المستحقة للسداد ({approvedDebts.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم، الرقم الضريبي، رقم البوليصة، أو رقم الفاتورة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* TAB 1: Contractors List */}
          {activeTab === 'contractors' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
              ) : filteredContractors.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-300 rounded-3xl">
                  <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700">لا يوجد مقاولين مسجلين</p>
                  <p className="text-xs text-slate-400 mt-1">ابدأ بإضافة أول مقاول نقل أو خدمات لتسجيل بياناته وحساباته.</p>
                </div>
              ) : (
                filteredContractors.map((c) => {
                  const defaultBank = (c.bankAccounts || []).find((b) => b.is_default) || c.bankAccounts?.[0];
                  return (
                    <div
                      key={c.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Bar */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-black text-slate-900">{c.name}</h3>
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                              الرقم الضريبي: {c.tax_number || c.taxNumber || 'غير مسجل'}
                            </span>
                          </div>

                          {c.totalOutstandingDebt && c.totalOutstandingDebt > 0 ? (
                            <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-black">
                              مستحق: {c.totalOutstandingDebt.toLocaleString('ar-EG')} ج.م
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold">
                              خالص الديون
                            </span>
                          )}
                        </div>

                        {/* Contact & Details */}
                        <div className="space-y-1.5 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{c.phone || 'لا يوجد هاتف'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.address || 'العنوان غير محدد'}</span>
                          </div>
                        </div>

                        {/* Bank Accounts Summary */}
                        {(() => {
                          const bankAccounts = c.bankAccounts || [];
                          const canExpandBanks = bankAccounts.length > 1;
                          const banksExpanded = expandedBankId === c.id;
                          return (
                            <div
                              ref={banksExpanded ? bankAccordionRef : undefined}
                              className={`mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl ${
                                canExpandBanks ? 'cursor-pointer select-none' : ''
                              }`}
                              onClick={() => {
                                if (!canExpandBanks) return;
                                setExpandedBankId((prev) => (prev === c.id ? null : c.id));
                              }}
                              role={canExpandBanks ? 'button' : undefined}
                              aria-expanded={canExpandBanks ? banksExpanded : undefined}
                            >
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                                <span className="flex items-center gap-1.5">
                                  <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                                  الحساب البنكي الرئيسي
                                </span>
                                <span className="text-[10px] text-indigo-600 font-mono flex items-center gap-1">
                                  {bankAccounts.length} حسابات
                                  {canExpandBanks && (
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform ${banksExpanded ? 'rotate-180' : ''}`}
                                    />
                                  )}
                                </span>
                              </div>
                              {banksExpanded && canExpandBanks ? (
                                <div className="space-y-2 mt-1">
                                  {bankAccounts.map((acc) => (
                                    <div key={acc.id} className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/80 first:border-0 first:pt-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800">{acc.bank_name}</span>
                                        {acc.is_default && (
                                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                                            رئيسي
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-mono text-slate-700 block mt-0.5">{acc.account_number}</span>
                                      {acc.account_holder && (
                                        <span className="block text-[10px] text-slate-400 mt-0.5">
                                          باسم: {acc.account_holder}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : defaultBank ? (
                                <div className="text-[11px] text-slate-600">
                                  <span className="font-bold text-slate-800">{defaultBank.bank_name}</span> -{' '}
                                  <span className="font-mono text-slate-700">{defaultBank.account_number}</span>
                                  {defaultBank.account_holder && (
                                    <span className="block text-[10px] text-slate-400 mt-0.5">
                                      باسم: {defaultBank.account_holder}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">لم يتم ربط حساب بنكي بعد</span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Rates Summary */}
                        {(() => {
                          const rates = c.rates || [];
                          const canExpandRates = rates.length > 1;
                          const ratesExpanded = expandedRatesId === c.id;
                          return (
                            <div
                              ref={ratesExpanded ? ratesAccordionRef : undefined}
                              className={`mt-2 text-[11px] text-slate-500 px-1 ${
                                canExpandRates ? 'cursor-pointer select-none' : ''
                              }`}
                              onClick={() => {
                                if (!canExpandRates) return;
                                setExpandedRatesId((prev) => (prev === c.id ? null : c.id));
                              }}
                              role={canExpandRates ? 'button' : undefined}
                              aria-expanded={canExpandRates ? ratesExpanded : undefined}
                            >
                              <div className="flex items-center justify-between">
                                <span>عروض أسعار المناطق المسجلة:</span>
                                <span className="font-bold text-slate-800 font-mono flex items-center gap-1">
                                  {rates.length} مناطق
                                  {canExpandRates && (
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 text-slate-500 transition-transform ${ratesExpanded ? 'rotate-180' : ''}`}
                                    />
                                  )}
                                </span>
                              </div>
                              {ratesExpanded && canExpandRates && (
                                <div className="mt-2 space-y-1.5">
                                  {rates.map((r) => (
                                    <div
                                      key={r.id}
                                      className="flex items-center justify-between gap-2 py-1.5 px-2 bg-slate-50 border border-slate-100 rounded-lg text-[11px]"
                                    >
                                      <div className="min-w-0">
                                        <span className="font-bold text-slate-800 block truncate">{r.zone_name}</span>
                                        <span className="text-[10px] text-slate-400">{r.container_type}</span>
                                      </div>
                                      <span className="font-mono font-bold text-slate-800 shrink-0">
                                        {Number(r.price).toLocaleString('ar-EG')} {r.currency || 'ج.م'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Actions Menu */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenBankModal(c)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            الحسابات
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenRateModal(c)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            الأسعار
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {canUpdateContractor && (
                            <button
                              type="button"
                              onClick={() => handleOpenContractorModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="تعديل بيانات المقاول"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}

                          {canDeleteContractor && (
                            <button
                              type="button"
                              onClick={() => handleDeleteContractor(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف المقاول"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Invoices List */}
          {activeTab === 'invoices' && (
            loading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-3.5 px-4">رقم الفاتورة والتاريخ</th>
                      <th className="py-3.5 px-4">المقاول</th>
                      <th className="py-3.5 px-4">الشحنة (رقم البوليصة)</th>
                      <th className="py-3.5 px-4">إجمالي المبلغ</th>
                      <th className="py-3.5 px-4">المدفوع / المتبقي</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block font-mono">{inv.invoiceNumber}</span>
                          <span className="text-[11px] text-slate-400">{inv.invoiceDate}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          {inv.contractor?.name || 'مقاول غير معروف'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-indigo-700 block font-mono">
                            بوليصة: {inv.shipment?.bol_number || inv.shipment?.bill_of_lading_number || 'بدون'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            عميل: {inv.shipment?.client?.name || 'عام'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-slate-900 font-mono">
                          {inv.totalAmount.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-emerald-700 font-bold block">
                            سُدد: {inv.paidAmount.toLocaleString('ar-EG')} ج.م
                          </span>
                          {inv.remainingAmount > 0 ? (
                            <span className="text-rose-600 font-bold text-[11px] block">
                              متبقي: {inv.remainingAmount.toLocaleString('ar-EG')} ج.م
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">خالص بالكامل</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {inv.status === 'pending' && (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              قيد المراجعة
                            </span>
                          )}
                          {inv.status === 'approved' && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              معتمدة (دين مستحق)
                            </span>
                          )}
                          {inv.status === 'partially_paid' && (
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              مدفوعة جزئياً
                            </span>
                          )}
                          {inv.status === 'paid' && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              مدفوعة بالكامل
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="عرض تفاصيل الفاتورة والمرفقات"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            {/* Approve button if pending */}
                            {inv.status === 'pending' && canApproveInvoice && (
                              <button
                                type="button"
                                onClick={() => handleApproveInvoice(inv)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm"
                                title="اعتماد وإقفال الفاتورة وإدراجها كدين"
                              >
                                اعتماد الفاتورة
                              </button>
                            )}

                            {/* Pay button if approved or partially paid */}
                            {['approved', 'partially_paid'].includes(inv.status) && canPay && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(inv)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1"
                                title="سداد الفاتورة والتحويل من الخزينة"
                              >
                                <Wallet className="h-3 w-3" />
                                سداد
                              </button>
                            )}

                            {inv.status !== 'paid' && canDeleteInvoice && (
                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                                title="حذف الفاتورة"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          لا توجد فواتير مصروفات مسجلة للمقاولين
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )
          )}

          {/* TAB 3: Debts & Payables */}
          {activeTab === 'debts' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-900">
                      قائمة التزامات وديون المقاولين المعتمدة الواجبة السداد
                    </h3>
                    <p className="text-xs text-rose-700 font-medium mt-0.5">
                      هذه الفواتير تم اعتمادها وإقفالها وتظهر كتنبيهات حية في إدارة الخزينة للسداد المباشر.
                    </p>
                  </div>
                </div>
                <div className="text-left font-mono">
                  <span className="text-xs text-rose-600 block">إجمالي المستحق الدفع:</span>
                  <span className="text-xl font-black text-rose-800">
                    {totalOutstandingDebts.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
                ) : approvedDebts.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">لا توجد ديون مستحقة للمقاولين حالياً</p>
                    <p className="text-xs text-slate-400 mt-1">جميع الفواتير المعتمدة مسددة بالكامل أو قيد المراجعة.</p>
                  </div>
                ) : (
                  approvedDebts.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-400 block font-mono">
                              فاتورة: {inv.invoiceNumber}
                            </span>
                            <h4 className="text-base font-black text-slate-900 mt-0.5">
                              {inv.contractor?.name}
                            </h4>
                          </div>
                          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-black font-mono">
                            {inv.remainingAmount.toLocaleString('ar-EG')} ج.م
                          </span>
                        </div>

                        <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">رقم بوليصة الشحن:</span>
                            <span className="font-bold text-indigo-700 font-mono">
                              {inv.shipment?.bol_number || inv.shipment?.bill_of_lading_number || 'غير محدد'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">تاريخ الاعتماد:</span>
                            <span className="text-slate-700">
                              {inv.approvedAt ? new Date(inv.approvedAt).toLocaleDateString('ar-EG') : 'معتمد'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">الحساب البنكي المقترح:</span>
                            <span className="font-bold text-slate-800">
                              {inv.contractor?.bank_accounts?.[0]?.bank_name || 'يرجى تسجيل حساب'} (
                              {inv.contractor?.bank_accounts?.[0]?.account_number || ''})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setViewingInvoice(inv)}
                          className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          عرض البنود والمرفقات
                        </button>

                        {canPay && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(inv)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all"
                          >
                            <Wallet className="h-4 w-4" />
                            سداد وتحويل من الخزينة
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 1: Add / Edit Contractor */}
          {/* ========================================================= */}
          {isContractorModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-indigo-600" />
                    {editingContractor ? 'تعديل بيانات المقاول' : 'إضافة مقاول نقل وخدمات جديد'}
                  </h3>
                  <button
                    onClick={() => setIsContractorModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveContractor} className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">اسم المقاول / الشركة *</label>
                    <input
                      type="text"
                      required
                      value={contractorFormData.name}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, name: e.target.value })}
                      placeholder="مثال: شركة الفرسان للنقل الدولي"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">الرقم الضريبي</label>
                      <input
                        type="text"
                        value={contractorFormData.taxNumber}
                        onChange={(e) => setContractorFormData({ ...contractorFormData, taxNumber: e.target.value })}
                        placeholder="مثال: 123-456-789"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">رقم الهاتف للتواصل</label>
                      <input
                        type="text"
                        value={contractorFormData.phone}
                        onChange={(e) => setContractorFormData({ ...contractorFormData, phone: e.target.value })}
                        placeholder="010XXXXXXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">العنوان أو المقر</label>
                    <input
                      type="text"
                      value={contractorFormData.address}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, address: e.target.value })}
                      placeholder="مثال: ميناء الإسكندرية - باب 10"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
                    <textarea
                      rows={2}
                      value={contractorFormData.notes}
                      onChange={(e) => setContractorFormData({ ...contractorFormData, notes: e.target.value })}
                      placeholder="أي شروط تعاقدية أو أرقام سائقين..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsContractorModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100"
                    >
                      {submitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 2: Bank Accounts Management */}
          {/* ========================================================= */}
          {isBankModalOpen && selectedContractorForBank && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-indigo-600" />
                      الحسابات البنكية للمقاول: {selectedContractorForBank.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      يمكنك تسجيل أكثر من حساب بنكي يتم التحويل عليه من الخزينة.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsBankModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Existing Accounts List */}
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {(selectedContractorForBank.bankAccounts || []).map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{acc.bank_name}</span>
                          {acc.is_default && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                              رئيسي
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-slate-600 block mt-0.5">
                          رقم الحساب: {acc.account_number}
                        </span>
                        {acc.iban && <span className="text-[10px] font-mono text-slate-400 block">IBAN: {acc.iban}</span>}
                        {acc.account_holder && (
                          <span className="text-[10px] text-slate-500 block">الاسم: {acc.account_holder}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!acc.is_default && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultBankAccount(acc.id)}
                            disabled={submitting}
                            className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
                            title="تعيين كحساب رئيسي"
                          >
                            تعيين كرئيسي
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBankAccount(acc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          title="حذف هذا الحساب"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(selectedContractorForBank.bankAccounts || []).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">لا توجد حسابات بنكية مسجلة لهذا المقاول بعد.</p>
                  )}
                </div>

                {/* Add New Bank Account Form */}
                <form onSubmit={handleSaveBankAccount} className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-indigo-600" />
                    إضافة حساب بنكي جديد
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم البنك *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: البنك الأهلي المصري"
                        value={bankFormData.bankName}
                        onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم الحساب *</label>
                      <input
                        type="text"
                        required
                        placeholder="رقم الحساب البنكي"
                        value={bankFormData.accountNumber}
                        onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم صاحب الحساب</label>
                      <input
                        type="text"
                        placeholder="اسم المستفيد"
                        value={bankFormData.accountHolder}
                        onChange={(e) => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">رقم الآيبان (IBAN)</label>
                      <input
                        type="text"
                        placeholder="EG..."
                        value={bankFormData.iban}
                        onChange={(e) => setBankFormData({ ...bankFormData, iban: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={bankFormData.isDefault}
                      onChange={(e) => setBankFormData({ ...bankFormData, isDefault: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    تعيين كحساب افتراضي رئيسي للتحويل
                  </label>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                    >
                      {submitting ? 'جاري الإضافة...' : 'إضافة الحساب'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 3: Zone Rates Management */}
          {/* ========================================================= */}
          {isRateModalOpen && selectedContractorForRates && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                      عروض أسعار المناطق: {selectedContractorForRates.name}
                    </h3>
                    <span className="text-xs text-slate-400">
                      أسعار النقل المتفق عليها لكل منطقة/وجهة لتطبيقها تلقائياً على الشحنات.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsRateModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Existing Rates */}
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {(selectedContractorForRates.rates || []).map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{r.zone_name}</span>
                          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-mono">
                            {r.container_type === '20ft'
                              ? 'حاوية 20 قدم'
                              : r.container_type === '40ft'
                              ? 'حاوية 40 قدم'
                              : 'عام'}
                          </span>
                        </div>
                        {r.notes && <span className="text-[10px] text-slate-400 block mt-0.5">{r.notes}</span>}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-emerald-700 font-mono">
                          {r.price.toLocaleString('ar-EG')} ج.م
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRate(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(selectedContractorForRates.rates || []).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">لم يتم تسجيل أسعار مناطق لهذا المقاول بعد.</p>
                  )}
                </div>

                {/* Add Rate Form */}
                <form onSubmit={handleSaveRate} className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    إضافة سعر منطقة جديد
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">المنطقة / الوجهة *</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: إسكندرية - العاشر من رمضان"
                        value={rateFormData.zoneName}
                        onChange={(e) => setRateFormData({ ...rateFormData, zoneName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">نوع الحاوية</label>
                      <select
                        value={rateFormData.containerType}
                        onChange={(e) => setRateFormData({ ...rateFormData, containerType: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      >
                        <option value="general">عام / نقل عادي</option>
                        <option value="20ft">حاوية 20 قدم</option>
                        <option value="40ft">حاوية 40 قدم</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">السعر المتفق عليه (ج.م) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="مثال: 3500"
                        value={rateFormData.price}
                        onChange={(e) => setRateFormData({ ...rateFormData, price: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">ملاحظات الاتفاق</label>
                      <input
                        type="text"
                        placeholder="شامل المبيت، أو العتالة..."
                        value={rateFormData.notes}
                        onChange={(e) => setRateFormData({ ...rateFormData, notes: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                    >
                      {submitting ? 'جاري الإضافة...' : 'إضافة التسعيرة'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 4: Create / Edit Contractor Invoice */}
          {/* ========================================================= */}
          {isInvoiceModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileUp className="h-5 w-5 text-indigo-600" />
                    تسجيل فاتورة مصروفات جديدة لمقاول
                  </h3>
                  <button
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveInvoice} className="space-y-4 mt-4 overflow-y-auto pr-1 flex-1">
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                    تنشئ هذه الخطوة رأس الفاتورة المرتبطة بالبوليصة فقط. بعد الحفظ تُفتح ورقة الفاتورة لإضافة البنود والإيصالات.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">المقاول *</label>
                      <select
                        required
                        value={invoiceFormData.contractorId}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, contractorId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                      >
                        <option value="">اختر المقاول...</option>
                        {contractors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.tax_number ? `(${c.tax_number})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        الشحنة المرتبطة (رقم البوليصة) *
                      </label>
                      <select
                        required
                        value={invoiceFormData.shipmentId}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, shipmentId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                      >
                        <option value="">
                          {shipments.length === 0
                            ? 'لا توجد شحنات مسجلة — أضف شحنة من إدارة الشحنات أولاً'
                            : 'اختر الشحنة بالبوليصة...'}
                        </option>
                        {shipments.map((s) => {
                          const bol =
                            s.bolNumber ||
                            s.bol_number ||
                            s.billOfLadingNumber ||
                            s.bill_of_lading_number ||
                            s.acid ||
                            s.declarationNumber46 ||
                            s.declaration_number_46 ||
                            'بدون رقم';
                          const clientName = s.client?.name || 'عميل غير محدد';
                          return (
                            <option key={s.id} value={s.id}>
                              بوليصة: {bol} — العميل: {clientName}
                            </option>
                          );
                        })}
                      </select>
                      {shipments.length === 0 && (
                        <p className="text-[10px] text-amber-700 mt-1.5">
                          لا تظهر بوالص لأن قائمة الشحنات فارغة لهذه الشركة.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">رقم الفاتورة / المرجع *</label>
                      <input
                        type="text"
                        required
                        value={invoiceFormData.invoiceNumber}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceNumber: e.target.value })}
                        placeholder="INV-XXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">تاريخ الفاتورة</label>
                      <input
                        type="date"
                        required
                        value={invoiceFormData.invoiceDate}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoiceDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات الفاتورة</label>
                    <textarea
                      rows={2}
                      value={invoiceFormData.notes}
                      onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                      placeholder="أي ملاحظات حول الصرف أو المراجعة..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsInvoiceModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100"
                    >
                      {submitting ? 'جاري الحفظ...' : 'إنشاء الفاتورة وفتح الورقة'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* MODAL 5: Invoice paper sheet (view + manage items) */}
          {/* ========================================================= */}
          {viewingInvoice && (
            <ContractorInvoiceSheet
              invoice={viewingInvoice}
              getAuthToken={getAuthToken}
              canEdit={canEditInvoice}
              canApprove={canApproveInvoice}
              canPay={canPay}
              onClose={() => setViewingInvoice(null)}
              onUpdated={handleInvoiceSheetUpdated}
              onApprove={handleApproveInvoice}
              onPay={(inv) => {
                setViewingInvoice(null);
                handleOpenPayModal(inv as ContractorInvoice);
              }}
              showToast={showToast}
            />
          )}

          {/* ========================================================= */}
          {/* MODAL 6: Payout from Treasury */}
          {/* ========================================================= */}
          {isPayModalOpen && payingInvoice && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-indigo-600" />
                      سداد وتحويل مستحقات مقاول من الخزينة
                    </h3>
                    <span className="text-xs text-slate-400">
                      فاتورة رقم: {payingInvoice.invoiceNumber} | المقاول: {payingInvoice.contractor?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPayModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleExecutePayment} className="space-y-4 mt-4">
                  {/* Summary of Debt */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-amber-800 font-bold block">المبلغ المتبقي على الفاتورة:</span>
                      <span className="text-[11px] text-amber-700">شحنة بوليصة: {payingInvoice.shipment?.bol_number || payingInvoice.shipment?.bill_of_lading_number || 'بدون'}</span>
                    </div>
                    <span className="text-base font-black text-amber-900 font-mono">
                      {payingInvoice.remainingAmount.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      الخزنة المراد الصرف منها (نقدية أو بنكية) *
                    </label>
                    <select
                      required
                      value={payFormData.treasuryId}
                      onChange={(e) => setPayFormData({ ...payFormData, treasuryId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    >
                      <option value="">اختر الخزنة...</option>
                      {treasuries.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.type === 'bank' ? 'حساب بنكي' : 'خزنة كاش'}) - الرصيد:{' '}
                          {(t.balances?.EGP || 0).toLocaleString('ar-EG')} ج.م
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      الحساب البنكي للمقاول المحوّل إليه *
                    </label>
                    <select
                      required
                      value={payFormData.bankAccountId}
                      onChange={(e) => setPayFormData({ ...payFormData, bankAccountId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                    >
                      <option value="">اختر الحساب البنكي للمقاول...</option>
                      {payingInvoice.contractor?.bank_accounts?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bank_name} - رقم: {b.account_number} {b.account_holder ? `(${b.account_holder})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">المبلغ المراد سداده (ج.م) *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        max={payingInvoice.remainingAmount}
                        value={payFormData.amount}
                        onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">رقم الإشعار / التحويل البنكي</label>
                      <input
                        type="text"
                        value={payFormData.referenceNumber}
                        onChange={(e) => setPayFormData({ ...payFormData, referenceNumber: e.target.value })}
                        placeholder="TRF-XXXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">ملاحظات التحويل</label>
                    <input
                      type="text"
                      value={payFormData.notes}
                      onChange={(e) => setPayFormData({ ...payFormData, notes: e.target.value })}
                      placeholder="ملاحظات قيد السداد..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPayModalOpen(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100"
                    >
                      {submitting ? 'جاري التحويل وخصم الخزنة...' : 'تأكيد السداد والخصم'}
                    </button>
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
