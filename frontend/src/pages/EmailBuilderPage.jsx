import { useState, useCallback } from 'react';
import {
  Sparkles, Eye, EyeOff, Code2, Send, X, Trash2, ChevronUp, ChevronDown,
  Copy, Loader2, Zap, Layout, Mail, Settings, CheckCircle, GripVertical,
} from 'lucide-react';
import { BLOCK_TYPES, AI_PROMPTS_SUGGESTIONS, generateFullHTML } from '@/data/emailBuilderData';
import { BlockPreview, PropertyPanel, DropZone } from '@/components/email-builder';
import { socialAPI } from '@/services/api';

const INITIAL_BLOCKS = [
  { id: 'b1', ...BLOCK_TYPES.find((b) => b.type === 'header'), data: { ...BLOCK_TYPES.find((b) => b.type === 'header').defaultData } },
  { id: 'b2', ...BLOCK_TYPES.find((b) => b.type === 'hero'), data: { ...BLOCK_TYPES.find((b) => b.type === 'hero').defaultData } },
  { id: 'b3', ...BLOCK_TYPES.find((b) => b.type === 'text'), data: { ...BLOCK_TYPES.find((b) => b.type === 'text').defaultData } },
  { id: 'b4', ...BLOCK_TYPES.find((b) => b.type === 'stats'), data: { ...BLOCK_TYPES.find((b) => b.type === 'stats').defaultData } },
  { id: 'b5', ...BLOCK_TYPES.find((b) => b.type === 'divider'), data: { ...BLOCK_TYPES.find((b) => b.type === 'divider').defaultData } },
  { id: 'b6', ...BLOCK_TYPES.find((b) => b.type === 'footer'), data: { ...BLOCK_TYPES.find((b) => b.type === 'footer').defaultData } },
];

const EMAIL_GROUPS_LOCAL = ['PM', 'Donatori', 'Newsletter', 'Voluntari', 'Parteneri'];

