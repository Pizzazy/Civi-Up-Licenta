import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquare, Loader2 } from 'lucide-react';
import { usersAPI, chatAPI } from '@/services/api';
import { Avatar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function FloatingChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [input, setInput] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Load users when chat opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadUsers() {
      setError('');
      try {
        const data = await usersAPI.getPeers();
        console.log('Peers loaded:', data);
        const list = (Array.isArray(data) ? data : []).filter((u) => u.id !== user?.id);
        if (!cancelled) {
          setUsers(list);
          if (list.length === 0) setError('No peers available.');
          if (list.length > 0 && !activeChatId) setActiveChatId(list[0].id);
        }
      } catch (err) {
        console.error('Error loading peers:', err);
        if (!cancelled) {
          setUsers([]);
          setError(err.message || 'Failed to load peers.');
        }
      }
    }
    loadUsers();
    return () => { cancelled = true; };
  }, [open]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChatId || !open) return;
    let cancelled = false;
    async function loadMessages() {
      setLoading(true);
      try {
        const data = await chatAPI.getMessages(activeChatId, undefined, { noCache: true });
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) setMessages((prev) => ({ ...prev, [activeChatId]: sortMessages(mergeMessages(prev[activeChatId] || [], list)) }));
      } catch (err) {
        if (!cancelled) setMessages((prev) => ({ ...prev, [activeChatId]: prev[activeChatId] || [] }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [activeChatId, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChatId, open]);

  // Polling to fetch new messages periodically when chat is open
  useEffect(() => {
    if (!open || !activeChatId) return undefined;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const data = await chatAPI.getMessages(activeChatId, undefined, { noCache: true });
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setMessages((prev) => ({ ...prev, [activeChatId]: sortMessages(mergeMessages(prev[activeChatId] || [], list)) }));
      } catch (err) {
        // silent
      }
    }, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [open, activeChatId]);

  const sendMsg = async () => {
    if (!input.trim() || !activeChatId) return;
    const text = input;
    setInput('');
    const newMsg = {
      id: `local_${Date.now()}`,
      text,
      content: text,
      mine: true,
      time: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => ({ ...prev, [activeChatId]: sortMessages([...(prev[activeChatId] || []), newMsg]) }));
    try {
      const res = await chatAPI.sendMessage(activeChatId, text);
      // Replace local temp message with server response when available
      if (res && res.id) {
        setMessages((prev) => ({
          ...prev,
          [activeChatId]: sortMessages((prev[activeChatId] || []).map((m) => (m.id === newMsg.id ? { ...res, mine: true } : m))),
        }));
      }
    } catch {
      /* ignore send errors */
    }
  };

  const activeUser = users.find((u) => u.id === activeChatId);

  // Helpers: merge and sort message arrays, avoid duplicates
  function mergeMessages(oldList, newList) {
    const map = new Map();
    (oldList || []).forEach((m) => map.set(String(m.id), m));
    (newList || []).forEach((m) => map.set(String(m.id), m));
    return Array.from(map.values());
  }

  function sortMessages(list) {
    return (list || []).slice().sort((a, b) => {
      // Prefer created_at if available
      const ta = a.created_at || a.time || a.id;
      const tb = b.created_at || b.time || b.id;
      const da = Date.parse(ta) || (typeof ta === 'number' ? ta : parseInt(String(ta).replace(/[^0-9]/g, '')) || 0);
      const db = Date.parse(tb) || (typeof tb === 'number' ? tb : parseInt(String(tb).replace(/[^0-9]/g, '')) || 0);
      return da - db;
    });
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-16 right-2 sm:bottom-20 sm:right-5 w-[calc(100vw-1rem)] sm:w-80 h-[calc(100vh-120px)] sm:h-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-2 sm:p-3 flex items-center gap-2">
            <span className="text-white font-bold text-sm sm:text-base flex-1 truncate">💬 Chat Intern</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="px-2 sm:px-3 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-600">
              {error}
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            {/* User list */}
            <div className="w-14 sm:w-16 bg-slate-50 border-r border-slate-100 flex flex-col items-center py-2 gap-1 overflow-y-auto">
              {users.map((u) => {
                const initials = u.avatar_initials || u.avatar || (u.full_name || u.name || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <button
                    key={u.id}
                    onClick={() => setActiveChatId(u.id)}
                    className={`relative w-9 sm:w-10 h-9 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                      activeChatId === u.id ? 'ring-2 ring-violet-500' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Avatar initials={initials} size="sm" colorIdx={typeof u.id === 'number' ? u.id : 0} />
                    {(u.status === 'active' || u.status === 'activ') && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white"></span>
                    )}
                  </button>
                );
              })}
              {users.length === 0 && <span className="text-xs text-slate-300 mt-2">—</span>}
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 border-b border-slate-100 bg-white">
                <p className="text-xs font-bold text-slate-700 truncate">{activeUser?.full_name || activeUser?.name || '—'}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate">{activeUser?.role || '—'}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
                {loading && <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-violet-400 animate-spin" /></div>}
                {(messages[activeChatId] || []).map((msg) => (
                  <div key={msg.id} className={`flex ${msg.mine || msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs leading-relaxed ${
                        msg.mine || msg.sender_id === user?.id
                          ? 'bg-violet-600 text-white rounded-tr-sm'
                          : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                      }`}
                    >
                      {msg.text || msg.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-1.5 sm:p-2 border-t border-slate-100 flex gap-1.5 sm:gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                  placeholder="Mesaj..."
                  className="flex-1 border border-slate-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-xs focus:outline-none focus:border-violet-400 transition-colors"
                />
                <button
                  onClick={sendMsg}
                  className="bg-violet-600 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-violet-700 transition-colors flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-2 sm:right-5 w-12 sm:w-14 h-12 sm:h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-50 flex-shrink-0"
      >
        {open ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </>
  );
}
