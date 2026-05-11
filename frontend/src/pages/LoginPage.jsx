import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Heart, LogIn, Loader2, Eye, EyeOff, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Introduceți email-ul și parola.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-violet-100 border border-violet-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-violet-700" />
          </div>
          <h1 className="text-4xl text-slate-900 font-display mb-3">CiviUp</h1>
          <p className="text-slate-700 text-lg font-medium mb-2">Platformă de Management ONG</p>
          <p className="text-slate-500 text-sm">Digitalizare completă pentru organizații non-profit</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-violet-100 border border-violet-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-7 h-7 text-violet-700" />
            </div>
            <h1 className="text-2xl text-slate-900 font-display">CiviUp</h1>
          </div>

          <div className="paper-card p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl text-slate-900 font-display">Bine ați revenit!</h2>
              <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mt-2">Conectați-vă la contul dumneavoastră</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@organizatie.ro"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-violet-300 transition-all"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5 block">Parolă</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-violet-300 transition-all pr-10"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-violet-700 hover:bg-violet-600 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Se conectează...' : 'Conectare'}
              </button>
            </form>
          </div>

          {/* Contact */}
          <div className="mt-6 paper-card p-5 text-center">
            <p className="text-slate-600 text-sm mb-2">Ai nevoie de acces sau suport?</p>
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 text-sm font-semibold">
              <Mail className="w-4 h-4" />
              civiup@contact.ro
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
