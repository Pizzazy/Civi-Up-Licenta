// ════════════════════════════════════════════════════════════════
// MOCK DATA — will be replaced with API calls
// ════════════════════════════════════════════════════════════════

export const CEO_USER = {
  id: 0,
  name: 'Alexandra Ionescu',
  role: 'CEO',
  avatar: 'AI',
  email: 'alexandra@civiup.ro',
  org: 'CIviUp România',
};

export const ALL_USERS = [
  { id: 0, name: 'Alexandra Ionescu', role: 'CEO', avatar: 'AI', email: 'alexandra@civiup.ro', lastLogin: '2025-12-09 08:32', status: 'activ', projects: [1, 2, 3, 4] },
  { id: 1, name: 'Mihai Dumitrescu', role: 'Project Manager', avatar: 'MD', email: 'mihai@civiup.ro', lastLogin: '2025-12-09 09:15', status: 'activ', projects: [1, 2] },
  { id: 2, name: 'Elena Constantin', role: 'Financial Officer', avatar: 'EC', email: 'elena@civiup.ro', lastLogin: '2025-12-08 17:44', status: 'activ', projects: [1, 2, 3, 4] },
  { id: 3, name: 'Radu Georgescu', role: 'Communications', avatar: 'RG', email: 'radu@civiup.ro', lastLogin: '2025-12-07 14:20', status: 'inactiv', projects: [3] },
  { id: 4, name: 'Ioana Popa', role: 'Volunteer Coordinator', avatar: 'IP', email: 'ioana@civiup.ro', lastLogin: '2025-12-09 10:05', status: 'activ', projects: [2, 4] },
  { id: 5, name: 'Andrei Stancu', role: 'Community Manager', avatar: 'AS', email: 'andrei@civiup.ro', lastLogin: '2025-12-06 12:00', status: 'în așteptare', projects: [] },
];

export const PENDING_ACCOUNTS = [
  { id: 10, name: 'Cristina Vlad', email: 'cristina@civiup.ro', role: 'Voluntar', requestDate: '2025-12-08', type: 'reset_password' },
  { id: 11, name: 'Dan Matei', email: 'dan@civiup.ro', role: 'PM Junior', requestDate: '2025-12-07', type: 'new_account' },
];

export const FINANCIAL_DATA = [
  { month: 'Ian', granturi: 30000, donatii: 8000, donatii_mari: 2000, redirectionari: 2000, cheltuieli: 28000 },
  { month: 'Feb', granturi: 38000, donatii: 11000, donatii_mari: 3000, redirectionari: 3000, cheltuieli: 32000 },
  { month: 'Mar', granturi: 28000, donatii: 12000, donatii_mari: 5000, redirectionari: 3000, cheltuieli: 35000 },
  { month: 'Apr', granturi: 45000, donatii: 18000, donatii_mari: 5000, redirectionari: 3000, cheltuieli: 29000 },
  { month: 'Mai', granturi: 40000, donatii: 16000, donatii_mari: 6000, redirectionari: 3000, cheltuieli: 41000 },
  { month: 'Iun', granturi: 55000, donatii: 22000, donatii_mari: 8000, redirectionari: 4000, cheltuieli: 38000 },
  { month: 'Iul', granturi: 60000, donatii: 24000, donatii_mari: 7000, redirectionari: 3000, cheltuieli: 45000 },
  { month: 'Aug', granturi: 48000, donatii: 20000, donatii_mari: 6000, redirectionari: 4000, cheltuieli: 52000 },
  { month: 'Sep', granturi: 65000, donatii: 26000, donatii_mari: 7000, redirectionari: 4000, cheltuieli: 47000 },
  { month: 'Oct', granturi: 55000, donatii: 22000, donatii_mari: 7000, redirectionari: 4000, cheltuieli: 43000 },
  { month: 'Nov', granturi: 72000, donatii: 30000, donatii_mari: 9000, redirectionari: 4000, cheltuieli: 58000 },
  { month: 'Dec', granturi: 85000, donatii: 34000, donatii_mari: 11000, redirectionari: 4000, cheltuieli: 62000 },
];

export const REVENUE_PIE = [
  { name: 'Granturi', value: 621000, color: '#7c3aed' },
  { name: 'Donații', value: 243000, color: '#a78bfa' },
  { name: 'Donații Mari', value: 76000, color: '#60a5fa' },
  { name: 'Redirecționări 3.5%', value: 41000, color: '#34d399' },
];

