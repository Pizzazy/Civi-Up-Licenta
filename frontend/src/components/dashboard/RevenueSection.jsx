import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function RevenueSection({ financialData, revenueView, loading, error }) {
  if (loading) {
    return <div className="h-[360px] rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="h-[360px] rounded-2xl border border-rose-100 bg-rose-50/50 flex items-center justify-center">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!financialData.length) {
    return (
      <div className="h-[360px] rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Nu există date financiare pentru anul selectat.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={360}>
      {revenueView === 'area' ? (
        <AreaChart data={financialData}>
          <defs>
            {[['granturi', '#6b4cc2'], ['donatii', '#3f6fb5'], ['donatii_mari', '#b07a2a'], ['redirectionari', '#2f7d6c']].map(([k, c]) => (
              <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c} stopOpacity={0.2} />
                <stop offset="95%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
          <Tooltip formatter={(v) => `${v.toLocaleString()} RON`} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="granturi" stroke="#6b4cc2" strokeWidth={2} fill="url(#g_granturi)" name="Granturi" />
          <Area type="monotone" dataKey="donatii" stroke="#3f6fb5" strokeWidth={2} fill="url(#g_donatii)" name="Donații" />
          <Area type="monotone" dataKey="donatii_mari" stroke="#b07a2a" strokeWidth={2} fill="url(#g_donatii_mari)" name="Donații Mari" />
          <Area type="monotone" dataKey="redirectionari" stroke="#2f7d6c" strokeWidth={2} fill="url(#g_redirectionari)" name="Redirecționări 3.5%" />
        </AreaChart>
      ) : (
        <BarChart data={financialData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
          <Tooltip formatter={(v) => `${v.toLocaleString()} RON`} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="granturi" stackId="a" fill="#6b4cc2" name="Granturi" />
          <Bar dataKey="donatii" stackId="a" fill="#3f6fb5" name="Donații" />
          <Bar dataKey="donatii_mari" stackId="a" fill="#b07a2a" name="Donații Mari" />
          <Bar dataKey="redirectionari" stackId="a" fill="#2f7d6c" name="Redirecționări 3.5%" radius={[4, 4, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
