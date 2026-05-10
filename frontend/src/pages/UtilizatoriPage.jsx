import { useState, useEffect, useMemo } from 'react';
import { UserPlus, Shield, Search, ChevronDown, Check, X, Eye, Ban, Loader2, AlertCircle } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { usersAPI } from '@/services/api';
import { ROLES } from '@/data/constants';

export default function UtilizatoriPage() {
  const [tab, setTab] = useState('activi');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ name: '', email: '', role: 'volunteer_coordinator' });
  const [createLoading, setCreateLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const usersData = await usersAPI.getAll();
        if (!cancelled) {
          setUsers(Array.isArray(usersData) ? usersData : []);
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

  useEffect(() => {
    if (tab !== 'pending' || pendingLoaded || pendingLoading) return;
    let cancelled = false;
    async function loadPending() {
      setPendingLoading(true);
      try {
        const pendingData = await usersAPI.getAccountRequests();
        if (!cancelled) {
          setPending(Array.isArray(pendingData) ? pendingData : []);
          setPendingLoaded(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setPendingLoading(false);
      }
    }
    loadPending();
    return () => { cancelled = true; };
  }, [tab, pendingLoaded, pendingLoading]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || u.full_name || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const approve = async (id) => {
    try {
      await usersAPI.approveRequest(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const reject = async (id) => {
    try {
      await usersAPI.rejectRequest(id);
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async () => {
    if (!createData.name || !createData.email) return;
    setCreateLoading(true);
    try {
      const created = await usersAPI.create({
        full_name: createData.name,
        email: createData.email,
        role: createData.role,
      });
      if (created) {
        setUsers((prev) => [...prev, {
          ...created,
          name: created.full_name || createData.name,
          avatar: (created.avatar_initials || createData.name.split(' ').map((p) => p[0]).join('').substring(0, 2)).toUpperCase(),
        }]);
      }
      setCreateData({ name: '', email: '', role: 'volunteer_coordinator' });
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Se încarcă utilizatorii...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {[['activi', `👥 Utilizatori (${users.length})`], ['pending', `⏳ Așteptare (${pending.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${tab === id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
          <UserPlus className="w-4 h-4" /> Cont Nou
        </button>
      </div>

      {showCreate && (
        <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-violet-700 flex items-center gap-2"><UserPlus className="w-4 h-4" /> Creează Cont Nou</h4>
          <div className="grid grid-cols-3 gap-3">
            <input value={createData.name} onChange={(e) => setCreateData((p) => ({ ...p, name: e.target.value }))} placeholder="Nume complet" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400" />
            <input value={createData.email} onChange={(e) => setCreateData((p) => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400" />
            <select value={createData.role} onChange={(e) => setCreateData((p) => ({ ...p, role: e.target.value }))} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400">
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createLoading} className="bg-violet-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2">
              {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {createLoading ? 'Se creează...' : 'Creează'}
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-sm font-semibold">Anulează</button>
          </div>
        </div>
      )}

      {tab === 'activi' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută utilizator sau rol..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400" />
            </div>
          </div>
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Niciun utilizator găsit.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  {['Utilizator', 'Rol', 'Email', 'Ultima Activitate', 'Status'].map((h) => (
                    <th key={h} className="px-4 pb-3 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => {
                  const name = user.name || user.full_name || 'Necunoscut';
                  const initials = user.avatar || user.avatar_initials || name.split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} size="sm" colorIdx={typeof user.id === 'number' ? user.id : 0} />
                          <span className="font-semibold text-slate-700">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" /> {ROLES[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{user.email}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{user.lastLogin || user.last_login_at?.slice(0, 10) || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${user.status === 'active' || user.active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {user.status === 'active' || user.active !== false ? '● Activ' : '○ Inactiv'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'pending' && (
        <div className="space-y-3">
          {pendingLoading && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <Loader2 className="w-5 h-5 text-violet-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-400">Se încarcă cererile...</p>
            </div>
          )}
          {pending.length === 0 && !pendingLoading && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-sm text-slate-400">Nu sunt cereri de cont în așteptare 🎉</p>
            </div>
          )}
          {pending.map((p) => {
            const pName = p.name || p.full_name || 'Necunoscut';
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                <Avatar initials={pName.split(' ').map((x) => x[0]).join('').substring(0, 2)} size="md" colorIdx={typeof p.id === 'number' ? p.id : 0} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{pName}</p>
                  <p className="text-xs text-slate-400">{p.email} · {ROLES[p.role] || p.role} · Înregistrat: {p.requestDate || p.created_at?.slice(0, 10) || '—'}</p>
                  {p.message && <p className="text-xs text-slate-500 mt-1 italic">"{p.message}"</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => approve(p.id)} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"><Check className="w-3.5 h-3.5" /> Aprobă</button>
                  <button onClick={() => reject(p.id)} className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"><X className="w-3.5 h-3.5" /> Respinge</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