export const BENEFICIARIES_BY_PROJECT = [
  { project: 'Educație', total: 420, directi: 320, indirecti: 100 },
  { project: 'Verde', total: 380, directi: 180, indirecti: 200 },
  { project: 'Bătrâni', total: 280, directi: 180, indirecti: 100 },
  { project: 'Artă', total: 167, directi: 120, indirecti: 47 },
];

export const PROJECTS = [
  {
    id: 1, name: 'Educație pentru Viitor', status: 'activ', progress: 72, color: '#7c3aed',
    grant: 120000, cheltuit: 86400, categorie: 'Educație', deadline: '2026-03-31', echipa: [0, 1, 2],
    beneficiariDirecti: 320, beneficiariIndirecti: 100,
    cheltuieli: [
      { id: 1, item: 'Materiale educaționale', suma: 12000, aprobat: true, data: '2025-10-15', furnizor: 'EdituraTop SRL' },
      { id: 2, item: 'Salarii tutori', suma: 45000, aprobat: true, data: '2025-11-01', furnizor: 'Persoane fizice' },
      { id: 3, item: 'Transport elevi', suma: 8500, aprobat: true, data: '2025-11-20', furnizor: 'Autobuz Trans' },
      { id: 4, item: 'Platformă e-learning', suma: 15000, aprobat: false, data: '2025-12-01', furnizor: 'TechEdu SRL' },
    ],
    events: [
      { id: 1, title: 'Ședință echipă proiect', date: '2025-12-12', time: '10:00', type: 'meeting', addedBy: 'Mihai Dumitrescu' },
      { id: 2, title: 'Deadline raport intermediar', date: '2025-12-20', time: '17:00', type: 'deadline', addedBy: 'Alexandra Ionescu' },
      { id: 3, title: 'Workshop tutori', date: '2025-12-28', time: '09:00', type: 'event', addedBy: 'Mihai Dumitrescu' },
    ],
    tasks: [
      { id: 1, title: 'Finalizare raport activități Q4', assignedTo: 1, priority: 'high', status: 'in_progress', dueDate: '2025-12-15', memos: [
        { id: 1, text: 'Am discutat cu tutori - toți au confirmat participarea', author: 1, date: '2025-12-08' },
        { id: 2, text: 'Verificați și secțiunea 3.2 din template', author: 0, date: '2025-12-09' },
      ]},
      { id: 2, title: 'Aprobare buget platformă e-learning', assignedTo: 0, priority: 'urgent', status: 'pending', dueDate: '2025-12-10', memos: [] },
      { id: 3, title: 'Recrutare 5 tutori noi pentru sem. 2', assignedTo: 4, priority: 'medium', status: 'done', dueDate: '2025-12-05', memos: [
        { id: 1, text: 'Finalizat! 6 tutori recrutați, toți cu experiență.', author: 4, date: '2025-12-04' },
      ]},
    ],
    socialPosts: [
      { id: 1, platform: ['Facebook', 'Instagram'], text: '🎓 300 de elevi au primit acces la platforma noastră de e-learning! #EducatiePentruViitor', date: '2025-12-01', likes: 342, shares: 87 },
      { id: 2, platform: ['LinkedIn'], text: 'Proiectul nostru educațional atinge un nou milestone: 95% rată de prezență a tutorilor!', date: '2025-11-28', likes: 156, shares: 34 },
    ],
  },
  {
    id: 2, name: 'Verde pentru Toți', status: 'activ', progress: 45, color: '#059669',
    grant: 80000, cheltuit: 36000, categorie: 'Mediu', deadline: '2026-06-30', echipa: [0, 1, 4],
    beneficiariDirecti: 180, beneficiariIndirecti: 200,
    cheltuieli: [
      { id: 1, item: 'Puieți și materiale', suma: 18000, aprobat: true, data: '2025-10-01', furnizor: 'Pepiniera Verde' },
      { id: 2, item: 'Echipamente', suma: 12000, aprobat: true, data: '2025-10-15', furnizor: 'AgroTech SRL' },
      { id: 3, item: 'Voluntari transport', suma: 6000, aprobat: false, data: '2025-11-10', furnizor: 'TransAuto' },
    ],
    events: [
      { id: 1, title: 'Plantare arbori - Parcul Herăstrău', date: '2025-12-14', time: '09:00', type: 'event', addedBy: 'Ioana Popa' },
      { id: 2, title: 'Întâlnire parteneri locali', date: '2025-12-18', time: '14:00', type: 'meeting', addedBy: 'Mihai Dumitrescu' },
    ],
    tasks: [
      { id: 1, title: 'Achiziție 500 puieți suplimentari', assignedTo: 2, priority: 'medium', status: 'pending', dueDate: '2025-12-20', memos: [] },
      { id: 2, title: 'Raport impact de mediu Q4', assignedTo: 1, priority: 'high', status: 'in_progress', dueDate: '2025-12-31', memos: [] },
    ],
    socialPosts: [
      { id: 1, platform: ['Facebook', 'Instagram', 'LinkedIn'], text: '🌱 2.000 de puieți plantați! Împreună facem România mai verde! #VerdePentruToti', date: '2025-12-03', likes: 521, shares: 142 },
    ],
  },
  {
    id: 3, name: 'Bătrâni Conectați', status: 'planificat', progress: 12, color: '#2563eb',
    grant: 45000, cheltuit: 5400, categorie: 'Social', deadline: '2026-09-15', echipa: [0, 2, 3],
    beneficiariDirecti: 180, beneficiariIndirecti: 100,
    cheltuieli: [
      { id: 1, item: 'Tablete și echipamente', suma: 5000, aprobat: true, data: '2025-11-20', furnizor: 'iStore' },
      { id: 2, item: 'Cursuri digitale', suma: 400, aprobat: false, data: '2025-12-01', furnizor: 'DigitalRo' },
    ],
    events: [
      { id: 1, title: 'Kick-off proiect', date: '2025-12-16', time: '11:00', type: 'meeting', addedBy: 'Alexandra Ionescu' },
    ],
    tasks: [
      { id: 1, title: 'Identificare 50 beneficiari', assignedTo: 3, priority: 'high', status: 'pending', dueDate: '2025-12-31', memos: [] },
    ],
    socialPosts: [],
  },
  {
    id: 4, name: 'Artă Comunitară', status: 'finalizat', progress: 100, color: '#d97706',
    grant: 30000, cheltuit: 29200, categorie: 'Cultură', deadline: '2025-10-31', echipa: [0, 2, 4],
    beneficiariDirecti: 120, beneficiariIndirecti: 47,
    cheltuieli: [
      { id: 1, item: 'Materiale artistice', suma: 8000, aprobat: true, data: '2025-08-01', furnizor: 'ArtShop' },
      { id: 2, item: 'Artiști invitați', suma: 12000, aprobat: true, data: '2025-09-15', furnizor: 'Persoane fizice' },
      { id: 3, item: 'Expoziție finală', suma: 9200, aprobat: true, data: '2025-10-20', furnizor: 'Galeria Atelier' },
    ],
    events: [],
    tasks: [],
    socialPosts: [
      { id: 1, platform: ['Facebook', 'Instagram'], text: '🎨 Expoziția finală \'Artă pentru Toți\' — un succes răsunător! Mulțumim celor 450 de vizitatori!', date: '2025-10-22', likes: 891, shares: 234 },
      { id: 2, platform: ['LinkedIn'], text: 'Proiectul Artă Comunitară s-a încheiat cu succes. 120 de beneficiari direcți și impact cultural major!', date: '2025-10-31', likes: 167, shares: 43 },
    ],
  },
];

