import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import {
  X,
  Lock,
  Mail,
  Building2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, language }) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPasswordReset,
    error,
    clearError,
    isLoading,
    isFirebaseReady,
  } = useAuth();

  const t = translations[language];
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [region, setRegion] = useState(t.regions[0]);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetSuccessMessage(null);

    try {
      if (tab === 'login') {
        await loginWithEmail(email, password);
        onClose();
      } else if (tab === 'register') {
        if (!factoryName.trim()) return;
        await registerWithEmail(email, password, factoryName, region);
        onClose();
      } else if (tab === 'reset') {
        await sendPasswordReset(email);
        setResetSuccessMessage(t.auth.verificationSent);
      }
    } catch {
      // Error handled by AuthContext
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      clearError();
      await loginWithGoogle();
      onClose();
    } catch {
      // Error handled by AuthContext
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label={t.common.close}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5 text-cyan-400 font-mono text-xs uppercase tracking-wider font-semibold">
            <Lock className="h-4 w-4" />
            <span>Firebase Authentication</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {tab === 'login' && t.auth.loginPromptTitle}
            {tab === 'register' && t.auth.register}
            {tab === 'reset' && t.auth.resetPassword}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t.auth.authNotice}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-lg bg-slate-950 p-1 mb-5 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              clearError();
              setResetSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'login'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.auth.login}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              clearError();
              setResetSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'register'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.auth.register}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('reset');
              clearError();
              setResetSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
              tab === 'reset'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.auth.resetPassword}
          </button>
        </div>

        {/* Error / Success Notices */}
        {error && (
          <div className="mb-4 rounded-lg bg-rose-950/50 border border-rose-800 p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {resetSuccessMessage && (
          <div className="mb-4 rounded-lg bg-emerald-950/50 border border-emerald-800 p-3 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">{resetSuccessMessage}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.auth.factoryName} *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={factoryName}
                    onChange={(e) => setFactoryName(e.target.value)}
                    placeholder="ТОО 'Казахстанский Металлургический Завод'"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t.auth.region} *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {t.regions.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {t.auth.email} *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="safety.chief@factory.kz"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  {t.auth.password} *
                </label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => setTab('reset')}
                    className="text-[11px] text-cyan-400 hover:underline"
                  >
                    {t.auth.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  minLength={6}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-cyan-500 focus:outline-none disabled:opacity-50 transition-colors shadow-sm"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {tab === 'login' && t.auth.login}
            {tab === 'register' && t.auth.register}
            {tab === 'reset' && t.auth.sendResetLink}
          </button>
        </form>

        {/* Google Sign In Divider */}
        {tab !== 'reset' && (
          <div className="mt-5">
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-slate-800 w-full" />
              <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider">
                {t.auth.orContinueWith}
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 py-2.5 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t.auth.googleSignIn}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
