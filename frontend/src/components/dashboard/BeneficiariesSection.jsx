import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PIE_COLORS = ['#6b4cc2', '#2f7d6c', '#2b5c8a', '#b26b2e', '#b04a4a', '#2a7a8a'];

export default function BeneficiariesSection({ beneficiaries, benefTab, loading, loaded, error }) {
  if (loading) {
    return <div className="h-[220px] rounded-2xl bg-slate-50 border border-slate-100 animate-pulse" />;
  }

  if (error) {
    return (
      <div className="h-[220px] rounded-2xl border border-rose-100 bg-rose-50/50 flex items-center justify-center">
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (loaded && !beneficiaries.length) {
    return (
      <div className="h-[220px] rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Nu există proiecte cu beneficiari în acest moment.</p>
      </div>
    );
  }

  if (benefTab === 'total') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={beneficiaries} cx="50%" cy="50%" outerRadius={80} dataKey="directi" nameKey="project" paddingAngle={3}>
                {beneficiaries.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v} persoane`} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {beneficiaries.map((b, i) => (
            <div key={b.project} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}></span>
              <span className="text-sm text-slate-600 flex-1">{b.project}</span>
              <div className="text-right">
                <p className="text-sm font-black text-slate-800">{b.directi}</p>
                <p className="text-xs text-slate-400">direcți</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={beneficiaries} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis dataKey="project" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={100} />
        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="directi" fill="#6b4cc2" name="Direcți" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