export const EMAILS_DB = [
  { id: 1, from: 'BCR Foundation', to: 'ceo', subject: 'Confirmare Grant Q1 2026 – 75.000 RON', preview: 'Stimate Alexandra, avem plăcerea de a confirma...', date: 'Dec 9', read: false, starred: true, group: 'Donatori', column: 'inbox' },
  { id: 2, from: 'Rompetrol CSR', to: 'ceo', subject: 'Invitație parteneriat strategic multianual', preview: 'Vă contactăm pentru a discuta o colaborare...', date: 'Dec 8', read: true, starred: false, group: 'Parteneri', column: 'inbox' },
  { id: 3, from: 'Mihai Dumitrescu', to: 'ceo', subject: 'Raport activități Educație – Noiembrie', preview: 'Alexandra, atașat găsiți raportul complet...', date: 'Dec 7', read: true, starred: false, group: 'PM', column: 'in_lucru' },
  { id: 4, from: 'Ministerul Educației', to: 'ceo', subject: 'Aprobare program național 2026', preview: 'Ca urmare a dosarului depus de organizația dvs...', date: 'Dec 5', read: false, starred: true, group: 'Parteneri', column: 'inbox' },
  { id: 5, from: 'Voluntar Maria P.', to: 'ceo', subject: 'Înregistrare voluntariat – eveniment dec.', preview: 'Bună ziua, doresc să mă înscriu ca voluntar...', date: 'Dec 4', read: true, starred: false, group: 'Voluntari', column: 'rezolvat' },
  { id: 6, from: 'Elena Constantin', to: 'ceo', subject: 'Reconciliere conturi Noiembrie – gata', preview: 'Bună dimineața, am finalizat reconcilierea...', date: 'Dec 3', read: true, starred: false, group: 'PM', column: 'rezolvat' },
  { id: 7, from: 'Lidl România', to: 'ceo', subject: 'Propunere campanie Crăciun 2025', preview: 'Echipa CSR Lidl dorește să propună...', date: 'Dec 2', read: false, starred: false, group: 'Donatori', column: 'inbox' },
];

