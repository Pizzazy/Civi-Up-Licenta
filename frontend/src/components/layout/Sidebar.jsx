import {
  LayoutDashboard, DollarSign, FolderOpen, Mail, Share2,
  Heart, ChevronRight, Menu, LogOut, User, Bot, ShieldCheck, X,
} from 'lucide-react';
import { NAV_ITEMS, APP_NAME, ROLE_LABELS } from '@/data/constants';
import { useAuth } from '@/context/AuthContext';
import { filterNavByRole } from '@/utils/roles';
import { Avatar } from '@/components/ui';

const ICON_MAP = {
  LayoutDashboard, DollarSign, FolderOpen, Mail, Share2,
  Bot, ShieldCheck,
};

export default function Sidebar({ active, onChange, collapsed, onToggle, isMobile = false }) {
  const { user, logout } = useAuth();

  const visibleNav = filterNavByRole(NAV_ITEMS, user?.role);

  return (
    <div
      className={`h-full flex flex-col bg-white border-r border-slate-200 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Brand */}
      <div className={`border-b border-slate-200 ${collapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4 flex items-center gap-3'}`}>
        <div className="w-8 h-8 bg-violet-100 border border-violet-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <Heart className="w-4 h-4 text-violet-700" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-slate-900 font-display text-sm leading-tight">{APP_NAME}</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em]">{user?.role || 'Portal'}</p>
          </div>
        )}
        <button onClick={onToggle} className={`text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 ${collapsed ? '' : 'ml-auto'}`}>
          {isMobile ? <X className="w-4 h-4" /> : collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {!collapsed && <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] px-3 mb-3">Module</p>}
        {visibleNav.map((item) => {
          const Icon = ICON_MAP[item.iconName];
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                isActive
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-700' : 'text-slate-400 group-hover:text-violet-600'}`}
                />
              )}
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {!collapsed && item.badge && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-violet-100 text-violet-700' : 'bg-rose-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: user & actions */}
      <div className="p-3 border-t border-slate-200 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar initials={user.avatar || 'U'} size="sm" colorIdx={0} />
            <div className="min-w-0">
              <p className="text-slate-900 text-xs font-semibold truncate">{user.name}</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] truncate">{ROLE_LABELS[user.role] || user.role}</p>
            </div>
          </div>
        )}
        <button onClick={() => onChange('profil')} className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-sm transition-all`}>
          <User className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Profil</span>}
        </button>
        <button
          onClick={logout}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-sm transition-all`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Deconectare</span>}
        </button>
      </div>
    </div>
  );
}
