import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Building2, Loader2, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '@/services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim() || !fullName.trim() || !email.trim() || !password) {
      setError('Toate câmpurile sunt obligatorii.');
      return;
    }
    if (password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authAPI.register({
        org_name: orgName.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Eroare la înregistrare.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
        <div className="w-full max-w-md text-center">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-400/30">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">Organizație creată!</h2>
            <p className="text-violet-300 text-sm mb-6">
              Contul pentru <strong className="text-white">{orgName}</strong> a fost creat cu succes.
              Puteți accesa platforma cu email-ul și parola stabilite.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              Autentifică-te acum
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="mt-8 space-y-3 text-left">
            {[
              'Management financiar complet',
              'Coordonarea proiectelor și voluntarilor',
              'Comunicare integrată (email, social media)',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-violet-200/80 text-sm">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full flex-shrink-0"></span>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
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
              <div className="w-12 h-12 bg-violet-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 border border-violet-400/30">
                <Building2 className="w-6 h-6 text-violet-300" />
              </div>
              <h2 className="text-xl font-black text-white">Înregistrează organizația</h2>
              <p className="text-violet-300 text-sm mt-1">Creează un cont CEO pentru organizația ta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Org name */}
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Numele organizației</label>
                <input
                  type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Asociația Exemplu"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all"
                />
              </div>
              {/* CEO name */}
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Numele tău (CEO)</label>
                <input
                  type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ion Popescu"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all"
                />
              </div>
              {/* Email */}
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@organizatie.ro"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all"
                  autoComplete="email"
                />
              </div>
              {/* Password */}
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Parolă</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minim 6 caractere"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all pr-10"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300/50 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {/* Confirm password */}
              <div>
                <label className="text-xs font-bold text-violet-200 uppercase tracking-wider mb-1.5 block">Confirmă parola</label>
                <input
                  type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetă parola"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-violet-300/50 text-sm focus:outline-none focus:border-violet-300 transition-all"
                  autoComplete="new-password"
                />
              </div>

              {error && <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-xl p-3">{error}</p>}

              <button type="submit" disabled={loading} className="w-full bg-violet-500 hover:bg-violet-400 disabled:opacity-60 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                {loading ? 'Se creează...' : 'Creează organizația'}
              </button>
            </form>
          </div>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-violet-300/70 text-sm mb-2">Ai deja un cont?</p>
            <Link to="/login" className="text-violet-300 hover:text-white text-sm font-bold transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Înapoi la autentificare
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
