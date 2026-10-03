"use client";

import React, { useEffect, useState } from "react";
import SidebarLayout from "../../components/SidebarLayout";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
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
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Shipment {
  bolNumber: string | null;
}

interface Statement {
  id: string;
  shipment: Shipment | null;
}

interface TreasuryTransaction {
  id: string;
  transactionType: "deposit" | "withdraw" | "reversal";
  amount: string;
  currency: string;
  exchangeRateAtTransaction: string;
  transactionDate: string;
  referenceNumber: string | null;
  notes: string | null;
  isReversed: boolean;
  client: Client | null;
  statement: Statement | null;
}

export default function TreasuryPage() {
  const { getAuthToken, hasPermission } = useAuth();
  const { showToast } = useToast();

  const canCreateTreasury = hasPermission("treasury.create");
  const canDeleteTreasury =
    hasPermission("treasury.delete") || hasPermission("treasury.reverse");
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [rate, setRate] = useState("1.0000");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  async function loadData() {
    try {
      const token = await getAuthToken();
      // Load transactions
      const txRes = await fetch("/api/treasury", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (txRes.ok) setTransactions(await txRes.json());

      // Load clients
      const cliRes = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cliRes.ok) setClients(await cliRes.json());
    } catch (err) {
      console.error(err);
      showToast("فشل تحميل دفتر قيود الخزينة", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [getAuthToken]);

  useEffect(() => {
    if (currency === "EGP") setRate("1.0000");
    else if (currency === "USD") setRate("48.5000");
    else if (currency === "EUR") setRate("52.3000");
  }, [currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      showToast("يرجى تحديد المبلغ لتثبيت الحركة", "warning");
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch("/api/treasury", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
        showToast("تم تسجيل المعاملة المالية في الخزينة بنجاح", "success");
        setIsModalOpen(false);
        // Reset
        setAmount("");
        setRefNo("");
        setNotes("");
        loadData();
      } else {
        showToast(data.error || "فشل قيد الحركة المالية في الخزانة", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "خطأ بالخادم عند معالجة قيد الحركة", "error");
    }
  };

  const filteredTx = transactions.filter(
    (t) =>
      (t.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.referenceNumber || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (t.client?.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Calculate distinct available balances per currency
  const balances: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
  transactions.forEach((t) => {
    if (t.isReversed) return; // Ignore reversed transactions!
    const amt = parseFloat(t.amount);
    const cur = t.currency;
    if (t.transactionType === "deposit") {
      balances[cur] = (balances[cur] || 0) + amt;
    } else if (
      t.transactionType === "withdraw" ||
      t.transactionType === "reversal"
    ) {
      balances[cur] = (balances[cur] || 0) - amt;
    }
  });

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              الخزينة والمعاملات المالية
            </h1>
            <p className="text-sm text-slate-500 font-light mt-1">
              إدارة حركة السيولة النقدية والبنكية للمكتب، مع حساب الأرصدة
              المتاحة حسب كل عملة على حدة وبشكل مستقل.
            </p>
          </div>
          {canCreateTreasury && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-5 rounded-2xl shadow-lg transition-colors shrink-0"
            >
              <Plus className="h-5 w-5" />
              معاملة خزينة مباشرة
            </button>
          )}
        </div>

        {/* Currency Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(balances).map(([curr, val]) => (
            <div
              key={curr}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-400 block">
                  رصيد خزينة الـ {curr} المتاح
                </span>
                <span className="text-2xl font-black text-slate-900 block mt-1">
                  {curr === "EGP"
                    ? val.toLocaleString("ar-EG", { minimumFractionDigits: 2 })
                    : `${curr === "USD" ? "$" : "€"}${val.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث بالبيان والوصف، العميل، رقم القيد أو المرجع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Dynamic Ledger table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              شجرة القيود والحركات اليومية
            </h3>
          </div>

          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-slate-50 animate-pulse rounded-lg"
                ></div>
              ))}
            </div>
          ) : filteredTx.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12">
              دفتر القيود فارغ حالياً.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-4">نوع المعاملة</th>
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
                    const isReversalType = tx.transactionType === "reversal";

                    const typeConfig = {
                      deposit: {
                        label: "إيداع",
                        icon: ArrowDownRight,
                        color: "text-emerald-600 bg-emerald-50",
                      },
                      withdraw: {
                        label: "سحب",
                        icon: ArrowUpLeft,
                        color: "text-red-600 bg-red-50",
                      },
                      reversal: {
                        label: "عكس قيد",
                        icon: ArrowRightLeft,
                        color: "text-purple-600 bg-purple-50",
                      },
                    }[tx.transactionType];

                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50/40 transition-colors ${isRev ? "opacity-40 line-through" : ""}`}
                      >
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] ${typeConfig?.color}`}
                          >
                            {typeConfig && (
                              <typeConfig.icon className="h-3.5 w-3.5" />
                            )}
                            {typeConfig?.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-800">
                            {tx.notes}
                          </p>
                          {tx.statement?.shipment?.bolNumber && (
                            <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
                              بوليصة: {tx.statement.shipment.bolNumber}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500 font-medium">
                          {tx.client?.name || "ـ"}
                        </td>
                        <td className="p-4 font-black text-slate-900">
                          {parseFloat(tx.amount).toLocaleString()} {tx.currency}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {tx.currency === "EGP"
                            ? "ـ"
                            : `${parseFloat(tx.exchangeRateAtTransaction).toFixed(2)} EGP`}
                        </td>
                        <td className="p-4 text-slate-500">
                          {tx.referenceNumber || "ـ"}
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(tx.transactionDate).toLocaleDateString(
                            "ar-EG",
                            { day: "numeric", month: "short" },
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* New Transaction Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 border border-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    تسجيل حركة نقدية في الخزينة
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* 1. Transaction Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    نوع الحركة المالية *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTxType("deposit")}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                        txType === "deposit"
                          ? "bg-white text-emerald-600 shadow-sm"
                          : "text-slate-600"
                      }`}
                    >
                      إيداع / قبض (داخل)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType("withdraw")}
                      className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                        txType === "withdraw"
                          ? "bg-white text-red-600 shadow-sm"
                          : "text-slate-600"
                      }`}
                    >
                      سحب / دفع (خارج)
                    </button>
                  </div>
                </div>

                {/* 2. Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      المبلغ والقيمة *
                    </label>
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
                    <label className="text-xs font-bold text-slate-700">
                      العملة
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {/* 3. Description / Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    بيان ووصف المعاملة بالتفصيل *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="تم سحب أجور مخلصين جمركيين، تم استلام سلفة نقدية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                {currency !== "EGP" && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-700">
                      سعر الصرف المترجم للجنيه المصري *
                    </label>
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

                {/* 4. Reference Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    رقم السند أو رقم الشيك المرجعي
                  </label>
                  <input
                    type="text"
                    placeholder="رقم مرجع الحركة"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left"
                    dir="ltr"
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
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg"
                  >
                    تثبيت قيد المعاملة اليومية
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
