"use client";

import React, { useEffect, useState } from "react";
import SidebarLayout from "../../components/SidebarLayout";
import PermissionGuard from "../../components/PermissionGuard";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { LoadingButton } from "../../components/LoadingButton";
import { motion } from "motion/react";
import {
  Wallet,
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
  ArrowDownRight,
  ArrowUpLeft,
  FileText,
  Clock,
  TrendingDown,
  Building2,
  Trash2,
  Vault,
  Layers,
  ArrowLeftRight,
  Pencil,
  Scale,
  SlidersHorizontal,
  AlertCircle,
} from "lucide-react";

interface Treasury {
  id: string;
  name: string;
  code: string | null;
  type: "cash" | "bank";
  isMain: boolean;
  isActive: boolean;
  notes: string | null;
  balances: {
    EGP: number;
    USD: number;
    EUR: number;
  };
}

interface TreasuryTransaction {
  id: string;
  treasuryId: string;
  relatedTreasuryId: string | null;
  transferGroupId: string | null;
  transactionType: "deposit" | "withdraw" | "transfer_out" | "transfer_in" | "reversal" | "adjustment_in" | "adjustment_out";
  amount: string;
  currency: string;
  exchangeRateAtTransaction: string;
  transactionDate: string;
  referenceNumber: string | null;
  notes: string | null;
  isReversed: boolean;
  treasury: { id: string; name: string; code: string | null } | null;
  relatedTreasury: { id: string; name: string; code: string | null } | null;
  client: { id: string; name: string } | null;
}

