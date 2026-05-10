import { useState, useEffect } from 'react';
import {
  ShieldCheck, UserPlus, Trash2, Check, X, Search, Loader2,
  Key, AlertTriangle, CheckCircle, User, Shield, Clock, AlertCircle,
} from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { usersAPI } from '@/services/api';
import { ROLES } from '@/data/constants';

export default function AccountManagementPage() {
  const [tab, setTab] = useState('conturi');
  const [users, setUsers] = useState([]);
  const [pwRequests, setPwRequests] = useState([]);
  const [accRequests, setAccRequests] = useState([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ name: '', email: '', role: 'volunteer_coordinator' });
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [usersData, accReqData] = await Promise.all([
          usersAPI.getAll().catch(() => []),
          usersAPI.getAccountRequests().catch(() => []),
        ]);
        if (!cancelled) {
          setUsers(Array.isArray(usersData) ? usersData : []);
          setAccRequests(Array.isArray(accReqData) ? accReqData : []);
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

  const handleDeleteUser = async (id) => {
    try {
      await usersAPI.delete(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showFeedback('Cont șters cu succes');
    } catch (err) {
      showFeedback('Eroare: ' + err.message);
    }
    setDeleteConfirm(null);
  };

  const handleCreateUser = async () => {
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
      showFeedback('Cont creat cu succes');
    } catch (err) {
      showFeedback('Eroare: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const approvePwRequest = (id) => {
    setPwRequests((prev) => prev.filter((r) => r.id !== id));
    showFeedback('Cerere de schimbare parolă aprobată');
  };

  const rejectPwRequest = (id) => {
    setPwRequests((prev) => prev.filter((r) => r.id !== id));
    showFeedback('Cerere de schimbare parolă respinsă');
  };

  const approveAccRequest = async (id) => {
    try {
      await usersAPI.approveRequest(id);
      const req = accRequests.find((r) => r.id === id);
      if (req) {
        setUsers((prev) => [...prev, {
          id: req.id,
          name: req.name || req.full_name,
          full_name: req.full_name || req.name,
          email: req.email,
          role: req.role,
          avatar: (req.name || req.full_name || '??').split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase(),
          status: 'active',
        }]);
      }
      setAccRequests((prev) => prev.filter((r) => r.id !== id));
      showFeedback('Cont nou aprobat și creat');
    } catch (err) {
      showFeedback('Eroare: ' + err.message);
    }
  };

  const rejectAccRequest = async (id) => {
    try {
      await usersAPI.rejectRequest(id);
      setAccRequests((prev) => prev.filter((r) => r.id !== id));
      showFeedback('Cerere de cont respinsă');
    } catch (err) {
      showFeedback('Eroare: ' + err.message);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.name || u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: 'conturi', label: `👥 Conturi (${users.length})` },
    { id: 'parole', label: `🔑 Cereri Parolă (${pwRequests.length})` },
    { id: 'cereri', label: `📩 Cereri Cont Nou (${accRequests.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-violet-600" />
          <div>
            <h1 className="text-xl font-black text-slate-800">Management Conturi</h1>
            <p className="text-sm text-slate-400">Gestionează conturi, cereri de parolă și conturi noi</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Cont Nou
        </button>
      </div>

      {/* Feedback */}
      {actionFeedback && (
        <div className="bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 py-2.5 rounded-xl">
          <CheckCircle className="w-4 h-4" /> {actionFeedback}
        </div>
      )}

      {/* Create new account */}
      {showCreate && (
        <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-bold text-violet-700 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Creează Cont Nou
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={createData.name}
              onChange={(e) => setCreateData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nume complet"
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
            <input
              value={createData.email}
              onChange={(e) => setCreateData((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              type="email"
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            />
            <select
              value={createData.role}
              onChange={(e) => setCreateData((p) => ({ ...p, role: e.target.value }))}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400"
            >
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateUser}
              disabled={createLoading}
              className="bg-violet-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2"
            >
              {createLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {createLoading ? 'Se creează...' : 'Creează Cont'}
            </button>
            <button onClick={() => setShowCreate(false)} className="border border-slate-200 text-slate-600 px-5 py-2 rounded-xl text-sm font-semibold">
              Anulează
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
              tab === t.id
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-slate-500">Se încarcă conturile...</span>
        </div>
      ) : (
      <>
      {/* CONTURI TAB */}
      {tab === 'conturi' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută utilizator, email sau rol..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                {['Utilizator', 'Rol', 'Email', 'Status', 'Acțiuni'].map((h) => (
                  <th key={h} className="px-4 pb-3 pt-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => {
                const name = u.name || u.full_name || 'Necunoscut';
                const initials = u.avatar || u.avatar_initials || name.split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase();
                return (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={initials} size="sm" colorIdx={typeof u.id === 'number' ? u.id : 0} />
                      <div>
                        <p className="font-semibold text-slate-700">{name}</p>
                        <p className="text-xs text-slate-400">Ultima: {u.lastLogin || u.last_login_at?.slice(0, 10) || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 w-fit">
                      <Shield className="w-3 h-3" /> {ROLES[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      (u.status === 'active' || u.status === 'activ') ? 'bg-emerald-50 text-emerald-600' :
                      (u.status === 'inactive' || u.status === 'inactiv') ? 'bg-slate-100 text-slate-400' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {u.status || 'activ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role !== 'ceo' && u.role !== 'CEO' ? (
                      deleteConfirm === u.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rose-600 font-semibold">Sigur?</span>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-xs bg-rose-500 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-rose-600"
                          >
                            Da
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs border border-slate-200 text-slate-600 px-2.5 py-1 rounded-lg font-semibold"
                          >
                            Nu
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Șterge
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-slate-300 italic">protejat</span>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CERERI PAROLA TAB */}
      {tab === 'parole' && (
        <div className="space-y-3">
          {pwRequests.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <Key className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nu sunt cereri de schimbare parolă în așteptare 🎉</p>
            </div>
          )}
          {pwRequests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <Avatar initials={r.avatar} size="md" colorIdx={r.userId} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-slate-800">{r.name}</p>
                  <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Key className="w-3 h-3" /> Schimbare parolă
                  </span>
                </div>
                <p className="text-xs text-slate-400">{r.email} · Cerere din {r.requestDate}</p>
                <p className="text-xs text-slate-500 mt-1 italic">Motiv: „{r.reason}"</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => approvePwRequest(r.id)}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Aprobă
                </button>
                <button
                  onClick={() => rejectPwRequest(r.id)}
                  className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Respinge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CERERI CONT NOU TAB */}
      {tab === 'cereri' && (
        <div className="space-y-3">
          {accRequests.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <UserPlus className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Nu sunt cereri de cont în așteptare 🎉</p>
            </div>
          )}
          {accRequests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
              <Avatar
                initials={(r.name || r.full_name || '??').split(' ').map((x) => x[0]).join('').substring(0, 2)}
                size="md"
                colorIdx={typeof r.id === 'number' ? r.id : 0}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-slate-800">{r.name || r.full_name || 'Necunoscut'}</p>
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                    {ROLES[r.role] || r.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{r.email} · Cerere din {r.requestDate || r.created_at?.slice(0, 10) || '—'}</p>
                {r.message && <p className="text-xs text-slate-500 mt-1 italic">„{r.message}"</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => approveAccRequest(r.id)}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Aprobă
                </button>
                <button
                  onClick={() => rejectAccRequest(r.id)}
                  className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Respinge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
