import { useState, useCallback, useRef, useEffect, Component } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Users, PenSquare, Layout, Mail, Plus, Upload, Trash2,
  ChevronRight, ChevronLeft, Check, Search, X, GripVertical, ArrowUp, ArrowDown,
  Copy, Send, Clock, CheckCircle, Loader2, Sparkles, MessageSquare,
  FileText, Image, Columns, Quote, BarChart3, MousePointerClick, Minus, Type,
  Shield, AlertTriangle,
} from 'lucide-react';
import { emailAPI, contactsAPI } from '@/services/api';

// ══════════════════════════════════════════════════════════════════════════════
// ERROR BOUNDARY — catches runtime rendering errors
// ══════════════════════════════════════════════════════════════════════════════

class EmailCRMErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('EmailCRM Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-90px)]">
          <div className="text-center p-8 paper-card max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg text-slate-900 font-display mb-2">Eroare Email CRM</h2>
            <p className="text-sm text-slate-500 mb-4">A apărut o eroare la încărcarea paginii.</p>
            <pre className="text-xs text-red-500 bg-red-50 rounded-lg p-3 text-left overflow-auto max-h-40 mb-4">
              {this.state.error?.message || 'Eroare necunoscută'}
            </pre>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-6 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-600"
            >
              Reîncarcă pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const GROUP_META = {
  Newsletter: { emoji: '📰', desc: 'Toți abonații activi' },
  Donatori: { emoji: '❤️', desc: 'Susținătorii organizației' },
  Parteneri: { emoji: '🤝', desc: 'Parteneri și colaboratori' },
  Voluntari: { emoji: '🙋', desc: 'Echipa de voluntari' },
  Echipa: { emoji: '👥', desc: 'Staff-ul intern' },
  PM: { emoji: '📋', desc: 'Project Managerii' },
  Toti: { emoji: '🌍', desc: 'Toate listele combinate' },
};

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── Default blocks ──────────────────────────────────────────

const DEFAULT_BLOCKS = [
  { id: uid(), type: 'header', data: { logoText: '🌍', orgName: 'CiviUp', tagline: 'Construim comunități mai puternice', bgColor: '#7c3aed', textColor: '#ffffff', accentColor: '#c4b5fd' } },
  { id: uid(), type: 'hero', data: { imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=300&fit=crop', headline: 'Împreună schimbăm comunitatea', subheadline: 'Descoperă ultimele proiecte și inițiative ale organizației noastre.', ctaText: 'Află mai multe', ctaUrl: 'https://civiup.ro', overlayOpacity: 0.5 } },
  { id: uid(), type: 'text', data: { heading: 'Dragă {{first_name}},', headingSize: 24, headingColor: '#1e293b', body: 'Îți mulțumim pentru sprijinul tău continuu. Iată cele mai recente noutăți din activitatea noastră.', bodyColor: '#475569', alignment: 'left', bgColor: '#ffffff', padding: 24 } },
  { id: uid(), type: 'button', data: { text: 'Vizitează site-ul', url: 'https://civiup.ro', bgColor: '#7c3aed', textColor: '#ffffff', containerBg: '#ffffff', borderRadius: 8, size: 'L', alignment: 'center' } },
  { id: uid(), type: 'footer', data: { orgName: 'CIviUp România', address: 'Str. Speranței 42, București', email: 'newsletter@civiup.ro', phone: '+40 721 000 000', website: 'https://civiup.ro', bgColor: '#f8fafc', textColor: '#64748b', linkColor: '#7c3aed', showSocial: true, showUnsubscribe: true } },
];

const BLOCK_PALETTE = [
  { section: 'Structură', items: [
    { type: 'header', label: 'Header Brand', desc: 'Logo și motto', icon: Layout },
    { type: 'footer', label: 'Footer', desc: 'Info organizație', icon: FileText },
    { type: 'divider', label: 'Separator', desc: 'Linie de separare', icon: Minus },
    { type: 'two_col', label: '2 Coloane', desc: 'Text + imagine', icon: Columns },
  ]},
  { section: 'Conținut', items: [
    { type: 'text', label: 'Text & Titlu', desc: 'Heading + paragraf', icon: Type },
    { type: 'quote', label: 'Citat/Callout', desc: 'Text evidențiat', icon: Quote },
    { type: 'stats', label: 'Statistici', desc: '3 statistici', icon: BarChart3 },
  ]},
  { section: 'Media', items: [
    { type: 'hero', label: 'Hero cu Imagine', desc: 'Banner mare', icon: Image },
    { type: 'image', label: 'Imagine', desc: 'Imagine cu caption', icon: Image },
  ]},
  { section: 'Acțiune', items: [
    { type: 'button', label: 'Buton CTA', desc: 'Call to action', icon: MousePointerClick },
  ]},
];

function createBlock(type) {
  const defaults = {
    header: { logoText: '🌍', orgName: 'CiviUp', tagline: 'Construim comunități mai puternice', bgColor: '#7c3aed', textColor: '#ffffff', accentColor: '#c4b5fd' },
    hero: { imageUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&h=300&fit=crop', headline: 'Titlu principal', subheadline: 'Subtitlu sau descriere scurtă', ctaText: 'Acționează acum', ctaUrl: 'https://civiup.ro', overlayOpacity: 0.5 },
    text: { heading: 'Titlu secțiune', headingSize: 24, headingColor: '#1e293b', body: 'Scrie conținutul tău aici...', bodyColor: '#475569', alignment: 'left', bgColor: '#ffffff', padding: 24 },
    image: { imageUrl: '', caption: 'Descriere imagine', borderRadius: 8, bgColor: '#ffffff' },
    two_col: { heading: 'Titlu secțiune', body: 'Text descriptiv pentru această secțiune.', ctaText: 'Citește mai mult', ctaColor: '#7c3aed', imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&h=200&fit=crop', imageCaption: '', imageLeft: false, bgColor: '#ffffff', showHeading: true, showBody: true, showCta: true, showImage: true },
    stats: { bgColor: '#7c3aed', textColor: '#ffffff', stats: [{ icon: '🏠', value: '12', label: 'Proiecte' }, { icon: '👥', value: '340', label: 'Beneficiari' }, { icon: '💰', value: '€45K', label: 'Colectat' }] },
    quote: { text: '„Împreună putem face o diferență reală în comunitate."', author: 'Maria Ionescu, Director', accentColor: '#7c3aed', bgColor: '#f5f3ff', textColor: '#4c1d95' },
    button: { text: 'Donează acum', url: '#', bgColor: '#7c3aed', textColor: '#ffffff', containerBg: '#ffffff', borderRadius: 8, size: 'L', alignment: 'center' },
    divider: { lineColor: '#e2e8f0', thickness: 1, bgColor: '#ffffff', marginY: 16 },
    footer: { orgName: 'CIviUp România', address: 'Str. Speranței 42, București', email: 'newsletter@civiup.ro', phone: '+40 721 000 000', website: 'https://civiup.ro', bgColor: '#f8fafc', textColor: '#64748b', linkColor: '#7c3aed', showSocial: true, showUnsubscribe: true },
  };
  return { id: uid(), type, data: { ...(defaults[type] || {}) } };
}

// ══════════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD HELPER
// ══════════════════════════════════════════════════════════════════════════════

function ImageUploadInput({ value, onChange, label = 'Imagine' }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await emailAPI.uploadImage(file);
      onChange(res.url);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="URL imagine..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mb-1.5" />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors disabled:opacity-50">
        {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Se încarcă...</> : <><Upload className="w-3.5 h-3.5" /> Încarcă de pe calculator</>}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BLOCK PREVIEW RENDER
// ══════════════════════════════════════════════════════════════════════════════

function BlockPreviewRender({ block }) {
  const d = block.data;
  switch (block.type) {
    case 'header':
      return (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: d.bgColor }}>
          <tbody><tr><td style={{ padding: '28px 40px', textAlign: 'center' }}>
            <span style={{ fontSize: 32 }}>{d.logoText}</span>
            <p style={{ color: d.textColor, fontSize: 20, fontWeight: 800, margin: '4px 0 2px' }}>{d.orgName}</p>
            <p style={{ color: d.accentColor, fontSize: 12, margin: 0 }}>{d.tagline}</p>
          </td></tr></tbody>
        </table>
      );
    case 'hero':
      return (
        <div style={{ position: 'relative', width: '100%', minHeight: 200, backgroundImage: `url(${d.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${d.overlayOpacity ?? 0.5})` }} />
          <div style={{ position: 'relative', padding: '48px 40px', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>{d.headline}</h2>
            <p style={{ color: '#e2e8f0', fontSize: 14, margin: '0 0 20px' }}>{d.subheadline}</p>
            {d.ctaText && <a href={d.ctaUrl || '#'} style={{ display: 'inline-block', padding: '10px 28px', background: '#7c3aed', color: '#fff', borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>{d.ctaText}</a>}
          </div>
        </div>
      );
    case 'text':
      return (
        <div style={{ padding: d.padding ?? 24, background: d.bgColor, textAlign: d.alignment || 'left' }}>
          {d.heading && <h3 style={{ color: d.headingColor, fontSize: d.headingSize || 24, fontWeight: 800, margin: '0 0 8px' }}>{d.heading}</h3>}
          <p style={{ color: d.bodyColor, fontSize: 14, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{d.body}</p>
        </div>
      );
    case 'image':
      return (
        <div style={{ background: d.bgColor, padding: 16, textAlign: 'center' }}>
          {d.imageUrl ? <img src={d.imageUrl} alt="" style={{ maxWidth: '100%', borderRadius: d.borderRadius ?? 8 }} /> : <div style={{ height: 120, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#94a3b8', fontSize: 13 }}>Încarcă o imagine</span></div>}
          {d.caption && <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>{d.caption}</p>}
        </div>
      );
    case 'two_col': {
      const showH = d.showHeading !== false;
      const showB = d.showBody !== false;
      const showC = d.showCta !== false;
      const showI = d.showImage !== false;
      const textCol = (
        <td style={{ width: showI ? '50%' : '100%', padding: 24, verticalAlign: 'middle' }}>
          {showH && <h3 style={{ color: '#1e293b', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>{d.heading}</h3>}
          {showB && <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px' }}>{d.body}</p>}
          {showC && d.ctaText && <span style={{ display: 'inline-block', padding: '8px 20px', background: d.ctaColor || '#7c3aed', color: '#fff', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{d.ctaText}</span>}
        </td>
      );
      const imgCol = showI ? (
        <td style={{ width: '50%', padding: 16 }}>
          <img src={d.imageUrl} alt="" style={{ width: '100%', borderRadius: 8 }} />
          {d.imageCaption && <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>{d.imageCaption}</p>}
        </td>
      ) : null;
      return (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: d.bgColor }}>
          <tbody><tr>{d.imageLeft ? <>{imgCol}{textCol}</> : <>{textCol}{imgCol}</>}</tr></tbody>
        </table>
      );
    }
    case 'stats':
      return (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: d.bgColor }}>
          <tbody><tr>
            {(d.stats || []).map((s, i) => (
              <td key={i} style={{ textAlign: 'center', padding: '28px 16px', width: '33.33%' }}>
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <p style={{ color: d.textColor, fontSize: 28, fontWeight: 800, margin: '4px 0 2px' }}>{s.value}</p>
                <p style={{ color: d.textColor, fontSize: 12, opacity: 0.8, margin: 0 }}>{s.label}</p>
              </td>
            ))}
          </tr></tbody>
        </table>
      );
    case 'quote':
      return (
        <div style={{ background: d.bgColor, padding: 24, borderLeft: `4px solid ${d.accentColor}` }}>
          <p style={{ color: d.textColor, fontSize: 16, fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 8px' }}>{d.text}</p>
          {d.author && <p style={{ color: d.textColor, fontSize: 12, opacity: 0.7, margin: 0 }}>— {d.author}</p>}
        </div>
      );
    case 'button': {
      const pad = d.size === 'L' ? '14px 36px' : '10px 24px';
      const fs = d.size === 'L' ? 16 : 13;
      return (
        <div style={{ padding: 24, background: d.containerBg, textAlign: d.alignment || 'center' }}>
          <a href={d.url || '#'} style={{ display: 'inline-block', padding: pad, background: d.bgColor, color: d.textColor, borderRadius: d.borderRadius ?? 8, fontWeight: 700, fontSize: fs, textDecoration: 'none' }}>{d.text}</a>
        </div>
      );
    }
    case 'divider':
      return (
        <div style={{ padding: `${d.marginY ?? 16}px 40px`, background: d.bgColor || '#ffffff' }}>
          <hr style={{ border: 'none', borderTop: `${d.thickness ?? 1}px solid ${d.lineColor || '#e2e8f0'}`, margin: 0 }} />
        </div>
      );
    case 'footer':
      return (
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: d.bgColor }}>
          <tbody><tr><td style={{ padding: '24px 40px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: d.textColor, margin: '0 0 4px' }}>{d.orgName}</p>
            <p style={{ fontSize: 11, color: d.textColor, margin: '0 0 4px' }}>{d.address}</p>
            <p style={{ fontSize: 11, color: d.textColor, margin: '0 0 12px' }}>{d.email} · {d.phone}</p>
            {d.showSocial && <p style={{ fontSize: 11, margin: '0 0 8px' }}><a href={d.website} style={{ color: d.linkColor, textDecoration: 'underline' }}>{d.website}</a></p>}
            {d.showUnsubscribe && <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}><a href="#" style={{ color: d.linkColor, textDecoration: 'underline' }}>Dezabonare newsletter</a></p>}
          </td></tr></tbody>
        </table>
      );
    default:
      return <div className="p-4 text-sm text-slate-400">Bloc necunoscut: {block.type}</div>;
  }
}

function EmailDocument({ blocks }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>CiviUp Newsletter</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f1f5f9' }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ background: '#f1f5f9' }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '24px 12px' }}>
                <table width="100%" cellPadding="0" cellSpacing="0" style={{ maxWidth: 600, background: '#ffffff' }}>
                  <tbody>
                    <tr>
                      <td>
                        {blocks.map((b) => <BlockPreviewRender key={b.id} block={b} />)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

function buildEmailHtml(blocks) {
  const safeBlocks = Array.isArray(blocks) && blocks.length ? blocks : DEFAULT_BLOCKS;
  return `<!doctype html>${renderToStaticMarkup(<EmailDocument blocks={safeBlocks} />)}`;
}

function blockText(block) {
  const d = block?.data || {};
  switch (block?.type) {
    case 'header':
      return [d.orgName, d.tagline].filter(Boolean).join('\n');
    case 'hero':
      return [d.headline, d.subheadline, d.ctaText, d.ctaUrl].filter(Boolean).join('\n');
    case 'text':
      return [d.heading, d.body].filter(Boolean).join('\n');
    case 'image':
      return d.caption || '';
    case 'two_col':
      return [d.heading, d.body, d.ctaText, d.imageCaption].filter(Boolean).join('\n');
    case 'stats':
      return (d.stats || []).map((s) => `${s.label || ''}: ${s.value || ''}`).join('\n');
    case 'quote':
      return [d.text, d.author ? `- ${d.author}` : ''].filter(Boolean).join('\n');
    case 'button':
      return [d.text, d.url].filter(Boolean).join(' - ');
    case 'footer':
      return [d.orgName, d.address, d.email, d.phone, d.website].filter(Boolean).join('\n');
    default:
      return '';
  }
}

function buildEmailText(blocks) {
  const safeBlocks = Array.isArray(blocks) && blocks.length ? blocks : DEFAULT_BLOCKS;
  const content = safeBlocks.map(blockText).filter(Boolean).join('\n\n').trim();
  return content || 'Newsletter CiviUp';
}

// ══════════════════════════════════════════════════════════════════════════════
// PROPERTY PANEL
// ══════════════════════════════════════════════════════════════════════════════

function PropInput({ label, value, onChange, type = 'text', multiline = false }) {
  const cls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300';
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      {multiline
        ? <textarea className={cls} rows={3} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        : <input className={cls} type={type} value={value ?? ''} onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} />}
    </div>
  );
}

function PropColor({ label, value, onChange }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0" />
        <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono" />
      </div>
    </div>
  );
}

function PropSlider({ label, value, onChange, min = 0, max = 100, step = 1 }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-500 mb-1">{label}: {value}</label>
      <input type="range" min={min} max={max} step={step} value={value ?? min} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-violet-600" />
    </div>
  );
}

function PropToggle({ label, value, onChange }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-violet-600' : 'bg-slate-200'} relative`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function PropAlign({ value, onChange }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-slate-500 mb-1">Aliniere</label>
      <div className="flex gap-1">
        {['left', 'center', 'right'].map((a) => (
          <button key={a} onClick={() => onChange(a)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${value === a ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500'}`}>
            {a === 'left' ? 'Stânga' : a === 'center' ? 'Centru' : 'Dreapta'}
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertyPanel({ block, onChange }) {
  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Layout className="w-7 h-7 text-slate-300" /></div>
        <p className="text-sm font-semibold text-slate-400">Selectează un bloc pentru a edita</p>
      </div>
    );
  }
  const d = block.data;
  const update = (key, val) => onChange({ ...block, data: { ...d, [key]: val } });
  const updateStat = (idx, key, val) => {
    const newStats = [...(d.stats || [])];
    newStats[idx] = { ...newStats[idx], [key]: val };
    onChange({ ...block, data: { ...d, stats: newStats } });
  };

  switch (block.type) {
    case 'header':
      return (<div><PropInput label="Logo / Emoji" value={d.logoText} onChange={(v) => update('logoText', v)} /><PropInput label="Organizație" value={d.orgName} onChange={(v) => update('orgName', v)} /><PropInput label="Tagline" value={d.tagline} onChange={(v) => update('tagline', v)} /><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /><PropColor label="Culoare text" value={d.textColor} onChange={(v) => update('textColor', v)} /><PropColor label="Accent" value={d.accentColor} onChange={(v) => update('accentColor', v)} /></div>);
    case 'hero':
      return (<div><ImageUploadInput label="Imagine hero" value={d.imageUrl} onChange={(v) => update('imageUrl', v)} /><PropInput label="Titlu" value={d.headline} onChange={(v) => update('headline', v)} /><PropInput label="Subtitlu" value={d.subheadline} onChange={(v) => update('subheadline', v)} /><PropInput label="Text buton" value={d.ctaText} onChange={(v) => update('ctaText', v)} /><PropInput label="Link buton" value={d.ctaUrl} onChange={(v) => update('ctaUrl', v)} /><PropSlider label="Opacitate overlay" value={d.overlayOpacity ?? 0.5} onChange={(v) => update('overlayOpacity', v)} min={0} max={1} step={0.1} /></div>);
    case 'text':
      return (<div><PropInput label="Heading" value={d.heading} onChange={(v) => update('heading', v)} /><PropSlider label="Mărime heading" value={d.headingSize || 24} onChange={(v) => update('headingSize', v)} min={16} max={48} /><PropColor label="Culoare heading" value={d.headingColor} onChange={(v) => update('headingColor', v)} /><PropInput label="Corp text" value={d.body} onChange={(v) => update('body', v)} multiline /><PropColor label="Culoare text" value={d.bodyColor} onChange={(v) => update('bodyColor', v)} /><PropAlign value={d.alignment} onChange={(v) => update('alignment', v)} /><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /><PropSlider label="Padding" value={d.padding ?? 24} onChange={(v) => update('padding', v)} min={0} max={64} /></div>);
    case 'image':
      return (<div><ImageUploadInput label="Imagine" value={d.imageUrl} onChange={(v) => update('imageUrl', v)} /><PropInput label="Caption" value={d.caption} onChange={(v) => update('caption', v)} /><PropSlider label="Rotunjire" value={d.borderRadius ?? 8} onChange={(v) => update('borderRadius', v)} min={0} max={32} /><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /></div>);
    case 'two_col':
      return (<div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vizibilitate elemente</p>
        <PropToggle label="Arată titlu" value={d.showHeading !== false} onChange={(v) => update('showHeading', v)} />
        <PropToggle label="Arată text" value={d.showBody !== false} onChange={(v) => update('showBody', v)} />
        <PropToggle label="Arată buton CTA" value={d.showCta !== false} onChange={(v) => update('showCta', v)} />
        <PropToggle label="Arată imagine" value={d.showImage !== false} onChange={(v) => update('showImage', v)} />
        <div className="my-2 border-t border-slate-100" />
        {d.showHeading !== false && <PropInput label="Titlu" value={d.heading} onChange={(v) => update('heading', v)} />}
        {d.showBody !== false && <PropInput label="Text" value={d.body} onChange={(v) => update('body', v)} multiline />}
        {d.showCta !== false && <><PropInput label="Text CTA" value={d.ctaText} onChange={(v) => update('ctaText', v)} /><PropColor label="Culoare CTA" value={d.ctaColor} onChange={(v) => update('ctaColor', v)} /></>}
        {d.showImage !== false && <><ImageUploadInput label="Imagine" value={d.imageUrl} onChange={(v) => update('imageUrl', v)} /><PropInput label="Caption imagine" value={d.imageCaption} onChange={(v) => update('imageCaption', v)} /></>}
        <PropToggle label="Imagine la stânga" value={d.imageLeft} onChange={(v) => update('imageLeft', v)} />
        <PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} />
      </div>);
    case 'stats':
      return (<div><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /><PropColor label="Culoare text" value={d.textColor} onChange={(v) => update('textColor', v)} />{(d.stats || []).map((s, i) => (<div key={i} className="border border-slate-100 rounded-lg p-3 mb-2"><p className="text-xs font-bold text-slate-400 mb-2">Statistică {i + 1}</p><PropInput label="Icon/Emoji" value={s.icon} onChange={(v) => updateStat(i, 'icon', v)} /><PropInput label="Valoare" value={s.value} onChange={(v) => updateStat(i, 'value', v)} /><PropInput label="Label" value={s.label} onChange={(v) => updateStat(i, 'label', v)} /></div>))}</div>);
    case 'quote':
      return (<div><PropInput label="Citat" value={d.text} onChange={(v) => update('text', v)} multiline /><PropInput label="Autor" value={d.author} onChange={(v) => update('author', v)} /><PropColor label="Accent" value={d.accentColor} onChange={(v) => update('accentColor', v)} /><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /><PropColor label="Culoare text" value={d.textColor} onChange={(v) => update('textColor', v)} /></div>);
    case 'button':
      return (<div><PropInput label="Text buton" value={d.text} onChange={(v) => update('text', v)} /><PropInput label="URL" value={d.url} onChange={(v) => update('url', v)} /><PropColor label="Culoare buton" value={d.bgColor} onChange={(v) => update('bgColor', v)} /><PropColor label="Culoare text" value={d.textColor} onChange={(v) => update('textColor', v)} /><PropColor label="Fundal container" value={d.containerBg} onChange={(v) => update('containerBg', v)} /><PropSlider label="Rotunjire" value={d.borderRadius ?? 8} onChange={(v) => update('borderRadius', v)} min={0} max={32} /><div className="mb-3"><label className="block text-xs font-semibold text-slate-500 mb-1">Mărime</label><div className="flex gap-1">{['S', 'L'].map((s) => (<button key={s} onClick={() => update('size', s)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${d.size === s ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 text-slate-500'}`}>{s === 'S' ? 'Mic' : 'Mare'}</button>))}</div></div><PropAlign value={d.alignment} onChange={(v) => update('alignment', v)} /></div>);
    case 'divider':
      return (<div><PropColor label="Culoare linie" value={d.lineColor} onChange={(v) => update('lineColor', v)} /><PropSlider label="Grosime (px)" value={d.thickness ?? 1} onChange={(v) => update('thickness', v)} min={1} max={6} /><PropSlider label="Spațiu vertical (px)" value={d.marginY ?? 16} onChange={(v) => update('marginY', v)} min={4} max={48} /><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /></div>);
    case 'footer':
      return (<div><PropInput label="Organizație" value={d.orgName} onChange={(v) => update('orgName', v)} /><PropInput label="Adresă" value={d.address} onChange={(v) => update('address', v)} /><PropInput label="Email" value={d.email} onChange={(v) => update('email', v)} /><PropInput label="Telefon" value={d.phone} onChange={(v) => update('phone', v)} /><PropInput label="Website" value={d.website} onChange={(v) => update('website', v)} /><PropColor label="Fundal" value={d.bgColor} onChange={(v) => update('bgColor', v)} /><PropColor label="Culoare text" value={d.textColor} onChange={(v) => update('textColor', v)} /><PropColor label="Culoare link" value={d.linkColor} onChange={(v) => update('linkColor', v)} /><PropToggle label="Arată social" value={d.showSocial} onChange={(v) => update('showSocial', v)} /><PropToggle label="Arată dezabonare" value={d.showUnsubscribe} onChange={(v) => update('showUnsubscribe', v)} /></div>);
    default:
      return <p className="text-sm text-slate-400 p-4">Nicio proprietate disponibilă.</p>;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// AI CHAT PANEL
// ══════════════════════════════════════════════════════════════════════════════

const AI_QUICK = [
  'Scrie un titlu captivant',
  'Generează un paragraf de introducere',
  'Scrie un CTA puternic',
  'Corectează diacriticele',
  'Scurtează textul',
  'Fă tonul mai prietenos',
];

function fakeAIResponse(msg) {
  const l = msg.toLowerCase();
  if (l.includes('titlu')) return '1. „Împreună construim un viitor mai bun"\n2. „Fiecare gest contează — Raport de Impact 2025"\n3. „Descoperă cum am schimbat comunitatea"';
  if (l.includes('introducere') || l.includes('paragraf')) return 'Dragă prieten al comunității,\n\nÎn ultimele luni, echipa noastră a lucrat neobosit la proiecte care au adus o schimbare reală în comunitățile vulnerabile. Iată cele mai importante realizări și pașii următori.';
  if (l.includes('cta') || l.includes('buton')) return '• „Donează acum și schimbă o viață"\n• „Vezi impactul donației tale"\n• „Alătură-te echipei de voluntari"';
  if (l.includes('diacritice')) return 'Textul tău arată bine! Diacriticele sunt corecte: ș, ț, ă, â, î.';
  if (l.includes('scurteaz')) return 'Varianta scurtată:\n\nAm ajutat 340 de persoane prin 12 proiecte active. Mulțumim pentru sprijin!';
  if (l.includes('prieten')) return 'Varianta mai prietenoasă:\n\nHei! 👋 Ne bucurăm că faci parte din familia noastră. Iată ce am realizat împreună — e incredibil! ✨';
  return 'Sigur, te pot ajuta! Încearcă să fii mai specific — de exemplu:\n• „Scrie un titlu pentru newsletter"\n• „Generează o introducere formală"\n• „Propune 3 CTA-uri pentru donații"';
}

function AIChatPanel({ messages, onSend, onInsert }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && <p className="text-xs text-slate-500 text-center mt-8">Întreabă AI-ul orice despre emailul tău ✨</p>}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[220px] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-violet-700 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {m.content}
              {m.role === 'ai' && (
                <button onClick={() => onInsert(m.content)} className="mt-2 text-xs text-violet-700 font-semibold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Inserează în email</button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1 mb-2">
          {AI_QUICK.map((q) => (
            <button key={q} onClick={() => { onSend(q); }} className="text-[10px] px-2 py-1 rounded-full border border-slate-200 text-slate-500 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors">{q}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Întreabă AI-ul..." className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100" />
          <button onClick={send} className="p-2 bg-violet-700 text-white rounded-lg hover:bg-violet-600"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP INDICATOR
// ══════════════════════════════════════════════════════════════════════════════

const STEPS = ['Destinatari', 'Compune', 'Previzualizare', 'Trimite'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${done ? 'bg-violet-700 text-white' : active ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
              {done ? <Check className="w-4 h-4" /> : step}
            </div>
            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${active ? 'text-slate-700' : 'text-slate-400'} hidden sm:inline`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-10 h-0.5 ${step < current ? 'bg-violet-300' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — RECIPIENTS
// ══════════════════════════════════════════════════════════════════════════════

function Step1Recipients({ selectedGroups, setSelectedGroups, individualEmails, setIndividualEmails, groupCounts, onNext }) {
  const [emailInput, setEmailInput] = useState('');
  const toggle = (g) => setSelectedGroups((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (e && e.includes('@') && e.includes('.') && !individualEmails.includes(e)) {
      setIndividualEmails((prev) => [...prev, e]);
    }
    setEmailInput('');
  };
  const totalRecipients = selectedGroups.reduce((a, g) => a + (groupCounts[g] || 0), 0) + individualEmails.length;
  const disabled = selectedGroups.length === 0 && individualEmails.length === 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl text-slate-900 font-display mb-1">Cui trimiți acest email?</h2>
      <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mb-6">Selectează grupurile de destinatari</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {Object.entries(GROUP_META).map(([group, meta]) => {
          const sel = selectedGroups.includes(group);
          return (
            <button key={group} onClick={() => toggle(group)} className={`relative text-left p-4 rounded-xl border-2 transition-all ${sel ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
              {sel && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-700 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
              <span className="text-2xl">{meta.emoji}</span>
              <p className="text-sm font-semibold text-slate-900 mt-2">{group}</p>
              <p className="text-xs text-slate-500">{meta.desc}</p>
              <p className="text-xs font-semibold text-violet-700 mt-1">{groupCounts[group] || 0} contacte</p>
            </button>
          );
        })}
      </div>

      <div className="paper-card p-4 mb-6">
        <p className="text-sm font-semibold text-slate-800 mb-2">Sau adaugă emailuri individuale</p>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEmail()} placeholder="email@exemplu.ro" className="w-full flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100" />
          <button onClick={addEmail} className="w-full sm:w-auto px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold hover:bg-violet-600">Adaugă</button>
        </div>
        {individualEmails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {individualEmails.map((e) => (
              <span key={e} className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">
                {e} <button onClick={() => setIndividualEmails((prev) => prev.filter((x) => x !== e))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500"><strong className="text-violet-700">{totalRecipients}</strong> destinatari selectați</p>
        <button onClick={onNext} disabled={disabled} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white ${disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-violet-700 hover:bg-violet-600'} transition-colors`}>Continuă →</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — COMPOSE  (enlarged: narrower sidebars, wider canvas)
// ══════════════════════════════════════════════════════════════════════════════

function DropZone({ index, dragOverIdx, onDragOver, onDragLeave, onDrop }) {
  const isOver = dragOverIdx === index;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      className={`transition-all ${isOver ? 'h-12 border-2 border-dashed border-violet-300 bg-violet-50/60 rounded-lg flex items-center justify-center' : 'h-2'}`}
    >
      {isOver && <span className="text-[11px] text-violet-700 font-semibold uppercase tracking-[0.2em]">Plasează aici</span>}
    </div>
  );
}

function Step2Compose({ blocks, setBlocks, selectedBlockId, setSelectedBlockId, subject, setSubject, onBack, onNext }) {
  const [dragType, setDragType] = useState(null);
  const [dragData, setDragData] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [rightTab, setRightTab] = useState('props');
  const [aiMessages, setAiMessages] = useState([]);

  const handlePaletteDragStart = (type) => { setDragType('palette'); setDragData(type); };
  const handleBlockDragStart = (blockId) => { setDragType('reorder'); setDragData(blockId); };

  const handleDrop = (atIndex) => {
    if (dragType === 'palette' && dragData) {
      const newBlock = createBlock(dragData);
      setBlocks((prev) => { const copy = [...prev]; copy.splice(atIndex, 0, newBlock); return copy; });
      setSelectedBlockId(newBlock.id);
    } else if (dragType === 'reorder' && dragData) {
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === dragData);
        if (idx === -1) return prev;
        const copy = [...prev];
        const [moved] = copy.splice(idx, 1);
        const insertAt = atIndex > idx ? atIndex - 1 : atIndex;
        copy.splice(insertAt, 0, moved);
        return copy;
      });
    }
    setDragType(null);
    setDragData(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => { setDragType(null); setDragData(null); setDragOverIdx(null); };

  const handleBlockChange = (updated) => {
    setBlocks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const moveBlock = (id, dir) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  const handleAISend = (msg) => {
    setAiMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setTimeout(() => {
      setAiMessages((prev) => [...prev, { role: 'ai', content: fakeAIResponse(msg) }]);
    }, 1200);
  };

  const handleAIInsert = (text) => {
    const newBlock = createBlock('text');
    newBlock.data.heading = '';
    newBlock.data.body = text;
    setBlocks((prev) => [...prev.slice(0, -1), newBlock, ...prev.slice(-1)]);
    setSelectedBlockId(newBlock.id);
    setRightTab('props');
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="flex gap-2 h-[calc(100vh-160px)]">
      {/* LEFT — palette (narrower) */}
      <div className="w-[170px] flex-shrink-0 paper-card overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-100 bg-white">
          <div className="flex-1 py-2 text-[11px] font-semibold text-slate-700 uppercase tracking-[0.2em] text-center">Blocuri</div>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {BLOCK_PALETTE.map((section) => (
            <div key={section.section} className="mb-2">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.2em] px-1 mb-1">{section.section}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.type} draggable onDragStart={() => handlePaletteDragStart(item.type)} onDragEnd={handleDragEnd} className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-violet-100/60 flex items-center justify-center group-hover:bg-violet-200/60 flex-shrink-0"><Icon className="w-3.5 h-3.5 text-violet-700" /></div>
                    <div className="min-w-0"><p className="text-[11px] font-semibold text-slate-700 truncate">{item.label}</p><p className="text-[9px] text-slate-400 truncate">{item.desc}</p></div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER — canvas (larger) */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 paper-card px-3 py-2 mb-2">
          <Mail className="w-4 h-4 text-slate-400" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subiectul emailului..." className="flex-1 text-sm font-semibold text-slate-800 outline-none" />
        </div>

        <div className="flex-1 overflow-y-auto bg-transparent rounded-xl p-4">
          <div className="mx-auto paper-card overflow-hidden" style={{ maxWidth: 640 }}>
            {blocks.length === 0 && (
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center m-6"
                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(0); }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(0); }}>
                <Layout className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500">Trage blocuri din panoul stâng pentru a începe</p>
              </div>
            )}
            {blocks.map((block, i) => (
              <div key={block.id}>
                <DropZone index={i} dragOverIdx={dragOverIdx} onDragOver={setDragOverIdx} onDragLeave={() => setDragOverIdx(null)} onDrop={handleDrop} />
                <div
                  draggable
                  onDragStart={() => handleBlockDragStart(block.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`relative group cursor-pointer ${selectedBlockId === block.id ? 'ring-2 ring-violet-300' : ''}`}
                >
                  <div className="absolute top-1 right-1 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 bg-white/90 rounded text-slate-400 hover:text-slate-600"><GripVertical className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, -1); }} className="p-1 bg-white/90 rounded text-slate-400 hover:text-slate-600"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 1); }} className="p-1 bg-white/90 rounded text-slate-400 hover:text-slate-600"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); const c = { ...block, id: uid(), data: { ...block.data } }; setBlocks((p) => { const idx = p.findIndex((b) => b.id === block.id); const cp = [...p]; cp.splice(idx + 1, 0, c); return cp; }); }} className="p-1 bg-white/90 rounded text-slate-400 hover:text-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); setBlocks((p) => p.filter((b) => b.id !== block.id)); if (selectedBlockId === block.id) setSelectedBlockId(null); }} className="p-1 bg-white/90 rounded text-rose-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  {selectedBlockId === block.id && <div className="absolute top-1 left-1 z-10 px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded border border-violet-200">{block.type}</div>}
                  <BlockPreviewRender block={block} />
                </div>
              </div>
            ))}
            {blocks.length > 0 && <DropZone index={blocks.length} dragOverIdx={dragOverIdx} onDragOver={setDragOverIdx} onDragLeave={() => setDragOverIdx(null)} onDrop={handleDrop} />}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">← Înapoi</button>
          <button onClick={onNext} className="px-6 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-600">Continuă →</button>
        </div>
      </div>

      {/* RIGHT — props / AI (narrower) */}
      <div className="w-[230px] flex-shrink-0 paper-card overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-100">
          <button onClick={() => setRightTab('props')} className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] ${rightTab === 'props' ? 'text-slate-700 border-b-2 border-violet-200' : 'text-slate-400'}`}>Proprietăți</button>
          <button onClick={() => setRightTab('ai')} className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] flex items-center gap-1 justify-center ${rightTab === 'ai' ? 'text-slate-700 border-b-2 border-violet-200' : 'text-slate-400'}`}><Sparkles className="w-3 h-3" /> AI</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rightTab === 'props'
            ? <div className="p-2.5"><PropertyPanel block={selectedBlock} onChange={handleBlockChange} /></div>
            : <AIChatPanel messages={aiMessages} onSend={handleAISend} onInsert={handleAIInsert} />}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — PREVIEW
// ══════════════════════════════════════════════════════════════════════════════

function Step3Preview({ blocks, subject, selectedGroups, individualEmails, groupCounts, onBack, onNext, setSubject }) {
  const [mobilePreview, setMobilePreview] = useState(false);
  const totalRecipients = selectedGroups.reduce((a, g) => a + (groupCounts[g] || 0), 0) + individualEmails.length;

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[500px]">
      <div className="w-2/5 space-y-4">
        <div className="paper-card p-5">
          <h3 className="text-base text-slate-900 font-display mb-4">Rezumat trimitere</h3>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1">Subiect</p>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-100" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-2">Destinatari</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedGroups.map((g) => (<span key={g} className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold">{g} ({groupCounts[g] || 0})</span>))}
                {individualEmails.length > 0 && <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">+{individualEmails.length} email-uri</span>}
              </div>
              <p className="text-sm font-semibold text-violet-700 mt-2">{totalRecipients} persoane vor primi acest email</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1">De la</p>
              <p className="text-sm text-slate-700">newsletter@civiup.ro</p>
            </div>
          </div>
        </div>
        {!subject && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div><p className="text-sm font-semibold text-amber-700">Nu ai completat subiectul emailului</p><p className="text-xs text-amber-600 mt-0.5">Adaugă un subiect înainte de a trimite.</p></div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">← Înapoi</button>
          <button onClick={onNext} disabled={!subject} className={`flex-1 px-6 py-2.5 rounded-xl text-sm font-bold text-white ${subject ? 'bg-violet-700 hover:bg-violet-600' : 'bg-slate-300 cursor-not-allowed'}`}>Continuă →</button>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-end gap-2 mb-3">
          <button onClick={() => setMobilePreview(false)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${!mobilePreview ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>Desktop</button>
          <button onClick={() => setMobilePreview(true)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mobilePreview ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'text-slate-500 hover:bg-slate-50 border border-transparent'}`}>Mobile</button>
        </div>
        <div className="flex-1 overflow-y-auto bg-transparent rounded-xl p-6 flex justify-center">
          <div className="paper-card overflow-hidden" style={{ width: mobilePreview ? 375 : 600 }}>
            {blocks.map((b) => <BlockPreviewRender key={b.id} block={b} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — SEND
// ══════════════════════════════════════════════════════════════════════════════

function Step4Send({ subject, selectedGroups, individualEmails, groupCounts, onBack, onSend, sending, sent, result, onNewEmail }) {
  const [gdprChecked, setGdprChecked] = useState(false);
  const totalRecipients = selectedGroups.reduce((a, g) => a + (groupCounts[g] || 0), 0) + individualEmails.length;

  if (sending) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <Loader2 className="w-12 h-12 text-violet-700 animate-spin mx-auto mb-4" />
        <h3 className="text-lg text-slate-900 font-display mb-2">Se trimite...</h3>
        <p className="text-sm text-slate-500 mb-6">Trimitem emailul la {totalRecipients} destinatari</p>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-violet-400 rounded-full animate-pulse" style={{ width: '60%' }} /></div>
      </div>
    );
  }

  if (sent && result) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-emerald-600" /></div>
        <h3 className="text-xl text-slate-900 font-display mb-2">Email trimis cu succes!</h3>
        <p className="text-sm text-slate-500 mb-6">{result.sent} emailuri trimise · {result.failed} erori</p>
        <button onClick={onNewEmail} className="px-5 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-600">Email nou</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="paper-card p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4"><Send className="w-6 h-6 text-violet-700" /></div>
        <h3 className="text-xl text-slate-900 font-display mb-2">Ești gata să trimiți?</h3>
        <div className="text-left space-y-2 my-6 bg-slate-50 rounded-xl p-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Subiect</span><span className="font-semibold text-slate-700 text-right max-w-[200px] truncate">{subject}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Destinatari</span><span className="font-semibold text-violet-700">{totalRecipients} persoane</span></div>
          <div className="flex justify-between"><span className="text-slate-400">De la</span><span className="font-semibold text-slate-700 text-xs">newsletter@civiup.ro</span></div>
        </div>
        <label className="flex items-start gap-3 text-left mb-6 cursor-pointer">
          <input type="checkbox" checked={gdprChecked} onChange={(e) => setGdprChecked(e.target.checked)} className="mt-1 w-4 h-4 rounded border-slate-300 accent-violet-600" />
          <span className="text-xs text-slate-500 leading-relaxed">Confirm că am dreptul să trimit la aceste adrese și respect legislația GDPR în vigoare.</span>
        </label>
        <button onClick={onSend} disabled={!gdprChecked} className={`w-full py-3 rounded-xl text-sm font-bold text-white ${gdprChecked ? 'bg-violet-700 hover:bg-violet-600' : 'bg-slate-300 cursor-not-allowed'} transition-colors`}>
          Trimite Emailul Acum →
        </button>
        <button onClick={onBack} className="mt-4 text-sm text-slate-500 hover:text-slate-700">← Înapoi la previzualizare</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS PAGE  (connected to backend)
// ══════════════════════════════════════════════════════════════════════════════

function ContactsPage({ contacts, setContacts, groupCounts, refreshContacts }) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', phone: '', organization: '', notes: '', gdpr_consent: false, tags: [] });
  const [activeGroupFilter, setActiveGroupFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const PER_PAGE = 20;

  const filtered = contacts.filter((c) => {
    if (search && !c.email?.includes(search.toLowerCase()) && !(c.first_name || '').toLowerCase().includes(search.toLowerCase()) && !(c.last_name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (activeGroupFilter && !(c.tags || []).includes(activeGroupFilter)) return false;
    return true;
  });
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleTag = (t) => setForm((prev) => ({ ...prev, tags: prev.tags.includes(t) ? prev.tags.filter((x) => x !== t) : [...prev.tags, t] }));

  const handleSave = async () => {
    if (!form.email) return;
    setSaving(true);
    try {
      await contactsAPI.create(form);
      await refreshContacts();
      setForm({ email: '', first_name: '', last_name: '', phone: '', organization: '', notes: '', gdpr_consent: false, tags: [] });
      setShowAddModal(false);
    } catch (err) {
      console.error('Create contact error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await contactsAPI.delete(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setSaving(true);
    try {
      await contactsAPI.importCSV(importFile);
      await refreshContacts();
      setShowImportModal(false);
      setImportFile(null);
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3 mb-5">
        <div className="w-full sm:flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută contacte..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-100" />
        </div>
        <button onClick={() => setShowImportModal(true)} className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Import CSV</button>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-4 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-600 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Adaugă Contact</button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {Object.entries(groupCounts).map(([g, count]) => (
          <button key={g} onClick={() => setActiveGroupFilter(activeGroupFilter === g ? null : g)} className={`flex-shrink-0 px-4 py-3 rounded-xl border text-left transition-all ${activeGroupFilter === g ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 bg-white hover:border-violet-200'}`}>
            <span className="text-lg">{GROUP_META[g]?.emoji || '📌'}</span>
            <p className="text-xs font-semibold text-slate-700 mt-1">{g}</p>
            <p className="text-xs text-violet-700 font-semibold">{count}</p>
          </button>
        ))}
      </div>

      <div className="paper-card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100 bg-slate-50/70">
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Nume</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Email</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Grupuri</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Sursă</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">GDPR</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Adăugat</th>
            <th className="text-right px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Acțiuni</th>
          </tr></thead>
          <tbody>
            {paged.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-800">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-slate-600">{c.email}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(c.tags || []).map((t) => (<span key={t} className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full text-[10px] font-semibold">{t}</span>))}</div></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{c.source || '–'}</td>
                <td className="px-4 py-3">{c.gdpr_consent ? <Shield className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-slate-400">–</span>}</td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.is_subscribed !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{c.is_subscribed !== false ? 'Abonat' : 'Dezabonat'}</span></td>
                <td className="px-4 py-3 text-xs text-slate-400">{(c.created_at || '').slice(0, 10)}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(c.id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan="8" className="py-12 text-center"><Users className="w-10 h-10 text-slate-200 mx-auto mb-3" /><p className="text-sm font-semibold text-slate-400">Niciun contact găsit</p></td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">{filtered.length} contacte total</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-30">Anterior</button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-30">Următor</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base text-slate-900 font-display">Adaugă Contact</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Prenume</label><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Nume</label><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Telefon</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 mb-1">Organizație</label><input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Note</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" /></div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">Grupuri</label>
                <div className="flex flex-wrap gap-2">
                  {['Newsletter', 'Donatori', 'Parteneri', 'Voluntari'].map((t) => (
                    <button key={t} onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.tags.includes(t) ? 'bg-violet-50 text-violet-700 border-violet-200' : 'border-slate-200 text-slate-500 hover:border-violet-200'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.gdpr_consent} onChange={(e) => setForm({ ...form, gdpr_consent: e.target.checked })} className="w-4 h-4 rounded border-slate-300 accent-violet-600" /><span className="text-xs text-slate-600">Consimțământ GDPR</span></label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Anulează</button>
              <button onClick={handleSave} disabled={!form.email || saving} className="flex-1 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-600 disabled:bg-slate-300 flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvează Contact</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base text-slate-900 font-display">Import CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <label className="block border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-violet-300 transition-colors cursor-pointer">
              <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" />
              <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">{importFile ? importFile.name : 'Trage fișierul CSV sau click pentru a încărca'}</p>
              <p className="text-xs text-slate-400 mt-1">Format: email, first_name, last_name, phone</p>
            </label>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600">Anulează</button>
              <button onClick={handleImport} disabled={!importFile || saving} className="flex-1 py-2.5 bg-violet-700 text-white rounded-xl text-sm font-bold hover:bg-violet-600 disabled:bg-slate-300 flex items-center justify-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Importă</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN — EmailCRM  (fully connected to backend)
// ══════════════════════════════════════════════════════════════════════════════

export default function EmailCRM() {
  return (
    <EmailCRMErrorBoundary>
      <EmailCRMInner />
    </EmailCRMErrorBoundary>
  );
}

function EmailCRMInner() {
  const [activePage, setActivePage] = useState('contacts');
  // Wizard
  const [newEmailStep, setNewEmailStep] = useState(1);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [individualEmails, setIndividualEmails] = useState([]);
  const [emailBlocks, setEmailBlocks] = useState([...DEFAULT_BLOCKS]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [subject, setSubject] = useState('');
  // Send state
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  // Data from backend
  const [contacts, setContacts] = useState([]);
  const [groupCounts, setGroupCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Data fetching ────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      const data = await contactsAPI.getAll();
      if (Array.isArray(data)) {
        setContacts(data);
      } else if (data && Array.isArray(data.data)) {
        setContacts(data.data);
      } else {
        setContacts([]);
      }
    } catch (err) { console.error('Fetch contacts error:', err); }
  }, []);

  const fetchGroupCounts = useCallback(async () => {
    try {
      const data = await contactsAPI.getGroupCounts();
      setGroupCounts(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
    } catch (err) { console.error('Fetch group counts error:', err); }
  }, []);

  const refreshContacts = useCallback(async () => {
    await Promise.all([fetchContacts(), fetchGroupCounts()]);
  }, [fetchContacts, fetchGroupCounts]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Load only contacts context on entry; other pages fetch lazily.
        await Promise.all([fetchContacts(), fetchGroupCounts()]);
      } catch (err) {
        console.error('EmailCRM init error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchContacts, fetchGroupCounts]);

  // ── Actions ──────────────────────────────────────────────

  const startNewEmail = () => {
    setActivePage('new-email');
    setNewEmailStep(1);
    setSelectedGroups([]);
    setIndividualEmails([]);
    setEmailBlocks([...DEFAULT_BLOCKS]);
    setSelectedBlockId(null);
    setSubject('');
    setSending(false);
    setSent(false);
    setSendResult(null);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const bodyHtml = buildEmailHtml(emailBlocks);
      const bodyText = buildEmailText(emailBlocks);

      const res = await emailAPI.sendCampaign({
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        to_groups: selectedGroups,
        to_emails: individualEmails,
      });
      setSent(true);
      setSendResult({ sent: res.sent || 0, failed: res.failed || 0, campaign_id: res.campaign_id });
    } catch (err) {
      console.error('Send campaign error:', err);
      setSent(true);
      setSendResult({ sent: 0, failed: 1, error: err.message });
    } finally {
      setSending(false);
    }
  };

  // ── NAV ────────────────────────────────────────────────────

  const NAV = [
    { id: 'contacts', label: 'Contacte', icon: Users, badge: contacts.length || null },
    { id: 'new-email', label: 'Email Nou', icon: PenSquare },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-90px)]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-violet-700 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-90px)] bg-transparent rounded-2xl overflow-hidden">
      {/* Sidebar */}
      <div className="w-[200px] bg-white flex flex-col flex-shrink-0 border-r border-slate-200">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center border border-violet-200"><Mail className="w-4 h-4 text-violet-700" /></div>
            <div><p className="text-sm text-slate-900 font-display">CiviUp</p><p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">Email CRM</p></div>
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button key={item.id} onClick={() => item.id === 'new-email' ? startNewEmail() : setActivePage(item.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left text-[13px]">{item.label}</span>
                {item.badge != null && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>{item.badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="px-3 pb-4">
          <div className="paper-card p-3 text-center">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.2em]">Plan gratuit Brevo</p>
            <p className="text-sm font-black text-slate-900">9.000 <span className="text-slate-400 font-semibold text-xs">/ lună</span></p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activePage === 'contacts' && (
          <ContactsPage contacts={contacts} setContacts={setContacts} groupCounts={groupCounts} refreshContacts={refreshContacts} />
        )}

        {activePage === 'new-email' && (
          <div>
            <StepIndicator current={newEmailStep} />
            {newEmailStep === 1 && (
              <Step1Recipients selectedGroups={selectedGroups} setSelectedGroups={setSelectedGroups} individualEmails={individualEmails} setIndividualEmails={setIndividualEmails} groupCounts={groupCounts} onNext={() => setNewEmailStep(2)} />
            )}
            {newEmailStep === 2 && (
              <Step2Compose blocks={emailBlocks} setBlocks={setEmailBlocks} selectedBlockId={selectedBlockId} setSelectedBlockId={setSelectedBlockId} subject={subject} setSubject={setSubject} onBack={() => setNewEmailStep(1)} onNext={() => setNewEmailStep(3)} />
            )}
            {newEmailStep === 3 && (
              <Step3Preview blocks={emailBlocks} subject={subject} selectedGroups={selectedGroups} individualEmails={individualEmails} groupCounts={groupCounts} setSubject={setSubject} onBack={() => setNewEmailStep(2)} onNext={() => setNewEmailStep(4)} />
            )}
            {newEmailStep === 4 && (
              <Step4Send subject={subject} selectedGroups={selectedGroups} individualEmails={individualEmails} groupCounts={groupCounts} onBack={() => setNewEmailStep(3)} onSend={handleSend} sending={sending} sent={sent} result={sendResult} onNewEmail={startNewEmail} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
