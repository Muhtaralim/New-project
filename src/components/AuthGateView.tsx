import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { BrandLogo } from './BrandLogo';
import {
  Lock,
  Mail,
  Building2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Server,
  LifeBuoy,
  Camera,
} from 'lucide-react';

interface AuthGateViewProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const AuthGateView: React.FC<AuthGateViewProps> = ({ language, setLanguage }) => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    sendPasswordReset,
    error,
    clearError,
    isLoading,
  } = useAuth();

  const t = translations[language];
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [region, setRegion] = useState(t.regions[0]);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetSent(false);
    try {
      if (tab === 'login') {
        await loginWithEmail(email, password);
      } else if (tab === 'register') {
        if (!factoryName.trim()) return;
        await registerWithEmail(email, password, factoryName, region);
      } else if (tab === 'reset') {
        await sendPasswordReset(email);
        setResetSent(true);
      }
    } catch {
      // Handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Minimal Language Topbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 px-4 sm:px-8 h-16 flex items-center justify-between">
        <BrandLogo size="sm" subtitle={t.founder.consoleBadge} />

        <div className="flex items-center rounded-md border border-slate-800 bg-slate-900 p-0.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setLanguage('ru')}
            className={`px-2 py-1 rounded transition-colors ${
              language === 'ru'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            RU
          </button>
          <span className="text-slate-700">|</span>
          <button
            type="button"
            onClick={() => setLanguage('kz')}
            className={`px-2 py-1 rounded transition-colors ${
              language === 'kz'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            KZ
          </button>
        </div>
      </header>

      {/* Main Centered Split Authentication Workspace */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
          {/* Left Identity & Capabilities Column */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <BrandLogo size="xl" showText={false} />
              <div>
                <div className="text-[11px] font-mono font-semibold text-cyan-400 tracking-wider uppercase">
                  {t.founder.consoleBadge}
                </div>
                <h1 className="text-xl font-bold text-white tracking-tight mt-1">
                  {t.founder.founderTitle}
                </h1>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {t.founder.authGateSubtitle}
                </p>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-4 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Server className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{t.nav.factories}: реестр предприятий, квоты, статусы и инспектор</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Camera className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{t.nav.errors}: подключенные камеры, IP/QR, сбои потоков</span>
              </div>
              <div className="flex items-start gap-2.5">
                <LifeBuoy className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{t.nav.support}: тикет-система и переписка с инженерами</span>
              </div>
              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800/70 text-[11px] font-mono text-slate-400">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>{t.founder.founderEmailHint}</span>
              </div>
            </div>
          </div>

          {/* Right Auth Form Column */}
          <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-7 flex flex-col justify-center">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {tab === 'login' && t.founder.authGateTitle}
                {tab === 'register' && t.auth.register}
                {tab === 'reset' && t.auth.resetPassword}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{t.auth.authNotice}</p>
            </div>

            {/* Tabs */}
            <div className="flex rounded-lg bg-slate-950 p-1 mb-5 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  clearError();
                  setResetSent(false);
                }}
                className={`flex-1 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                  tab === 'login'
                    ? 'bg-slate-800 text-cyan-300'
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
                  setResetSent(false);
                }}
                className={`flex-1 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                  tab === 'register'
                    ? 'bg-slate-800 text-cyan-300'
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
                  setResetSent(false);
                }}
                className={`flex-1 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
                  tab === 'reset'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.auth.resetPassword}
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {resetSent && (
              <div className="mb-4 rounded-lg bg-emerald-950/60 border border-emerald-800 p-3 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{t.auth.verificationSent}</span>
              </div>
            )}

            {tab !== 'reset' && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={() => void loginWithGoogle()}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-cyan-500/40 bg-slate-950 py-2.5 px-4 text-xs font-bold text-white hover:border-cyan-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>{t.founder.founderGoogleBtn}</span>
                </button>

                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 border-t border-slate-800" />
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider whitespace-nowrap shrink-0">
                    {t.auth.orContinueWith}
                  </span>
                  <div className="flex-1 border-t border-slate-800" />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'register' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        placeholder="ТОО 'Казахстанский Завод'"
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
                </div>
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
                    placeholder="dakoasylbek2003@gmail.com"
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
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>
                  {tab === 'login' && t.auth.login}
                  {tab === 'register' && t.auth.register}
                  {tab === 'reset' && t.auth.sendResetLink}
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
