// ════════════════════════════════════════════════════════════════
// APPLICATION CONSTANTS
// ════════════════════════════════════════════════════════════════

export const APP_NAME = 'CiviUp';

// ── Role definitions for RBAC (match backend enum values) ─────
export const ROLES = {
  ceo: 'ceo',
  project_manager: 'project_manager',
  financial_officer: 'financial_officer',
  communications: 'communications',
  volunteer_coordinator: 'volunteer_coordinator',
  community_manager: 'community_manager',
  voluntar: 'voluntar',
  cititor: 'cititor',
};

// ── Human-readable labels for display ─────────────────────────
export const ROLE_LABELS = {
  ceo: 'CEO',
  project_manager: 'Project Manager',
  financial_officer: 'Financial Officer',
  communications: 'Communications',
  volunteer_coordinator: 'Volunteer Coordinator',
  community_manager: 'Community Manager',
  voluntar: 'Voluntar',
  cititor: 'Cititor',
};

// ── Permissions map: which roles can access which modules ─────
export const PERMISSIONS = {
  dashboard: [ROLES.ceo, ROLES.project_manager, ROLES.financial_officer, ROLES.communications, ROLES.volunteer_coordinator, ROLES.community_manager, ROLES.voluntar],
  financiar: [ROLES.ceo, ROLES.financial_officer],
  proiecte: [ROLES.ceo, ROLES.project_manager, ROLES.financial_officer, ROLES.volunteer_coordinator],
  crm: [ROLES.ceo, ROLES.project_manager, ROLES.communications],
  'email-crm': [ROLES.ceo, ROLES.project_manager, ROLES.communications],
  social: [ROLES.ceo, ROLES.communications, ROLES.community_manager],
  email_builder: [ROLES.ceo, ROLES.communications],
  'ai-analize': [ROLES.ceo, ROLES.project_manager, ROLES.financial_officer],
  'management-conturi': [ROLES.ceo],
};

// ── UI constants ─────────────────────────────────────────────
export const AVATAR_COLORS = [
  'bg-violet-600',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
];

export const PLATFORM_COLORS = {
  Facebook: 'bg-blue-100 text-blue-700 border-blue-200',
  Instagram: 'bg-rose-100 text-rose-700 border-rose-200',
  LinkedIn: 'bg-sky-100 text-sky-700 border-sky-200',
  Twitter: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const ALL_PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'Twitter'];

export const EMAIL_GROUPS = ['PM', 'Donatori', 'Newsletter', 'Voluntari', 'Parteneri'];

export const KANBAN_COLS = [
  { id: 'inbox', label: '📥 Inbox', color: 'border-blue-200 bg-blue-50' },
  { id: 'in_lucru', label: '🔄 În Lucru', color: 'border-amber-200 bg-amber-50' },
  { id: 'rezolvat', label: '✅ Rezolvat', color: 'border-emerald-200 bg-emerald-50' },
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', iconName: 'LayoutDashboard', badge: null },
  { id: 'financiar', label: 'Financiar & OCR', iconName: 'DollarSign', badge: null },
  { id: 'proiecte', label: 'Proiecte & Granturi', iconName: 'FolderOpen', badge: null },
  { id: 'email-crm', label: 'Email & CRM', iconName: 'Mail', badge: null },
  { id: 'social', label: 'Social Media', iconName: 'Share2', badge: null },
  { id: 'ai-analize', label: 'AI Analize', iconName: 'Bot', badge: null },
  { id: 'management-conturi', label: 'Management Conturi', iconName: 'ShieldCheck', badge: null },
];
