import { useState, useEffect } from 'react';
import {
  Mail, Search, Star, Archive, Send, Plus, Inbox, Clock, Bot, Loader2, Zap,
  ChevronRight, ChevronLeft, GripVertical, CircleDot, AlertCircle,
} from 'lucide-react';
import { Avatar, Badge } from '@/components/ui';
import { emailAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const KANBAN_COLS = [
  { id: 'lead', label: '🎯 Lead', color: '#7c3aed' },
  { id: 'contact', label: '📞 Contact', color: '#2563eb' },
  { id: 'negotiation', label: '🤝 Negociere', color: '#d97706' },
  { id: 'won', label: '✅ Câștigat', color: '#059669' },
];

const EMAIL_GROUPS = [
  { name: 'PM', color: '#7c3aed', count: 0 },
  { name: 'Donatori', color: '#059669', count: 0 },
  { name: 'Newsletter', color: '#2563eb', count: 0 },
  { name: 'Voluntari', color: '#d97706', count: 0 },
  { name: 'Parteneri', color: '#dc2626', count: 0 },
];

function normalizeEmail(email) {
  if (!email) return null;

  const toEmails = Array.isArray(email.to_emails)
    ? email.to_emails
    : Array.isArray(email.toEmails)
      ? email.toEmails
      : [];
  const body = email.body_text || email.body_html || email.body || '';
  const sentAt = email.sent_at || email.sentAt || email.created_at || email.createdAt || '';

  return {
    ...email,
    sent: typeof email.sent === 'boolean' ? email.sent : Boolean(email.is_draft === false || email.sent_at),
    read: typeof email.read === 'boolean' ? email.read : Boolean(email.is_read),
    starred: typeof email.starred === 'boolean' ? email.starred : Boolean(email.is_starred),
    archived: typeof email.archived === 'boolean' ? email.archived : email.kanban_column === 'arhiva',
    from: email.from || email.from_name || email.from_email || '',
    to: email.to || toEmails.join(', '),
    body,
    date: email.date || sentAt,
  };
}

export default function CRMPage() {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [aiCompose, setAiCompose] = useState(false);
  const [kanbanSearch, setKanbanSearch] = useState('');

  // Load emails from backend
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await emailAPI.getAll();
        if (!cancelled) setEmails(Array.isArray(data) ? data.map(normalizeEmail).filter(Boolean) : []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setEmails([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const inboxEmails = emails.filter((e) => !e.archived && !e.sent);
  const starredEmails = emails.filter((e) => e.starred);
  const sentEmails = emails.filter((e) => e.sent);
  const archivedEmails = emails.filter((e) => e.archived);

  const toggleStar = async (id) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, starred: !e.starred, is_starred: !e.starred } : e)));
    try { await emailAPI.toggleStar(id); } catch { /* revert on error if needed */ }
  };

  const archiveEmail = async (id) => {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, archived: true, kanban_column: 'arhiva' } : e)));
    try {
      await emailAPI.updateColumn(id, 'arhiva');
    } catch {
      // keep local fallback
    }
  };

  const handleAICompose = () => {
    setAiCompose(true);
    setTimeout(() => {
      setComposeData({
        to: 'donatori@organization.ro',
        subject: 'Mulțumim pentru sprijinul vostru',
        body: `Dragi donatori și susținători,\n\nVrem să vă mulțumim din suflet pentru generozitatea și sprijinul continuu pe care ni le arătați. Datorită contribuțiilor voastre, am reușit să ajutăm beneficiari direcți prin proiectele noastre.\n\nFiecare donație contează, fiecare gest face diferența.\n\nCu recunoștință,\nEchipa ${user?.organization || 'organizatiei'}`,
      });
      setAiCompose(false);
    }, 1500);
  };

  const sendEmail = async () => {
    if (!composeData.to || !composeData.subject) return;
    const toEmails = composeData.to
      .split(/[;,\s]+/)
      .map((addr) => addr.trim())
      .filter(Boolean);

    if (!toEmails.length) {
      setError('Introduceți cel puțin o adresă de email validă.');
      return;
    }

    setError('');
    try {
      const created = await emailAPI.create({
        subject: composeData.subject,
        to_emails: toEmails,
        body_text: composeData.body,
        body_html: composeData.body ? composeData.body.replace(/\n/g, '<br />') : '',
        is_draft: false,
      });
      const newEmail = normalizeEmail(created);
      if (newEmail) {
        setEmails((prev) => [...prev, { ...newEmail, sent: true, read: true, starred: false, archived: false }]);
      }
    } catch (err) {
      setError(err?.message || 'Nu am putut trimite emailul prin provider.');
      return;
    }
    setComposeData({ to: '', subject: '', body: '' });
    setComposing(false);
  };

  const SIDEBAR_ITEMS = [
    { id: 'inbox', icon: Inbox, label: 'Inbox', count: inboxEmails.filter((e) => !e.read).length },
    { id: 'starred', icon: Star, label: 'Marcate', count: starredEmails.length },
    { id: 'sent', icon: Send, label: 'Trimise', count: sentEmails.length },
    { id: 'archived', icon: Archive, label: 'Arhivate', count: archivedEmails.length },
    { id: 'kanban', icon: CircleDot, label: 'CRM Pipeline', count: 0 },
  ];

  const currentEmails = tab === 'inbox' ? inboxEmails : tab === 'starred' ? starredEmails : tab === 'sent' ? sentEmails : tab === 'archived' ? archivedEmails : [];

  /* Kanban — local state for CRM pipeline */
  const [kanban, setKanban] = useState(() => {
    const cols = {};
    KANBAN_COLS.forEach((c) => { cols[c.id] = []; });
    return cols;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        <span className="ml-3 text-sm text-slate-500">Se încarcă emailurile...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-5 h-[calc(100vh-180px)]">
      {/* Email sidebar */}
      <div className="w-52 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <button onClick={() => { setComposing(true); setSelectedEmail(null); }} className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl text-sm font-bold mb-3 transition-colors">
          <Plus className="w-4 h-4" /> Compune
        </button>
        <div className="space-y-0.5">
          {SIDEBAR_ITEMS.map((s) => (
            <button key={s.id} onClick={() => { setTab(s.id); setSelectedEmail(null); setComposing(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${tab === s.id ? 'bg-violet-50 text-violet-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <s.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{s.label}</span>
              {s.count > 0 && <span className={`text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold ${tab === s.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.count}</span>}
            </button>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Grupuri</p>
          {EMAIL_GROUPS.map((g) => (
            <div key={g.name} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }}></span>{g.name}</div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === 'kanban' ? (
          /* Kanban Board */
          <div className="flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">CRM Pipeline</h3>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={kanbanSearch} onChange={(e) => setKanbanSearch(e.target.value)} placeholder="Caută lead..." className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-40 focus:outline-none focus:border-violet-400" />
                </div>
              </div>
            </div>
            {Object.values(kanban).every(arr => arr.length === 0) && (
              <div className="text-center py-12">
                <CircleDot className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">Niciun lead în pipeline</p>
                <p className="text-xs text-slate-400 mt-1">Adăugați contacte pentru a gestiona relațiile cu donatorii și partenerii.</p>
              </div>
            )}
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
              {KANBAN_COLS.map((col) => (
                <div key={col.id} className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }}></span>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{col.label}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{(kanban[col.id] || []).length}</span>
                  </div>
                  <div className="space-y-2">
                    {(kanban[col.id] || []).filter((card) => !kanbanSearch || card.name.toLowerCase().includes(kanbanSearch.toLowerCase())).map((card) => (
                      <div key={card.id} className="bg-white rounded-xl border border-slate-100 hover:border-violet-200 p-3 cursor-pointer transition-all shadow-sm hover:shadow-md group">
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-slate-200 mt-0.5 flex-shrink-0 group-hover:text-slate-400 transition-colors" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-700 truncate">{card.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{card.contact}</p>
                            <p className="text-xs text-slate-500 mt-1.5">{card.notes}</p>
                            <div className="mt-2"><Badge status={card.priority} /></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : composing ? (
          /* Compose */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Compune Email</h3>
              <div className="flex gap-2">
                <button onClick={handleAICompose} disabled={aiCompose}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-60">
                  {aiCompose ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  {aiCompose ? 'Generez...' : 'AI Compose'}
                </button>
                <button onClick={() => setComposing(false)} className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl">Anulează</button>
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-auto">
              <input value={composeData.to} onChange={(e) => setComposeData((p) => ({ ...p, to: e.target.value }))} placeholder="Către: email@exemplu.ro" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400" />
              <input value={composeData.subject} onChange={(e) => setComposeData((p) => ({ ...p, subject: e.target.value }))} placeholder="Subiect" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-violet-400" />
              <textarea value={composeData.body} onChange={(e) => setComposeData((p) => ({ ...p, body: e.target.value }))} placeholder="Scrieți mesajul..." className="w-full flex-1 min-h-[200px] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400 resize-none" />
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={sendEmail} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors">
                <Send className="w-4 h-4" /> Trimite
              </button>
            </div>
          </div>
        ) : selectedEmail ? (
          /* Email detail */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <button onClick={() => setSelectedEmail(null)} className="text-slate-400 hover:text-violet-600"><ChevronLeft className="w-5 h-5" /></button>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800 truncate">{selectedEmail.subject}</h3>
                <p className="text-xs text-slate-400">De la: {selectedEmail.from || selectedEmail.from_email} · {selectedEmail.date || selectedEmail.created_at?.slice(0, 10)}</p>
              </div>
              <button onClick={() => toggleStar(selectedEmail.id)} className={`${selectedEmail.starred ? 'text-amber-500' : 'text-slate-300'} hover:text-amber-500`}><Star className="w-4 h-4" /></button>
              <button onClick={() => { archiveEmail(selectedEmail.id); setSelectedEmail(null); }} className="text-slate-300 hover:text-slate-500"><Archive className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 p-5 overflow-auto">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selectedEmail.body || selectedEmail.preview || 'Niciun conținut.'}</p>
            </div>
          </div>
        ) : (
          /* Email list */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 capitalize">{tab} ({currentEmails.length})</h3>
            </div>
            {error && <div className="p-3 m-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
            {currentEmails.length === 0 && !error && <div className="p-8 text-center text-sm text-slate-400">Niciun email în {tab}.</div>}
            <div className="divide-y divide-slate-50">
              {currentEmails.map((email) => (
                <div key={email.id} onClick={() => { setSelectedEmail(email); if (!email.read) { setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, read: true } : e))); emailAPI.markRead(email.id).catch(() => {}); } }}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-violet-50/50 transition-colors ${!email.read ? 'bg-violet-50/30' : ''}`}>
                  <button onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }} className={`flex-shrink-0 ${email.starred ? 'text-amber-500' : 'text-slate-200 hover:text-amber-400'}`}><Star className="w-3.5 h-3.5" /></button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${!email.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{email.subject}</p>
                      <span className="text-xs text-slate-400 ml-3 flex-shrink-0">{email.date || email.created_at?.slice(0, 10)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{email.from || email.from_email} · {(email.body || email.preview || '').substring(0, 80)}...</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-200 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
