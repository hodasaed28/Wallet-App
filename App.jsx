import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowLeftRight, Clock, Plus, 
  Trash2, Edit3, Download, Upload, AlertCircle, CheckCircle2, 
  PieChart as ChartIcon, Settings, Home, Calendar, Tag, Search, Check, RefreshCw
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const WALLET_NAMES = { cash: 'نقدي', ewallet: 'محفظة إلكترونية', visa: 'بطاقة فيزا / بنكية' };
const EXPENSE_CATEGORIES = ['طعام ومشروبات', 'مواصلات وبنزين', 'تسوق ومشتريات', 'فواتير والتزامات', 'ترفيه وخروج', 'تحويل مالي', 'أخرى'];
const INCOME_CATEGORIES = ['مرتب وعمل', 'تحويل مالي', 'أخرى'];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [startDayOfMonth, setStartDayOfMonth] = useState(1);
  const [savingGoal, setSavingGoal] = useState({ target: 50000, current: 0 });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterWallet, setFilterWallet] = useState('all');
  const [reportDays, setReportDays] = useState(30);

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalMode, setTxModalMode] = useState('income');
  const [editTxData, setEditTxData] = useState(null);

  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [editRecData, setEditRecData] = useState(null);

  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceWallet, setBalanceWallet] = useState('cash');
  const [manualBalanceVal, setManualBalanceVal] = useState('');

  const [toast, setToast] = useState(null);

  // Show Toast
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load Initial Data
  useEffect(() => {
    const savedTx = localStorage.getItem('mywallet_txs');
    const savedRec = localStorage.getItem('mywallet_recurring');
    const savedGoal = localStorage.getItem('mywallet_goal');
    const savedStartDay = localStorage.getItem('mywallet_start_day');

    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedRec) setRecurring(JSON.parse(savedRec));
    if (savedGoal) setSavingGoal(JSON.parse(savedGoal));
    if (savedStartDay) setStartDayOfMonth(Number(savedStartDay));
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem('mywallet_txs', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('mywallet_recurring', JSON.stringify(recurring));
  }, [recurring]);

  useEffect(() => {
    localStorage.setItem('mywallet_goal', JSON.stringify(savingGoal));
  }, [savingGoal]);

  useEffect(() => {
    localStorage.setItem('mywallet_start_day', startDayOfMonth.toString());
  }, [startDayOfMonth]);

  // Recalculate Balances Chronologically
  const walletBalances = useMemo(() => {
    const balances = { cash: 0, ewallet: 0, visa: 0 };
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        if (balances[tx.wallet] !== undefined) balances[tx.wallet] += amt;
      } else if (tx.type === 'outcome') {
        if (balances[tx.wallet] !== undefined) balances[tx.wallet] -= amt;
      } else if (tx.type === 'transfer') {
        if (balances[tx.wallet] !== undefined) balances[tx.wallet] -= amt;
        if (balances[tx.targetWallet] !== undefined) balances[tx.targetWallet] += amt;
      }
    });
    return balances;
  }, [transactions]);

  const totalBalance = walletBalances.cash + walletBalances.ewallet + walletBalances.visa;

  // Recurring alerts (within 7 days or overdue)
  const dueRecurring = useMemo(() => {
    const now = new Date();
    return recurring.filter(r => {
      if (!r.isActive) return false;
      const due = new Date(r.nextDueDate);
      const diffDays = (due - now) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    });
  }, [recurring]);

  // Filtered transactions for Home
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesWallet = filterWallet === 'all' || t.wallet === filterWallet || t.targetWallet === filterWallet;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        t.title?.toLowerCase().includes(q) || 
        t.category?.toLowerCase().includes(q) || 
        t.note?.toLowerCase().includes(q);
      return matchesType && matchesWallet && matchesSearch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterType, filterWallet, searchQuery]);

  // Handle Pay Recurring Subscription
  const handlePayRecurring = (item) => {
    const now = new Date();
    const newTx = {
      id: Date.now().toString(),
      title: item.title,
      amount: Number(item.amount),
      type: 'outcome',
      wallet: item.wallet,
      targetWallet: null,
      category: item.category,
      date: now.toISOString(),
      note: `سداد دوري تلقائي لـ "${item.title}"`,
      tags: ['#اشتراك', '#دوري']
    };

    // Calculate Next Due Date
    const nextDate = new Date(item.nextDueDate);
    if (item.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
    else if (item.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (item.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (item.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

    setTransactions(prev => [newTx, ...prev]);
    setRecurring(prev => prev.map(r => r.id === item.id ? { ...r, nextDueDate: nextDate.toISOString() } : r));
    showToast(`تم سداد ${item.title} وتحديث موعد القسط القادم`);
  };

  // Export JSON (v3.0 standard)
  const exportData = () => {
    const data = {
      app: "MyWalletApp",
      version: "3.0",
      exportDate: new Date().toISOString(),
      currency: "ج.م",
      transactions,
      recurring,
      budgets: [],
      debts: [],
      goals: [savingGoal]
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const dateStr = `${d.getFullYear()}_${String(d.getMonth()+1).padStart(2,'0')}_${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
    a.href = url;
    a.download = `wallet_backup_${dateStr}.json`;
    a.click();
    showToast("تم تصدير النسخة الاحتياطية بنجاح");
  };

  // Import JSON
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.transactions) {
          const mappedTxs = json.transactions.map(t => ({
            ...t,
            wallet: (t.wallet === 'card' || t.wallet === 'credit') ? 'visa' : t.wallet,
            targetWallet: (t.targetWallet === 'card' || t.targetWallet === 'credit') ? 'visa' : t.targetWallet
          }));
          setTransactions(mappedTxs);
        }
        if (json.recurring) setRecurring(json.recurring);
        if (json.goals && json.goals[0]) setSavingGoal(json.goals[0]);
        showToast("تم استيراد البيانات وإعادة احتساب الأرصدة بنجاح");
      } catch (err) {
        showToast("فشل استيراد الملف: تنسيق غير صحيح");
      }
    };
    reader.readAsText(file);
  };

  // Manual Balance Adjustment
  const handleManualBalanceSubmit = (e) => {
    e.preventDefault();
    const targetVal = parseFloat(manualBalanceVal);
    if (isNaN(targetVal)) return;

    const currentVal = walletBalances[balanceWallet];
    const diff = targetVal - currentVal;
    if (diff === 0) {
      setBalanceModalOpen(false);
      return;
    }

    const adjTx = {
      id: Date.now().toString(),
      title: 'تعديل رصيد يدوي',
      amount: Math.abs(diff),
      type: diff > 0 ? 'income' : 'outcome',
      wallet: balanceWallet,
      targetWallet: null,
      category: 'أخرى',
      date: new Date().toISOString(),
      note: 'تعديل يدوي للرصيد المتاح',
      tags: ['#تعديل_يدوي']
    };

    setTransactions(prev => [adjTx, ...prev]);
    setBalanceModalOpen(false);
    setManualBalanceVal('');
    showToast("تم ضبط رصيد المحفظة بنجاح");
  };

  // Reports Computations
  const reportData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - reportDays);

    const periodTxs = transactions.filter(t => new Date(t.date) >= cutoff);
    let totalIncome = 0;
    let totalOutcome = 0;
    const categoryTotals = {};
    const walletOutcomeTotals = { cash: 0, ewallet: 0, visa: 0 };
    const dailyMap = {};

    periodTxs.forEach(t => {
      const amt = Number(t.amount) || 0;
      const day = t.date.split('T')[0];
      if (t.type === 'income') totalIncome += amt;
      else if (t.type === 'outcome') {
        totalOutcome += amt;
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
        if (walletOutcomeTotals[t.wallet] !== undefined) walletOutcomeTotals[t.wallet] += amt;
        dailyMap[day] = (dailyMap[day] || 0) + amt;
      }
    });

    const topExpenses = periodTxs
      .filter(t => t.type === 'outcome')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return {
      totalIncome,
      totalOutcome,
      net: totalIncome - totalOutcome,
      categoryTotals,
      walletOutcomeTotals,
      dailyMap,
      topExpenses
    };
  }, [transactions, reportDays]);

  return (
    <div className="flex flex-col min-h-screen bg-[#070d1e] text-slate-100 max-w-md mx-auto relative pb-24 shadow-2xl">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-emerald-600 text-white text-center py-2 px-4 rounded-xl shadow-lg font-bold text-sm transition-all animate-bounce">
          {toast}
        </div>
      )}

      {/* Top Header */}
      <header className="p-4 bg-[#0d1630] border-b border-slate-800 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            محفظتي الذكية
          </h1>
          <p className="text-xs text-slate-400">إدارة المصاريف والمحافظ الشخصية</p>
        </div>
        <div className="text-left">
          <span className="text-[10px] text-slate-400 block">الرصيد الإجمالي</span>
          <span className="text-base font-bold text-emerald-400">
            {totalBalance.toLocaleString('ar-EG')} ج.م
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1">
        {/* ===================== HOME TAB ===================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Wallet Balance Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#121c3b] p-3 rounded-2xl border border-emerald-900/40 relative overflow-hidden">
                <span className="text-xs text-slate-400 block mb-1">نقدي</span>
                <span className="text-sm font-bold text-emerald-400 block truncate">
                  {walletBalances.cash.toLocaleString('ar-EG')}
                </span>
                <span className="text-[10px] text-slate-500">ج.م</span>
              </div>
              <div className="bg-[#121c3b] p-3 rounded-2xl border border-blue-900/40 relative overflow-hidden">
                <span className="text-xs text-slate-400 block mb-1">إلكترونية</span>
                <span className="text-sm font-bold text-blue-400 block truncate">
                  {walletBalances.ewallet.toLocaleString('ar-EG')}
                </span>
                <span className="text-[10px] text-slate-500">ج.م</span>
              </div>
              <div className="bg-[#121c3b] p-3 rounded-2xl border border-purple-900/40 relative overflow-hidden">
                <span className="text-xs text-slate-400 block mb-1">فيزا / بنك</span>
                <span className="text-sm font-bold text-purple-400 block truncate">
                  {walletBalances.visa.toLocaleString('ar-EG')}
                </span>
                <span className="text-[10px] text-slate-500">ج.م</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button 
                onClick={() => { setTxModalMode('income'); setEditTxData(null); setTxModalOpen(true); }}
                className="flex flex-col items-center justify-center p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold gap-1 transition"
              >
                <TrendingUp size={18} />
                <span>+ دخل</span>
              </button>
              <button 
                onClick={() => { setTxModalMode('outcome'); setEditTxData(null); setTxModalOpen(true); }}
                className="flex flex-col items-center justify-center p-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold gap-1 transition"
              >
                <TrendingDown size={18} />
                <span>+ مصروف</span>
              </button>
              <button 
                onClick={() => { setTxModalMode('transfer'); setEditTxData(null); setTxModalOpen(true); }}
                className="flex flex-col items-center justify-center p-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-xl text-xs font-semibold gap-1 transition"
              >
                <ArrowLeftRight size={18} />
                <span>تحويل</span>
              </button>
              <button 
                onClick={() => setBalanceModalOpen(true)}
                className="flex flex-col items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold gap-1 transition"
              >
                <RefreshCw size={18} />
                <span>تعديل رصيد</span>
              </button>
            </div>

            {/* Recurring Due Alerts Banner */}
            {dueRecurring.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-2xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-2">
                  <AlertCircle size={16} />
                  <span>أقساط والتزامات قريبة الاستحقاق ({dueRecurring.length})</span>
                </div>
                <div className="space-y-2">
                  {dueRecurring.map(rec => (
                    <div key={rec.id} className="flex justify-between items-center bg-[#0d1630] p-2 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block">{rec.title}</span>
                        <span className="text-[10px] text-amber-400">
                          {Number(rec.amount).toLocaleString('ar-EG')} ج.م • موعده: {new Date(rec.nextDueDate).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <button 
                        onClick={() => handlePayRecurring(rec)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Check size={12} />
                        تم الدفع
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="bg-[#0f1b3b] p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-3 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="بحث في العمليات..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#080e22] text-xs text-slate-100 rounded-xl pr-9 pl-3 py-2 border border-slate-700/60 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-[#080e22] text-slate-300 text-xs rounded-lg p-1.5 border border-slate-700 flex-1 focus:outline-none"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="income">دخل فقط</option>
                  <option value="outcome">مصروف فقط</option>
                  <option value="transfer">تحويلات</option>
                </select>
                <select 
                  value={filterWallet} 
                  onChange={(e) => setFilterWallet(e.target.value)}
                  className="bg-[#080e22] text-slate-300 text-xs rounded-lg p-1.5 border border-slate-700 flex-1 focus:outline-none"
                >
                  <option value="all">كل المحافظ</option>
                  <option value="cash">نقدي</option>
                  <option value="ewallet">إلكترونية</option>
                  <option value="visa">فيزا</option>
                </select>
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                <span>العمليات الأخيرة ({filteredTransactions.length})</span>
              </div>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">لا توجد عمليات مطابقة</div>
              ) : (
                filteredTransactions.map(tx => (
                  <div key={tx.id} className="bg-[#101b38] border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        tx.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
                        tx.type === 'outcome' ? 'bg-rose-500/20 text-rose-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {tx.type === 'income' ? <TrendingUp size={16} /> :
                         tx.type === 'outcome' ? <TrendingDown size={16} /> : <ArrowLeftRight size={16} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{tx.title}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{new Date(tx.date).toLocaleDateString('ar-EG')}</span>
                          <span>•</span>
                          <span>{WALLET_NAMES[tx.wallet]}</span>
                          {tx.targetWallet && <span> ➔ {WALLET_NAMES[tx.targetWallet]}</span>}
                          <span>•</span>
                          <span className="text-slate-300">{tx.category}</span>
                        </div>
                        {tx.note && <p className="text-[10px] text-slate-400 mt-1 italic">{tx.note}</p>}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {tx.tags.map((tg, i) => (
                              <span key={i} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                {tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs font-black ${
                        tx.type === 'income' ? 'text-emerald-400' :
                        tx.type === 'outcome' ? 'text-rose-400' : 'text-purple-400'
                      }`}>
                        {tx.type === 'income' ? '+' : tx.type === 'outcome' ? '-' : ''}
                        {Number(tx.amount).toLocaleString('ar-EG')} ج.م
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-slate-500">
                        <button 
                          onClick={() => { setEditTxData(tx); setTxModalMode(tx.type); setTxModalOpen(true); }}
                          className="hover:text-slate-300 transition"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذه العملية؟')) {
                              setTransactions(prev => prev.filter(t => t.id !== tx.id));
                              showToast('تم حذف العملية');
                            }
                          }}
                          className="hover:text-rose-400 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===================== REPORTS TAB ===================== */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            {/* Period Selector */}
            <div className="flex overflow-x-auto gap-1 pb-1">
              {[7, 14, 30, 60, 90, 180, 365].map(d => (
                <button
                  key={d}
                  onClick={() => setReportDays(d)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    reportDays === d ? 'bg-blue-600 text-white' : 'bg-[#121c3b] text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  آخر {d} يوم
                </button>
              ))}
            </div>

            {/* Period Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#111c38] p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">الدخل</span>
                <span className="text-xs font-bold text-emerald-400 block truncate">
                  {reportData.totalIncome.toLocaleString('ar-EG')}
                </span>
                <span className="text-[9px] text-slate-500">ج.م</span>
              </div>
              <div className="bg-[#111c38] p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">المصروفات</span>
                <span className="text-xs font-bold text-rose-400 block truncate">
                  {reportData.totalOutcome.toLocaleString('ar-EG')}
                </span>
                <span className="text-[9px] text-slate-500">ج.م</span>
              </div>
              <div className="bg-[#111c38] p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">الصافي</span>
                <span className={`text-xs font-bold block truncate ${reportData.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {reportData.net.toLocaleString('ar-EG')}
                </span>
                <span className="text-[9px] text-slate-500">ج.م</span>
              </div>
            </div>

            {/* Doughnut Chart: Expenses by Category */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 mb-3">توزيع المصروفات حسب الفئة</h3>
              {Object.keys(reportData.categoryTotals).length > 0 ? (
                <div className="h-48 flex justify-center">
                  <Doughnut 
                    data={{
                      labels: Object.keys(reportData.categoryTotals),
                      datasets: [{
                        data: Object.values(reportData.categoryTotals),
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'],
                        borderWidth: 0
                      }]
                    }}
                    options={{
                      plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Cairo', size: 10 }, color: '#94a3b8' } }
                      },
                      maintainAspectRatio: false
                    }}
                  />
                </div>
              ) : (
                <p className="text-center text-xs text-slate-500 py-6">لا توجد مصروفات خلال هذه الفترة</p>
              )}
            </div>

            {/* Progress Bars for Wallets Outflow */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">توزيع الصرف على المحافظ</h3>
              {reportData.totalOutcome > 0 ? (
                ['visa', 'cash', 'ewallet'].map(wKey => {
                  const amt = reportData.walletOutcomeTotals[wKey] || 0;
                  const pct = Math.round((amt / reportData.totalOutcome) * 100) || 0;
                  return (
                    <div key={wKey} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{WALLET_NAMES[wKey]}</span>
                        <span>{amt.toLocaleString('ar-EG')} ج.م ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            wKey === 'visa' ? 'bg-purple-500' : wKey === 'cash' ? 'bg-emerald-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-xs text-slate-500 py-2">لا توجد مصاريف لحساب النسب</p>
              )}
            </div>

            {/* Top Expenses */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-bold text-slate-300 mb-2">أكبر العمليات مصروفاً في الفترة</h3>
              {reportData.topExpenses.map((tx, idx) => (
                <div key={tx.id} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center text-slate-400 font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="text-slate-200 font-bold block">{tx.title}</span>
                      <span className="text-[10px] text-slate-400">{tx.category} • {new Date(tx.date).toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                  <span className="font-bold text-rose-400">{Number(tx.amount).toLocaleString('ar-EG')} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== SETTINGS TAB ===================== */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Start of Month Setup */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-300 block">يوم بدء الشهر المالي للمرتب (1 - 28)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  min="1" 
                  max="28" 
                  value={startDayOfMonth} 
                  onChange={(e) => setStartDayOfMonth(Number(e.target.value))}
                  className="bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 flex-1 focus:outline-none"
                />
                <button 
                  onClick={() => showToast('تم حفظ يوم بداية الشهر')}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  حفظ
                </button>
              </div>
            </div>

            {/* Savings Goal */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">هدف الادخار</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">المستهدف (ج.م)</span>
                  <input 
                    type="number" 
                    value={savingGoal.target} 
                    onChange={(e) => setSavingGoal({ ...savingGoal, target: Number(e.target.value) })}
                    className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">المدخر حالياً (ج.م)</span>
                  <input 
                    type="number" 
                    value={savingGoal.current} 
                    onChange={(e) => setSavingGoal({ ...savingGoal, current: Number(e.target.value) })}
                    className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>نسبة الإنجاز</span>
                  <span>{savingGoal.target > 0 ? Math.round((savingGoal.current / savingGoal.target) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full" 
                    style={{ width: `${Math.min(100, savingGoal.target > 0 ? (savingGoal.current / savingGoal.target) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recurring Management */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-300">الاشتراكات والأقساط المتكررة</h3>
                <button 
                  onClick={() => { setEditRecData(null); setRecurringModalOpen(true); }}
                  className="bg-amber-600/30 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>إضافة قسط</span>
                </button>
              </div>

              <div className="space-y-2">
                {recurring.map(item => (
                  <div key={item.id} className="bg-[#080e22] p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{item.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {item.isActive ? 'نشط' : 'متوقف'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {Number(item.amount).toLocaleString('ar-EG')} ج.م • موعده: {new Date(item.nextDueDate).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handlePayRecurring(item)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold"
                      >
                        سداد
                      </button>
                      <button 
                        onClick={() => { setEditRecData(item); setRecurringModalOpen(true); }}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm('هل تريد حذف هذا الاشتراك؟')) {
                            setRecurring(prev => prev.filter(r => r.id !== item.id));
                            showToast('تم حذف الاشتراك');
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Backup & Restore */}
            <div className="bg-[#111c38] p-4 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">النسخ الاحتياطي (فورمات v3.0)</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={exportData}
                  className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl text-xs font-bold transition"
                >
                  <Download size={14} />
                  <span>تصدير JSON</span>
                </button>
                <label className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-bold cursor-pointer transition">
                  <Upload size={14} />
                  <span>استيراد JSON</span>
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-2xl space-y-2">
              <h3 className="text-xs font-bold text-rose-400">منطقة الخطر</h3>
              <button 
                onClick={() => {
                  if (window.confirm('تحذير: هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء!')) {
                    localStorage.clear();
                    setTransactions([]);
                    setRecurring([]);
                    setSavingGoal({ target: 50000, current: 0 });
                    showToast('تم مسح جميع البيانات');
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-bold transition"
              >
                مسح كل البيانات بالكامل
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ===================== BOTTOM NAVIGATION ===================== */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#091024]/90 backdrop-blur-md border-t border-slate-800 px-6 py-2 flex justify-between items-center z-30">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'home' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Home size={18} />
          <span className="text-[10px]">الرئيسية</span>
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'reports' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <ChartIcon size={18} />
          <span className="text-[10px]">التقارير</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'settings' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Settings size={18} />
          <span className="text-[10px]">الإعدادات</span>
        </button>
      </nav>

      {/* ===================== TRANSACTION MODAL ===================== */}
      {txModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#0f1b3b] border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                {editTxData ? 'تعديل العملية' : txModalMode === 'income' ? 'إضافة دخل جديد' : txModalMode === 'outcome' ? 'إضافة مصروف جديد' : 'تحويل بين المحافظ'}
              </h3>
              <button onClick={() => setTxModalOpen(false)} className="text-slate-400 text-xs font-bold">إلغاء</button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const title = form.title.value.trim();
              const amount = parseFloat(form.amount.value);
              const wallet = form.wallet.value;
              const targetWallet = form.targetWallet ? form.targetWallet.value : null;
              const category = form.category ? form.category.value : 'أخرى';
              const dateVal = form.date.value;
              const note = form.note.value;
              const tags = form.tags.value ? form.tags.value.split(' ').filter(Boolean) : [];

              if (!title || isNaN(amount) || amount <= 0) {
                alert('يرجى إدخال اسم العملية ومبلغ صحيح موجَب');
                return;
              }

              if (txModalMode === 'transfer' && wallet === targetWallet) {
                alert('يجب اختيار محفظتين مختلفتين للتحويل');
                return;
              }

              // Check if outcome exceeds wallet balance
              if (txModalMode === 'outcome' && walletBalances[wallet] < amount) {
                if (!window.confirm('تنبيه: الرصيد في هذه المحفظة غير كافٍ. هل تريد المتابعة على أي حال؟')) {
                  return;
                }
              }

              const newTx = {
                id: editTxData ? editTxData.id : Date.now().toString(),
                title,
                amount,
                type: txModalMode,
                wallet,
                targetWallet: txModalMode === 'transfer' ? targetWallet : null,
                category: txModalMode === 'transfer' ? 'تحويل مالي' : category,
                date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
                note,
                tags
              };

              if (editTxData) {
                setTransactions(prev => prev.map(t => t.id === editTxData.id ? newTx : t));
                showToast('تم تحديث العملية بنجاح');
              } else {
                setTransactions(prev => [newTx, ...prev]);
                showToast('تمت إضافة العملية بنجاح');
              }
              setTxModalOpen(false);
            }} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">العنوان</label>
                <input 
                  name="title" 
                  defaultValue={editTxData?.title || ''} 
                  required 
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">المبلغ (ج.م)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="amount" 
                  defaultValue={editTxData?.amount || ''} 
                  required 
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none font-bold" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {txModalMode === 'transfer' ? 'من محفظة' : 'المحفظة'}
                  </label>
                  <select 
                    name="wallet" 
                    defaultValue={editTxData?.wallet || 'visa'} 
                    className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2 py-2 focus:outline-none"
                  >
                    <option value="visa">فيزا / بنكية</option>
                    <option value="cash">نقدي</option>
                    <option value="ewallet">إلكترونية</option>
                  </select>
                </div>

                {txModalMode === 'transfer' ? (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">إلى محفظة</label>
                    <select 
                      name="targetWallet" 
                      defaultValue={editTxData?.targetWallet || 'cash'} 
                      className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2 py-2 focus:outline-none"
                    >
                      <option value="cash">نقدي</option>
                      <option value="ewallet">إلكترونية</option>
                      <option value="visa">فيزا / بنكية</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">الفئة</label>
                    <select 
                      name="category" 
                      defaultValue={editTxData?.category || (txModalMode === 'income' ? 'مرتب وعمل' : 'طعام ومشروبات')} 
                      className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2 py-2 focus:outline-none"
                    >
                      {(txModalMode === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">التاريخ والوقت</label>
                <input 
                  type="datetime-local" 
                  name="date" 
                  defaultValue={editTxData ? editTxData.date.slice(0, 16) : new Date().toISOString().slice(0, 16)} 
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">ملاحظة (اختياري)</label>
                <input 
                  name="note" 
                  defaultValue={editTxData?.note || ''} 
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">وسوم (مفصولة بمسافة مثل: #بنزين #سفر)</label>
                <input 
                  name="tags" 
                  defaultValue={editTxData?.tags ? editTxData.tags.join(' ') : ''} 
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition mt-2"
              >
                {editTxData ? 'حفظ التعديلات' : 'إضافة الآن'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MANUAL BALANCE MODAL ===================== */}
      {balanceModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1b3b] border border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">تعديل رصيد محفظة يدوياً</h3>
            <form onSubmit={handleManualBalanceSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">اختر المحفظة</label>
                <select 
                  value={balanceWallet} 
                  onChange={(e) => setBalanceWallet(e.target.value)}
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="cash">نقدي</option>
                  <option value="ewallet">إلكترونية</option>
                  <option value="visa">فيزا / بنكية</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">الرصيد الفعلي الحالي (ج.م)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={manualBalanceVal} 
                  onChange={(e) => setManualBalanceVal(e.target.value)} 
                  required 
                  placeholder={`الرصيد المسجل: ${walletBalances[balanceWallet]}`}
                  className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setBalanceModalOpen(false)}
                  className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold"
                >
                  تحديث
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== RECURRING MODAL ===================== */}
      {recurringModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1b3b] border border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100">
              {editRecData ? 'تعديل القسط / الاشتراك' : 'إضافة قسط دوري جديد'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const title = form.title.value.trim();
              const amount = parseFloat(form.amount.value);
              const frequency = form.frequency.value;
              const wallet = form.wallet.value;
              const category = form.category.value;
              const nextDueDate = form.nextDueDate.value;
              const isActive = form.isActive.checked;

              if (!title || isNaN(amount) || amount <= 0) {
                alert('يرجى إدخال بيانات صحيحة');
                return;
              }

              const newRec = {
                id: editRecData ? editRecData.id : Date.now().toString(),
                title,
                amount,
                frequency,
                wallet,
                category,
                nextDueDate: new Date(nextDueDate).toISOString(),
                isActive,
                note: form.note.value
              };

              if (editRecData) {
                setRecurring(prev => prev.map(r => r.id === editRecData.id ? newRec : r));
                showToast('تم تعديل الاشتراك');
              } else {
                setRecurring(prev => [...prev, newRec]);
                showToast('تمت إضافة الاشتراك');
              }
              setRecurringModalOpen(false);
            }} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">اسم الالتزام / القسط</label>
                <input name="title" defaultValue={editRecData?.title || ''} required className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">المبلغ (ج.م)</label>
                  <input type="number" step="0.01" name="amount" defaultValue={editRecData?.amount || ''} required className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">التكرار</label>
                  <select name="frequency" defaultValue={editRecData?.frequency || 'monthly'} className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2 py-2 focus:outline-none">
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">المحفظة</label>
                  <select name="wallet" defaultValue={editRecData?.wallet || 'visa'} className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2 py-2 focus:outline-none">
                    <option value="visa">فيزا</option>
                    <option value="cash">نقدي</option>
                    <option value="ewallet">إلكترونية</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">الفئة</label>
                  <select name="category" defaultValue={editRecData?.category || 'فواتير والتزامات'} className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-2 py-2 focus:outline-none">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">تاريخ الاستحقاق القادم</label>
                <input type="date" name="nextDueDate" defaultValue={editRecData ? editRecData.nextDueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)} required className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">ملاحظة</label>
                <input name="note" defaultValue={editRecData?.note || ''} className="w-full bg-[#080e22] text-xs text-slate-200 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" name="isActive" id="isActive" defaultChecked={editRecData ? editRecData.isActive : true} className="rounded" />
                <label htmlFor="isActive" className="text-xs text-slate-300">تفعيل التنبيه والخصم</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setRecurringModalOpen(false)} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-xl text-xs font-bold">إلغاء</button>
                <button type="submit" className="flex-1 bg-amber-600 text-white py-2 rounded-xl text-xs font-bold">{editRecData ? 'تحديث' : 'إضافة'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
