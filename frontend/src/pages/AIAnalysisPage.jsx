import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  Bot,
  Clock,
  Loader2,
  MessageSquare,
  PieChart as PieChartIcon,
  RefreshCcw,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { aiAnalysisAPI } from '@/services/api';

const SAMPLE_QUESTIONS = [
  'Pe ce am cheltuit cel mai mult?',
  'Care este soldul între venituri și cheltuieli?',
  'Ce categorii de venituri au cea mai mare pondere?',
  'Arată-mi distribuția cheltuielilor pe categorii.',
  'Ce trend au avut veniturile în ultima perioadă?',
];

const PIE_COLORS = ['#6b4cc2', '#3f6fb5', '#2f7d6c', '#b07a2a', '#b04a4a', '#2a7a8a', '#7a6ab0'];

const INTRO_MESSAGE = {
  id: 'intro',
  role: 'assistant',
  text: 'Pune o întrebare despre venituri sau cheltuieli. Analiza va verifica datele și îți va afișa un răspuns concis și un grafic.',
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ro-RO')} RON`;
}

function normalizeChartData(chartData) {
  return (chartData || [])
    .map((item) => ({
      name: item?.categorie || 'Necunoscut',
      value: Number(item?.suma || 0),
    }))
    .filter((item) => item.name && Number.isFinite(item.value));
}

function guessChartType(question, chartData) {
  const lower = question.toLowerCase();
  if (chartData.length <= 4) return 'pie';
  if (/(distrib|structur|păr|proc|repart|top)/i.test(lower)) return 'pie';
  return 'bar';
}