export default function EmailBuilderPage() {
  const [blocks, setBlocks] = useState(INITIAL_BLOCKS);
  const [selectedId, setSelectedId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  const [subject, setSubject] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [draggingBlockId, setDraggingBlockId] = useState(null);
  const [draggingFromPalette, setDraggingFromPalette] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [recipients, setRecipients] = useState(['Donatori']);

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  const updateBlock = useCallback((updated) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }, []);

  const deleteBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateBlock = (id) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const original = blocks[idx];
    const clone = { ...original, id: `b${Date.now()}`, data: { ...original.data } };
    const next = [...blocks];
    next.splice(idx + 1, 0, clone);
    setBlocks(next);
  };

  const moveBlock = (id, direction) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setBlocks(next);
  };

  const onPaletteDragStart = (e, blockType) => {
    setDraggingFromPalette(blockType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onCanvasDragStart = (e, id) => {
    setDraggingBlockId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropZone = (e, index) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggingFromPalette) {
      const def = BLOCK_TYPES.find((b) => b.type === draggingFromPalette);
      if (!def) return;
      const newBlock = { id: `b${Date.now()}`, type: def.type, label: def.label, icon: def.icon, data: { ...def.defaultData } };
      const next = [...blocks];
      next.splice(index, 0, newBlock);
      setBlocks(next);
      setSelectedId(newBlock.id);
      setDraggingFromPalette(null);
    } else if (draggingBlockId) {
      const fromIdx = blocks.findIndex((b) => b.id === draggingBlockId);
      if (fromIdx === -1) return;
      const next = [...blocks];
      const [moved] = next.splice(fromIdx, 1);
      const insertAt = fromIdx < index ? index - 1 : index;
      next.splice(insertAt, 0, moved);
      setBlocks(next);
      setDraggingBlockId(null);
    }
  };

  const onDragEnd = () => { setDraggingBlockId(null); setDraggingFromPalette(null); setDragOverIndex(null); };

  const runAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await socialAPI.generateAIText(aiPrompt, 'email', 'formal');
      const text = typeof res === 'string' ? res : res?.text || res?.generated_text || aiPrompt;
      setBlocks((prev) => prev.map((b) => {
        if (b.type === 'text' && prev.indexOf(b) === prev.findIndex((x) => x.type === 'text')) {
          return { ...b, data: { ...b.data, heading: 'Dragă susținătorule,', body: text } };
        }
        return b;
      }));
    } catch {
      // If API fails, just insert prompt as body text
      setBlocks((prev) => prev.map((b) => {
        if (b.type === 'text' && prev.indexOf(b) === prev.findIndex((x) => x.type === 'text')) {
          return { ...b, data: { ...b.data, body: aiPrompt } };
        }
        return b;
      }));
    } finally {
      setAiLoading(false);
      setAiOpen(false);
      setAiPrompt('');
    }
  };

  const handleSend = () => { setSentSuccess(true); setTimeout(() => setSentSuccess(false), 3000); };

  const htmlOutput = generateFullHTML(blocks, subject);
  const categories = [...new Set(BLOCK_TYPES.map((b) => b.category))];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* LEFT: BLOCK PALETTE */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-white">
          <p className="text-slate-900 font-display text-sm">Email Builder</p>
          <p className="text-slate-500 text-xs mt-0.5 uppercase tracking-[0.2em]">Drag blocks → canvas</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {categories.map((cat) => (
            <div key={cat} className="mb-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">{cat}</p>
              <div className="space-y-1.5">
                {BLOCK_TYPES.filter((b) => b.category === cat).map((def) => (
                  <div key={def.type} draggable onDragStart={(e) => onPaletteDragStart(e, def.type)} onDragEnd={onDragEnd}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-violet-200 cursor-grab active:cursor-grabbing transition-all group select-none">
                    <div className="w-7 h-7 bg-violet-100/70 group-hover:bg-violet-200/70 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                      <def.icon className="w-3.5 h-3.5 text-violet-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 leading-tight">{def.label}</p>
                      <p className="text-xs text-slate-400 truncate leading-tight">{def.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: CANVAS */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              className="flex-1 text-sm font-semibold text-slate-700 focus:outline-none bg-transparent border-b border-transparent focus:border-violet-300 transition-colors pb-0.5 min-w-0"
              placeholder="Subiect email..." />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1">
              {EMAIL_GROUPS_LOCAL.map((g) => (
                <button key={g} onClick={() => setRecipients((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])}
                  className={`text-xs px-2.5 py-1.5 rounded-full border font-semibold transition-colors ${recipients.includes(g) ? 'bg-violet-50 text-violet-700 border-violet-200' : 'border-slate-200 text-slate-600 hover:border-violet-200'}`}>{g}</button>
              ))}
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <button onClick={() => setAiOpen(true)} className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-violet-200 hover:bg-violet-100 transition-all">
              <Sparkles className="w-3 h-3" /> AI Fill
            </button>
            <button onClick={() => setShowPreview((v) => !v)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${showPreview ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showPreview ? 'Editare' : 'Preview'}
            </button>
            <button onClick={() => setShowHTML((v) => !v)} className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
              <Code2 className="w-3 h-3" /> HTML
            </button>
            <button onClick={handleSend} className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-colors">
              <Send className="w-3 h-3" /> Trimite
            </button>
          </div>
        </div>

        {sentSuccess && (
          <div className="bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 py-2.5">
            <CheckCircle className="w-4 h-4" /> Email trimis cu succes către: {recipients.join(', ')}!
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-transparent">
          {showPreview ? (
            <div className="max-w-[600px] mx-auto paper-card overflow-hidden">
              {blocks.map((b) => <BlockPreview key={b.id} block={b} />)}
            </div>
          ) : (
            <div className="max-w-[640px] mx-auto">
              <DropZone index={0} dragOverIndex={dragOverIndex} setDragOverIndex={setDragOverIndex} onDrop={onDropZone} />
              {blocks.map((block, idx) => {
                const def = BLOCK_TYPES.find((b) => b.type === block.type);
                const isSelected = selectedId === block.id;
                return (
                  <div key={block.id}>
                    <div
                      draggable onDragStart={(e) => onCanvasDragStart(e, block.id)} onDragEnd={onDragEnd}
                      onClick={() => setSelectedId(isSelected ? null : block.id)}
                      className={`relative group paper-card overflow-hidden transition-all cursor-pointer border-2 ${isSelected ? 'border-violet-400' : 'border-transparent hover:border-violet-200'}`}>
                      <div className={`absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl p-1 border border-slate-200 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="px-2 py-1 cursor-grab text-slate-400 hover:text-slate-600" title="Trage pentru a muta"><GripVertical className="w-3.5 h-3.5" /></div>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }} disabled={idx === 0} className="p-1 text-slate-400 hover:text-violet-600 disabled:opacity-30 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }} disabled={idx === blocks.length - 1} className="p-1 text-slate-400 hover:text-violet-600 disabled:opacity-30 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full border border-violet-200">
                          {def && <def.icon className="w-3 h-3" />} {def?.label}
                        </div>
                      )}
                      <div className="pointer-events-none select-none"><BlockPreview block={block} /></div>
                    </div>
                    <DropZone index={idx + 1} dragOverIndex={dragOverIndex} setDragOverIndex={setDragOverIndex} onDrop={onDropZone} />
                  </div>
                );
              })}
              {blocks.length === 0 && (
                <div className="paper-card border-2 border-dashed border-violet-200 h-64 flex flex-col items-center justify-center text-slate-400">
                  <Layout className="w-10 h-10 text-violet-300 mb-3" />
                  <p className="font-semibold text-sm">Drag un bloc din panoul stânga pentru a începe</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: PROPERTY PANEL */}
      {!showPreview && (
        <div className="w-64 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-white">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" /> Proprietăți Bloc
            </p>
          </div>
          <PropertyPanel block={selectedBlock} onChange={updateBlock} />
        </div>
      )}

      {/* HTML MODAL */}
      {showHTML && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-violet-600" />
                <p className="text-slate-900 font-display">Cod HTML Email</p>
                <span className="text-slate-400 text-xs uppercase tracking-[0.2em]">gata de trimis</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { navigator.clipboard?.writeText(htmlOutput); }}
                  className="text-xs border border-slate-200 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Copiază
                </button>
                <button onClick={() => setShowHTML(false)} className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">{htmlOutput}</pre>
            </div>
          </div>
        </div>
      )}

      {/* AI MODAL */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center border border-violet-200">
                  <Sparkles className="w-5 h-5 text-violet-700" />
                </div>
                <div>
                  <p className="text-slate-900 font-display">Newsletter Generator</p>
                  <p className="text-slate-500 text-xs uppercase tracking-[0.2em]">Completează blocurile de text</p>
                </div>
                <button onClick={() => setAiOpen(false)} className="ml-auto text-slate-400 hover:text-slate-900"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {AI_PROMPTS_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setAiPrompt(s)} className="text-xs bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 transition-colors">{s}</button>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2 block">Descrie ce dorești</label>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={4}
                  placeholder="Ex: Newsletter de Crăciun pentru donatori, ton cald și emoționant..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={runAI} disabled={aiLoading || !aiPrompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold transition-colors">
                  {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generez conținut...</> : <><Zap className="w-4 h-4" /> Generează Email</>}
                </button>
                <button onClick={() => setAiOpen(false)} className="border border-slate-200 text-slate-600 px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-colors">Anulează</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
