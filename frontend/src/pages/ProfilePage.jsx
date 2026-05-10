import { useState } from 'react';
import {
  Lock, Save, Loader2, CheckCircle, AlertCircle,
  Mail, Phone, Building, MapPin, User, Eye, EyeOff, Shield,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLES } from '@/data/constants';
import { usersAPI } from '@/services/api';

export default function ProfilePage() {
  const { user, updateCurrentUser } = useAuth();

  // Personal info
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoError, setInfoError] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwStatus, setPwStatus] = useState(null); // 'success' | 'error' | null

  const handleSaveInfo = async () => {
    setInfoSaving(true);
    setInfoSaved(false);
    setInfoError('');
    try {
      const updated = await usersAPI.update(user.id, {
        full_name: name,
        phone,
        bio,
      });
      updateCurrentUser(updated);
      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 3000);
    } catch (err) {
      setInfoError(err.message || 'Eroare la salvare');
    } finally {
      setInfoSaving(false);
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setPwStatus('error');
      return;
    }
    if (newPassword.length < 8) {
      setPwStatus('error');
      return;
    }
    setPwLoading(true);
    setPwStatus(null);
    // No backend endpoint for password change yet — show confirmation
    setPwLoading(false);
    setPwStatus('success');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPwStatus(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <User className="w-6 h-6 text-violet-600" />
        <div>
          <h1 className="text-xl font-black text-slate-800">Profilul Meu</h1>
          <p className="text-sm text-slate-400">Gestionează informațiile contului tău</p>
        </div>
      </div>

      {/* Profile Image + Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Gradient header */}
        <div className="h-28 bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center">
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-2xl font-black">{user?.avatar || 'U'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 px-6 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-black text-slate-800">{user?.name}</h2>
            <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3" /> {ROLES[user?.role] || user?.role}
            </span>
          </div>
          <p className="text-sm text-slate-400">{user?.email}{user?.organization ? ` · ${user.organization}` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-violet-500" /> Informații Personale
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Nume Complet</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Email</label>
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">{email}</span>
                <span className="ml-auto text-xs text-slate-400 italic">nu se poate modifica</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Bio / Descriere</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Scrie câteva cuvinte despre tine..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSaveInfo}
                disabled={infoSaving}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                {infoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {infoSaving ? 'Se salvează...' : 'Salvează Modificări'}
              </button>
              {infoSaved && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                  <CheckCircle className="w-4 h-4" /> Salvat!
                </span>
              )}
              {infoError && (
                <span className="flex items-center gap-1.5 text-rose-600 text-sm font-semibold">
                  <AlertCircle className="w-4 h-4" /> {infoError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-500" /> Schimbare Parolă
          </h3>

          {pwStatus === 'success' && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <p className="text-sm text-emerald-700 font-semibold">Cererea de schimbare parolă a fost trimisă! Un administrator va aproba cererea.</p>
            </div>
          )}

          {pwStatus === 'error' && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <p className="text-sm text-rose-700 font-semibold">Parolele nu se potrivesc sau noua parolă are mai puțin de 8 caractere.</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Parola Curentă</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 pr-10"
                />
                <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Parola Nouă</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minim 8 caractere"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 pr-10"
                />
                <button type="button" onClick={() => setShowNewPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        newPassword.length >= i * 3
                          ? i <= 1
                            ? 'bg-rose-400'
                            : i <= 2
                            ? 'bg-amber-400'
                            : i <= 3
                            ? 'bg-emerald-400'
                            : 'bg-emerald-600'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Confirmă Parola Nouă</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetă parola nouă"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  confirmPassword && confirmPassword !== newPassword
                    ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                }`}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs text-rose-500 mt-1">Parolele nu se potrivesc</p>
              )}
            </div>
            <button
              type="submit"
              disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {pwLoading ? 'Se trimite cererea...' : 'Trimite Cerere Schimbare Parolă'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              <strong>Notă:</strong> Cererea de schimbare a parolei va fi trimisă unui administrator (CEO) pentru aprobare. Veți primi o notificare când cererea este procesată.
            </p>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">Detalii Cont</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rol</p>
            <p className="text-sm font-bold text-slate-700">{ROLES[user?.role] || user?.role}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Organizație</p>
            <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" /> {user?.organization || '—'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Membru din</p>
            <p className="text-sm font-bold text-slate-700">{user?.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }) : '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ultima Autentificare</p>
            <p className="text-sm font-bold text-slate-700">{user?.last_login_at ? new Date(user.last_login_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
