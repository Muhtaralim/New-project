import React from 'react';
import { FounderTab, Language } from '../types';
import { translations } from '../i18n/translations';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  Factory,
  AlertTriangle,
  Users,
  LifeBuoy,
  CreditCard,
  ShieldCheck,
  Settings,
  LogOut,
  X,
} from 'lucide-react';

interface FounderSidebarProps {
  activeTab: FounderTab;
  setActiveTab: (tab: FounderTab) => void;
  language: Language;
  factoriesCount: number;
  openErrorsCount: number;
  openTicketsCount: number;
  employeesCount: number;
  founderEmail: string;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const FounderSidebar: React.FC<FounderSidebarProps> = ({
  activeTab,
  setActiveTab,
  language,
  factoriesCount,
  openErrorsCount,
  openTicketsCount,
  employeesCount,
  founderEmail,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const t = translations[language];

  const menuGroups: {
    groupLabel: string;
    items: {
      id: FounderTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
      badgeTone?: 'rose' | 'amber' | 'slate';
    }[];
  }[] = [
    {
      groupLabel: language === 'kz' ? 'Операциялық бақылау' : 'Операционный центр',
      items: [
        {
          id: 'dashboard',
          label: t.nav.founderDashboard,
          icon: LayoutDashboard,
        },
        {
          id: 'factories',
          label: t.nav.factories,
          icon: Factory,
          badge: factoriesCount,
          badgeTone: 'slate',
        },
        {
          id: 'errors',
          label: t.nav.errors,
          icon: AlertTriangle,
          badge: openErrorsCount,
          badgeTone: openErrorsCount > 0 ? 'rose' : 'slate',
        },
        {
          id: 'employees',
          label: t.nav.employees,
          icon: Users,
          badge: employeesCount,
          badgeTone: 'slate',
        },
      ],
    },
    {
      groupLabel: language === 'kz' ? 'Қолдау және басқару' : 'Поддержка и управление',
      items: [
        {
          id: 'support',
          label: t.nav.support,
          icon: LifeBuoy,
          badge: openTicketsCount,
          badgeTone: openTicketsCount > 0 ? 'amber' : 'slate',
        },
        {
          id: 'billing',
          label: t.nav.billing,
          icon: CreditCard,
        },
        {
          id: 'audit',
          label: t.nav.audit,
          icon: ShieldCheck,
        },
        {
          id: 'settings',
          label: t.nav.settings,
          icon: Settings,
        },
      ],
    },
  ];

  const renderBadgeClass = (tone: 'rose' | 'amber' | 'slate' | undefined) => {
    if (tone === 'rose') return 'bg-rose-600/90 text-white';
    if (tone === 'amber') return 'bg-amber-600/90 text-white';
    return 'bg-slate-800 text-slate-300';
  };

  const sidebarBody = (
    <div className="flex h-full flex-col bg-slate-950 border-r border-slate-800 w-64">
      {/* Brand Lockup */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <BrandLogo size="md" subtitle={t.founder.consoleBadge} />
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label={t.common.close}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.groupLabel} className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              {group.groupLabel}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums shrink-0 ${renderBadgeClass(
                        item.badgeTone
                      )}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Founder Identity Footer */}
      <div className="border-t border-slate-800 p-3 space-y-2.5 shrink-0">
        <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            {t.founder.consoleBadge}
          </div>
          <div className="text-xs font-mono text-slate-200 truncate mt-0.5">{founderEmail}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-900/70 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/50 hover:text-white transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span>{t.auth.logoutAccount}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block shrink-0">{sidebarBody}</aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
};
