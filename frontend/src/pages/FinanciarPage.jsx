import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertCircle, CheckCircle, DollarSign, Eye, Filter,
  Loader2, Plus, Upload, X,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import { donationsAPI, expensesAPI, ocrAPI } from '@/services/api';

const DOC_TYPES = [
  { value: 'factura', label: 'Factura' },
  { value: 'bon', label: 'Bon' },
];

const EXPENSE_CATEGORIES = ['salarii', 'transport', 'materiale', 'marketing', 'it', 'evenimente', 'birou', 'alta'];
const INCOME_CATEGORIES = ['grant', 'donatie', 'donatie_mare', 'redirectionare_3_5', 'sponsorizare', 'alta'];
const INCOME_TYPES = ['individual', 'corporate', 'grant', 'redirectionare_3_5', 'alta'];

function statusBadge(item) {
  const pendingProof = item.payment_status === 'in_asteptare_dovada' && item.document_type === 'factura';
  if (pendingProof) return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">În așteptare dovadă</span>;
  if (item.status === 'aprobat') return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Aprobat</span>;
  if (item.status === 'respins') return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">Respins</span>;
  return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">În așteptare</span>;
}

export default function FinanciarPage() {
  const [tab, setTab] = useState('cheltuieli');
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [expenseFilter, setExpenseFilter] = useState(null); // null = all, 'ong' = ONG only, 'projects' = projects only

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDocType, setFilterDocType] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMin, setFilterMin] = useState('');
  const [filterMax, setFilterMax] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofUploading, setProofUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMeta, setOcrMeta] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const invoiceRef = useRef(null);
  const proofRef = useRef(null);

  const [form, setForm] = useState({
    furnizor: '',
    donator_name: '',
    item_description: '',
    suma: '',
    category: 'alta',
    donation_type: 'individual',
    donation_date: '',
    expense_date: '',
    document_type: 'factura',
    invoice_url: '',
    proof_url: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      let expenseParams = {
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        category: filterCategory || undefined,
        document_type: filterDocType || undefined,
        min_amount: filterMin || undefined,
        max_amount: filterMax || undefined,
      };
      
      // Add scope filter for expenses (ONG vs Projects)
      if (expenseFilter === 'ong') {
        expenseParams.is_null = 'project_id'; // ONG-level expenses have no project_id
      } else if (expenseFilter === 'projects') {
        expenseParams.is_not_null = 'project_id'; // Project-level expenses have project_id
      }
      
      const [exp, rev] = await Promise.all([
        expensesAPI.getAll(expenseParams).catch(() => []),
        donationsAPI.getAll({
          date_from: filterDateFrom || undefined,
          date_to: filterDateTo || undefined,
          income_category: filterCategory || undefined,
          donation_type: filterType || undefined,
          min_amount: filterMin || undefined,
          max_amount: filterMax || undefined,
        }).catch(() => []),
      ]);
      setExpenses(Array.isArray(exp) ? exp : []);
      setIncome(Array.isArray(rev) ? rev : []);
    } catch (err) {
      setError(err.message || 'Eroare la încărcare.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDateFrom, filterDateTo, filterCategory, filterDocType, filterType, filterMin, filterMax, expenseFilter]);

  useEffect(() => {
    return () => {
      if (previewDoc?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(previewDoc.url);
      }
    };
  }, [previewDoc]);

  const totalIncome = useMemo(() => income.reduce((s, i) => s + Number(i.suma || 0), 0), [income]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.suma || 0), 0), [expenses]);
  const pendingProofCount = useMemo(() => (
    [...expenses, ...income].filter((x) => x.document_type === 'factura' && x.payment_status === 'in_asteptare_dovada').length
  ), [expenses, income]);

  const rows = tab === 'cheltuieli' ? expenses : income;

  const resetForm = () => {
    setForm({
      furnizor: '',
      donator_name: '',
      item_description: '',
      suma: '',
      category: 'alta',
      donation_type: 'individual',
      donation_date: '',
      expense_date: '',
      document_type: 'factura',
      invoice_url: '',
      proof_url: '',
      notes: '',
    });
    setOcrMeta(null);
    setPreviewDoc(null);
  };

  const handleOCR = async (file) => {
    if (!file) return;
    setOcrLoading(true);
    setError('');
    try {
      const data = await ocrAPI.process(file);
      setOcrMeta({
        confidence: data.confidence,
        extracted: data.extracted,
      });
      setForm((p) => ({
        ...p,
        furnizor: data.extracted?.furnizor || p.furnizor,
        donator_name: data.extracted?.furnizor || p.donator_name,
        item_description: data.extracted?.numar_factura || p.item_description,
        suma: data.extracted?.suma || p.suma,
        expense_date: data.extracted?.data || p.expense_date,
        donation_date: data.extracted?.data || p.donation_date,
        document_type: data.document_type || p.document_type,
      }));
    } catch (err) {
      setError(err.message || 'OCR local indisponibil.');
    } finally {
      setOcrLoading(false);
    }
  };

  const uploadDocument = async (file, kind) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = tab === 'cheltuieli'
        ? await expensesAPI.uploadDocument(file)
        : await donationsAPI.uploadDocument(file);
      setForm((p) => ({ ...p, [kind]: res.url }));

      if (kind === 'invoice_url') {
        const localPreviewUrl = URL.createObjectURL(file);
        setPreviewDoc({
          url: localPreviewUrl,
          type: file.type || 'application/octet-stream',
          name: file.name || 'document',
        });
        await handleOCR(file);
      }
    } catch (err) {
      setError(err.message || 'Upload document eșuat.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.suma) return;
    setSaving(true);
    setError('');
    try {
      const paymentStatus = form.proof_url ? 'achitat' : 'in_asteptare_dovada';
      if (tab === 'cheltuieli') {
        await expensesAPI.create({
          furnizor: form.furnizor,
          item_description: form.item_description,
          suma: Number(form.suma),
          category: form.category,
          expense_date: form.expense_date || null,
          document_type: form.document_type,
          invoice_url: form.invoice_url || null,
          proof_url: form.proof_url || null,
          payment_status: paymentStatus,
          notes: form.notes || null,
        });
      } else {
        await donationsAPI.create({
          donator_name: form.donator_name,
          suma: Number(form.suma),
          income_category: form.category,
          donation_type: form.donation_type,
          donation_date: form.donation_date || null,
          document_type: form.document_type,
          invoice_url: form.invoice_url || null,
          proof_url: form.proof_url || null,
          payment_status: paymentStatus,
          notes: form.notes || null,
        });
      }
      setShowAdd(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message || 'Salvarea a eșuat.');
    } finally {
      setSaving(false);
    }
  };

  const addProofToItem = async (file) => {
    if (!selected || !file) return;
    setProofUploading(true);
    try {
      const upload = tab === 'cheltuieli'
        ? await expensesAPI.uploadDocument(file)
        : await donationsAPI.uploadDocument(file);

      const updated = tab === 'cheltuieli'
        ? await expensesAPI.addProof(selected.id, upload.url)
        : await donationsAPI.addProof(selected.id, upload.url);

      setSelected(updated);
      await loadData();
    } catch (err) {
      setError(err.message || 'Nu am putut adăuga dovada plății.');
    } finally {
      setProofUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon={DollarSign} label="Total Venituri" value={`${totalIncome.toLocaleString('ro-RO')} RON`} changeType="up" change="înregistrate" color="emerald" />
        <StatCard icon={Activity} label="Total Cheltuieli" value={`${totalExpenses.toLocaleString('ro-RO')} RON`} changeType="up" change="înregistrate" color="violet" />
        <StatCard icon={CheckCircle} label="Sold" value={`${(totalIncome - totalExpenses).toLocaleString('ro-RO')} RON`} changeType={totalIncome - totalExpenses >= 0 ? 'up' : 'down'} change="curent" color="blue" />
        <StatCard icon={AlertCircle} label="Facturi fără dovadă" value={String(pendingProofCount)} changeType="down" change="necesită acțiune" color="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <button onClick={() => setTab('cheltuieli')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'cheltuieli' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Cheltuieli</button>
            <button onClick={() => setTab('venituri')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'venituri' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Venituri</button>
            
            {tab === 'cheltuieli' && (
              <div className="ml-4 flex gap-1 pl-4 border-l border-slate-200">
                <button onClick={() => setExpenseFilter(null)} className={`px-3 py-1 rounded-lg text-xs font-semibold ${expenseFilter === null ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-600'}`}>Toate</button>
                <button onClick={() => setExpenseFilter('ong')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${expenseFilter === 'ong' ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>ONG</button>
                <button onClick={() => setExpenseFilter('projects')} className={`px-3 py-1 rounded-lg text-xs font-semibold ${expenseFilter === 'projects' ? 'bg-purple-200 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>Proiecte</button>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={() => setShowFilters((v) => !v)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 flex items-center gap-2"><Filter className="w-4 h-4" />Filtre</button>
            <button onClick={() => { resetForm(); setShowAdd(true); }} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" />Adaugă</button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border-b border-slate-100 grid grid-cols-6 gap-2">
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Suma min" value={filterMin} onChange={(e) => setFilterMin(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Suma max" value={filterMax} onChange={(e) => setFilterMax(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Toate categoriile</option>
              {(tab === 'cheltuieli' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {tab === 'cheltuieli' ? (
              <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Tip document</option>
                {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            ) : (
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Tip venit</option>
                {INCOME_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
        )}

        {loading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="px-4 py-3 text-xs text-slate-400 uppercase">Data</th>
                <th className="px-4 py-3 text-xs text-slate-400 uppercase">Nume</th>
                <th className="px-4 py-3 text-xs text-slate-400 uppercase">Categorie</th>
                <th className="px-4 py-3 text-xs text-slate-400 uppercase">Tip Doc</th>
                <th className="px-4 py-3 text-xs text-slate-400 uppercase">Sumă</th>
                <th className="px-4 py-3 text-xs text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pendingProof = r.document_type === 'factura' && r.payment_status === 'in_asteptare_dovada';
                return (
                  <tr key={r.id} className={`border-b border-slate-50 ${pendingProof ? 'bg-amber-50/60' : ''}`}>
                    <td className="px-4 py-3 text-xs text-slate-500">{r.expense_date || r.donation_date || r.created_at?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{r.furnizor || r.donator_name || r.item_description || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.category || r.income_category || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.document_type || '—'}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{Number(r.suma || 0).toLocaleString('ro-RO')} RON</td>
                    <td className="px-4 py-3">{statusBadge(r)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setSelected(r)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><Eye className="w-4 h-4" /></button></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">Nu există înregistrări pentru filtrele selectate.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Adaugă {tab === 'cheltuieli' ? 'Cheltuială' : 'Venit'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {tab === 'cheltuieli' ? (
                    <>
                      <input value={form.furnizor} onChange={(e) => setForm((p) => ({ ...p, furnizor: e.target.value }))} placeholder="Furnizor" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      <input value={form.item_description} onChange={(e) => setForm((p) => ({ ...p, item_description: e.target.value }))} placeholder="Descriere" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      <input value={form.suma} onChange={(e) => setForm((p) => ({ ...p, suma: e.target.value }))} placeholder="Suma" type="number" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      <input value={form.expense_date} onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))} type="date" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </>
                  ) : (
                    <>
                      <input value={form.donator_name} onChange={(e) => setForm((p) => ({ ...p, donator_name: e.target.value }))} placeholder="Donator / sursă venit" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      <select value={form.donation_type} onChange={(e) => setForm((p) => ({ ...p, donation_type: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">{INCOME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                      <input value={form.suma} onChange={(e) => setForm((p) => ({ ...p, suma: e.target.value }))} placeholder="Suma" type="number" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                      <input value={form.donation_date} onChange={(e) => setForm((p) => ({ ...p, donation_date: e.target.value }))} type="date" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </>
                  )}

                  <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {(tab === 'cheltuieli' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={form.document_type} onChange={(e) => setForm((p) => ({ ...p, document_type: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>

                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Note" className="mt-3 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <input ref={invoiceRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => uploadDocument(e.target.files?.[0], 'invoice_url')} />
                  <button onClick={() => invoiceRef.current?.click()} disabled={uploading || ocrLoading} className="py-2 border border-dashed border-slate-300 rounded-lg text-sm font-semibold text-slate-600 flex items-center justify-center gap-2">{uploading || ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Încarcă document + OCR</button>

                  <input ref={proofRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => uploadDocument(e.target.files?.[0], 'proof_url')} />
                  <button onClick={() => proofRef.current?.click()} disabled={uploading} className="py-2 border border-dashed border-slate-300 rounded-lg text-sm font-semibold text-slate-600 flex items-center justify-center gap-2">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Încarcă dovadă</button>
                </div>

                <div className="mt-2 text-xs text-slate-500">
                  <p>Document: {form.invoice_url ? 'încărcat' : 'neîncărcat'} | Dovadă: {form.proof_url ? 'încărcată' : 'lipsă'}</p>
                  {ocrMeta && <p className="text-emerald-700 font-semibold mt-1">OCR detectat: {ocrMeta.confidence}%</p>}
                </div>

                <div className="mt-5 flex gap-2 justify-end">
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold">Anulează</button>
                  <button onClick={handleCreate} disabled={saving || !form.suma} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvează</button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden min-h-[360px] bg-slate-50">
                <div className="px-3 py-2 border-b border-slate-200 bg-white text-xs font-bold text-slate-500">Preview Document</div>
                {!previewDoc?.url && <div className="h-[320px] flex items-center justify-center text-sm text-slate-400">Încarcă documentul pentru preview și OCR automat</div>}
                {previewDoc?.url && previewDoc.type?.startsWith('image/') && (
                  <img src={previewDoc.url} alt="preview" className="w-full h-[360px] object-contain bg-white" />
                )}
                {previewDoc?.url && previewDoc.type === 'application/pdf' && (
                  <iframe title="pdf-preview" src={previewDoc.url} className="w-full h-[360px] bg-white" />
                )}
                {previewDoc?.url && previewDoc.type !== 'application/pdf' && !previewDoc.type?.startsWith('image/') && (
                  <div className="p-4 text-sm">
                    <a href={previewDoc.url} target="_blank" rel="noreferrer" className="text-violet-600 underline">Deschide documentul: {previewDoc.name}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Detalii {tab === 'cheltuieli' ? 'Cheltuială' : 'Venit'}</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Nume:</span> {selected.furnizor || selected.donator_name || '—'}</p>
              <p><span className="font-semibold">Sumă:</span> {Number(selected.suma || 0).toLocaleString('ro-RO')} RON</p>
              <p><span className="font-semibold">Categorie:</span> {selected.category || selected.income_category || '—'}</p>
              <p><span className="font-semibold">Tip document:</span> {selected.document_type || '—'}</p>
              <p><span className="font-semibold">Status:</span> {statusBadge(selected)}</p>
              <p><span className="font-semibold">Document:</span> {selected.invoice_url ? <a className="text-violet-600 underline" href={selected.invoice_url} target="_blank" rel="noreferrer">Deschide</a> : 'Lipsă'}</p>
              <p><span className="font-semibold">Dovadă:</span> {selected.proof_url ? <a className="text-violet-600 underline" href={selected.proof_url} target="_blank" rel="noreferrer">Deschide</a> : 'Lipsă'}</p>
            </div>

            {!selected.proof_url && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-700 font-semibold mb-2">Adaugă dovada plății</p>
                <input id="proof-file" type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => addProofToItem(e.target.files?.[0])} />
                <button onClick={() => document.getElementById('proof-file')?.click()} disabled={proofUploading} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold flex items-center gap-2">
                  {proofUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Încarcă dovada
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
