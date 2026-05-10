import { useState, useEffect } from 'react';
import { Target, DollarSign, Users, CheckCircle, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { StatCard, Badge, Avatar } from '@/components/ui';
import { projectsAPI } from '@/services/api';
import ProjectDetailPage from './ProjectDetailPage';

export default function ProiectePage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', category: '', grant_total: '', beneficiari_directi: 0, deadline: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await projectsAPI.getAll();
        if (!cancelled) setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (selectedProject) {
    return <ProjectDetailPage project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  const totalGrant = projects.reduce((s, p) => s + (Number(p.grant_total || p.grant || 0)), 0);
  const totalBeneficiari = projects.reduce((s, p) => s + (Number(p.beneficiari_directi || p.beneficiariDirecti || 0)), 0);
  const finalizate = projects.filter((p) => p.status === 'finalizat' || p.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Se încarcă proiectele...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="flex items-center justify-end">
        {!showAddProject ? (
          <button onClick={() => setShowAddProject(true)} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Adaugă proiect</button>
        ) : (
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold">Proiect nou</h4>
              <button onClick={() => setShowAddProject(false)} className="text-xs text-slate-500">Anulează</button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nume proiect *</label>
                <input value={newProject.name} onChange={(e) => setNewProject((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Programul de Educație Comunitară" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Categorie</label>
                <input value={newProject.category} onChange={(e) => setNewProject((p) => ({ ...p, category: e.target.value }))} placeholder="Ex: Educație, Sănătate, Mediu" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Grant total (RON)</label>
                <input value={newProject.grant_total} onChange={(e) => setNewProject((p) => ({ ...p, grant_total: e.target.value }))} placeholder="Ex: 50000" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Beneficiari direcți</label>
                <input value={newProject.beneficiari_directi} onChange={(e) => setNewProject((p) => ({ ...p, beneficiari_directi: Number(e.target.value) }))} placeholder="Ex: 100" type="number" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Deadline</label>
                <input value={newProject.deadline} onChange={(e) => setNewProject((p) => ({ ...p, deadline: e.target.value }))} type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end mt-3 gap-2">
              <button onClick={() => setShowAddProject(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold">Anulează</button>
              <button onClick={async () => {
                try {
                  const payload = {
                    name: newProject.name,
                    category: newProject.category || undefined,
                    grant_total: newProject.grant_total ? Number(newProject.grant_total) : undefined,
                    beneficiari_directi: Number(newProject.beneficiari_directi) || 0,
                    deadline: newProject.deadline || undefined,
                  };
                  const created = await projectsAPI.create(payload);
                  setProjects((p) => [created, ...p]);
                  setShowAddProject(false);
                  setNewProject({ name: '', category: '', grant_total: '', beneficiari_directi: 0, deadline: '' });
                } catch (err) {
                  setError(err.message || 'Eroare la creare proiect.');
                }
              }} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Creează</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Total Granturi" value={`${totalGrant.toLocaleString('ro-RO')} RON`} color="violet" />
        <StatCard icon={Users} label="Beneficiari Direcți" value={String(totalBeneficiari)} color="blue" />
        <StatCard icon={CheckCircle} label="Proiecte Finalizate" value={`${finalizate} / ${projects.length}`} color="emerald" />
        <StatCard icon={DollarSign} label="Proiecte Active" value={String(projects.filter((p) => p.status === 'activ').length)} color="rose" />
      </div>

      {projects.length === 0 && !error && (
        <div className="text-center py-12">
          <Target className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Niciun proiect încă</p>
          <p className="text-xs text-slate-400 mt-1">Creați primul proiect din dashboard.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => setSelectedProject(p)}
            className="bg-white rounded-2xl border-2 border-slate-100 hover:border-violet-300 cursor-pointer transition-all shadow-sm hover:shadow-md p-5 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-black text-slate-800 group-hover:text-violet-700 transition-colors">{p.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{p.category || '—'} · {(p.members || []).length} membri · deadline {p.deadline || '—'}</p>
              </div>
              <Badge status={p.status} />
            </div>
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Grant</span>
                <span className="font-bold text-slate-700">{Number(p.grant_total || 0).toLocaleString('ro-RO')} RON</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, p.grant_total ? 100 : 0)}%`, backgroundColor: p.color || '#7c3aed' }} />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-xs text-slate-500">
                <span>Beneficiari: <strong className="text-slate-700">{Number(p.beneficiari_directi || 0)} direcți</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
