import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Target, DollarSign, TrendingUp,
  Upload, Loader2, CheckCircle, Calendar, CheckSquare, Square,
  Clock, ChevronDown, MessageSquare, AlertCircle, Trash2,
} from 'lucide-react';
import { StatCard, Badge, Avatar } from '@/components/ui';
import { expensesAPI, tasksAPI, calendarAPI, projectsAPI, ocrAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function ProjectDetailPage({ project: initialProject, onBack }) {
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState('buget');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', assignedTo: null, priority: 'medium', dueDate: '' });
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '10:00', type: 'meeting' });
  const [showAddBeneficiari, setShowAddBeneficiari] = useState(false);
  const [newBenefCount, setNewBenefCount] = useState(0);
  const [newBenefEvent, setNewBenefEvent] = useState({ title: '', date: '', time: '10:00', type: 'event' });
  const [taskError, setTaskError] = useState('');
  const [eventError, setEventError] = useState('');
  const [expandedTask, setExpandedTask] = useState(null);
  const [newMemo, setNewMemo] = useState({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState(null);
  const [ocrError, setOcrError] = useState('');
  const fileInputRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear] = useState(new Date().getFullYear());
  const [projectStats, setProjectStats] = useState(null);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Load light project data first (budget/stats); tasks/calendar are lazy-loaded per tab.
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [expData, statsData] = await Promise.all([
          expensesAPI.getAll({ project_id: project.id }).catch(() => []),
          projectsAPI.getStats(project.id).catch(() => null),
        ]);
        if (cancelled) return;
        setExpenses(Array.isArray(expData) ? expData : []);
        if (statsData) setProjectStats(statsData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [project.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadTasks() {
      if (tab !== 'tasks' || tasksLoaded || tasksLoading) return;
      setTasksLoading(true);
      try {
        const data = await tasksAPI.getAll({ project_id: project.id }).catch(() => []);
        if (!cancelled) {
          setTasks(Array.isArray(data) ? data : []);
          setTasksLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setTasks([]);
          setTasksLoaded(true);
          setTaskError(err?.message || 'Nu am putut încărca task-urile.');
        }
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    }
    loadTasks();
    return () => { cancelled = true; };
  }, [tab, tasksLoaded, tasksLoading, project.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      if (tab !== 'calendar' || eventsLoaded || eventsLoading) return;
      setEventsLoading(true);
      try {
        const data = await calendarAPI.getAll({ project_id: project.id }).catch(() => []);
        if (!cancelled) {
          setEvents(Array.isArray(data) ? data : []);
          setEventsLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setEventsLoaded(true);
          setEventError(err?.message || 'Nu am putut încărca evenimentele.');
        }
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    }
    loadEvents();
    return () => { cancelled = true; };
  }, [tab, eventsLoaded, eventsLoading, project.id]);

  const getInitials = (u) => u?.avatar_initials || u?.avatar || (u?.full_name || u?.name || '??').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();

  const getEventStatus = (event) => {
    if (event?.status) return event.status;
    const eventDate = event?.event_date || event?.date;
    if (!eventDate) return 'activ';
    const parsed = new Date(`${eventDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return 'activ';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed < today ? 'finalizat' : 'activ';
  };

  // Members from API are already user objects {id, full_name, avatar_initials, role}
  const members = project.members || [];

  const grantTotal = Number(project.grant_total || project.grant || 0);
  const totalSpent = projectStats ? Number(projectStats.total_cheltuieli || 0) : expenses.reduce((a, e) => a + Number(e.suma || 0), 0);
  const soldRamas = grantTotal - totalSpent;
  const progressPct = grantTotal > 0 ? Math.round((totalSpent / grantTotal) * 100) : 0;

  const addTask = async () => {
    if (!newTask.title) {
      setTaskError('Titlul task-ului este obligatoriu.');
      return;
    }
    setTaskError('');
    try {
      const created = await tasksAPI.create({
        title: newTask.title,
        assigned_to: newTask.assignedTo || null,
        priority: newTask.priority,
        due_date: newTask.dueDate || null,
        project_id: project.id,
        status: 'pending',
      });
      if (created?.id) setTasks((prev) => [...prev, created]);
    } catch (err) {
      console.error('Eroare la creare task:', err);
      setTaskError(err.message || 'Nu am putut crea task-ul.');
      return;
    }
    setNewTask({ title: '', assignedTo: null, priority: 'medium', dueDate: '' });
    setShowAddTask(false);
  };

  const toggleTaskStatus = async (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus = task.status === 'done' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
    try { await tasksAPI.updateStatus(id, nextStatus); } catch { /* already updated locally */ }
  };

  const addMemo = (taskId) => {
    const text = newMemo[taskId];
    if (!text?.trim()) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, memos: [...(t.memos || []), { id: Date.now(), text, author: currentUser?.id || 0, date: new Date().toISOString().slice(0, 10) }] } : t)));
    setNewMemo((prev) => ({ ...prev, [taskId]: '' }));
  };

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      setEventError('Completează titlul și data evenimentului.');
      return;
    }
    setEventError('');
    try {
      const created = await calendarAPI.create({
        title: newEvent.title,
        event_date: newEvent.date,
        start_time: newEvent.time,
        event_type: newEvent.type,
        project_id: project.id,
      });
      if (created?.id) setEvents((prev) => [...prev, created]);
    } catch (err) {
      console.error('Eroare la creare eveniment:', err);
      setEventError(err.message || 'Nu am putut crea evenimentul.');
      return;
    }
    setNewEvent({ title: '', date: '', time: '10:00', type: 'meeting' });
    setShowAddEvent(false);
  };

  const addBeneficiari = async () => {
    const count = Number(newBenefCount) || 0;
    if (count <= 0) return;
    try {
      const updated = await projectsAPI.update(project.id, {
        beneficiari_directi: (project.beneficiari_directi || 0) + count,
      });
      if (updated?.id) setProject(updated);

      // Optionally create an associated event (workshop/training/etc.)
      if (newBenefEvent.title && newBenefEvent.date) {
        try {
          const created = await calendarAPI.create({
            title: newBenefEvent.title,
            event_date: newBenefEvent.date,
            start_time: newBenefEvent.time,
            event_type: newBenefEvent.type || 'event',
            project_id: project.id,
          });
          if (created?.id) setEvents((prev) => [...prev, created]);
        } catch (err) {
          console.error('Eroare la creare eveniment asociat beneficiari:', err);
        }
      }
    } catch (err) {
      console.error('Eroare la actualizare beneficiari:', err);
    }
    setNewBenefCount(0);
    setShowAddBeneficiari(false);
    setNewBenefEvent({ title: '', date: '', time: '10:00', type: 'event' });
  };

  const deleteEvent = async (eventId) => {
    try {
      await calendarAPI.delete(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      setEventError(err.message || 'Nu am putut șterge evenimentul.');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (expandedTask === taskId) setExpandedTask(null);
    } catch (err) {
      setTaskError(err.message || 'Nu am putut șterge task-ul.');
    }
  };

  const handleOCR = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrData(null);
    setOcrError('');
    try {
      const data = await ocrAPI.process(file);
      setOcrData(data?.extracted || data);
    } catch (err) {
      setOcrError(err.message || 'Procesarea OCR a eșuat.');
    } finally {
      setOcrLoading(false);
    }
  };

  const saveOCR = async () => {
    if (!ocrData) return;
    try {
      const created = await expensesAPI.create({
        furnizor: ocrData.furnizor || 'OCR',
        item_description: ocrData.item_description || ocrData.furnizor || 'Cheltuială OCR',
        suma: Number(String(ocrData.suma || '0').replace(/[^0-9.,]/g, '').replace(',', '.')),
        category: ocrData.categorie || ocrData.category || 'alta',
        expense_date: ocrData.data || ocrData.date || new Date().toISOString().slice(0, 10),
        numar_factura: ocrData.numar_factura || '',
        project_id: project.id,
      });
      if (created?.id) setExpenses((prev) => [created, ...prev]);
      setOcrData(null);
    } catch (err) {
      setOcrError(err.message || 'Salvarea a eșuat.');
    }
  };

  const TABS = [
    { id: 'buget', label: '💰 Buget & Cheltuieli' },
    { id: 'beneficiari', label: '👥 Beneficiari' },
    { id: 'calendar', label: '📅 Calendar' },
    { id: 'tasks', label: `✅ Task-uri (${tasks.length})` },
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-semibold transition-colors">
            <ChevronLeft className="w-4 h-4" /> Înapoi la proiecte
          </button>
          <h2 className="text-xl font-black text-slate-800">{project.name}</h2>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          <span className="ml-3 text-sm text-slate-500">Se încarcă datele proiectului...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-semibold transition-colors">
          <ChevronLeft className="w-4 h-4" /> Înapoi la proiecte
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-black text-slate-800">{project.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <Badge status={project.status} />
            <span className="text-xs text-slate-400">{project.category || '—'} · Deadline: {project.deadline || '—'}</span>
            <div className="flex items-center gap-1">
              {members.map((m) => (
                <Avatar key={m.id} initials={getInitials(m)} size="xs" colorIdx={0} />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-800">{progressPct}%</p>
          <p className="text-xs text-slate-400">utilizare buget</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${progressPct >= 90 ? 'bg-rose-400' : progressPct >= 60 ? 'bg-violet-500' : 'bg-emerald-400'}`} style={{ width: `${progressPct}%` }} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white rounded-t-2xl overflow-hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap ${tab === t.id ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* BUGET TAB */}
      {tab === 'buget' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Target} label="Grant Total" value={`${grantTotal.toLocaleString()} RON`} color="violet" />
            <StatCard icon={DollarSign} label="Total Cheltuit" value={`${totalSpent.toLocaleString()} RON`} color="rose" />
            <StatCard icon={TrendingUp} label="Sold Rămas" value={`${soldRamas.toLocaleString()} RON`} color="emerald" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Cheltuieli Proiect</h3>
              <div>
                <input ref={(el) => { if (el) fileInputRef.current = el; }} type="file" accept="image/*,.pdf" className="hidden" onChange={handleOCR} />
                <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                  {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {ocrLoading ? 'Procesez OCR...' : 'Adaugă cu OCR'}
                </button>
              </div>
            </div>
            {ocrError && <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{ocrError}</div>}
            {ocrData && (
              <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5" /> OCR finalizat — verificați datele</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {Object.entries(ocrData).map(([k, v]) => (
                    <div key={k}><label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">{k.replace('_', ' ')}</label>
                      <input defaultValue={v} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" /></div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveOCR} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Salvează</button>
                  <button onClick={() => setOcrData(null)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-semibold">Anulează</button>
                </div>
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Furnizor / Descriere</th>
                  <th className="pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Sumă</th>
                  <th className="pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-slate-400">Nicio cheltuială înregistrată.</td></tr>
                )}
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 text-xs text-slate-400">{e.expense_date || e.created_at?.slice(0, 10) || '—'}</td>
                    <td className="py-2.5 font-medium text-slate-700 text-sm">{e.item_description || e.furnizor || '—'}</td>
                    <td className="py-2.5 text-right font-bold text-slate-800">{Number(e.suma || 0).toLocaleString()} RON</td>
                    <td className="py-2.5 text-right"><Badge status={e.status || 'in_asteptare'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BENEFICIARI TAB */}
      {tab === 'beneficiari' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-slate-800">Beneficiari Direcți</h4>
                <p className="text-xs text-slate-400 mt-0.5">{(project.beneficiari_directi || 0).toLocaleString()} persoane</p>
              </div>
              <div>
                <button onClick={() => setShowAddBeneficiari((v) => !v)} className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-violet-700 transition-colors">
                  <Plus className="w-3 h-3" /> Adaugă
                </button>
              </div>
            </div>

            {showAddBeneficiari && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                <input value={newBenefCount} onChange={(e) => setNewBenefCount(e.target.value)} placeholder="Număr beneficiari direcți" type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                <input value={newBenefEvent.title} onChange={(e) => setNewBenefEvent((p) => ({ ...p, title: e.target.value }))} placeholder="Titlu eveniment (opțional)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                <div className="flex gap-2">
                  <input type="date" value={newBenefEvent.date} onChange={(e) => setNewBenefEvent((p) => ({ ...p, date: e.target.value }))} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                  <input type="time" value={newBenefEvent.time} onChange={(e) => setNewBenefEvent((p) => ({ ...p, time: e.target.value }))} className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                </div>
                <select value={newBenefEvent.type} onChange={(e) => setNewBenefEvent((p) => ({ ...p, type: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none">
                  <option value="meeting">Ședință</option>
                  <option value="deadline">Deadline</option>
                  <option value="event">Eveniment</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={addBeneficiari} className="bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Salvează</button>
                  <button onClick={() => setShowAddBeneficiari(false)} className="border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs">Anulează</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CALENDAR TAB */}
      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth((m) => Math.max(0, m - 1))}><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
              <span className="font-bold text-slate-800">{monthNames[currentMonth]} {currentYear}</span>
              <button onClick={() => setCurrentMonth((m) => Math.min(11, m + 1))}><ChevronRight className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={i} className="text-center text-xs font-bold text-slate-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasEvent = events.some((e) => (e.event_date || e.date) === dateStr);
                const today = new Date();
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                return (
                  <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-all relative
                    ${isToday ? 'bg-violet-600 text-white' : hasEvent ? 'bg-violet-50 text-violet-700 hover:bg-violet-100' : 'text-slate-600 hover:bg-slate-50'}`}>
                    {day}
                    {hasEvent && !isToday && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-500"></span>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Evenimente</h4>
              <button onClick={() => setShowAddEvent((v) => !v)} className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-xl font-bold hover:bg-violet-700 transition-colors">
                <Plus className="w-3 h-3" /> Adaugă
              </button>
            </div>
            {showAddEvent && (
              <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-2">
                {eventError && <p className="text-xs text-rose-600">{eventError}</p>}
                <input value={newEvent.title} onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))} placeholder="Titlu eveniment" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                <div className="flex gap-2">
                  <input type="date" value={newEvent.date} onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                  <input type="time" value={newEvent.time} onChange={(e) => setNewEvent((p) => ({ ...p, time: e.target.value }))} className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                </div>
                <select value={newEvent.type} onChange={(e) => setNewEvent((p) => ({ ...p, type: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none">
                  <option value="meeting">Ședință</option><option value="deadline">Deadline</option><option value="event">Eveniment</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={addEvent} className="bg-violet-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Salvează</button>
                  <button onClick={() => setShowAddEvent(false)} className="border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs">Anulează</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
                {eventError && !showAddEvent && <p className="text-xs text-rose-600 text-center">{eventError}</p>}
              {eventsLoading && <p className="text-sm text-slate-400 text-center py-4">Se încarcă evenimentele...</p>}
              {!eventsLoading && events.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Niciun eveniment adăugat.</p>}
              {events.map((ev) => {
                const evType = ev.event_type || ev.type || 'event';
                const evStatus = getEventStatus(ev);
                return (
                <div key={ev.id} className={`flex items-start gap-3 p-3 rounded-xl border ${evType === 'deadline' ? 'border-rose-200 bg-rose-50' : evType === 'meeting' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'} ${evStatus === 'finalizat' ? 'opacity-75' : ''}`}>
                  <div className={`w-1.5 h-8 rounded-full ${evType === 'deadline' ? 'bg-rose-400' : evType === 'meeting' ? 'bg-blue-400' : 'bg-emerald-400'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700">{ev.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{ev.event_date || ev.date || '—'} · {ev.start_time || ev.time || '—'}</p>
                    <div className="mt-1">
                      <Badge status={evStatus} />
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                    title="Șterge eveniment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-xs text-slate-500">
              <span>✅ {tasks.filter((t) => t.status === 'done').length} finalizate</span>
              <span>🔄 {tasks.filter((t) => t.status === 'in_progress').length} în lucru</span>
              <span>⏳ {tasks.filter((t) => t.status === 'pending').length} în așteptare</span>
            </div>
            <button onClick={() => setShowAddTask((v) => !v)} className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-violet-700 transition-colors">
              <Plus className="w-3 h-3" /> Task nou
            </button>
          </div>

          {showAddTask && (
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-violet-700">Adaugă Task Nou</h4>
              {taskError && <p className="text-xs text-rose-600">{taskError}</p>}
              <input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))} placeholder="Titlu task..." className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400" />
              <div className="grid grid-cols-3 gap-3">
                <select value={newTask.assignedTo || ''} onChange={(e) => setNewTask((p) => ({ ...p, assignedTo: e.target.value || null }))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  <option value="">Neatribuit</option>
                  {members.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.name}</option>)}
                </select>
                <select value={newTask.priority} onChange={(e) => setNewTask((p) => ({ ...p, priority: e.target.value }))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                  <option value="urgent">🔴 Urgent</option><option value="high">🟠 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option>
                </select>
                <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask((p) => ({ ...p, dueDate: e.target.value }))} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={addTask} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Creează Task</button>
                <button onClick={() => setShowAddTask(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm">Anulează</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {taskError && !showAddTask && <p className="text-xs text-rose-600 text-center">{taskError}</p>}
            {tasksLoading && <p className="text-sm text-slate-400 text-center py-4">Se încarcă task-urile...</p>}
            {!tasksLoading && tasks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Niciun task adăugat.</p>}
            {tasks.map((task) => {
              const assignee = task.assignee || members.find((m) => m.id === task.assigned_to);
              const isExpanded = expandedTask === task.id;
              return (
                <div key={task.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${task.status === 'done' ? 'border-emerald-100 opacity-75' : 'border-slate-100 hover:border-violet-200'}`}>
                  <div className="flex items-center gap-3 p-4">
                    <button onClick={() => toggleTaskStatus(task.id)} className="flex-shrink-0">
                      {task.status === 'done' ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : task.status === 'in_progress' ? <Clock className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-slate-300 hover:text-violet-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge status={task.priority} /><Badge status={task.status} />
                        {(task.due_date || task.dueDate) && <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{task.due_date || task.dueDate}</span>}
                        {(task.memos || []).length > 0 && <span className="text-xs text-slate-400 flex items-center gap-1"><MessageSquare className="w-3 h-3" />{task.memos.length}</span>}
                      </div>
                    </div>
                    {assignee ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Avatar initials={getInitials(assignee)} size="xs" colorIdx={typeof assignee.id === 'number' ? assignee.id : 0} />
                        <span className="text-xs text-slate-500 hidden sm:block">{(assignee.full_name || assignee.name || '').split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 italic flex-shrink-0">neatribuit</span>
                    )}
                    <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-slate-300 hover:text-violet-500 transition-colors flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-slate-300 hover:text-rose-600 transition-colors flex-shrink-0"
                      title="Șterge task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Memo-uri ({(task.memos || []).length})</p>
                      <div className="space-y-2 mb-3">
                        {(task.memos || []).length === 0 && <p className="text-xs text-slate-400">Niciun memo adăugat.</p>}
                        {(task.memos || []).map((m) => {
                          const author = m.author || members.find((u) => u.id === m.author_id);
                          return (
                            <div key={m.id} className="flex items-start gap-2 bg-white border border-slate-100 rounded-xl p-3">
                              {author && <Avatar initials={getInitials(author)} size="xs" colorIdx={typeof author.id === 'number' ? author.id : 0} />}
                              <div><p className="text-xs text-slate-700">{m.text}</p><p className="text-xs text-slate-400 mt-0.5">{author?.full_name || author?.name || '—'} · {m.date}</p></div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input value={newMemo[task.id] || ''} onChange={(e) => setNewMemo((p) => ({ ...p, [task.id]: e.target.value }))}
                          placeholder="Adaugă memo..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-400" />
                        <button onClick={() => addMemo(task.id)} className="bg-violet-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-violet-700">Adaugă</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
