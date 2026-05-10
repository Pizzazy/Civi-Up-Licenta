import { Layers } from 'lucide-react';
import { BLOCK_TYPES } from '@/data/emailBuilderData';

/* ── Shared prop sub-components ── */

function PropInput({ label, value, onChange, type = 'text', min, max, step }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} min={min} max={max} step={step}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors" />
    </div>
  );
}

function PropTextarea({ label, value, onChange, rows = 3 }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors resize-none" />
    </div>
  );
}

function PropColor({ label, value, onChange }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-200" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-400" />
      </div>
    </div>
  );
}

function PropSelect({ label, value, onChange, options }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PropToggle({ label, value, onChange }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">{label}</label>
      <button onClick={() => onChange(!value)} className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-violet-600' : 'bg-slate-200'}`}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all" style={{ left: value ? 'calc(100% - 18px)' : 2 }} />
      </button>
    </div>
  );
}

/* ── Main Property Panel ── */

export default function PropertyPanel({ block, onChange }) {
  if (!block) return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
      <Layers className="w-10 h-10 text-slate-200 mb-3" />
      <p className="text-sm font-medium">Selectează un bloc pentru a edita proprietățile</p>
    </div>
  );

  const update = (key, value) => onChange({ ...block, data: { ...block.data, [key]: value } });
  const updateStat = (i, key, value) => {
    const stats = [...block.data.stats];
    stats[i] = { ...stats[i], [key]: value };
    onChange({ ...block, data: { ...block.data, stats } });
  };
  const { type, data } = block;
  const def = BLOCK_TYPES.find((b) => b.type === type);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          {def && <def.icon className="w-4 h-4 text-violet-600" />}
          <p className="text-sm font-semibold text-slate-900">{def?.label || type}</p>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{def?.description}</p>
      </div>
      <div className="p-4">
        {type === 'header' && <>
          <PropInput label="Logo Text" value={data.logo} onChange={(v) => update('logo', v)} />
          <PropInput label="Nume Organizație" value={data.orgName} onChange={(v) => update('orgName', v)} />
          <PropInput label="Tagline" value={data.tagline} onChange={(v) => update('tagline', v)} />
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
          <PropColor label="Text" value={data.textColor} onChange={(v) => update('textColor', v)} />
          <PropColor label="Accent" value={data.accentColor} onChange={(v) => update('accentColor', v)} />
        </>}
        {type === 'hero' && <>
          <PropInput label="URL Imagine" value={data.imageUrl} onChange={(v) => update('imageUrl', v)} />
          <PropInput label="Titlu Principal" value={data.headline} onChange={(v) => update('headline', v)} />
          <PropInput label="Subtitlu" value={data.subheadline} onChange={(v) => update('subheadline', v)} />
          <PropInput label="Text Buton CTA" value={data.ctaText} onChange={(v) => update('ctaText', v)} />
          <PropInput label="Link Buton" value={data.ctaUrl} onChange={(v) => update('ctaUrl', v)} />
          <PropInput label="Opacitate Overlay (0–1)" value={data.overlayOpacity} onChange={(v) => update('overlayOpacity', parseFloat(v))} type="number" min="0" max="1" step="0.05" />
        </>}
        {type === 'text' && <>
          <PropInput label="Titlu (Heading)" value={data.heading} onChange={(v) => update('heading', v)} />
          <PropInput label="Dimensiune Titlu (px)" value={data.headingSize} onChange={(v) => update('headingSize', v)} type="number" min="14" max="60" />
          <PropColor label="Culoare Titlu" value={data.headingColor} onChange={(v) => update('headingColor', v)} />
          <PropTextarea label="Text Paragraf" value={data.body} onChange={(v) => update('body', v)} rows={4} />
          <PropColor label="Culoare Text" value={data.bodyColor} onChange={(v) => update('bodyColor', v)} />
          <PropSelect label="Aliniere" value={data.align} onChange={(v) => update('align', v)} options={[{ value: 'left', label: 'Stânga' }, { value: 'center', label: 'Centru' }, { value: 'right', label: 'Dreapta' }]} />
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
          <PropInput label="Padding vertical (px)" value={data.padding} onChange={(v) => update('padding', v)} type="number" min="0" max="80" />
        </>}
        {type === 'image' && <>
          <PropInput label="URL Imagine" value={data.imageUrl} onChange={(v) => update('imageUrl', v)} />
          <PropInput label="Caption" value={data.caption} onChange={(v) => update('caption', v)} />
          <PropColor label="Culoare Caption" value={data.captionColor} onChange={(v) => update('captionColor', v)} />
          <PropInput label="Raza colțuri (px)" value={data.borderRadius} onChange={(v) => update('borderRadius', v)} type="number" min="0" max="30" />
          <PropColor label="Fundal secțiune" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
        </>}
        {type === 'two_col' && <>
          <PropInput label="Titlu" value={data.heading} onChange={(v) => update('heading', v)} />
          <PropColor label="Culoare Titlu" value={data.headingColor} onChange={(v) => update('headingColor', v)} />
          <PropTextarea label="Text" value={data.body} onChange={(v) => update('body', v)} rows={4} />
          <PropColor label="Culoare Text" value={data.bodyColor} onChange={(v) => update('bodyColor', v)} />
          <PropInput label="Text CTA" value={data.ctaText} onChange={(v) => update('ctaText', v)} />
          <PropColor label="Culoare CTA" value={data.ctaColor} onChange={(v) => update('ctaColor', v)} />
          <PropInput label="URL Imagine" value={data.imageUrl} onChange={(v) => update('imageUrl', v)} />
          <PropInput label="Caption Imagine" value={data.imageCaption} onChange={(v) => update('imageCaption', v)} />
          <PropToggle label="Imagine la stânga" value={data.reverseLayout} onChange={(v) => update('reverseLayout', v)} />
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
        </>}
        {type === 'stats' && <>
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
          <PropColor label="Culoare Text" value={data.textColor} onChange={(v) => update('textColor', v)} />
          <div className="border-t border-slate-100 pt-3 mt-1">
            {data.stats.map((s, i) => (
              <div key={i} className="mb-4 p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-500 mb-2">Statistică {i + 1}</p>
                <PropInput label="Emoji/Icon" value={s.icon} onChange={(v) => updateStat(i, 'icon', v)} />
                <PropInput label="Valoare" value={s.value} onChange={(v) => updateStat(i, 'value', v)} />
                <PropInput label="Etichetă" value={s.label} onChange={(v) => updateStat(i, 'label', v)} />
              </div>
            ))}
          </div>
        </>}
        {type === 'quote' && <>
          <PropTextarea label="Text Citat" value={data.text} onChange={(v) => update('text', v)} rows={4} />
          <PropInput label="Autor" value={data.author} onChange={(v) => update('author', v)} />
          <PropColor label="Culoare Accent (bordura)" value={data.accentColor} onChange={(v) => update('accentColor', v)} />
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
          <PropColor label="Culoare Text" value={data.textColor} onChange={(v) => update('textColor', v)} />
        </>}
        {type === 'button' && <>
          <PropInput label="Text Buton" value={data.text} onChange={(v) => update('text', v)} />
          <PropInput label="Link (URL)" value={data.url} onChange={(v) => update('url', v)} />
          <PropColor label="Fundal Buton" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
          <PropColor label="Culoare Text" value={data.textColor} onChange={(v) => update('textColor', v)} />
          <PropColor label="Fundal Secțiune" value={data.containerBg} onChange={(v) => update('containerBg', v)} />
          <PropInput label="Raza colțuri (px)" value={data.borderRadius} onChange={(v) => update('borderRadius', v)} type="number" min="0" max="60" />
          <PropSelect label="Dimensiune" value={data.size} onChange={(v) => update('size', v)} options={[{ value: 'small', label: 'Mic' }, { value: 'large', label: 'Mare' }]} />
          <PropSelect label="Aliniere" value={data.align} onChange={(v) => update('align', v)} options={[{ value: 'left', label: 'Stânga' }, { value: 'center', label: 'Centru' }, { value: 'right', label: 'Dreapta' }]} />
        </>}
        {type === 'divider' && <>
          <PropInput label="Text / Simbol" value={data.label} onChange={(v) => update('label', v)} />
          <PropColor label="Culoare Linie" value={data.color} onChange={(v) => update('color', v)} />
          <PropColor label="Culoare Text" value={data.labelColor} onChange={(v) => update('labelColor', v)} />
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
        </>}
        {type === 'footer' && <>
          <PropInput label="Nume Organizație" value={data.orgName} onChange={(v) => update('orgName', v)} />
          <PropInput label="Adresă" value={data.address} onChange={(v) => update('address', v)} />
          <PropInput label="Email" value={data.email} onChange={(v) => update('email', v)} />
          <PropInput label="Telefon" value={data.phone} onChange={(v) => update('phone', v)} />
          <PropInput label="Website" value={data.website} onChange={(v) => update('website', v)} />
          <PropColor label="Fundal" value={data.bgColor} onChange={(v) => update('bgColor', v)} />
          <PropColor label="Culoare Text" value={data.textColor} onChange={(v) => update('textColor', v)} />
          <PropColor label="Culoare Link-uri" value={data.linkColor} onChange={(v) => update('linkColor', v)} />
          <PropToggle label="Afișează Social Media" value={data.showSocial} onChange={(v) => update('showSocial', v)} />
          <PropToggle label="Afișează Dezabonare" value={data.showUnsubscribe} onChange={(v) => update('showUnsubscribe', v)} />
        </>}
      </div>
    </div>
  );
}