export default function TreasuryPage() {
  const { getAuthToken, hasPermission } = useAuth();
  const { showToast } = useToast();

  const canCreateTx = hasPermission("treasury.create");
  const canManageSafes = hasPermission("treasury.manage_safes") || canCreateTx;
  const canTransfer = hasPermission("treasury.transfer") || canCreateTx;

  // Data states
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [overallBalances, setOverallBalances] = useState({ EGP: 0, USD: 0, EUR: 0 });
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>("all");

  // Modals visibility
  const [isModalOpen, setIsModalOpen] = useState(false); // Direct transaction
  const [isAddTreasuryModalOpen, setIsAddTreasuryModalOpen] = useState(false); // New safe
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false); // Inter-treasury transfer

  // Direct Transaction Form States
  const [targetTreasuryId, setTargetTreasuryId] = useState("");
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [rate, setRate] = useState("1.0000");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");

  // New Treasury Form States
  const [newTreasuryName, setNewTreasuryName] = useState("");
  const [newTreasuryCode, setNewTreasuryCode] = useState("");
  const [newTreasuryType, setNewTreasuryType] = useState<"cash" | "bank">("cash");
  const [newTreasuryNotes, setNewTreasuryNotes] = useState("");

  // Transfer Form States
  const [fromTreasuryId, setFromTreasuryId] = useState("");
  const [toTreasuryId, setToTreasuryId] = useState("");
  const [fromCurrency, setFromCurrency] = useState("EGP");
  const [toCurrency, setToCurrency] = useState("EGP");
  const [transferAmount, setTransferAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.0000");
  const [customConvertedAmount, setCustomConvertedAmount] = useState("");
  const [transferRefNo, setTransferRefNo] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [submittingTreasury, setSubmittingTreasury] = useState(false);
  const [submittingDirectTx, setSubmittingDirectTx] = useState(false);

  // Edit Treasury Form States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTreasury, setEditingTreasury] = useState<Treasury | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editType, setEditType] = useState<"cash" | "bank">("cash");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Treasury States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTreasury, setDeletingTreasury] = useState<Treasury | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Adjust Balance States
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingTreasury, setAdjustingTreasury] = useState<Treasury | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState<"deposit" | "withdrawal">("deposit");
  const [adjustCurrency, setAdjustCurrency] = useState<"EGP" | "USD" | "EUR">("EGP");
  const [adjustReason, setAdjustReason] = useState("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const token = await getAuthToken();

      // 1. Fetch Treasuries & Overall Balances
      const tRes = await fetch("/api/treasuries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (tRes.ok) {
        const tData = await tRes.json();
        setTreasuries(tData.treasuries || []);
        setOverallBalances(tData.overallBalances || { EGP: 0, USD: 0, EUR: 0 });
      }

      // 2. Fetch Transactions (filtered by selected Treasury if not 'all')
      const url = selectedTreasuryId === "all" 
        ? "/api/treasury" 
        : `/api/treasury?treasuryId=${selectedTreasuryId}`;
      const txRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }
    } catch (err) {
      console.error(err);
      showToast("فشل تحميل بيانات الخزينة", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [getAuthToken, selectedTreasuryId]);

  useEffect(() => {
    if (currency === "EGP") setRate("1.0000");
    else if (currency === "USD") setRate("48.5000");
    else if (currency === "EUR") setRate("52.3000");
  }, [currency]);

  // Handle Exchange Rate & Calculated Target Amount in Transfer Modal
  useEffect(() => {
    if (fromCurrency === toCurrency) {
      setExchangeRate("1.0000");
    } else {
      if (fromCurrency === "USD" && toCurrency === "EGP") setExchangeRate("50.0000");
      else if (fromCurrency === "EGP" && toCurrency === "USD") setExchangeRate("50.0000");
      else if (fromCurrency === "EUR" && toCurrency === "EGP") setExchangeRate("54.0000");
      else if (fromCurrency === "EGP" && toCurrency === "EUR") setExchangeRate("54.0000");
    }
  }, [fromCurrency, toCurrency]);

  // Auto calculate converted amount preview
  const calculatedTargetAmount = React.useMemo(() => {
    const amt = parseFloat(transferAmount || "0");
    const r = parseFloat(exchangeRate || "1");
    if (isNaN(amt) || amt <= 0) return 0;
    if (fromCurrency === toCurrency) return amt;

    if (fromCurrency === "USD" && toCurrency === "EGP") return amt * r;
    if (fromCurrency === "EGP" && toCurrency === "USD") return amt / r;
    if (fromCurrency === "EUR" && toCurrency === "EGP") return amt * r;
    if (fromCurrency === "EGP" && toCurrency === "EUR") return amt / r;
    return amt * r;
  }, [transferAmount, exchangeRate, fromCurrency, toCurrency]);

  // Handle Creating New Treasury
  const handleAddTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTreasuryName.trim()) {
      showToast("يرجى إدخال اسم الخزنة", "warning");
      return;
    }

    setSubmittingTreasury(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/treasuries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newTreasuryName.trim(),
          code: newTreasuryCode.trim() || undefined,
          type: newTreasuryType,
          notes: newTreasuryNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("تم إنشاء الخزنة بنجاح", "success");
        setIsAddTreasuryModalOpen(false);
        setNewTreasuryName("");
        setNewTreasuryCode("");
        setNewTreasuryNotes("");
        loadData();
      } else {
        showToast(data.error || "فشل إنشاء الخزنة", "error");
      }
    } catch (err: any) {
      showToast(err.message || "خطأ في إنشاء الخزنة", "error");
    } finally {
      setSubmittingTreasury(false);
    }
  };

  // Handle Direct Deposit / Withdraw
  const handleDirectTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      showToast("يرجى تحديد المبلغ لتثبيت الحركة", "warning");
      return;
    }

    setSubmittingDirectTx(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/treasury", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          treasuryId: targetTreasuryId || (selectedTreasuryId !== "all" ? selectedTreasuryId : undefined),
          transactionType: txType,
          amount: parseFloat(amount),
          currency,
          exchangeRateAtTransaction: parseFloat(rate),
          referenceNumber: refNo || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("تم تسجيل المعاملة المالية بالخزنة بنجاح", "success");
        setIsModalOpen(false);
        setAmount("");
        setRefNo("");
        setNotes("");
        loadData();
      } else {
        showToast(data.error || "فشل قيد الحركة المالية", "error");
      }
    } catch (err: any) {
      showToast(err.message || "خطأ عند معالجة القيد", "error");
    } finally {
      setSubmittingDirectTx(false);
    }
  };

  // Handle Inter-Treasury Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromTreasuryId || !toTreasuryId) {
      showToast("يرجى تحديد الخزنة المصدر والخزنة المستلمة", "warning");
      return;
    }
    if (fromTreasuryId === toTreasuryId) {
      showToast("لا يمكن التحويل ونقل الأموال لنفس الخزنة المصدر", "warning");
      return;
    }
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      showToast("يرجى إدخال مبلغ تحويل صحيح أكبر من 0", "warning");
      return;
    }

    try {
      setSubmittingTransfer(true);
      const token = await getAuthToken();
      const res = await fetch("/api/treasury/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromTreasuryId,
          toTreasuryId,
          fromCurrency,
          toCurrency,
          amount: parseFloat(transferAmount),
          exchangeRate: parseFloat(exchangeRate || "1"),
          convertedAmount: customConvertedAmount ? parseFloat(customConvertedAmount) : calculatedTargetAmount,
          referenceNumber: transferRefNo || undefined,
          notes: transferNotes || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "تم تنفيذ التحويل بين الخزن بنجاح", "success");
        setIsTransferModalOpen(false);
        setTransferAmount("");
        setCustomConvertedAmount("");
        setTransferRefNo("");
        setTransferNotes("");
        loadData();
      } else {
        showToast(data.error || "فشل تنفيذ التحويل بين الخزن", "error");
      }
    } catch (err: any) {
      showToast(err.message || "خطأ في إجراء التحويل", "error");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Open Edit Treasury Modal
  const openEditModal = (t: Treasury) => {
    setEditingTreasury(t);
    setEditName(t.name);
    setEditCode(t.code || "");
    setEditType(t.type);
    setEditNotes(t.notes || "");
    setIsEditModalOpen(true);
  };

  // Handle Edit Treasury Metadata Submit (Financial Rule 1: NO direct balance editing)
  const handleEditTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreasury) return;
    if (!editName.trim()) {
      showToast("اسم الخزنة مطلوب", "warning");
      return;
    }

    setSubmittingEdit(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/treasury/${editingTreasury.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim() || null,
          type: editType,
          notes: editNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "تم تحديث بيانات الخزنة بنجاح", "success");
        setIsEditModalOpen(false);
        setEditingTreasury(null);
        loadData();
      } else {
        showToast(data.error || "فشل تحديث الخزنة", "error");
      }
    } catch (err: any) {
      showToast(err.message || "خطأ أثناء تحديث بيانات الخزنة", "error");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (t: Treasury) => {
    setDeletingTreasury(t);
    setIsDeleteModalOpen(true);
  };

  // Handle Delete Treasury (Financial Rule 2: Cannot delete if balance != 0)
  const handleDeleteTreasury = async () => {
    if (!deletingTreasury) return;

    setSubmittingDelete(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/treasury/${deletingTreasury.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "تم حذف الخزنة بنجاح", "success");
        if (selectedTreasuryId === deletingTreasury.id) {
          setSelectedTreasuryId("all");
        }
        setIsDeleteModalOpen(false);
        setDeletingTreasury(null);
        loadData();
      } else {
        // Displays clear message if non-zero balance
        showToast(data.error || "لا يمكن حذف الخزنة", "error");
      }
    } catch (err: any) {
      showToast(err.message || "خطأ أثناء محاولة حذف الخزنة", "error");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Open Adjust Balance Modal
  const openAdjustModal = (t: Treasury) => {
    setAdjustingTreasury(t);
    setAdjustAmount("");
    setAdjustType("deposit");
    setAdjustCurrency("EGP");
    setAdjustReason("");
    setIsAdjustModalOpen(true);
  };

  // Handle Manual Balance Adjustment Submit (Logs as transaction & updates balance)
  const handleAdjustTreasury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingTreasury) return;

    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num <= 0) {
      showToast("يرجى إدخال مبلغ تسوية صحيح أكبر من 0", "warning");
      return;
    }

    if (!adjustReason.trim()) {
      showToast("يرجى كتابة سبب التسوية والمبرر المحاسبي", "warning");
      return;
    }

    setSubmittingAdjust(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/treasury/${adjustingTreasury.id}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: num,
          type: adjustType,
          currency: adjustCurrency,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "تمت تسوية رصيد الخزنة بنجاح", "success");
        setIsAdjustModalOpen(false);
        setAdjustingTreasury(null);
        setAdjustAmount("");
        setAdjustReason("");
        loadData();
      } else {
        showToast(data.error || "فشل إجراء تسوية الرصيد", "error");
      }
    } catch (err: any) {
      showToast(err.message || "خطأ أثناء إجراء التسوية", "error");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Filter transactions search
  const filteredTx = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.notes || "").toLowerCase().includes(q) ||
      (t.referenceNumber || "").toLowerCase().includes(q) ||
      (t.client?.name || "").toLowerCase().includes(q) ||
      (t.treasury?.name || "").toLowerCase().includes(q) ||
      (t.relatedTreasury?.name || "").toLowerCase().includes(q)
    );
  });

  // Currently active view balances
  const activeBalances = React.useMemo(() => {
    if (selectedTreasuryId === "all") {
      return overallBalances;
    }
    const currentTreasury = treasuries.find((t) => t.id === selectedTreasuryId);
    return currentTreasury?.balances || { EGP: 0, USD: 0, EUR: 0 };
  }, [selectedTreasuryId, overallBalances, treasuries]);

  const activeTreasuryObj = treasuries.find((t) => t.id === selectedTreasuryId);

  return (
    <PermissionGuard requiredPermission={["treasury.view", "treasury.create"]} pageTitle="الخزينة والمقبوضات">
      <SidebarLayout>
      <div className="space-y-6">
        {/* Top Header & Quick Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Vault className="h-7 w-7 text-indigo-600" />
              إدارة الخزن والمعاملات المالية
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              إدارة الخزن المتعددة النقدية والبنكية، الأرصدة الحالية، والتحويلات المالية المباشرة بين الخزن مع سعر الصرف.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canManageSafes && (
              <button
                onClick={() => {
                  setNewTreasuryName("");
                  setNewTreasuryCode("");
                  setIsAddTreasuryModalOpen(true);
                }}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                إضافة خزنة جديدة
              </button>
            )}

            {canTransfer && (
              <button
                onClick={() => {
                  if (treasuries.length < 2) {
                    showToast("يحب وجود خزنتين على الأقل لإجراء عمليات التحويل بينهما", "warning");
                    return;
                  }
                  setFromTreasuryId(treasuries[0]?.id || "");
                  setToTreasuryId(treasuries[1]?.id || "");
                  setIsTransferModalOpen(true);
                }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-colors"
              >
                <ArrowLeftRight className="h-4 w-4" />
                تحويل بين الخزن
              </button>
            )}

            {canCreateTx && (
              <button
                onClick={() => {
                  setTargetTreasuryId(selectedTreasuryId !== "all" ? selectedTreasuryId : (treasuries[0]?.id || ""));
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                معاملة خزنة جديدة
              </button>
            )}
          </div>
        </div>

        {/* Treasury Selector Tabs Header */}
        <div className="bg-white p-2 border border-slate-200 rounded-2xl flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedTreasuryId("all")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
              selectedTreasuryId === "all"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="h-4 w-4" />
            الصفحة المجمعة (كافة الخزن)
          </button>

          {treasuries.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTreasuryId(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
                selectedTreasuryId === t.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Building2 className="h-4 w-4" />
              {t.name}
              {t.isMain && <span className="bg-amber-400 text-slate-900 text-[9px] px-1.5 py-0.5 rounded font-black">الرئيسية</span>}
            </button>
          ))}
        </div>

        {/* Active Treasury Specific Action Toolbar (when a single treasury is selected) */}
        {selectedTreasuryId !== "all" && activeTreasuryObj && (
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Vault className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{activeTreasuryObj.name}</h3>
                  {activeTreasuryObj.isMain && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded font-black">
                      الرئيسية
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">({activeTreasuryObj.code || "TR-01"})</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{activeTreasuryObj.notes || "لا توجد ملاحظات إضافية"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PermissionGuard permission={["treasury.adjust", "treasury.manage_safes"]}>
                <button
                  type="button"
                  onClick={() => openAdjustModal(activeTreasuryObj)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
                >
                  <Scale className="h-4 w-4" />
                  تسوية الرصيد
                </button>
              </PermissionGuard>

              <PermissionGuard permission={["treasury.edit", "treasury.manage_safes"]}>
                <button
                  type="button"
                  onClick={() => openEditModal(activeTreasuryObj)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Pencil className="h-4 w-4" />
                  تعديل البيانات
                </button>
              </PermissionGuard>

              {!activeTreasuryObj.isMain && (
                <PermissionGuard permission="treasury.delete">
                  <button
                    type="button"
                    onClick={() => openDeleteModal(activeTreasuryObj)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف الخزنة
                  </button>
                </PermissionGuard>
              )}
            </div>
          </div>
        )}

        {/* Currency Summary Grid for Selected View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block">
                {selectedTreasuryId === "all" ? "إجمالي رصيد الخزن (EGP)" : `رصيد (${activeTreasuryObj?.name}) بالجنيه`}
              </span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                {activeBalances.EGP.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م
              </span>
            </div>
            <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              EGP
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block">
                {selectedTreasuryId === "all" ? "إجمالي رصيد الخزن (USD)" : `رصيد (${activeTreasuryObj?.name}) بالدولار`}
              </span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                ${activeBalances.USD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-11 w-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              USD
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 block">
                {selectedTreasuryId === "all" ? "إجمالي رصيد الخزن (EUR)" : `رصيد (${activeTreasuryObj?.name}) باليورو`}
              </span>
              <span className="text-2xl font-black text-slate-900 block mt-1">
                €{activeBalances.EUR.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-11 w-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
              EUR
            </div>
          </div>
        </div>

        {/* Combined Treasuries Overview Cards (Only in 'all' view) */}
        {selectedTreasuryId === "all" && treasuries.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              قائمة الخزن المعتمدة والأرصدة المستقلة لكل خزنة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treasuries.map((t) => (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-indigo-300 transition-all cursor-pointer"
                  onClick={() => setSelectedTreasuryId(t.id)}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Vault className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono block">{t.code || "TR-01"} • {t.type === "bank" ? "حساب بنكي" : "خزنة نقدية"}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {t.isMain && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                          الرئيسية
                        </span>
                      )}

                      {/* Actions Menu */}
                      <PermissionGuard permission={["treasury.adjust", "treasury.manage_safes"]}>
                        <button
                          type="button"
                          title="تسوية رصيد الخزنة (عجز / زيادة)"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdjustModal(t);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Scale className="h-4 w-4" />
                        </button>
                      </PermissionGuard>

                      <PermissionGuard permission={["treasury.edit", "treasury.manage_safes"]}>
                        <button
                          type="button"
                          title="تعديل بيانات الخزنة"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(t);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </PermissionGuard>

                      {!t.isMain && (
                        <PermissionGuard permission="treasury.delete">
                          <button
                            type="button"
                            title="حذف الخزنة"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(t);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">EGP</span>
                      <span className="text-xs font-black text-slate-800 dir-ltr block mt-0.5">
                        {t.balances.EGP.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">USD</span>
                      <span className="text-xs font-black text-slate-800 dir-ltr block mt-0.5">
                        ${t.balances.USD.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block">EUR</span>
                      <span className="text-xs font-black text-slate-800 dir-ltr block mt-0.5">
                        €{t.balances.EUR.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم الخزنة، البيان والوصف، العميل، أو مرجع القيد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Dynamic Ledger table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
              {selectedTreasuryId === "all"
                ? "شجرة القيود والحركات المجمعة لكافة الخزن"
                : `جدول القيود والحركات الخاصة بـ (${activeTreasuryObj?.name})`}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              إجمالي القيود: {filteredTx.length}
            </span>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : filteredTx.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">
              لا توجد قيود أو حركات سابقة مطابقة للبحث.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">نوع الحركة</th>
                    <th className="p-4">الخزنة</th>
                    <th className="p-4">البيان والتفاصيل</th>
                    <th className="p-4">العميل المرتبط</th>
                    <th className="p-4">المبلغ المقيد</th>
                    <th className="p-4">سعر الصرف</th>
                    <th className="p-4">المرجع</th>
                    <th className="p-4">تاريخ القيد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTx.map((tx) => {
                    const isRev = tx.isReversed;

                    const typeConfig = {
                      deposit: {
                        label: "إيداع",
                        icon: ArrowDownRight,
                        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
                      },
                      withdraw: {
                        label: "سحب",
                        icon: ArrowUpLeft,
                        color: "text-red-700 bg-red-50 border-red-200",
                      },
                      transfer_out: {
                        label: "تحويل صادرة",
                        icon: ArrowLeftRight,
                        color: "text-amber-700 bg-amber-50 border-amber-200",
                      },
                      transfer_in: {
                        label: "تحويل واردة",
                        icon: ArrowLeftRight,
                        color: "text-blue-700 bg-blue-50 border-blue-200",
                      },
                      reversal: {
                        label: "عكس قيد",
                        icon: ArrowRightLeft,
                        color: "text-purple-700 bg-purple-50 border-purple-200",
                      },
                      adjustment_in: {
                        label: "تسوية فائض (+)",
                        icon: Scale,
                        color: "text-teal-700 bg-teal-50 border-teal-200",
                      },
                      adjustment_out: {
                        label: "تسوية عجز (-)",
                        icon: SlidersHorizontal,
                        color: "text-orange-700 bg-orange-50 border-orange-200",
                      },
                    }[tx.transactionType] || {
                      label: tx.transactionType,
                      icon: Coins,
                      color: "text-slate-700 bg-slate-50 border-slate-200",
                    };

                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50/50 transition-colors ${isRev ? "opacity-40 line-through" : ""}`}
                      >
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border ${typeConfig.color}`}
                          >
                            <typeConfig.icon className="h-3 w-3" />
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">
                            {tx.treasury?.name || "الخزنة الرئيسية"}
                          </span>
                          {tx.relatedTreasury && (
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {tx.transactionType === "transfer_out" ? `إلى: ${tx.relatedTreasury.name}` : `من: ${tx.relatedTreasury.name}`}
                            </span>
                          )}
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="font-semibold text-slate-800 truncate">
                            {tx.notes || "ـ"}
                          </p>
                        </td>
                        <td className="p-4 text-slate-500 font-medium">
                          {tx.client?.name || "ـ"}
                        </td>
                        <td className="p-4 font-black text-slate-900 dir-ltr">
                          {parseFloat(tx.amount).toLocaleString()} {tx.currency}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {tx.currency === "EGP" && tx.exchangeRateAtTransaction === "1.0000"
                            ? "ـ"
                            : `${parseFloat(tx.exchangeRateAtTransaction).toFixed(2)}`}
                        </td>
                        <td className="p-4 text-slate-500 font-mono">
                          {tx.referenceNumber || "ـ"}
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(tx.transactionDate).toLocaleDateString("ar-EG", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal 1: Add New Treasury Modal */}
        {isAddTreasuryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Vault className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">إضافة خزنة / حساب جديد</h3>
                </div>
                <button
                  onClick={() => setIsAddTreasuryModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddTreasury} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم الخزنة / الحساب *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خزنة فرع الإسكندرية، خزنة دولار مبيعات..."
                    value={newTreasuryName}
                    onChange={(e) => setNewTreasuryName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">كود الخزنة</label>
                    <input
                      type="text"
                      placeholder="مثال: TR-02"
                      value={newTreasuryCode}
                      onChange={(e) => setNewTreasuryCode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono dir-ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نوع الحساب</label>
                    <select
                      value={newTreasuryType}
                      onChange={(e) => setNewTreasuryType(e.target.value as "cash" | "bank")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="cash">خزنة كاش / نقدية</option>
                      <option value="bank">حساب بنكي / محفظة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ملاحظات أو وصف</label>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات تفصيلية عن الخزنة والموقع..."
                    value={newTreasuryNotes}
                    onChange={(e) => setNewTreasuryNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddTreasuryModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={submittingTreasury}
                    loadingText="جاري حفظ الخزنة..."
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                  >
                    حفظ وإنشاء الخزنة
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Inter-Treasury Transfer Modal */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-6 w-6 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">إجراء تحويل مالي بين الخزن</h3>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4 mt-4">
                {/* Source & Target Treasuries */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">من خزنة (المصدر) *</label>
                    <select
                      value={fromTreasuryId}
                      onChange={(e) => setFromTreasuryId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {treasuries.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">إلى خزنة (الهدف) *</label>
                    <select
                      value={toTreasuryId}
                      onChange={(e) => setToTreasuryId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {treasuries.map((t) => (
                        <option key={t.id} value={t.id} disabled={t.id === fromTreasuryId}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Source & Destination Currencies */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عملة الخزنة المصدر</label>
                    <select
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="EGP">EGP (جنيه)</option>
                      <option value="USD">USD (دولار)</option>
                      <option value="EUR">EUR (يورو)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">عملة الخزنة المستلمة</label>
                    <select
                      value={toCurrency}
                      onChange={(e) => setToCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="EGP">EGP (جنيه)</option>
                      <option value="USD">USD (دولار)</option>
                      <option value="EUR">EUR (يورو)</option>
                    </select>
                  </div>
                </div>

                {/* Amount & Exchange Rate */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ الخصم من المصدر *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold dir-ltr"
                    />
                  </div>

                  {fromCurrency !== toCurrency ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-emerald-700">سعر الصرف (Exchange Rate) *</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-800 dir-ltr"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">سعر الصرف</label>
                      <input
                        type="text"
                        disabled
                        value="1.0000 (نفس العملة)"
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500"
                      />
                    </div>
                  )}
                </div>

                {/* Exchange Calculation Live Result Preview */}
                {fromCurrency !== toCurrency && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">
                      المبلغ المحوّل المستلم الصافي:
                    </span>
                    <span className="text-sm font-black text-emerald-900 dir-ltr">
                      {calculatedTargetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {toCurrency}
                    </span>
                  </div>
                )}

                {/* Notes & Reference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">سبب التحويل أو ملاحظات</label>
                  <input
                    type="text"
                    placeholder="تحويل لتغذية خزنة المبيعات، تحويل دولار لبنك..."
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsTransferModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={submittingTransfer}
                    loadingText="جاري تنفيذ التحويل..."
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-2"
                  >
                    تأكيد وتنفيذ التحويل المالي
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Direct Deposit/Withdraw Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">تسجيل حركة نقدية مباشرة</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleDirectTransaction} className="space-y-4 mt-4">
                {/* Target Treasury Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اختيار الخزنة *</label>
                  <select
                    value={targetTreasuryId}
                    onChange={(e) => setTargetTreasuryId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                  >
                    {treasuries.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isMain ? "(الرئيسية)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">نوع الحركة المالية *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTxType("deposit")}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                        txType === "deposit" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
                      }`}
                    >
                      إيداع / قبض (داخل)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("withdraw")}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                        txType === "withdraw" ? "bg-white text-red-600 shadow-sm" : "text-slate-600"
                      }`}
                    >
                      سحب / دفع (خارج)
                    </button>
                  </div>
                </div>

                {/* Amount & Currency */}
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">العملة</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {currency !== "EGP" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">سعر الصرف للجنيه المصري *</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left font-bold text-indigo-600 dir-ltr"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">بيان ووصف المعاملة بالتفصيل *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="سحب مصاريف تشغيلية، استلام إيداع نقدي..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">رقم السند أو المرشح</label>
                  <input
                    type="text"
                    placeholder="رقم مرجع الحركة"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={submittingDirectTx}
                    loadingText="جاري تثبيت القيد..."
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
                  >
                    تثبيت قيد المعاملة
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Edit Treasury Metadata Modal (Strict Financial Rule 1: No balance field) */}
        {isEditModalOpen && editingTreasury && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">تعديل بيانات الخزنة / الحساب</h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Strict Financial Notice */}
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
                💡 <span className="font-bold">قاعدة مالية رقابية:</span> لا يمكن تعديل الرصيد المالي مباشرة هنا لحماية السجلات. لتسوية الفروقات أو الأرصدة يرجى استخدام زر <strong>(تسوية الرصيد)</strong>.
              </div>

              <form onSubmit={handleEditTreasury} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">اسم الخزنة / الحساب *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسم الخزنة"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">كود الخزنة</label>
                    <input
                      type="text"
                      placeholder="مثال: TR-01"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono dir-ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">نوع الحساب</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as "cash" | "bank")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="cash">خزنة كاش / نقدية</option>
                      <option value="bank">حساب بنكي / محفظة</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ملاحظات أو وصف</label>
                  <textarea
                    rows={2}
                    placeholder="ملاحظات تفصيلية..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={submittingEdit}
                    loadingText="جاري حفظ التعديلات..."
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                  >
                    حفظ التعديلات
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 5: Delete Treasury Confirmation (Strict Financial Rule 2: Balance must be 0) */}
        {isDeleteModalOpen && deletingTreasury && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-600">
                  <AlertCircle className="h-6 w-6" />
                  <h3 className="text-base font-bold text-slate-900">تأكيد حذف الخزنة</h3>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف الخزنة{" "}
                  <strong className="text-rose-600">"{deletingTreasury.name}"</strong>؟
                </p>

                {/* Balances Warning Box */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>قاعدة مالية رقابية صارمة:</span>
                  </div>
                  <p className="leading-relaxed">
                    لا يمكن حذف أي خزنة إذا كان بها أي رصيد متبقي غير صفري. يجب تصفية أو تحويل كافة الأرصدة إلى خزنة أخرى أولاً قبل الحذف.
                  </p>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 mt-2 space-y-1">
                    <span className="font-bold text-[11px] text-slate-700 block">الأرصدة الحالية بالخزنة:</span>
                    <div className="flex items-center justify-between text-xs font-black pt-0.5">
                      <span className="text-emerald-700">{deletingTreasury.balances.EGP.toLocaleString()} EGP</span>
                      <span className="text-blue-700">${deletingTreasury.balances.USD.toLocaleString()} USD</span>
                      <span className="text-purple-700">€{deletingTreasury.balances.EUR.toLocaleString()} EUR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  إلغاء
                </button>
                <LoadingButton
                  onClick={handleDeleteTreasury}
                  isLoading={submittingDelete}
                  loadingText="جاري الحذف..."
                  variant="destructive"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-md"
                >
                  تأكيد الحذف
                </LoadingButton>
              </div>
            </div>
          </div>
        )}

        {/* Modal 6: Adjust Balance Modal (Logged Transaction Entry) */}
        {isAdjustModalOpen && adjustingTreasury && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-6 w-6 text-amber-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">تسوية رصيد الخزنة</h3>
                    <p className="text-xs text-slate-500 font-semibold">{adjustingTreasury.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Current Balances preview */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">الأرصدة الحالية بالخزنة:</span>
                <div className="flex items-center justify-around gap-2 text-xs font-black">
                  <span className="text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {adjustingTreasury.balances.EGP.toLocaleString()} EGP
                  </span>
                  <span className="text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    ${adjustingTreasury.balances.USD.toLocaleString()} USD
                  </span>
                  <span className="text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    €{adjustingTreasury.balances.EUR.toLocaleString()} EUR
                  </span>
                </div>
              </div>

              <form onSubmit={handleAdjustTreasury} className="space-y-4 mt-4">
                {/* Adjustment Direction */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">نوع التسوية المحاسبية *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjustType("deposit")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        adjustType === "deposit"
                          ? "bg-emerald-600 text-white shadow"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      تسوية فائض (زيادة +)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType("withdrawal")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        adjustType === "withdrawal"
                          ? "bg-rose-600 text-white shadow"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      تسوية عجز (خصم -)
                    </button>
                  </div>
                </div>

                {/* Currency & Amount */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">العملة *</label>
                    <select
                      value={adjustCurrency}
                      onChange={(e) => setAdjustCurrency(e.target.value as "EGP" | "USD" | "EUR")}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">مبلغ التسوية *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-left dir-ltr"
                    />
                  </div>
                </div>

                {/* Reason & Notes (Mandatory) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">سبب ومبرر التسوية الإلزامي *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="مثال: تسوية جرد سنوي، تصحيح خطأ تقييد سابق، إثبات عجز/فائض نقدي موثق..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={submittingAdjust}
                    loadingText="جاري قيد التسوية..."
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md"
                  >
                    تثبيت قيد التسوية
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
