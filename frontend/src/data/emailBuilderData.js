import {
  Layout, Image, Type, Columns2, BarChart2, Quote, Minus,
  Square, Mail,
} from 'lucide-react';

// ─── BLOCK DEFINITIONS ────────────────────────────────────────

export const BLOCK_TYPES = [
  {
    type: 'header', label: 'Header Brand', icon: Layout, category: 'Structură',
    description: 'Logo + titlu organizație',
    defaultData: {
      logo: 'CiviUp', orgName: 'Organizația Mea',
      tagline: 'Schimbăm lumea, împreună.',
      bgColor: '#4c1d95', textColor: '#ffffff', accentColor: '#a78bfa',
    },
  },
  {
    type: 'hero', label: 'Hero cu Text', icon: Image, category: 'Media',
    description: 'Imagine mare cu text suprapus',
    defaultData: {
      imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
      headline: 'Împreună facem diferența',
      subheadline: '2025 — Un an de impact real în comunitate',
      ctaText: 'Descoperă povestea', ctaUrl: '#',
      overlayOpacity: 0.55, bgColor: '#1e1b4b',
    },
  },
  {
    type: 'text', label: 'Text & Titlu', icon: Type, category: 'Conținut',
    description: 'Heading + paragraf de text',
    defaultData: {
      heading: 'Dragă susținătorule,',
      headingSize: '28', headingColor: '#1e1b4b',
      body: 'Suntem bucuroși să vă împărtășim cele mai recente realizări ale organizației noastre. Datorită sprijinului vostru, am reușit să transformăm vieți și să construim comunități mai puternice.',
      bodyColor: '#475569', align: 'left', bgColor: '#ffffff', padding: '40',
    },
  },
  {
    type: 'image', label: 'Imagine', icon: Image, category: 'Media',
    description: 'Imagine full-width cu caption',
    defaultData: {
      imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&q=80',
      caption: 'Evenimentul nostru anual — București, Decembrie 2025',
      captionColor: '#94a3b8', altText: 'Imagine eveniment',
      borderRadius: '12', bgColor: '#f8fafc',
    },
  },
  {
    type: 'two_col', label: '2 Coloane', icon: Columns2, category: 'Structură',
    description: 'Text stânga + imagine dreapta',
    defaultData: {
      heading: 'Proiectul - Educatie pentru Viitor',
      headingColor: '#1e1b4b',
      body: 'Prin proiectul nostru flagship, am oferit acces la resurse educaționale de calitate pentru 320 de elevi din comunități vulnerabile. Rata de retenție a atins 94% — un record pentru noi!',
      bodyColor: '#475569',
      imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&q=80',
      imageCaption: 'Elevi din proiectul nostru',
      ctaText: 'Citește mai mult', ctaUrl: '#',
      ctaColor: '#7c3aed', reverseLayout: false, bgColor: '#ffffff',
    },
  },
  {
    type: 'stats', label: 'Statistici', icon: BarChart2, category: 'Conținut',
    description: '3 cifre cheie side by side',
    defaultData: {
      bgColor: '#4c1d95', textColor: '#ffffff',
      stats: [
        { value: '1.247', label: 'Beneficiari direcți', icon: '❤️' },
        { value: '881k', label: 'RON mobilizați', icon: '💰' },
        { value: '4', label: 'Proiecte active', icon: '🎯' },
      ],
    },
  },
  {
    type: 'quote', label: 'Citat / Callout', icon: Quote, category: 'Conținut',
    description: 'Citat inspirațional sau mesaj cheie',
    defaultData: {
      text: '"Fiecare leu donat se transformă în speranță reală pentru o familie care are nevoie de noi. Mulțumim că sunteți alături de noi în această misiune."',
      author: 'Echipa CiviUp',
      accentColor: '#7c3aed', bgColor: '#f5f3ff', textColor: '#1e1b4b',
    },
  },
  {
    type: 'button', label: 'Buton CTA', icon: Square, category: 'Acțiune',
    description: 'Call-to-action centrat',
    defaultData: {
      text: 'Donează acum și fă diferența', url: '#',
      bgColor: '#7c3aed', textColor: '#ffffff',
      containerBg: '#ffffff', borderRadius: '50',
      size: 'large', align: 'center',
    },
  },
  {
    type: 'divider', label: 'Separator', icon: Minus, category: 'Structură',
    description: 'Linie decorativă cu text opțional',
    defaultData: {
      label: '• • •', color: '#e2e8f0', labelColor: '#94a3b8',
      bgColor: '#ffffff', style: 'dots',
    },
  },
  {
    type: 'footer', label: 'Footer', icon: Mail, category: 'Structură',
    description: 'Contact + social + unsubscribe',
    defaultData: {
      orgName: 'Organizația Mea / CiviUp',
      address: 'Strada Florilor 12, București, România',
      email: 'contact@civiup.ro', phone: '',
      website: 'www.civiup.ro',
      showSocial: true, showUnsubscribe: true,
      bgColor: '#1e1b4b', textColor: '#a78bfa', linkColor: '#c4b5fd',
    },
  },
];

