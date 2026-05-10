import { useState, useEffect } from 'react';
import { SocialAnalyticsPanel } from '@/components/social';
import { socialAPI } from '@/services/api';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SocialPage() {
  const [posts, setPosts] = useState([]);
  const [platformTab, setPlatformTab] = useState('facebook');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connections, setConnections] = useState(null);

  const filteredPosts = posts.filter((p) => {
    const platformList = Array.isArray(p.platforms)
      ? p.platforms
      : Array.isArray(p.platform)
        ? p.platform
        : [p.platforms ?? p.platform].filter(Boolean);
    if (platformTab === 'facebook') return platformList.includes('Facebook');
    return platformList.includes('Instagram');
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');

      try {
        const connectionData = await socialAPI.getConnectionStatus();
        if (!cancelled) setConnections(connectionData || null);
      } catch {
        if (!cancelled) setConnections(null);
      }

      try {
        const postsData = await socialAPI.getPosts({ status: 'published' });
        if (!cancelled) setPosts(Array.isArray(postsData) ? postsData : []);
      } catch (err) {
        if (!cancelled) {
          setPosts([]);
          setError(err?.message || 'Nu am putut încărca postările.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg text-slate-900 font-display">Social Media</h2>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-[0.2em]">Analiză și performanță postări publicate</p>
      </div>

      {connections && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="paper-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Facebook</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {connections.facebook?.connected ? 'Conectat' : 'Neconectat'}
            </p>
          </div>
          <div className="paper-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Instagram</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {connections.instagram?.connected ? 'Conectat' : 'Neconectat'}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setPlatformTab('facebook')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            platformTab === 'facebook'
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200'
          }`}
        >
          Facebook
        </button>
        <button
          onClick={() => setPlatformTab('instagram')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            platformTab === 'instagram'
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-200'
          }`}
        >
          Instagram
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-600">Se încarcă postările...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <SocialAnalyticsPanel
            posts={filteredPosts}
            title={platformTab === 'facebook' ? 'Facebook — Engagement' : 'Instagram — Engagement'}
            maxPosts={20}
          />
        </div>
      )}
    </div>
  );
}
