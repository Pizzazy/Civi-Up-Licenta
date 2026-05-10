import { Facebook, Linkedin, Instagram } from 'lucide-react';

export default function BlockPreview({ block }) {
  const { type, data } = block;

  if (type === 'header') return (
    <div style={{ background: data.bgColor, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontFamily: 'serif', fontSize: 22, fontWeight: 900, color: data.textColor, letterSpacing: '-0.5px' }}>{data.logo}</div>
        <div style={{ fontSize: 10, color: data.accentColor, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: 2 }}>{data.orgName}</div>
      </div>
      <div style={{ fontSize: 11, color: data.accentColor, fontStyle: 'italic' }}>{data.tagline}</div>
    </div>
  );

  if (type === 'hero') return (
    <div style={{ position: 'relative', minHeight: 240, backgroundImage: `url(${data.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${data.overlayOpacity})` }} />
      <div style={{ position: 'relative', padding: '48px 32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 10px', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{data.headline}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: '0 0 22px' }}>{data.subheadline}</p>
        <span style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', padding: '10px 24px', borderRadius: 50, fontWeight: 700, fontSize: 13 }}>{data.ctaText}</span>
      </div>
    </div>
  );

  if (type === 'text') return (
    <div style={{ background: data.bgColor, padding: `${data.padding}px 32px`, textAlign: data.align }}>
      <h2 style={{ fontSize: parseInt(data.headingSize) * 0.78, fontWeight: 800, color: data.headingColor, margin: '0 0 12px', lineHeight: 1.25 }}>{data.heading}</h2>
      <p style={{ fontSize: 13.5, lineHeight: 1.75, color: data.bodyColor, margin: 0 }}>{data.body}</p>
    </div>
  );

  if (type === 'image') return (
    <div style={{ background: data.bgColor, padding: '20px 32px' }}>
      <img src={data.imageUrl} alt={data.altText} style={{ width: '100%', borderRadius: parseInt(data.borderRadius), display: 'block' }} />
      {data.caption && <p style={{ fontSize: 11, color: data.captionColor, textAlign: 'center', margin: '8px 0 0', fontStyle: 'italic' }}>{data.caption}</p>}
    </div>
  );

  if (type === 'two_col') return (
    <div style={{ background: data.bgColor, padding: '28px 32px' }}>
      <div style={{ display: 'flex', gap: 20, flexDirection: data.reverseLayout ? 'row-reverse' : 'row' }}>
        <div style={{ flex: '1 1 55%' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: data.headingColor, margin: '0 0 10px', lineHeight: 1.3 }}>{data.heading}</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: data.bodyColor, margin: '0 0 14px' }}>{data.body}</p>
          <span style={{ display: 'inline-block', background: data.ctaColor, color: '#fff', padding: '8px 18px', borderRadius: 40, fontWeight: 700, fontSize: 12 }}>{data.ctaText}</span>
        </div>
        <div style={{ flex: '1 1 45%' }}>
          <img src={data.imageUrl} alt={data.imageCaption} style={{ width: '100%', borderRadius: 10, display: 'block' }} />
          {data.imageCaption && <p style={{ fontSize: 10, color: '#94a3b8', margin: '5px 0 0', textAlign: 'center' }}>{data.imageCaption}</p>}
        </div>
      </div>
    </div>
  );

  if (type === 'stats') return (
    <div style={{ background: data.bgColor, padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {data.stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '0 12px' }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: data.textColor, letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (type === 'quote') return (
    <div style={{ background: data.bgColor, padding: '28px 32px 28px 40px', borderLeft: `4px solid ${data.accentColor}` }}>
      <p style={{ fontSize: 16, lineHeight: 1.7, color: data.textColor, fontStyle: 'italic', fontWeight: 500, margin: '0 0 10px' }}>{data.text}</p>
      <p style={{ fontSize: 11, color: data.accentColor, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>— {data.author}</p>
    </div>
  );

  if (type === 'button') return (
    <div style={{ background: data.containerBg, padding: '20px 32px', textAlign: data.align }}>
      <span style={{ display: 'inline-block', background: data.bgColor, color: data.textColor, padding: data.size === 'large' ? '14px 36px' : '10px 24px', borderRadius: parseInt(data.borderRadius), fontWeight: 800, fontSize: data.size === 'large' ? 15 : 13, letterSpacing: '0.2px' }}>
        {data.text}
      </span>
    </div>
  );

  if (type === 'divider') return (
    <div style={{ background: data.bgColor, padding: '16px 32px', textAlign: 'center' }}>
      {data.label ? (
        <p style={{ fontSize: 14, color: data.labelColor, margin: 0, letterSpacing: 6 }}>{data.label}</p>
      ) : (
        <hr style={{ border: 'none', borderTop: `1px solid ${data.color}`, margin: 0 }} />
      )}
    </div>
  );

  if (type === 'footer') return (
    <div style={{ background: data.bgColor, padding: '28px 32px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>{data.orgName}</p>
      {data.showSocial && (
        <div style={{ margin: '0 0 12px' }}>
          {[Facebook, Linkedin, Instagram].map((Icon, i) => (
            <span key={i} style={{ display: 'inline-block', margin: '0 4px', background: 'rgba(255,255,255,0.12)', borderRadius: '50%', width: 28, height: 28, lineHeight: '28px', textAlign: 'center' }}>
              <Icon style={{ width: 13, height: 13, color: '#a78bfa', display: 'inline', verticalAlign: 'middle' }} />
            </span>
          ))}
        </div>
      )}
      <p style={{ fontSize: 10, color: data.textColor, margin: '0 0 4px' }}>{data.address}</p>
      <p style={{ fontSize: 10, color: data.textColor, margin: '0 0 4px' }}>{data.email} · {data.phone}</p>
      <p style={{ fontSize: 10, color: data.linkColor, margin: '0 0 12px' }}>{data.website}</p>
      {data.showUnsubscribe && <p style={{ fontSize: 9, color: 'rgba(167,139,250,0.4)', margin: 0 }}>Dezabonare · Confidențialitate</p>}
    </div>
  );

  return <div className="p-4 text-xs text-slate-400 text-center">Bloc: {type}</div>;
}