export const ALL_SOCIAL_POSTS = [
  { id: 1, projectId: 1, platform: ['Facebook', 'Instagram'], text: '🎓 300 de elevi au primit acces la platforma de e-learning!', date: '2025-12-01', likes: 342, shares: 87, reach: 12400, comments: 23 },
  { id: 2, projectId: 2, platform: ['Facebook', 'Instagram', 'LinkedIn'], text: '🌱 2.000 de puieți plantați! Împreună facem România mai verde!', date: '2025-12-03', likes: 521, shares: 142, reach: 28900, comments: 67 },
  { id: 3, projectId: null, platform: ['Facebook'], text: '❤️ Mulțumim celor 1.200+ beneficiari care ne-au schimbat perspectiva în 2025!', date: '2025-12-05', likes: 1204, shares: 356, reach: 45200, comments: 134 },
  { id: 4, projectId: null, platform: ['LinkedIn', 'Facebook'], text: '📊 Raport de impact 2025: 881.000 RON mobilizați pentru comunitate!', date: '2025-11-30', likes: 287, shares: 89, reach: 19800, comments: 31 },
  { id: 5, projectId: 4, platform: ['Facebook', 'Instagram'], text: '🎨 Expoziția \'Artă pentru Toți\' — 450 de vizitatori, zero bilete!', date: '2025-10-22', likes: 891, shares: 234, reach: 38600, comments: 112 },
  { id: 6, projectId: 3, platform: ['Facebook'], text: '📱 Lansăm proiectul \'Bătrâni Conectați\' — 50 de seniori vor învăța să folosească internetul!', date: '2025-12-07', likes: 445, shares: 98, reach: 22100, comments: 54 },
  { id: 7, projectId: null, platform: ['Instagram'], text: '✨ 5 ani de CIviUp — mulțumim pentru fiecare moment alături de noi!', date: '2025-11-15', likes: 1876, shares: 521, reach: 67800, comments: 298 },
  { id: 8, projectId: 1, platform: ['LinkedIn'], text: 'Proiectul nostru educațional: 95% rată de prezență a tutorilor!', date: '2025-11-28', likes: 156, shares: 34, reach: 8900, comments: 12 },
  { id: 9, projectId: 2, platform: ['Facebook'], text: '🌳 Weekend de ecologie — 150 voluntari au curățat parcul!', date: '2025-11-20', likes: 634, shares: 187, reach: 31200, comments: 78 },
  { id: 10, projectId: null, platform: ['Facebook', 'Instagram', 'LinkedIn'], text: '🎁 Campanie de Crăciun: donează și oferă bucurie unei familii!', date: '2025-12-08', likes: 892, shares: 312, reach: 52400, comments: 156 },
];

export const CHAT_MESSAGES_INIT = {
  1: [
    { id: 1, from: 'Mihai Dumitrescu', fromId: 1, text: 'Bună ziua! Raportul pentru Educație este gata.', time: '09:15', mine: false },
    { id: 2, from: 'CEO', fromId: 0, text: 'Mulțumesc, Mihai! Putem face o ședință mâine la 10?', time: '09:32', mine: true },
    { id: 3, from: 'Mihai Dumitrescu', fromId: 1, text: 'Absolut! Vă trimit agenda în avans.', time: '09:35', mine: false },
  ],
  2: [
    { id: 1, from: 'Elena Constantin', fromId: 2, text: 'Reconcilierea conturilor pentru noiembrie este finalizată.', time: '08:45', mine: false },
    { id: 2, from: 'CEO', fromId: 0, text: 'Perfect! Există vreo discrepanță față de buget?', time: '11:20', mine: true },
    { id: 3, from: 'Elena Constantin', fromId: 2, text: 'Suntem cu 3.2% sub buget la cheltuieli. Detalii în raport!', time: '11:28', mine: false },
  ],
  3: [
    { id: 1, from: 'Radu Georgescu', fromId: 3, text: 'Am pregătit 3 variante de postări pentru campania de Crăciun.', time: '14:00', mine: false },
    { id: 2, from: 'CEO', fromId: 0, text: 'Excelent! Trimite-mi variantele pentru aprobare.', time: '15:10', mine: true },
  ],
  4: [
    { id: 1, from: 'Ioana Popa', fromId: 4, text: 'Avem 45 de voluntari înregistrați pentru 20 decembrie!', time: '10:05', mine: false },
    { id: 2, from: 'CEO', fromId: 0, text: 'Fantastic! Asigurați-vă că toți au primit instrucțiunile.', time: '10:30', mine: true },
  ],
};