function MessageBubble({ role, text }) {
  const isAssistant = role === 'assistant';
  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm whitespace-pre-line ${
          isAssistant
            ? 'bg-slate-50 border border-slate-200 text-slate-700'
            : 'bg-violet-700 text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-70">
          {isAssistant ? <Bot className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
          <span>{isAssistant ? 'Asistent' : 'Tu'}</span>
        </div>
        <p className="text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default function AIAnalysisPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([INTRO_MESSAGE]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const runAnalysis = async (submittedQuestion) => {
    const trimmedQuestion = (submittedQuestion ?? question).trim();
    if (!trimmedQuestion || loading) return;

    setQuestion('');
    setLoading(true);
    setError('');
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        role: 'user',
        text: trimmedQuestion,
      },
    ]);

    try {
      const response = await aiAnalysisAPI.analyze(trimmedQuestion);
      const normalizedChartData = normalizeChartData(response?.chart_data);
      const assistantText = response?.text_ai || 'Nu am obținut o concluzie clară din datele disponibile.';

      setAnalysis({
        question: trimmedQuestion,
        text_ai: assistantText,
        chartData: normalizedChartData,
      });
      setChartType(guessChartType(trimmedQuestion, normalizedChartData));
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: assistantText,
        },
      ]);
      setHistory((prev) => [
        { id: Date.now(), question: trimmedQuestion, timestamp: new Date().toLocaleTimeString('ro-RO') },
        ...prev.slice(0, 7),
      ]);
    } catch (err) {
      const message = err?.message || 'Eroare la analiza AI.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          text: `Nu am putut genera analiza: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages([INTRO_MESSAGE]);
    setAnalysis(null);
    setHistory([]);
    setError('');
    setQuestion('');
  };

  const activeChartData = analysis?.chartData || [];

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-violet-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl text-slate-900 font-display truncate">AI Analize Date</h1>
            <p className="text-xs text-slate-500 uppercase tracking-[0.2em] truncate">Chat financiar conectat la Supabase și Gemini</p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearConversation}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
        >
          <RefreshCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Resetează</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <div className="lg:col-span-2 space-y-4 md:space-y-5">
          <div className="paper-card overflow-hidden flex flex-col">
            <div className="border-b border-slate-100 bg-white px-4 md:px-5 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Analiză financiară</p>
                <p className="text-xs md:text-sm text-slate-600 truncate">Întreabă despre venituri, cheltuieli sau distribuții pe categorii.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 flex-shrink-0">
                <Bot className="w-4 h-4 text-violet-600" />
                Analiză & date
              </div>
            </div>

            <div className="h-[400px] sm:h-[520px] overflow-y-auto px-4 md:px-5 py-3 md:py-4 space-y-3 md:space-y-4 bg-transparent flex-1">
              {messages.map((message) => (
                <MessageBubble key={message.id} role={message.role} text={message.text} />
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-700 text-xs md:text-sm">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] mb-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analizez datele
                    </div>
                    <p className="text-xs md:text-sm">Gemini citește datele financiare și pregătește răspunsul.</p>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            <div className="border-t border-slate-100 bg-white px-4 md:px-5 py-3 md:py-4">
              <form
                className="space-y-2 md:space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  runAnalysis();
                }}
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 md:p-3 focus-within:border-violet-200 focus-within:bg-white transition-colors">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        runAnalysis();
                      }
                    }}
                    rows={2}
                    placeholder="Ex: Pe ce am cheltuit cel mai mult?"
                    className="w-full resize-none border-0 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-1 md:gap-2 order-2 md:order-1">
                    {SAMPLE_QUESTIONS.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => runAnalysis(sample)}
                        className="rounded-full border border-violet-200 bg-violet-50 px-2 md:px-3 py-1 md:py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors whitespace-nowrap"
                      >
                        {sample.substring(0, 15)}{sample.length > 15 ? '...' : ''}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 md:px-4 py-2 md:py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed order-1 md:order-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="hidden md:inline">Trimite</span>
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          <div className="paper-card p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Vizualizare</p>
                <h2 className="text-base md:text-lg text-slate-900 font-display">Grafic interactiv</h2>
              </div>

              <div className="inline-flex rounded-2xl bg-slate-100 p-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`inline-flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold transition-colors ${
                    chartType === 'bar' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Bar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('pie')}
                  className={`inline-flex items-center gap-1 md:gap-2 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold transition-colors ${
                    chartType === 'pie' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <PieChartIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden md:inline">Pie</span>
                </button>
              </div>
            </div>

            {!analysis ? (
              <div className="flex min-h-[240px] sm:min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-4 md:px-6 text-center">
                <TrendingUp className="w-10 md:w-12 h-10 md:h-12 text-slate-300 mb-2 md:mb-3" />
                <p className="text-sm md:text-base font-semibold text-slate-700">Aștept o întrebare</p>
                <p className="mt-2 max-w-md text-xs md:text-sm text-slate-500">
                  După ce trimiți o întrebare, aici apare graficul construit din <span className="font-semibold text-slate-700">chart_data</span>.
                </p>
              </div>
            ) : activeChartData.length === 0 ? (
              <div className="flex min-h-[240px] sm:min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 px-4 md:px-6 text-center">
                <Clock className="w-10 md:w-12 h-10 md:h-12 text-slate-300 mb-2 md:mb-3" />
                <p className="text-sm md:text-base font-semibold text-slate-700">Nu există date suficiente</p>
                <p className="mt-2 max-w-md text-xs md:text-sm text-slate-500">
                  AI-ul a returnat concluzia text, dar nu a găsit o serie utilă pentru grafic.
                </p>
              </div>
            ) : chartType === 'bar' ? (
              <div className="space-y-3 md:space-y-4">
                <ResponsiveContainer width="100%" height={240} minHeight={240}>
                  <BarChart data={activeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(value) => `${(Number(value) / 1000).toFixed(0)}k`} width={40} />
                    <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="value" name="Suma (RON)" radius={[10, 10, 0, 0]} fill="#6b4cc2" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {activeChartData.slice(0, 6).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 md:gap-3 rounded-2xl border border-slate-200 bg-white/80 px-2 md:px-3 py-2">
                      <span className="h-2.5 md:h-3 w-2.5 md:w-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="flex-1 text-xs md:text-sm text-slate-600 truncate">{item.name}</span>
                      <span className="text-xs md:text-sm font-bold text-slate-800 flex-shrink-0">{formatMoney(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)] items-start">
                <ResponsiveContainer width="100%" height={240} minHeight={240}>
                  <PieChart>
                    <Pie
                      data={activeChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={4}
                    >
                      {activeChartData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 md:space-y-3">
                  {activeChartData.slice(0, 7).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2 md:gap-3 rounded-2xl border border-slate-200 bg-white/80 px-2 md:px-3 py-1.5 md:py-2.5">
                      <span className="h-2.5 md:h-3 w-2.5 md:w-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs md:text-sm font-semibold text-slate-700">{item.name}</p>
                        <p className="text-[11px] text-slate-400">{formatMoney(item.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 md:space-y-5">
          <div className="paper-card p-4 md:p-5">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <MessageSquare className="w-4 h-4" />
              Istoric
            </p>
            {history.length === 0 ? (
              <p className="py-4 text-xs md:text-sm text-slate-500">Nicio întrebare procesată încă.</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => runAnalysis(item.question)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-2 md:px-3 py-2 md:py-3 text-left transition-colors hover:border-violet-200 hover:bg-slate-50"
                  >
                    <p className="line-clamp-2 text-xs md:text-sm font-semibold text-slate-700">{item.question}</p>
                    <p className="mt-1 text-[10px] md:text-xs text-slate-400">{item.timestamp}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="paper-card p-4 md:p-5">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Bot className="w-4 h-4 text-violet-600" />
              Ce face endpointul
            </p>
            <div className="space-y-2 md:space-y-3 text-xs md:text-sm text-slate-600">
              <p>1. Citește datele financiare din Supabase înainte să interogheze AI-ul.</p>
              <p>2. Trimite către Gemini întrebarea și contextul agregat din venituri și cheltuieli.</p>
              <p>3. Primește strict JSON cu <span className="font-semibold text-slate-900">text_ai</span> și <span className="font-semibold text-slate-900">chart_data</span>.</p>
            </div>
          </div>
        </div>
      </div>

    </div>

  );
}