export const AI_PROMPTS_SUGGESTIONS = [
  'Newsletter de Crăciun pentru donatori, ton cald',
  'Raport de impact anual 2025, ton profesional',
  'Invitație eveniment de gală, ton elegant',
  'Email de mulțumire după donație, ton emoționant',
  'Update proiect pentru parteneri corporativi',
];

// ─── HTML GENERATOR ────────────────────────────────────────────

export function generateBlockHTML(block) {
  const { type, data } = block;
  switch (type) {
    case 'header':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};padding:28px 40px;">
  <tr>
    <td>
      <div style="font-family:'Segoe UI',sans-serif;font-size:26px;font-weight:900;color:${data.textColor};letter-spacing:-0.5px;">${data.logo}</div>
      <div style="font-size:12px;color:${data.accentColor};font-weight:600;margin-top:2px;text-transform:uppercase;letter-spacing:2px;">${data.orgName}</div>
    </td>
    <td align="right" style="font-size:11px;color:${data.accentColor};font-style:italic;">${data.tagline}</td>
  </tr>
</table>`;
    case 'hero':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr>
    <td style="position:relative;padding:0;">
      <div style="position:relative;min-height:300px;background-image:url(${data.imageUrl});background-size:cover;background-position:center;">
        <div style="position:absolute;inset:0;background:rgba(0,0,0,${data.overlayOpacity});"></div>
        <div style="position:relative;padding:60px 40px;text-align:center;">
          <h1 style="font-family:'Segoe UI',sans-serif;font-size:36px;font-weight:900;color:#fff;margin:0 0 12px;line-height:1.2;">${data.headline}</h1>
          <p style="font-size:16px;color:rgba(255,255,255,0.85);margin:0 0 28px;">${data.subheadline}</p>
          <a href="${data.ctaUrl}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:14px;">${data.ctaText}</a>
        </div>
      </div>
    </td>
  </tr>
</table>`;
    case 'text':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:${data.padding}px 40px;text-align:${data.align};">
    <h2 style="font-family:'Segoe UI',sans-serif;font-size:${data.headingSize}px;font-weight:800;color:${data.headingColor};margin:0 0 16px;line-height:1.25;">${data.heading}</h2>
    <p style="font-size:15px;line-height:1.75;color:${data.bodyColor};margin:0;">${data.body}</p>
  </td></tr>
</table>`;
    case 'image':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:24px 40px;">
    <img src="${data.imageUrl}" alt="${data.altText}" width="100%" style="border-radius:${data.borderRadius}px;display:block;max-width:100%;" />
    ${data.caption ? `<p style="font-size:12px;color:${data.captionColor};text-align:center;margin:10px 0 0;font-style:italic;">${data.caption}</p>` : ''}
  </td></tr>
</table>`;
    case 'two_col': {
      const left = `<td width="52%" style="padding:0 20px 0 0;vertical-align:top;">
      <h3 style="font-family:'Segoe UI',sans-serif;font-size:22px;font-weight:800;color:${data.headingColor};margin:0 0 14px;line-height:1.3;">${data.heading}</h3>
      <p style="font-size:14px;line-height:1.7;color:${data.bodyColor};margin:0 0 20px;">${data.body}</p>
      <a href="${data.ctaUrl}" style="display:inline-block;background:${data.ctaColor};color:#fff;text-decoration:none;padding:10px 22px;border-radius:40px;font-weight:700;font-size:13px;">${data.ctaText}</a>
    </td>`;
      const right = `<td width="48%" style="vertical-align:top;">
      <img src="${data.imageUrl}" alt="${data.imageCaption}" width="100%" style="border-radius:12px;display:block;" />
      ${data.imageCaption ? `<p style="font-size:11px;color:#94a3b8;margin:6px 0 0;text-align:center;">${data.imageCaption}</p>` : ''}
    </td>`;
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>${data.reverseLayout ? right + left : left + right}</tr></table>
  </td></tr>
</table>`;
    }
    case 'stats':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${data.stats.map((s, i) => `<td width="33%" style="text-align:center;padding:0 ${i === 1 ? '20px' : '10px'};">
        <div style="font-size:28px;margin-bottom:6px;">${s.icon}</div>
        <div style="font-size:30px;font-weight:900;color:${data.textColor};letter-spacing:-1px;">${s.value}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;text-transform:uppercase;letter-spacing:1px;">${s.label}</div>
      </td>`).join('')}
    </tr></table>
  </td></tr>
</table>`;
    case 'quote':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:36px 48px;border-left:4px solid ${data.accentColor};">
    <p style="font-size:18px;line-height:1.7;color:${data.textColor};font-style:italic;font-weight:500;margin:0 0 14px;">${data.text}</p>
    <p style="font-size:12px;color:${data.accentColor};font-weight:700;margin:0;text-transform:uppercase;letter-spacing:1px;">— ${data.author}</p>
  </td></tr>
</table>`;
    case 'button': {
      const align = data.align === 'left' ? 'left' : data.align === 'right' ? 'right' : 'center';
      const padding = data.size === 'large' ? '16px 40px' : '12px 28px';
      const fontSize = data.size === 'large' ? '16px' : '14px';
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.containerBg};">
  <tr><td style="padding:24px 40px;text-align:${align};">
    <a href="${data.url}" style="display:inline-block;background:${data.bgColor};color:${data.textColor};text-decoration:none;padding:${padding};border-radius:${data.borderRadius}px;font-weight:800;font-size:${fontSize};font-family:'Segoe UI',sans-serif;letter-spacing:0.2px;">${data.text}</a>
  </td></tr>
</table>`;
    }
    case 'divider':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:20px 40px;text-align:center;">
    ${data.label ? `<p style="font-size:16px;color:${data.labelColor};margin:0;letter-spacing:6px;">${data.label}</p>` : `<hr style="border:none;border-top:1px solid ${data.color};margin:0;" />`}
  </td></tr>
</table>`;
    case 'footer':
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${data.bgColor};">
  <tr><td style="padding:36px 40px;text-align:center;">
    <p style="font-size:14px;font-weight:800;color:#fff;margin:0 0 12px;">${data.orgName}</p>
    ${data.showSocial ? `<div style="margin:0 0 16px;">
      <a href="#" style="display:inline-block;margin:0 6px;background:rgba(255,255,255,0.1);border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;color:#fff;text-decoration:none;font-size:14px;">f</a>
      <a href="#" style="display:inline-block;margin:0 6px;background:rgba(255,255,255,0.1);border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;color:#fff;text-decoration:none;font-size:14px;">in</a>
      <a href="#" style="display:inline-block;margin:0 6px;background:rgba(255,255,255,0.1);border-radius:50%;width:32px;height:32px;line-height:32px;text-align:center;color:#fff;text-decoration:none;font-size:14px;">ig</a>
    </div>` : ''}
    <p style="font-size:11px;color:${data.textColor};margin:0 0 6px;">${data.address}</p>
    <p style="font-size:11px;color:${data.textColor};margin:0 0 6px;">${data.email} · ${data.phone}</p>
    <p style="font-size:11px;color:${data.linkColor};margin:0 0 16px;"><a href="${data.website}" style="color:${data.linkColor};">${data.website}</a></p>
    ${data.showUnsubscribe ? `<p style="font-size:10px;color:rgba(167,139,250,0.5);margin:0;"><a href="#" style="color:rgba(167,139,250,0.5);text-decoration:underline;">Dezabonare newsletter</a> · <a href="#" style="color:rgba(167,139,250,0.5);text-decoration:underline;">Politică confidențialitate</a></p>` : ''}
  </td></tr>
</table>`;
    default:
      return '';
  }
}

export function generateFullHTML(blocks, subject) {
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject || 'Newsletter CiviUp'}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.12);">
        <tr><td>${blocks.map((b) => generateBlockHTML(b)).join('\n        ')}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
