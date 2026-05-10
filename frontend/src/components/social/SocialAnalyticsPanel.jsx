import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { projectsAPI } from '@/services/api';
import { PLATFORM_ICONS } from '@/components/ui/PlatformSelector';

export default function SocialAnalyticsPanel({ posts, title = 'Analiză Postări', maxPosts = 10, showProjectFilter = false }) {
  const [filterProject, setFilterProject] = useState('all');
  const [projects, setProjects] = useState([]);
  const normalizeId = (value) => String(value ?? '');

  useEffect(() => {
    if (!showProjectFilter) return;
    projectsAPI.getAll().then((data) => setProjects(Array.isArray(data) ? data : [])).catch(() => {});
  }, [showProjectFilter]);

  const filtered = posts
    .filter((p) =>
      filterProject === 'all'
        ? true
        : filterProject === 'ong'
          ? p.projectId == null && p.project_id == null
          : normalizeId(p.projectId ?? p.project_id) === filterProject,
    )
    .slice(0, maxPosts);

  const totalReach = filtered.reduce((a, p) => a + (p.reach || 0), 0);
  const totalLikes = filtered.reduce((a, p) => a + (p.likes || 0), 0);
  const avgEng = filtered.length && totalReach > 0
    ? (
        (filtered.reduce((a, p) => a + (p.likes || 0) + (p.shares || 0) + (p.comments || 0), 0) /
          totalReach) *
        100
      ).toFixed(1)
    : 0;

  const chartData = filtered
    .slice(0, 6)
    .map((p) => ({
      name: (p.date || p.created_at || '').slice(5, 10),
      likes: p.likes || 0,
      shares: p.shares || 0,
      reach: Math.round((p.reach || 0) / 100),
    }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-slate-900 font-display">{title}</h3>
        {showProjectFilter && projects.length > 0 && (
          <div className="flex gap-2 text-xs">
            {[['all', 'Toate'], ['ong', 'ONG General'], ...projects.map((p) => [String(p.id), (p.name || '').split(' ')[0]])].map(
              ([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilterProject(v)}
                  className={`px-3 py-1.5 rounded-full border font-semibold transition-colors ${
                    filterProject === v
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'border-slate-200 text-slate-600 hover:border-violet-200'
                  }`}
                >
                  {l}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="paper-card p-3 text-center border-t-4 border-t-violet-500">
          <p className="text-lg font-black text-slate-900 font-display">{totalReach.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">Reach total</p>
        </div>
        <div className="paper-card p-3 text-center border-t-4 border-t-rose-500">
          <p className="text-lg font-black text-slate-900 font-display">{totalLikes.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">Like-uri</p>
        </div>
        <div className="paper-card p-3 text-center border-t-4 border-t-emerald-500">
          <p className="text-lg font-black text-slate-900 font-display">{avgEng}%</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-[0.16em]">Engagement</p>
        </div>
      </div>

      {/* Chart */}
      <div className="paper-card p-4">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} />
            <Bar dataKey="likes" fill="#6b4cc2" radius={[4, 4, 0, 0]} />
            <Bar dataKey="shares" fill="#9b8dd8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Post list */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Nicio postare de afișat.</p>}
        {filtered.map((p) => {
          const postProjectId = p.projectId ?? p.project_id;
          const proj = projects.find((pr) => normalizeId(pr.id) === normalizeId(postProjectId));
          const platformList = Array.isArray(p.platforms)
            ? p.platforms
            : Array.isArray(p.platform)
              ? p.platform
              : [p.platforms ?? p.platform].filter(Boolean);
          return (
            <div key={p.id} className="flex items-start gap-3 paper-card p-3 hover:border-violet-200 transition-colors">
              <div className="flex flex-col gap-1 flex-shrink-0">
                {platformList.map((pl) => {
                  const Icon = PLATFORM_ICONS[String(pl)];
                  return Icon ? <Icon key={pl} className="w-3.5 h-3.5 text-slate-400" /> : null;
                })}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{p.text}</p>
                <div className="flex gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-400">{p.date || p.created_at?.slice(0, 10)}</span>
                  {proj && <span className="text-xs text-violet-600 font-medium">{(proj.name || '').split(' ')[0]}</span>}
                  <span className="text-xs text-rose-500">❤ {p.likes || 0}</span>
                  <span className="text-xs text-slate-500">↗ {p.shares || 0}</span>
                  <span className="text-xs text-emerald-600">👁 {(p.reach || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
