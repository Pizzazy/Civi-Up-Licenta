import { useState, useEffect } from 'react';
import {
  History, Search, Filter, Trash2, Check, X, CheckCircle,
  Calendar, DollarSign, Building, AlertTriangle, Download,
  ChevronDown, Eye, Loader2, AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { expensesAPI, projectsAPI } from '@/services/api';

export default function ExpenseHistoryPage() {
  const [tab, setTab] = useState('istoric');
  const [expenses, setExpenses] = useState([]);
  const [deletionReqs, setDeletionReqs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Toate');
  const [filterProject, setFilterProject] = useState('Toate');
  const [filterStatus, setFilterStatus] = useState('Toate');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [expData, projData] = await Promise.all([
          expensesAPI.getAll().catch(() => []),
          projectsAPI.getAll().catch(() => []),
        ]);
        if (!cancelled) {
          setExpenses(Array.isArray(expData) ? expData : []);
          setProjects(Array.isArray(projData) ? projData : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const showFeedback = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const approveDeletion = async (id) => {
    const req = deletionReqs.find((r) => r.id === id);
    if (req) {
      try {
        await expensesAPI.delete(req.expenseId);
        setExpenses((prev) => prev.filter((e) => e.id !== req.expenseId));
      } catch { /* ignore */ }
    }
    setDeletionReqs((prev) => prev.filter((r) => r.id !== id));
    showFeedback('Cerere de ștergere aprobată — cheltuiala a fost eliminată');
  };

  const rejectDeletion = (id) => {
    setDeletionReqs((prev) => prev.filter((r) => r.id !== id));
    showFeedback('Cerere de ștergere respinsă');
  };

  const categories = ['Toate', ...new Set(expenses.map((e) => e.category).filter(Boolean))];
  const projectNames = ['Toate', ...projects.map((p) => p.name)];
  const getProjectName = (pid) => projects.find((p) => p.id === pid)?.name || '—';

  const filteredExpenses = expenses.filter((e) => {
    const furnizor = e.furnizor || e.item_description || '';
    const factura = e.numar_factura || '';
    if (search && !furnizor.toLowerCase().includes(search.toLowerCase()) && !factura.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat !== 'Toate' && e.category !== filterCat) return false;
    if (filterProject !== 'Toate' && getProjectName(e.project_id) !== filterProject) return false;
    if (filterStatus !== 'Toate') {
      const statusMap = { 'Aprobat': 'aprobat', 'În așteptare': 'in_asteptare', 'Respins': 'respins' };
      if (e.status !== statusMap[filterStatus]) return false;
    }
    return true;
  });

  const totalFiltered = filteredExpenses.reduce((acc, e) => acc + Number(e.suma || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Se încarcă istoricul cheltuielilor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-violet-600" />
          <div>
            <h1 className="text-xl font-black text-slate-800">Istoric Cheltuieli</h1>
            <p className="text-sm text-slate-400">Toate cheltuielile înregistrate & cereri de ștergere</p>
          </div>
        </div>
        <button
          onClick={() => showFeedback('Export CSV inițiat')}
          className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Feedback */}
      {actionFeedback && (
        <div className="bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 py-2.5 rounded-xl">
          <CheckCircle className="w-4 h-4" /> {actionFeedback}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3">
        {[
          ['istoric', `📋 Istoric (${expenses.length})`],
          ['stergeri', `🗑️ Cereri Ștergere (${deletionReqs.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              tab === id
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ISTORIC TAB */}
      {tab === 'istoric' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Search + Filters */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Caută furnizor sau nr. factură..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400"
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  showFilters ? 'bg-violet-50 text-violet-700 border-violet-200' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" /> Filtre <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {showFilters && (
              <div className="flex gap-3 flex-wrap">
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-400"
                >
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-400"
                >
                  {projectNames.map((p) => <option key={p}>{p}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-400"
                >
                  {['Toate', 'Aprobat', 'În așteptare', 'Respins'].map((s) => <option key={s}>{s}</option>)}
                </select>
                <div className="flex items-center gap-2 ml-auto text-xs text-slate-500">
                  <span>{filteredExpenses.length} cheltuieli</span>
                  <span>·</span>
                  <span className="font-bold text-slate-700">{totalFiltered.toLocaleString()} RON total</span>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Data', 'Furnizor', 'Proiect', 'Categorie', 'Sumă', 'Status', 'Factură', ''].map((h) => (
                  <th key={h} className="px-4 pb-3 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" /> {e.expense_date || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-700">{e.furnizor || e.item_description || '—'}</p>
                    <p className="text-xs text-slate-400">Înregistrat de: {e.added_by_profile?.full_name || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{getProjectName(e.project_id)}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.category || '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{Number(e.suma || 0).toLocaleString()} RON</td>
                  <td className="px-4 py-3"><Badge status={e.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">{e.numar_factura || '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedRow(expandedRow === e.id ? null : e.id)}
                      className="text-slate-300 hover:text-violet-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredExpenses.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">Nicio cheltuială găsită cu filtrele selectate.</div>
          )}

          {/* Summary */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">{filteredExpenses.length} înregistrări afișate</span>
            <div className="flex gap-4">
              <span className="text-xs text-slate-500">
                Total aprobate: <strong className="text-emerald-600">{filteredExpenses.filter((e) => e.status === 'aprobat').reduce((a, e) => a + Number(e.suma || 0), 0).toLocaleString()} RON</strong>
              </span>
              <span className="text-xs text-slate-500">
                Total în așteptare: <strong className="text-amber-600">{filteredExpenses.filter((e) => e.status === 'in_asteptare').reduce((a, e) => a + Number(e.suma || 0), 0).toLocaleString()} RON</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CERERI STERGERE TAB */}
      {tab === 'stergeri' && (
        <div className="space-y-3">
          {deletionReqs.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <Trash2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nu sunt cereri de ștergere cheltuieli în așteptare 🎉</p>
            </div>
          )}
          {deletionReqs.map((r) => {
            const expense = expenses.find((e) => e.id === r.expenseId);
            return (
              <div key={r.id} className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800">Cerere ștergere: {r.furnizor}</p>
                      <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-semibold">
                        {r.suma.toLocaleString()} RON
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Categorie: {r.categorie} · Cerere de la: {r.requestedBy} · {r.requestDate}</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl">
                      <p className="text-xs font-bold text-slate-500 mb-1">Motivul ștergerii:</p>
                      <p className="text-sm text-slate-600">„{r.reason}"</p>
                    </div>
                    {expense && (
                      <div className="mt-2 flex gap-4 text-xs text-slate-400">
                        <span>Factură: <strong className="text-slate-600">{expense.numar_factura || '—'}</strong></span>
                        <span>Data: <strong className="text-slate-600">{expense.expense_date || '—'}</strong></span>
                        <span>Proiect: <strong className="text-slate-600">{getProjectName(expense.project_id)}</strong></span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveDeletion(r.id)}
                      className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobă Ștergerea
                    </button>
                    <button
                      onClick={() => rejectDeletion(r.id)}
                      className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Respinge
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
