'use client';

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Filter,
  User,
  Ship,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  RotateCcw,
  Trash2,
  Tag,
  Fingerprint
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  fingerprint?: number | null;
  role?: string;
}

interface Shipment {
  id: string;
  bolNumber: string | null;
  acid: string | null;
  client?: { name: string };
}

interface ExpenseType {
  id: string;
  name: string;
  category?: string;
}

interface CustodyExpense {
  id: string;
  custodyId: string;
  description: string;
  amount: number;
  currency: string;
  expenseType: string;
  receiptNumber: string | null;
  expenseDate: string;
  shipmentId: string | null;
  shipment: {
    id: string;
    bolNumber: string | null;
    acid: string | null;
    declarationNumber46: string | null;
    clientName: string;
  } | null;
  createdAt: string;
}

interface Custody {
  id: string;
  employeeId: string;
  employee: Employee | null;
  amount: number;
  totalIssued: number;
  totalSpent: number;
  remainingAmount: number;
  hasSettlementItem: boolean;
  currency: string;
  status: 'open' | 'closed';
  issuedDate: string;
  closedAt: string | null;
  expenses: CustodyExpense[];
  createdAt: string;
}

export default function CustodyPage() {
  const { getAuthToken, hasPermission, dbUser } = useAuth();
  const { showToast } = useToast();

  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [expenseTypesList, setExpenseTypesList] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [filterShipmentId, setFilterShipmentId] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [selectedCustody, setSelectedCustody] = useState<Custody | null>(null);

  // Issue Custody Form
  const [issueEmployeeId, setIssueEmployeeId] = useState('');
  const [issueAmount, setIssueAmount] = useState('');
  const [issueCurrency, setIssueCurrency] = useState('EGP');
  const [issueNotes, setIssueNotes] = useState('');

  // Add Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [expenseReceiptNo, setExpenseReceiptNo] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseShipmentId, setExpenseShipmentId] = useState('');

  // New Expense Type Form
  const [newTypeName, setNewTypeName] = useState('');

  // Printable Statement Modal
  const [printCustody, setPrintCustody] = useState<Custody | null>(null);

  const formatEmpName = (emp?: { name: string; fingerprint?: number | null } | null) => {
    if (!emp) return 'موظف';
    return emp.fingerprint ? `${emp.name}_${emp.fingerprint}` : emp.name;
  };

  async function loadData() {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Load custodies
      const custRes = await fetch('/api/custody', { headers });
      if (custRes.ok) setCustodies(await custRes.json());

      // Load employees (users)
      const empRes = await fetch('/api/users', { headers });
      if (empRes.ok) {
        const usersData = await empRes.json();
        const userList = Array.isArray(usersData) ? usersData : (usersData.users || []);
        setEmployees(userList.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          fingerprint: u.fingerprint,
          role: u.role,
        })));
      }

      // Load shipments
      const shipRes = await fetch('/api/shipments', { headers });
      if (shipRes.ok) setShipments(await shipRes.json());

      // Load dynamic expense types
      const typesRes = await fetch('/api/expense-types', { headers });
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setExpenseTypesList(typesData);
        if (typesData.length > 0 && !expenseType) {
          setExpenseType(typesData[0].name);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ أثناء تحميل بيانات العهد', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [getAuthToken]);

  // Handle Issue Custody
  const handleIssueCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueEmployeeId || !issueAmount || parseFloat(issueAmount) <= 0) {
      showToast('يرجى تحديد الموظف ومبلغ العهدة بشكل صحيح', 'warning');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/custody', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: issueEmployeeId,
          amount: parseFloat(issueAmount),
          currency: issueCurrency,
          notes: issueNotes || undefined,
        }),
      });

      if (res.ok) {
        showToast('تم صرف العهدة وتسجيل حركة السحب بالخزينة بنجاح', 'success');
        setIsIssueOpen(false);
        setIssueEmployeeId('');
        setIssueAmount('');
        setIssueNotes('');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل صرف العهدة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Handle Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustody || !expenseAmount || parseFloat(expenseAmount) <= 0) {
      showToast('يرجى كتابة مبلغ المصروف بشكل صحيح', 'warning');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/custody/expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          custodyId: selectedCustody.id,
          amount: parseFloat(expenseAmount),
          expenseType: expenseType || 'عام',
          receiptNumber: expenseReceiptNo || undefined,
          description: expenseDescription,
          expenseDate,
          shipmentId: expenseShipmentId || undefined,
        }),
      });

      if (res.ok) {
        showToast('تم تسجيل المصروف خصماً من العهدة وترحيله بنجاح', 'success');
        setIsExpenseOpen(false);
        setExpenseAmount('');
        setExpenseReceiptNo('');
        setExpenseDescription('');
        setExpenseShipmentId('');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل تسجيل المصروف', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Handle Create New Expense Type
  const handleCreateExpenseType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName || !newTypeName.trim()) return;

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/expense-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTypeName.trim() }),
      });

      if (res.ok) {
        const created = await res.json();
        showToast('تم إضافة نوع المصروف الجديد بنجاح', 'success');
        setIsAddTypeOpen(false);
        setNewTypeName('');
        setExpenseTypesList((prev) => [...prev, created]);
        setExpenseType(created.name);
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إضافة نوع المصروف', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Temporary Settlement Stage
  const handleTemporaryRefund = async (custody: Custody) => {
    if (custody.remainingAmount <= 0) {
      showToast('الرصيد المتبقي 0.00 بالفعل', 'info');
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/custody/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ custodyId: custody.id }),
      });

      if (res.ok) {
        showToast('تم إدراج بند تصفية العهدة مؤقتاً وسيعود الرصيد لـ 0.00', 'success');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إضافة بند التصفية', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Revert / Delete Settlement Expense Line
  const handleRevertSettlement = async (expenseId: string) => {
    if (!confirm('هل تريد إلغاء التصفية وحذف بند الاسترداد لإعادة فتح إمكانية تسجيل المصروفات؟')) {
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/custody/expense/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast('تم إلغاء التصفية وعودة الرصيد وإتاحة تسجيل المصروفات مجدداً', 'success');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إلغاء التصفية', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Final Close & Real Treasury Deposit
  const handleFinalCloseCustody = async (custody: Custody) => {
    if (!confirm('هل تريد إقفال وتصفية حساب العهدة النهائي وتوريد المتبقي فعلياً إلى الخزينة؟')) return;

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/custody/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ custodyId: custody.id }),
      });

      if (res.ok) {
        showToast('تم إقفال العهدة وتوريد المتبقي فعلياً للخزينة وتسجيل حركة الإيداع بنجاح', 'success');
        loadData();
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل إقفال العهدة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('خطأ بالخادم', 'error');
    }
  };

  // Filtered Custodies List
  const filteredCustodies = custodies.filter((c) => {
    if (filterEmployeeId && c.employeeId !== filterEmployeeId) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterShipmentId) {
      const hasShipmentExpense = c.expenses.some((e) => e.shipmentId === filterShipmentId);
      if (!hasShipmentExpense) return false;
    }
    if (filterFromDate) {
      const fromTime = new Date(filterFromDate).getTime();
      const custTime = new Date(c.issuedDate).getTime();
      if (custTime < fromTime) return false;
    }
    if (filterToDate) {
      const toTime = new Date(filterToDate).getTime() + 86400000;
      const custTime = new Date(c.issuedDate).getTime();
      if (custTime > toTime) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const empFormatted = formatEmpName(c.employee).toLowerCase();
      const hasMatchingExpense = c.expenses.some(
        (e) => e.description.toLowerCase().includes(q) || (e.receiptNumber || '').toLowerCase().includes(q)
      );
      if (!empFormatted.includes(q) && !c.amount.toString().includes(q) && !hasMatchingExpense) {
        return false;
      }
    }
    return true;
  });

  // Summary Metrics
  const totalActiveCustodies = custodies.filter((c) => c.status === 'open').length;
  const totalIssuedSum = custodies.reduce((sum, c) => sum + (c.totalIssued || 0), 0);
  const totalSpentSum = custodies.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const totalRemainingSum = custodies.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

  const canManageTypes = hasPermission('settings.manage') || dbUser?.role === 'admin';

  return (
    <SidebarLayout>
      <div className="space-y-6" dir="rtl">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة وعهد الموظفين وتصفيتها</h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              متابعة صرف العهد بأكواد البصمة، الخصم التلقائي من الخزينة، التصفية المرحلية والتراجع، والتوريد النهائي للخزينة.
            </p>
          </div>
          {(hasPermission('custody.create') || dbUser?.role === 'admin') && (
            <button
              onClick={() => setIsIssueOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-5 rounded-2xl shadow-lg shadow-indigo-600/10 transition-colors shrink-0"
            >
              <Plus className="h-5 w-5" />
              صرف عهدة جديدة لموظف
            </button>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">العهد النشطة حالياً</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-3">{totalActiveCustodies}</p>
            <span className="text-[11px] text-slate-400 font-medium">من أصل {custodies.length} عهدة كلياً</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">إجمالي العهد المصروفة</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-3">{totalIssuedSum.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span></p>
            <span className="text-[11px] text-slate-400 font-medium">حركات سحب بالخزينة</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">إجمالي المصروفات المسجلة</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-3">{totalSpentSum.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span></p>
            <span className="text-[11px] text-slate-400 font-medium">شحنات وعام</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">المتبقي المعلق بالعهد</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="h-5 w-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-3">{totalRemainingSum.toLocaleString()} <span className="text-xs text-slate-400 font-bold">ج.م</span></p>
            <span className="text-[11px] text-slate-400 font-medium">بانتظار الإيداع النهائي بالخزينة</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">فلاتر كشوفات ومراجعة العهد</h3>
            </div>
            {(filterEmployeeId || filterStatus !== 'all' || filterShipmentId || filterFromDate || filterToDate || searchQuery) && (
              <button
                onClick={() => {
                  setFilterEmployeeId('');
                  setFilterStatus('all');
                  setFilterShipmentId('');
                  setFilterFromDate('');
                  setFilterToDate('');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">بحث بالنص أو الإيصال</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="اسم الموظف، بيان المصروف، الإيصال..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">فلتر بالموظف (الاسم_البصمة)</label>
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none font-bold text-slate-800"
              >
                <option value="">جميع الموظفين</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{formatEmpName(emp)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">حالة العهدة</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="open">عهد نشطة (قيد التصفية)</option>
                <option value="closed">عهد مسواة ومغلقة</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">مصروفات شحنة معينة</label>
              <select
                value={filterShipmentId}
                onChange={(e) => setFilterShipmentId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              >
                <option value="">جميع الشحنات</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.bolNumber ? `بوليصة: ${s.bolNumber}` : `ACID: ${s.acid || s.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">من تاريخ</label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Custodies List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-white border border-slate-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredCustodies.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto">
            <Wallet className="h-12 w-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 mt-4">لا توجد عهد مالية مطابقة للفلاتر</h3>
            <p className="text-sm text-slate-500 mt-1">قم بصرف عهدة جديدة لموظف للبدء في تتبع مصروفاته.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCustodies.map((custody) => {
              const formattedDate = new Date(custody.issuedDate).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              // Condition to hide "+ تسجيل مصروف": If remainingAmount === 0 OR hasSettlementItem === true
              const isSettledOrZero = custody.hasSettlementItem || custody.remainingAmount === 0;

              return (
                <div
                  key={custody.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Custody Header */}
                  <div className="p-5 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 font-bold">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-900">{formatEmpName(custody.employee)}</h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              custody.status === 'open'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {custody.status === 'open' ? 'نشطة (قيد التصفية)' : 'مغلقة ومورّدة للخزينة'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">تاريخ الصرف: {formattedDate}</p>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block font-light text-[10px]">العهدة الأصلية</span>
                        <span className="font-black text-slate-900">{custody.totalIssued.toLocaleString()} {custody.currency}</span>
                      </div>

                      <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block font-light text-[10px]">المصروفات</span>
                        <span className="font-black text-blue-600">{custody.totalSpent.toLocaleString()} {custody.currency}</span>
                      </div>

                      <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block font-light text-[10px]">الرصيد المتبقي</span>
                        <span className={`font-black ${custody.remainingAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {custody.remainingAmount.toLocaleString()} {custody.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">بيان مصروفات العهدة ({custody.expenses.length}):</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Print Statement Button */}
                      <button
                        onClick={() => setPrintCustody(custody)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Printer className="h-4 w-4" />
                        طباعة كشف العهدة
                      </button>

                      {custody.status === 'open' && (
                        <>
                          {/* Add Expense Button — HIDDEN automatically if settled or remaining === 0 */}
                          {!isSettledOrZero && (hasPermission('custody.expense') || dbUser?.role === 'admin') && (
                            <button
                              onClick={() => {
                                setSelectedCustody(custody);
                                setIsExpenseOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors flex items-center gap-1.5"
                            >
                              <Plus className="h-4 w-4" />
                              تسجيل مصروف من العهدة
                            </button>
                          )}

                          {/* Temp Settlement Button — visible if remaining > 0 and no settlement line added yet */}
                          {!custody.hasSettlementItem && custody.remainingAmount > 0 && (hasPermission('custody.settle') || dbUser?.role === 'admin') && (
                            <button
                              onClick={() => handleTemporaryRefund(custody)}
                              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors flex items-center gap-1.5"
                            >
                              <ArrowDownLeft className="h-4 w-4" />
                              تصفية واسترداد المتبقي مؤقتاً
                            </button>
                          )}

                          {/* Final Close & Real Treasury Deposit Button */}
                          {(hasPermission('custody.settle') || dbUser?.role === 'admin') && (
                            <button
                              onClick={() => handleFinalCloseCustody(custody)}
                              disabled={custody.remainingAmount > 0.01 && !custody.hasSettlementItem}
                              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
                                isSettledOrZero
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                              title={!isSettledOrZero ? 'يجب إدراج بند تصفية وتوريد المتبقي أولاً' : 'إقفال حساب العهدة النهائي وتوريد المتبقي للخزينة'}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              إقفال الحساب النهائي والتوريد للخزينة
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expenses Table */}
                  <div className="overflow-x-auto">
                    {custody.expenses.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium">
                        لم يتم تسجيل أي مصروفات على هذه العهدة حتى الآن.
                      </div>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <tr>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">نوع المصروف</th>
                            <th className="p-3">رقم الإيصال/الفاتورة</th>
                            <th className="p-3">البيان والتفاصيل</th>
                            <th className="p-3">الشحنة المرتبطة</th>
                            <th className="p-3 text-left">المبلغ المصروف</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {custody.expenses.map((exp) => {
                            const isSettlementRow = exp.expenseType === 'تسوية/استرداد متبقي';
                            return (
                              <tr key={exp.id} className={isSettlementRow ? 'bg-amber-50/60 font-bold' : 'hover:bg-slate-50/50'}>
                                <td className="p-3 text-slate-500">
                                  {new Date(exp.expenseDate).toLocaleDateString('ar-EG')}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-bold ${
                                      isSettlementRow
                                        ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                        : 'bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    {exp.expenseType}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-slate-600">
                                  {exp.receiptNumber || 'بدون إيصال'}
                                </td>
                                <td className="p-3 font-semibold text-slate-900">
                                  {exp.description}
                                </td>
                                <td className="p-3">
                                  {exp.shipment ? (
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold border border-indigo-100 inline-flex items-center gap-1">
                                      <Ship className="h-3 w-3" />
                                      {exp.shipment.bolNumber ? `بوليصة: ${exp.shipment.bolNumber}` : `ACID: ${exp.shipment.acid || 'شحنة'}`}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">مصروف عام/إداري</span>
                                  )}
                                </td>
                                <td className="p-3 text-left font-black text-slate-900">
                                  {parseFloat(exp.amount.toString()).toLocaleString()} {exp.currency}
                                </td>
                                <td className="p-3 text-center">
                                  {isSettlementRow && custody.status === 'open' ? (
                                    <button
                                      onClick={() => handleRevertSettlement(exp.id)}
                                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 mx-auto"
                                      title="إلغاء التصفية وحذف بند التسوية لإتاحة تسجيل مصروفات مجدداً"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      إلغاء التصفية
                                    </button>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal 1: Issue New Custody */}
        {isIssueOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">صرف عهدة جديدة لموظف</h3>
                </div>
                <button onClick={() => setIsIssueOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleIssueCustody} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الموظف المستلم (الاسم_البصمة) *</label>
                  <select
                    required
                    value={issueEmployeeId}
                    onChange={(e) => setIssueEmployeeId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                  >
                    <option value="">-- اختر الموظف --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{formatEmpName(emp)} ({emp.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">مبلغ العهدة (خصماً من الخزينة) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="المبلغ"
                      value={issueAmount}
                      onChange={(e) => setIssueAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-left focus:outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">العملة</label>
                    <select
                      value={issueCurrency}
                      onChange={(e) => setIssueCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ملاحظات وغرض الصرف</label>
                  <textarea
                    rows={2}
                    placeholder="سبب أو غرض صرف العهدة..."
                    value={issueNotes}
                    onChange={(e) => setIssueNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsIssueOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
                  >
                    تأكيد الصرف من الخزينة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Record Expense */}
        {isExpenseOpen && selectedCustody && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">تسجيل مصروف من العهدة</h3>
                  <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                    العهدة: {formatEmpName(selectedCustody.employee)} (المتبقي: {selectedCustody.remainingAmount.toLocaleString()} {selectedCustody.currency})
                  </p>
                </div>
                <button onClick={() => setIsExpenseOpen(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ المصروف *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      placeholder="المبلغ"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-left focus:outline-none"
                      dir="ltr"
                    />
                  </div>

                  {/* Dynamic Expense Types Dropdown + Add Type Button */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">نوع المصروف *</label>
                      {canManageTypes && (
                        <button
                          type="button"
                          onClick={() => setIsAddTypeOpen(true)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          نوع جديد
                        </button>
                      )}
                    </div>
                    <select
                      value={expenseType}
                      onChange={(e) => setExpenseType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none font-bold text-slate-800"
                    >
                      {expenseTypesList.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">رقم الفاتورة / الإيصال</label>
                    <input
                      type="text"
                      placeholder="رقم الإيصال"
                      value={expenseReceiptNo}
                      onChange={(e) => setExpenseReceiptNo(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">تاريخ الصرف</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الشحنة المرتبطة (اختياري - لمطالبة العميل)</label>
                  <select
                    value={expenseShipmentId}
                    onChange={(e) => setExpenseShipmentId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="">-- مصروف عام / غير مرتبط بشحنة --</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.bolNumber ? `بوليصة: ${s.bolNumber}` : `ACID: ${s.acid || s.id.slice(0, 8)}`} {s.client ? `(${s.client.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">البيان والتفاصيل *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="تفاصيل ما تم صرفه..."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsExpenseOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
                  >
                    تسجيل المصروف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Add New Expense Type */}
        {isAddTypeOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">إضافة تصنيف مصروف جديد</h3>
                </div>
                <button onClick={() => setIsAddTypeOpen(false)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpenseType} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم تصنيف المصروف *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: رسوم أرضيات وتخزين"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddTypeOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow"
                  >
                    حفظ التصنيف
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Printable Custody Statement */}
        {printCustody && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 border border-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
                <h3 className="text-lg font-bold text-slate-900">كشف حساب عهدة موظف</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                  >
                    <Printer className="h-4 w-4" />
                    طباعة التقرير
                  </button>
                  <button onClick={() => setPrintCustody(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="text-center border-b border-slate-200 pb-4">
                  <h2 className="text-xl font-black text-slate-900">كشف تسوية عهدة موظف</h2>
                  <p className="text-xs text-slate-500 mt-1">شركة التخليص الجمركي - إدارة الحسابات والرقابة</p>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <span className="text-slate-400 block font-light">اسم الموظف (الاسم_البصمة):</span>
                    <span className="font-bold text-slate-900">{formatEmpName(printCustody.employee)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-light">تاريخ الصرف:</span>
                    <span className="font-bold text-slate-900">{new Date(printCustody.issuedDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-light">مبلغ العهدة الكلي:</span>
                    <span className="font-bold text-slate-900">{printCustody.totalIssued.toLocaleString()} {printCustody.currency}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-light">حالة العهدة:</span>
                    <span className="font-bold text-slate-900">{printCustody.status === 'open' ? 'نشطة (قيد التصفية)' : 'مغلقة ومورّدة للخزينة'}</span>
                  </div>
                </div>

                <table className="w-full text-right text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">النوع</th>
                      <th className="p-2.5">رقم الإيصال</th>
                      <th className="p-2.5">البيان</th>
                      <th className="p-2.5 text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printCustody.expenses.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2.5">{new Date(e.expenseDate).toLocaleDateString('ar-EG')}</td>
                        <td className="p-2.5">{e.expenseType}</td>
                        <td className="p-2.5 font-mono">{e.receiptNumber || '-'}</td>
                        <td className="p-2.5">{e.description}</td>
                        <td className="p-2.5 text-left font-bold">{parseFloat(e.amount.toString()).toLocaleString()} {e.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs font-bold">
                  <span>الرصيد المتبقي:</span>
                  <span className="text-sm font-black">{printCustody.remainingAmount.toLocaleString()} {printCustody.currency}</span>
                </div>

                <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8">
                  <div>
                    <p className="text-slate-500">توقيع الموظف المستلم</p>
                    <p className="mt-8 font-bold">..............................</p>
                  </div>
                  <div>
                    <p className="text-slate-500">اعتماد المدير المالي</p>
                    <p className="mt-8 font-bold">..............................</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
