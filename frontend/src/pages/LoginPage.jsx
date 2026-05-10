import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, LogIn, Loader2, Eye, EyeOff, UserPlus } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-3">CiviUp</h1>
          <p className="text-violet-200 text-lg font-medium mb-2">Platformă de Management ONG</p>
          <p className="text-violet-300/70 text-sm">Digitalizare completă pentru organizații non-profit</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">CiviUp</h1>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-xl font-black text-white">Bine ați revenit!</h2>
              <p className="text-violet-300 text-sm mt-1">Conectați-vă la contul dumneavoastră</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@organizatie.ro"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Parolă</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all pr-10"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300/50 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-xl p-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {loading ? 'Se conectează...' : 'Conectare'}
              </button>
            </form>
          </div>

          {/* Register link */}
          <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center">
            <p className="text-violet-300 text-sm mb-3">Nu ai cont pentru organizația ta?</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-5 py-2.5 text-white font-bold text-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Înregistrează organizația
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
