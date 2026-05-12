import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Menu, X } from 'lucide-react';

const MODULE_LABELS = {
  dashboard: 'Dashboard & Analize',
  financiar: 'Financiar & OCR',
  proiecte: 'Proiecte',
  crm: 'Email & CRM',
  'email-crm': 'Email & CRM',
  social: 'Social Media',
  profil: 'Profilul Meu',
  'ai-analize': 'AI Analize Date',
  'management-conturi': 'Management Conturi',
};

export default function Topbar({ activeModule, onModuleChange, onMobileMenuToggle, mobileSidebarOpen }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 md:px-5 gap-3 md:gap-4 flex-shrink-0 relative z-20">
      {/* Mobile hamburger menu */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden text-slate-600 hover:text-slate-900 transition-colors"
      >
        {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <h2 className="text-sm md:text-base text-slate-900 font-display flex-1 truncate">
        {MODULE_LABELS[activeModule] || activeModule}
      </h2>

      {/* User avatar — click to open profile */}
      <div onClick={() => navigate('/profil')} className="flex items-center gap-2.5 pl-3 md:pl-4 border-l border-slate-200 cursor-pointer hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 bg-violet-100 border border-violet-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-violet-700 text-xs font-black">{user?.avatar_initials || user?.avatar || user?.name?.slice(0, 1)?.toUpperCase() || 'U'}</span>
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</p>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-[0.2em]">{user?.role}</p>
        </div>
      </div>
    </div>
  );
}
