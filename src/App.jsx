import { useState, useEffect, useCallback } from "react";

// ====== 設定 ======
const API_URL = ""; // ← 貼上你的 GAS Web App URL

// ====== 工具函式 ======
const fmt = (n) => (!n && n !== 0 ? "—" : Math.round(n).toLocaleString());
const fmtP = (n) => (!n ? "—" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtPct = (n) => (!n && n !== 0 ? "" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`);
const plCls = (n) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-500");
const isTW = (sym) => /^\d+$/.test(sym);
const today = () => new Date().toISOString().slice(0, 10);

// ====== API 呼叫 ======
async function apiGet(action = "getData") {
  const res = await fetch(`${API_URL}?action=${action}`);
  return res.json();
}
async function apiPost(action, data = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, data }),
  });
  return res.json();
}

// ====== 市場標籤 ======
function MarketTag({ symbol }) {
  const tw = isTW(symbol);
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${tw ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-violet-50 text-violet-700 ring-1 ring-violet-200"}`}>
      {tw ? "TW" : "US"}
    </span>
  );
}

// ====== Skeleton 骨架屏 ======
function Skeleton({ rows = 5, cols = 8 }) {
  return (
    <div className="animate-pulse p-6">
      <div className="h-4 bg-slate-200 rounded w-48 mb-6" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 bg-slate-200 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ====== Loading 畫面 ======
function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50">
      <div className="relative">
        <div className="w-16 h-16 border-[3px] border-slate-200 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-[3px] border-transparent border-t-blue-600 rounded-full animate-spin" />
      </div>
      <p className="mt-5 text-slate-500 text-sm font-medium tracking-wide animate-pulse">
        同步即時股價中...
      </p>
    </div>
  );
}

// ====== Toast 通知 ======
function Toast({ message, visible }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-medium shadow-2xl transition-all duration-300 z-50 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
      {message}
    </div>
  );
}

