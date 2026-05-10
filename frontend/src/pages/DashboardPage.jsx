import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { TrendingUp, DollarSign, Heart, Target, Bot, Zap, Loader2, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/ui';
import { dashboardAPI } from '@/services/api';

const RevenueSection = lazy(() => import('@/components/dashboard/RevenueSection'));
const BeneficiariesSection = lazy(() => import('@/components/dashboard/BeneficiariesSection'));

const PIE_COLORS = ['#6b4cc2', '#2f7d6c', '#2b5c8a', '#b26b2e', '#b04a4a', '#2a7a8a'];
const CATEGORY_COLORS = {
  grant: '#6b4cc2',
  donatie: '#3f6fb5',
  donatie_mare: '#b07a2a',
  redirectionare_3_5: '#2f7d6c',
};
const CATEGORY_LABELS = {
  grant: 'Granturi',
  donatie: 'Donații',
  donatie_mare: 'Donații Mari',
  redirectionare_3_5: 'Redirecționări 3.5%',
};
const MONTH_NAMES = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatRON(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

function hasFinancialValues(rows) {
  return rows.some((row) => (
    Number(row.granturi || 0) !== 0
    || Number(row.donatii || 0) !== 0
    || Number(row.donatii_mari || 0) !== 0
    || Number(row.redirectionari || 0) !== 0
    || Number(row.cheltuieli || 0) !== 0
  ));
}

function normalizeFinancialRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    ...row,
    month: row.month || row.luna || MONTH_NAMES[index] || `Luna ${index + 1}`,
    granturi: Number(row.granturi || 0),
    donatii: Number(row.donatii || 0),
    donatii_mari: Number(row.donatii_mari || 0),
    redirectionari: Number(row.redirectionari || 0),
    cheltuieli: Number(row.cheltuieli || 0),
  }));
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [financialData, setFinancialData] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [benefLoading, setBenefLoading] = useState(false);
  const [benefLoaded, setBenefLoaded] = useState(false);
  const [error, setError] = useState('');
  const [financialError, setFinancialError] = useState('');
  const [benefError, setBenefError] = useState('');

  const [benefTab, setBenefTab] = useState('total');
  const [revenueView, setRevenueView] = useState('area');
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const autoFallbackYearRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      setSummaryLoading(true);
      setError('');
      try {
        const sum = await dashboardAPI.getSummary();
        if (cancelled) return;
        setSummary(sum);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Eroare la încărcarea datelor.');
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    }
    loadSummary();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!summary) return;

    let cancelled = false;
    async function loadFinancial() {
      setFinancialLoading(true);
      setFinancialError('');
      try {
        const fin = await dashboardAPI.getFinancialMonthly(chartYear);
        if (cancelled) return;
        const normalized = normalizeFinancialRows(fin);
        if (
          chartYear === new Date().getFullYear()
          && !autoFallbackYearRef.current
          && !hasFinancialValues(normalized)
          && chartYear > 2000
        ) {
          autoFallbackYearRef.current = true;
          setChartYear((year) => year - 1);
          return;
        }
        setFinancialData(normalized);
      } catch (err) {
        if (!cancelled) setFinancialError(err.message || 'Nu am putut încărca evoluția lunară.');
      } finally {
        if (!cancelled) setFinancialLoading(false);
      }
    }

    loadFinancial();
    return () => { cancelled = true; };
  }, [chartYear, summary]);

  useEffect(() => {
    if (!summary || benefLoaded) return;

    let cancelled = false;
    async function loadBeneficiaries() {
      setBenefLoading(true);
      setBenefError('');
      try {
        const ben = await dashboardAPI.getBeneficiariByProject();
        if (cancelled) return;
        setBeneficiaries(ben.map((b) => ({
          project: b.project_name,
          directi: b.directi,
          total: b.total,
        })));
        setBenefLoaded(true);
      } catch (err) {
        if (!cancelled) setBenefError(err.message || 'Nu am putut încărca beneficiarii.');
      } finally {
        if (!cancelled) setBenefLoading(false);
      }
    }

    loadBeneficiaries();
    return () => { cancelled = true; };
  }, [benefLoaded, summary]);

  const handleAI = () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    // Simple client-side response based on loaded data
    setTimeout(() => {
      let r = '';
      const lower = aiQuery.toLowerCase();
      if (summary) {
        if (lower.includes('venit') || lower.includes('donator') || lower.includes('donați')) {
          r = `Veniturile totale sunt ${summary.total_venituri?.toLocaleString('ro-RO')} RON.\n\n`;
          if (summary.venituri_by_category) {
            r += 'Structura veniturilor:\n';
            Object.entries(summary.venituri_by_category).forEach(([cat, val]) => {
              r += `• ${CATEGORY_LABELS[cat] || cat}: ${val.toLocaleString('ro-RO')} RON\n`;
            });
          }
        } else if (lower.includes('cheltuial') || lower.includes('expens')) {
          r = `Cheltuieli aprobate: ${summary.total_cheltuieli?.toLocaleString('ro-RO')} RON\nÎn așteptare: ${summary.cheltuieli_in_asteptare_count} cheltuieli (${summary.cheltuieli_in_asteptare_suma?.toLocaleString('ro-RO')} RON)\nSold disponibil: ${summary.sold_disponibil?.toLocaleString('ro-RO')} RON`;
        } else if (lower.includes('proiect')) {
          r = `Proiecte active: ${summary.proiecte_active} din ${summary.proiecte_total}\nBeneficiari direcți: ${summary.total_beneficiari_directi?.toLocaleString('ro-RO')}`;
        } else {
          r = `Sumar organizație:\n• Venituri: ${summary.total_venituri?.toLocaleString('ro-RO')} RON\n• Cheltuieli: ${summary.total_cheltuieli?.toLocaleString('ro-RO')} RON\n• Sold: ${summary.sold_disponibil?.toLocaleString('ro-RO')} RON\n• Proiecte active: ${summary.proiecte_active}/${summary.proiecte_total}\n• Beneficiari direcți: ${summary.total_beneficiari_directi?.toLocaleString('ro-RO')}`;
        }
      } else {
        r = 'Nu sunt date disponibile încă. Încercați din nou.';
      }
      setAiLoading(false);
      setAiResponse(r);
    }, 800);
  };

  // Build revenue pie from summary
  const revenuePie = summary?.venituri_by_category
    ? Object.entries(summary.venituri_by_category).map(([cat, val]) => ({
        name: CATEGORY_LABELS[cat] || cat,
        value: val,
        color: CATEGORY_COLORS[cat] || '#94a3b8',
      }))
    : [];

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Se încarcă dashboard-ul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium mb-1">Eroare la încărcarea datelor</p>
          <p className="text-xs text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={TrendingUp} label="Venituri Totale" value={`${formatRON(summary?.total_venituri || 0)} RON`} color="violet" />
        <StatCard icon={DollarSign} label="Cheltuieli Aprobate" value={`${formatRON(summary?.total_cheltuieli || 0)} RON`} color="emerald" />
        <StatCard icon={Heart} label="Beneficiari Direcți" value={(summary?.total_beneficiari_directi || 0).toLocaleString('ro-RO')} color="blue" />
        <StatCard icon={Target} label="Proiecte Active" value={`${summary?.proiecte_active || 0} / ${summary?.proiecte_total || 0}`} color="rose" />
      </div>

      {/* Revenue chart */}
      <div className="paper-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg text-slate-900 font-display">Structura Veniturilor {chartYear}</h3>
            <p className="text-xs text-slate-500 mt-0.5 uppercase tracking-[0.2em]">Granturi · Donații · Redirecționări 3.5%</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center border border-slate-200 rounded-full overflow-hidden bg-white">
              <button onClick={() => setChartYear((y) => y - 1)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">←</button>
              <span className="text-xs font-semibold text-slate-700 px-1">{chartYear}</span>
              <button onClick={() => setChartYear((y) => Math.min(y + 1, new Date().getFullYear()))} className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">→</button>
            </div>
            <button onClick={() => setRevenueView('area')} className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${revenueView === 'area' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'border-slate-200 text-slate-600 hover:bg-white'}`}>Arie</button>
            <button onClick={() => setRevenueView('bar')} className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${revenueView === 'bar' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'border-slate-200 text-slate-600 hover:bg-white'}`}>Bare</button>
          </div>
        </div>
        {revenuePie.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-5">
            {revenuePie.map((r) => (
              <div key={r.name} className="rounded-2xl p-3 text-center border border-slate-200/70 bg-white/70">
                <p className="text-base font-black font-display" style={{ color: r.color }}>{formatRON(r.value)}</p>
                <p className="text-[11px] font-semibold text-slate-600 mt-1 uppercase tracking-[0.16em]">{r.name}</p>
              </div>
            ))}
          </div>
        )}
        <Suspense fallback={<div className="h-[360px] rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />}>
          <RevenueSection
            financialData={financialData}
            revenueView={revenueView}
            loading={financialLoading}
            error={financialError}
          />
        </Suspense>
      </div>

      {/* Beneficiaries */}
      <div className="paper-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg text-slate-900 font-display">Beneficiari</h3>
            <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">{(summary?.total_beneficiari_directi || 0).toLocaleString('ro-RO')} beneficiari direcți</p>
          </div>
          <div className="flex gap-2">
            {['total', 'proiecte'].map((v) => (
              <button key={v} onClick={() => setBenefTab(v)} className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors capitalize ${benefTab === v ? 'bg-violet-50 text-violet-700 border-violet-200' : 'border-slate-200 text-slate-600 hover:bg-white'}`}>{v}</button>
            ))}
          </div>
        </div>

        <Suspense fallback={<div className="h-[220px] rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />}>
          <BeneficiariesSection
            beneficiaries={beneficiaries}
            benefTab={benefTab}
            loading={benefLoading}
            loaded={benefLoaded}
            error={benefError}
          />
        </Suspense>
      </div>

      {/* AI Analyst */}
      <div className="paper-card p-6 border-l-4 border-l-violet-500">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center border border-violet-200">
            <Bot className="w-5 h-5 text-violet-700" />
          </div>
          <div>
            <h3 className="text-slate-900 font-display">AI Data Analyst</h3>
            <p className="text-slate-500 text-xs uppercase tracking-[0.2em]">CiviUp Intelligence</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-700 text-xs font-semibold">Online</span>
          </span>
        </div>
        <div className="flex gap-3 mb-3">
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAI()}
            placeholder="Ex: Cum stăm cu donatorii? Analizează cheltuielile..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-violet-300 transition-all"
          />
          <button
            onClick={handleAI}
            disabled={aiLoading}
            className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white px-5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {aiLoading ? 'Analizez...' : 'Analizează'}
          </button>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          {['Venituri totale', 'Analiză cheltuieli', 'Status proiecte'].map((q) => (
            <button key={q} onClick={() => setAiQuery(q)} className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full transition-colors">{q}</button>
          ))}
        </div>
        {aiLoading && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-3">
            {[0, 150, 300].map((d) => (
              <div key={d} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }}></div>
            ))}
            <span className="text-slate-600 text-sm ml-1">Analizez datele...</span>
          </div>
        )}
        {aiResponse && !aiLoading && (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{aiResponse}</div>
        )}
        {!aiLoading && !aiResponse && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 text-center">
            <p className="text-slate-500 text-xs">Puneți o întrebare despre date, donatori, cheltuieli sau proiecte.</p>
          </div>
        )}
      </div>
    </div>
  );
}
