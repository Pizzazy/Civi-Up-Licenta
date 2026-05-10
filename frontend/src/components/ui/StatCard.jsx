import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = {
  violet: { bg: 'bg-violet-100/60', icon: 'text-violet-700', accent: 'border-t-violet-500' },
  emerald: { bg: 'bg-emerald-100/60', icon: 'text-emerald-700', accent: 'border-t-emerald-500' },
  blue: { bg: 'bg-sky-100/60', icon: 'text-sky-700', accent: 'border-t-sky-500' },
  rose: { bg: 'bg-rose-100/60', icon: 'text-rose-700', accent: 'border-t-rose-500' },
  amber: { bg: 'bg-amber-100/60', icon: 'text-amber-700', accent: 'border-t-amber-500' },
};

export default function StatCard({ icon: Icon, label, value, change, changeType, color = 'violet', onClick }) {
  const c = COLORS[color] || COLORS.violet;

  return (
    <div
      onClick={onClick}
      className={`paper-card border-t-4 p-5 transition-colors ${c.accent} ${onClick ? 'cursor-pointer hover:bg-white' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`${c.bg} p-2.5 rounded-xl`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {change && (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${changeType === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
          >
            {changeType === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900 mb-1 font-display">{value}</p>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-[0.08em]">{label}</p>
    </div>
  );
}