// ====== 摘要卡片 ======
function SummaryCard({ label, value, sub, icon }) {
  const isNeg = typeof value === "string" && value.startsWith("-");
  const isPos = typeof value === "string" && value.startsWith("+");
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-2">
        <span>{icon}</span>{label}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${isPos ? "text-emerald-600" : isNeg ? "text-rose-600" : "text-slate-800"}`}>
        {value}
      </div>
      {sub && <div className={`text-xs mt-1 font-medium ${sub.startsWith("+") ? "text-emerald-500" : sub.startsWith("-") ? "text-rose-500" : "text-slate-400"}`}>{sub}</div>}
    </div>
  );
}

// ====== Modal ======
function Modal({ open, onClose, title, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl ${width} w-full max-h-[90vh] overflow-y-auto animate-in`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ====== 表單輸入 ======
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition";
const selectCls = inputCls;

// ====== 主元件 ======
export default function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState({ msg: "", show: false });
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // 'add' | 'sell' | 'div' | 'inv' | 'api'
  const [invRows, setInvRows] = useState([]);
  const [apiResults, setApiResults] = useState([]);

  // Form states
  const [addForm, setAddForm] = useState({ market: "TW", broker: "凱基", symbol: "", date: today(), price: "", shares: "", fee: "0" });
  const [sellForm, setSellForm] = useState({ market: "TW", symbol: "", sellDate: today(), sellPrice: "", sellShares: "", fee: "0", tax: "0" });
  const [divForm, setDivForm] = useState({ market: "TW", symbol: "", year: new Date().getFullYear(), exDate: today(), cashDiv: "0", stockDiv: "0", heldShares: "" });

  const showToast = useCallback((msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 3500);
  }, []);

  // ====== 載入資料 ======
  const loadData = useCallback(async () => {
    if (!API_URL) { setLoading(false); return; }
    try {
      const res = await apiGet("getData");
      if (res.success) setData(res.data);
      else showToast("載入失敗：" + res.error);
    } catch (e) {
      showToast("連線失敗：" + e.message);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ====== 操作 ======
  const doAction = async (action, msg) => {
    setBusy(true); showToast(msg);
    try {
      const res = await apiPost(action);
      if (res.success) {
        if (res.data) setData(res.data);
        showToast(res.message || (res.count !== undefined ? (res.count > 0 ? `完成！新增 ${res.count} 筆` : "無新資料") : "完成！"));
        if (!res.data) await loadData();
      } else showToast("錯誤：" + res.error);
    } catch (e) { showToast("錯誤：" + e.message); }
    setBusy(false);
  };

  const submitAdd = async () => {
    const d = { ...addForm, price: parseFloat(addForm.price), shares: parseInt(addForm.shares), fee: parseInt(addForm.fee) || 0 };
    if (!d.symbol || !d.price || !d.shares) { showToast("請填寫必要欄位"); return; }
    setModal(null); setBusy(true); showToast("新增中...");
    try {
      const res = await apiPost("addHolding", d);
      showToast(res.success ? res.message : "錯誤：" + res.error);
      await loadData();
    } catch (e) { showToast("錯誤：" + e.message); }
    setBusy(false);
  };

  const submitSell = async () => {
    const d = { ...sellForm, sellPrice: parseFloat(sellForm.sellPrice), sellShares: parseInt(sellForm.sellShares), fee: parseInt(sellForm.fee) || 0, tax: parseInt(sellForm.tax) || 0 };
    if (!d.symbol || !d.sellPrice || !d.sellShares) { showToast("請填寫必要欄位"); return; }
    setModal(null); setBusy(true); showToast("賣出處理中...");
    try {
      const res = await apiPost("sellHolding", d);
      showToast(res.success ? res.message : "錯誤：" + res.error);
      await loadData();
    } catch (e) { showToast("錯誤：" + e.message); }
    setBusy(false);
  };

  const submitDiv = async () => {
    const d = { ...divForm, year: parseInt(divForm.year), cashDiv: parseFloat(divForm.cashDiv) || 0, stockDiv: parseFloat(divForm.stockDiv) || 0, heldShares: parseInt(divForm.heldShares) || 0 };
    if (!d.symbol || !d.year || !d.heldShares) { showToast("請填寫必要欄位"); return; }
    setModal(null); setBusy(true); showToast("記錄股利中...");
    try {
      const res = await apiPost("addDividend", d);
      showToast(res.success ? res.message : "錯誤：" + res.error);
      await loadData();
    } catch (e) { showToast("錯誤：" + e.message); }
    setBusy(false);
  };

  const openInv = async () => {
    setModal("inv"); setInvRows([]);
    try {
      const res = await apiGet("getInventory");
      setInvRows(res.success ? res.data : []);
    } catch (e) { showToast("錯誤：" + e.message); }
  };

  const delRow = async (row) => {
    if (!confirm(`確定刪除第 ${row} 列？`)) return;
    showToast("刪除中...");
    try {
      const res = await apiPost("deleteRow", { row });
      showToast(res.success ? res.message : "錯誤：" + res.error);
      openInv();
    } catch (e) { showToast("錯誤：" + e.message); }
  };

  const openApiTest = async () => {
    setModal("api"); setApiResults([]);
    try {
      const res = await apiGet("testApis");
      setApiResults(res.success ? res.data : []);
    } catch (e) { showToast("錯誤：" + e.message); }
  };

  // 交易稅自動計算
  useEffect(() => {
    if (sellForm.market === "TW") {
      const tax = Math.round((parseFloat(sellForm.sellPrice) || 0) * (parseInt(sellForm.sellShares) || 0) * 0.003);
      setSellForm((f) => ({ ...f, tax: String(tax) }));
    }
  }, [sellForm.market, sellForm.sellPrice, sellForm.sellShares]);

  // 股利預覽
  const divCashPreview = Math.round((parseFloat(divForm.cashDiv) || 0) * (parseInt(divForm.heldShares) || 0));
  const divStockPreview = divForm.market === "TW"
    ? Math.floor((parseFloat(divForm.stockDiv) || 0) / 10 * (parseInt(divForm.heldShares) || 0))
    : Math.floor((parseFloat(divForm.stockDiv) || 0) * (parseInt(divForm.heldShares) || 0));

  // ====== 渲染 ======
  if (loading) return <LoadingScreen />;

  if (!API_URL) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">設定 API 連線</h2>
          <p className="text-sm text-slate-500 mb-6">請在程式碼中填入 GAS Web App URL</p>
          <code className="block bg-slate-100 rounded-lg px-4 py-3 text-xs text-slate-600 font-mono">const API_URL = "https://script.google.com/macros/s/.../exec"</code>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const pl = s.totalPL || 0;
  const rpl = s.totalRealizedPL || 0;
  const dv = s.totalCashDividend || s.totalDividend || 0;
  const totalAll = pl + rpl + dv;
  const totalAllPct = s.totalCost > 0 ? totalAll / s.totalCost : 0;

  const tabs = [
    { label: "📊 未實現損益", count: data?.unrealized?.length || 0 },
    { label: "📕 已實現損益", count: data?.realized?.length || 0 },
    { label: "💰 股利記錄", count: data?.dividends?.length || 0 },
  ];

  const brokers = ["凱基", "富邦", "元大", "國泰", "永豐", "中信", "玉山", "台新", "其他"];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">📊 投資組合儀表板</h1>
              <p className="text-blue-200 text-xs mt-1">最後更新：{s.lastUpdate || "—"}</p>
            </div>
            <button onClick={() => { setLoading(true); loadData(); }} disabled={busy} className="text-blue-200 hover:text-white text-sm bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition disabled:opacity-50">
              🔃 重整
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 mb-5">
          {[
            { label: "➕ 新增持股", cls: "bg-blue-600 hover:bg-blue-700 text-white", action: () => { setAddForm({ ...addForm, date: today() }); setModal("add"); } },
            { label: "📋 重新計算", cls: "bg-emerald-600 hover:bg-emerald-700 text-white", action: () => doAction("recalc", "重新計算中（約 30 秒）...") },
            { label: "🔄 更新股價", cls: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200", action: () => doAction("updatePrices", "更新股價中（約 30 秒）...") },
            { label: "📤 記錄賣出", cls: "bg-rose-600 hover:bg-rose-700 text-white", action: () => { setSellForm({ ...sellForm, sellDate: today() }); setModal("sell"); } },
            { label: "💰 記錄股利", cls: "bg-violet-600 hover:bg-violet-700 text-white", action: () => { setDivForm({ ...divForm, year: new Date().getFullYear(), exDate: today() }); setModal("div"); } },
            { label: "🔍 抓取除權息", cls: "bg-amber-500 hover:bg-amber-600 text-white", action: () => doAction("fetchDividends", "抓取除權息中（約 60 秒）...") },
            { label: "📝 持股明細", cls: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200", action: openInv },
            { label: "🧪 測試API", cls: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200", action: openApiTest },
            { label: "⏰ 每日自動", cls: "bg-white hover:bg-slate-50 text-slate-700 ring-1 ring-slate-200", action: () => doAction("setupTrigger", "設定中...") },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} disabled={busy} className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition shadow-sm disabled:opacity-50 ${btn.cls}`}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <SummaryCard icon="💰" label="總投入成本" value={fmt(s.totalCost)} />
          <SummaryCard icon="📈" label="目前市值" value={fmt(s.totalMarket)} />
          <SummaryCard icon="📊" label="未實現損益" value={`${pl >= 0 ? "+" : ""}${fmt(pl)}`} sub={fmtPct(s.totalPLPct)} />
          <SummaryCard icon="📕" label="已實現損益" value={`${rpl >= 0 ? "+" : ""}${fmt(rpl)}`} />
          <SummaryCard icon="🎁" label="累計股利" value={fmt(dv)} />
          <SummaryCard icon="🏆" label="總報酬" value={`${totalAll >= 0 ? "+" : ""}${fmt(totalAll)}`} sub={fmtPct(totalAllPct)} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mb-0">
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${tab === i ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              {t.label} <span className="text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Panels */}
        <div className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-slate-200 overflow-x-auto">
          {/* 未實現損益 */}
          {tab === 0 && (
            !data?.unrealized?.length ? <div className="py-16 text-center text-slate-400">尚無持股，請點「➕ 新增持股」開始</div> :
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  {["代碼","名稱","","券商","股數","平均成本","目前股價","漲跌","投入成本","目前市值","損益","報酬率","股利","來源"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.unrealized.map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/40 transition">
                    <td className="px-3 py-2.5 font-semibold text-blue-700">{r.symbol}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{r.name}</td>
                    <td className="px-2 py-2.5"><MarketTag symbol={r.symbol} /></td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{r.broker}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.shares)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtP(r.avgCost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmtP(r.curPrice)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${plCls(r.change)}`}>{r.change > 0 ? "+" : ""}{fmtP(r.change)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{fmt(r.totalCost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{fmt(r.marketValue)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${plCls(r.plAmount)}`}>{r.plAmount >= 0 ? "+" : ""}{fmt(r.plAmount)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${plCls(r.plPct)}`}>{fmtPct(r.plPct)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-violet-600">{r.accDiv > 0 ? fmt(r.accDiv) : "—"}</td>
                    <td className="px-3 py-2.5 text-center text-[10px] text-slate-300">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 已實現損益 */}
          {tab === 1 && (
            !data?.realized?.length ? <div className="py-16 text-center text-slate-400">尚無賣出記錄</div> :
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  {["代碼","名稱","","賣出日期","賣出價","股數","平均成本","手續費","稅","損益","報酬率"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.realized.map((r, i) => (
                  <tr key={i} className="hover:bg-rose-50/30 transition">
                    <td className="px-3 py-2.5 font-semibold text-blue-700">{r.symbol}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{r.name}</td>
                    <td className="px-2 py-2.5"><MarketTag symbol={r.symbol} /></td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{r.sellDate}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtP(r.sellPrice)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.sellShares)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtP(r.avgCost)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{fmt(r.fee)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{fmt(r.tax)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-bold ${plCls(r.realizedPL)}`}>{r.realizedPL >= 0 ? "+" : ""}{fmt(r.realizedPL)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${plCls(r.returnPct)}`}>{fmtPct(r.returnPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 股利記錄 */}
          {tab === 2 && (
            !data?.dividends?.length ? <div className="py-16 text-center text-slate-400">尚無股利記錄，請點「🔍 抓取除權息」</div> :
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80">
                  {["代碼","名稱","年度","除息日","現金股利","股票股利","持股數","實領現金","配股數","殖利率","備註"].map((h, i) => (
                    <th key={i} className="px-3 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.dividends.map((r, i) => (
                  <tr key={i} className="hover:bg-violet-50/30 transition">
                    <td className="px-3 py-2.5 font-semibold text-blue-700">{r.symbol}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{r.name}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600">{r.year}</td>
                    <td className="px-3 py-2.5 text-center text-slate-600 text-xs">{r.exDate}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtP(r.cashDiv)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtP(r.stockDiv)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.heldShares)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-emerald-600">{fmt(r.cashReceived)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(r.stockReceived)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{fmtPct(r.yieldPct)}</td>
                    <td className="px-3 py-2.5 text-center text-[10px] text-slate-300">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-400">
        Stock Portfolio v5 · Vercel + Google Apps Script · TWSE / GOOGLEFINANCE / Fugle / Yahoo / Alpha Vantage
      </footer>

      {/* ===== Modals ===== */}

      {/* 新增持股 */}
      <Modal open={modal === "add"} onClose={() => setModal(null)} title="➕ 新增持股">
        <div className="grid grid-cols-2 gap-3">
          <Field label="市場"><select className={selectCls} value={addForm.market} onChange={(e) => setAddForm({ ...addForm, market: e.target.value })}><option value="TW">TW 台股</option><option value="US">US 美股</option></select></Field>
          <Field label="證券公司"><select className={selectCls} value={addForm.broker} onChange={(e) => setAddForm({ ...addForm, broker: e.target.value })}>{brokers.map((b) => <option key={b}>{b}</option>)}</select></Field>
          <Field label="股票代碼"><input className={inputCls} placeholder="2330 或 AAPL" value={addForm.symbol} onChange={(e) => setAddForm({ ...addForm, symbol: e.target.value })} /></Field>
          <Field label="交易日期"><input type="date" className={inputCls} value={addForm.date} onChange={(e) => setAddForm({ ...addForm, date: e.target.value })} /></Field>
          <Field label="買入價格"><input type="number" step="0.01" className={inputCls} value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} /></Field>
          <Field label="買入股數"><input type="number" className={inputCls} value={addForm.shares} onChange={(e) => setAddForm({ ...addForm, shares: e.target.value })} /></Field>
        </div>
        <Field label="手續費"><input type="number" className={inputCls} value={addForm.fee} onChange={(e) => setAddForm({ ...addForm, fee: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition">取消</button>
          <button onClick={submitAdd} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50">確認新增</button>
        </div>
      </Modal>

      {/* 記錄賣出 */}
      <Modal open={modal === "sell"} onClose={() => setModal(null)} title="📤 記錄賣出">
        <div className="grid grid-cols-2 gap-3">
          <Field label="市場"><select className={selectCls} value={sellForm.market} onChange={(e) => setSellForm({ ...sellForm, market: e.target.value })}><option value="TW">TW 台股</option><option value="US">US 美股</option></select></Field>
          <Field label="股票代碼"><input className={inputCls} placeholder="2330" value={sellForm.symbol} onChange={(e) => setSellForm({ ...sellForm, symbol: e.target.value })} /></Field>
          <Field label="賣出日期"><input type="date" className={inputCls} value={sellForm.sellDate} onChange={(e) => setSellForm({ ...sellForm, sellDate: e.target.value })} /></Field>
          <Field label="賣出價格"><input type="number" step="0.01" className={inputCls} value={sellForm.sellPrice} onChange={(e) => setSellForm({ ...sellForm, sellPrice: e.target.value })} /></Field>
          <Field label="賣出股數"><input type="number" className={inputCls} value={sellForm.sellShares} onChange={(e) => setSellForm({ ...sellForm, sellShares: e.target.value })} /></Field>
          <Field label="手續費"><input type="number" className={inputCls} value={sellForm.fee} onChange={(e) => setSellForm({ ...sellForm, fee: e.target.value })} /></Field>
        </div>
        <Field label="交易稅（台股 0.3% 自動計算）"><input type="number" className={inputCls} value={sellForm.tax} onChange={(e) => setSellForm({ ...sellForm, tax: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition">取消</button>
          <button onClick={submitSell} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition disabled:opacity-50">確認賣出</button>
        </div>
      </Modal>

      {/* 記錄股利 */}
      <Modal open={modal === "div"} onClose={() => setModal(null)} title="💰 記錄股利發放">
        <div className="grid grid-cols-2 gap-3">
          <Field label="市場"><select className={selectCls} value={divForm.market} onChange={(e) => setDivForm({ ...divForm, market: e.target.value })}><option value="TW">TW 台股</option><option value="US">US 美股</option></select></Field>
          <Field label="股票代碼"><input className={inputCls} placeholder="2330" value={divForm.symbol} onChange={(e) => setDivForm({ ...divForm, symbol: e.target.value })} /></Field>
          <Field label="發放年度"><input type="number" className={inputCls} value={divForm.year} onChange={(e) => setDivForm({ ...divForm, year: e.target.value })} /></Field>
          <Field label="除權息日"><input type="date" className={inputCls} value={divForm.exDate} onChange={(e) => setDivForm({ ...divForm, exDate: e.target.value })} /></Field>
          <Field label="每股現金股利"><input type="number" step="0.01" className={inputCls} value={divForm.cashDiv} onChange={(e) => setDivForm({ ...divForm, cashDiv: e.target.value })} /></Field>
          <Field label="每股股票股利"><input type="number" step="0.01" className={inputCls} value={divForm.stockDiv} onChange={(e) => setDivForm({ ...divForm, stockDiv: e.target.value })} /></Field>
        </div>
        <Field label="配息時持股數"><input type="number" className={inputCls} placeholder="除權息日當天持有" value={divForm.heldShares} onChange={(e) => setDivForm({ ...divForm, heldShares: e.target.value })} /></Field>
        <div className="bg-slate-50 rounded-xl p-3 mt-3 text-sm text-slate-600 flex gap-6">
          <span>實領現金：<strong className="text-emerald-600">{divForm.heldShares ? divCashPreview.toLocaleString() : "—"}</strong></span>
          <span>配股股數：<strong>{divStockPreview > 0 ? divStockPreview.toLocaleString() + " 股" : "無配股"}</strong></span>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition">取消</button>
          <button onClick={submitDiv} disabled={busy} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition disabled:opacity-50">確認記錄</button>
        </div>
      </Modal>

      {/* 持股明細 */}
      <Modal open={modal === "inv"} onClose={() => setModal(null)} title="📝 持股庫存明細" width="max-w-3xl">
        {!invRows.length ? <Skeleton rows={6} cols={6} /> :
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50">{["市場","券商","代碼","名稱","日期","價格","股數","備註",""].map((h, i) => <th key={i} className="px-2 py-2 text-slate-400 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {invRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 border-b border-slate-50">
                    <td className="px-2 py-1.5">{r.market}</td>
                    <td className="px-2 py-1.5">{r.broker}</td>
                    <td className="px-2 py-1.5 font-semibold text-blue-700">{r.symbol}</td>
                    <td className="px-2 py-1.5 text-slate-500">{r.name}</td>
                    <td className="px-2 py-1.5 text-slate-500">{r.date}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtP(r.price)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmt(r.shares)}</td>
                    <td className="px-2 py-1.5 text-slate-300 text-[10px]">{r.note}</td>
                    <td className="px-2 py-1.5"><button onClick={() => delRow(r.row)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded p-1 transition">🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-center py-3 text-xs text-slate-400">共 {invRows.length} 筆</div>
          </div>
        }
      </Modal>

      {/* API 測試 */}
      <Modal open={modal === "api"} onClose={() => setModal(null)} title="🧪 API 連線測試">
        {!apiResults.length ? <Skeleton rows={5} cols={3} /> :
          <div className="space-y-2">
            {apiResults.map((r, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-lg">{r.status === "✅" ? "✅" : r.status === "⚠️" ? "⚠️" : "❌"}</span>
                <div>
                  <div className={`text-sm font-medium ${r.status === "✅" ? "text-emerald-700" : r.status === "⚠️" ? "text-amber-700" : "text-rose-700"}`}>{r.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        }
      </Modal>

      <Toast message={toast.msg} visible={toast.show} />
    </div>
  );
}