// ── AI mock responses ────────────────────────────────────────
export const AI_RESPONSES = {
  donatori: '📊 **Analiză Donatori – Decembrie 2025**\n\nLuna aceasta: **90.700 RON** (+32.6% față de noiembrie).\n• Donatori corporativi: 88% din total\n• Donator recurent: Maria Popescu — activ 6 luni consecutiv\n• **Recomandare:** Contactați top 3 donatori corporativi pentru parteneriate multianuale. Rată retenție: 71%.',
  cheltuieli: '💰 **Analiză Cheltuieli – 30 zile**\n\nTotal: **23.150 RON**, eficiență buget **94.2%**.\n• Evenimente: 36.7% — în linie cu planul\n• IT & Marketing: 42% — investiție în vizibilitate\n• **Alertă:** 2 cheltuieli în așteptare: 6.200 RON\n• **Recomandare:** Renegociați contractul Webdesign Pro — -20% cost posibil.',
  proiecte: '🎯 **Status Proiecte**\n\n• **Educație** (72%): pe track, platformă e-learning necesită aprobare urgentă\n• **Verde** (45%): risc moderat depășire deadline — accelerați voluntarii\n• **Bătrâni Conectați** (12%): fază incipientă — atenție achiziție echipamente\n• **Recomandare:** Prioritizați bugetul IT pentru Educație.',
  default: '🤖 **Analiză Generală CiviUp**\n\n• Venituri 2025: **981.000 RON** (+34%)\n• Eficiență operațională: **89.3%**\n• Beneficiari direcți: **1.247 persoane**\n• Impact social: ⭐⭐⭐⭐⭐ (top 5% ONG-uri România)\n\n**Recomandare strategică:** Aplicați la 2 granturi europene în Q1 2026 — Horizon Europe Social Innovation track.',
};

export const AI_SOCIAL_GENERATE = (prompt, project) => {
  const base = project
    ? `proiectul "${project}" al organizației CIviUp`
    : 'organizația CIviUp / CiviUp';
  if (prompt.toLowerCase().includes('crăciun') || prompt.toLowerCase().includes('craciun'))
    return `🎁 Sărbătorile aduc bucurie mai multă atunci când le împărțim! ${base} pregătește surprize speciale pentru 500 de familii vulnerabile. Poți face parte din poveste — donează sau alătură-te voluntarilor noștri! 💜 #CiviUp #Craciun2025 #ImpactSocial #Voluntariat`;
  if (prompt.toLowerCase().includes('impact') || prompt.toLowerCase().includes('raport'))
    return `📊 Cifrele spun tot: în 2025, ${base} a ajutat 1.247 de beneficiari direcți, a mobilizat 881.000 RON și a plantat 2.000 de arbori. Acesta nu este un raport — este o promisiune pentru 2026! 💜 #CiviUp #ImpactSocial #ONG #Romania`;
  if (prompt.toLowerCase().includes('voluntar'))
    return `🤝 Vrei să faci o diferență reală? ${base} caută voluntari dedicați pentru proiectele noastre din 2026! Indiferent de domeniu — educație, mediu, cultură sau social — există un loc pentru tine. Înscrie-te acum! 💜 #Voluntariat #CiviUp #FiiSchimbarea`;
  return `🌟 La ${base}, credem că fiecare acțiune mică creează valuri de schimbare. Împreună cu comunitatea noastră, construim un viitor mai bun — o zi la rândul. Mulțumim că sunteți alături de noi! 💜 #CiviUp #CIviUp #ImpactSocial #Comunitate`;
};
