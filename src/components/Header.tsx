import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { BrandLogo } from './BrandLogo';
import {
  Bot,
  Building2,
  LogIn,
  Bell,
  CheckCircle2,
  Menu,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  sectionTitle: string;
  language: Language;
  setLanguage: (lang: Language) => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenNotifications: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  onOpenMobileMenu?: () => void;
  showBrandOnDesktop?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  sectionTitle,
  language,
  setLanguage,
  onOpenAuth,
  onOpenProfile,
  onOpenNotifications,
  onToggleChat,
  isChatOpen,
  onOpenMobileMenu,
  showBrandOnDesktop = false,
}) => {
  const { currentUser, profile, unreadCount, isFounder } = useAuth();
  const t = translations[language];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        {/* Left Zone: Mobile Menu + Brand / Section Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white shrink-0"
              aria-label="Открыть меню"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <div className={showBrandOnDesktop ? 'block' : 'lg:hidden'}>
            <BrandLogo size="sm" />
          </div>

          <div className="hidden sm:flex items-center gap-2 min-w-0">
            {isFounder && (
              <span className="hidden lg:inline-flex items-center gap-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-cyan-300 whitespace-nowrap shrink-0">
                <ShieldCheck className="h-3 w-3" />
                <span>{t.founder.consoleBadge}</span>
              </span>
            )}
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {sectionTitle}
            </h1>
          </div>
        </div>

        {/* Right Zone: Language, Notifications, AI Chat, Account Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center rounded-md border border-slate-800 bg-slate-900/90 p-0.5 text-[11px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => setLanguage('ru')}
              className={`px-1.5 sm:px-2 py-1 rounded transition-colors ${
                language === 'ru'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-label="Переключить на русский язык"
            >
              RU
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setLanguage('kz')}
              className={`px-1.5 sm:px-2 py-1 rounded transition-colors ${
                language === 'kz'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-label="Қазақ тіліне ауыстыру"
            >
              KZ
            </button>
          </div>

          {!isFounder && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative flex items-center justify-center p-1.5 sm:p-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500/50 hover:text-white transition-colors shrink-0"
              title={t.notifications.title}
              aria-label={t.notifications.title}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center border border-slate-950 tabular-nums">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleChat}
            className={`flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
              isChatOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold shadow-sm'
                : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/50 hover:text-white'
            }`}
            aria-label="Открыть индустриальный ИИ-ассистент"
          >
            <Bot className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">{t.nav.assistant}</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-200 hover:border-cyan-500/50 hover:text-white transition-colors whitespace-nowrap shrink-0"
              title={profile?.factoryName || t.nav.profile}
            >
              <Building2 className="h-4 w-4 text-cyan-400 shrink-0" />
              <span className="max-w-[90px] sm:max-w-[150px] truncate font-medium">
                {isFounder ? (currentUser.email || 'Основатель') : (profile?.factoryName || t.nav.profile)}
              </span>
              {profile?.emailVerified && (
                <span title={t.auth.verified} className="inline-flex items-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 text-[11px] sm:text-xs font-semibold transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>{t.auth.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
