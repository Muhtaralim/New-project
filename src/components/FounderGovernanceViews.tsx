import React, { useState } from 'react';
import {
  AdminUser,
  BillingStatus,
  FactoryPlan,
  FounderAuditLog,
  Language,
  PlatformSettings,
  UserProfile,
} from '../types';
import { translations } from '../i18n/translations';
import { PRIMARY_FOUNDER_EMAIL } from '../utils/industrialMath';
import {
  CreditCard,
  ShieldCheck,
  Settings,
  Trash2,
  UserPlus,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface FounderBillingViewProps {
  factories: UserProfile[];
  language: Language;
  onUpdateGovernance: (
    factoryId: string,
    updates: { plan?: FactoryPlan; billingStatus?: BillingStatus }
  ) => Promise<void>;
}

export const FounderBillingView: React.FC<FounderBillingViewProps> = ({
  factories,
  language,
  onUpdateGovernance,
}) => {
  const t = translations[language];

  const planCards = [
    {
      id: 'trial' as FactoryPlan,
      name: t.founder.planTrial,
      price: '0 ₸ / 14д',
      quota: 'До 8 камер · До 30 сотрудников',
    },
    {
      id: 'pro' as FactoryPlan,
      name: t.founder.planPro,
      price: '290 000 ₸ / мес',
      quota: 'До 40 камер · До 250 сотрудников · EcoPredict',
    },
    {
      id: 'enterprise' as FactoryPlan,
      name: t.founder.planEnterprise,
      price: 'Индивидуально',
      quota: 'Безлимит камер · Выделенный AI-сервер · SLA 99.9%',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-cyan-400" />
          <span>{t.founder.billingTitle}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">{t.founder.billingSubtitle}</p>
      </div>

      {/* Plan Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planCards.map((card) => {
          const count = factories.filter((f) => (f.plan || 'trial') === card.id).length;
          return (
            <div
              key={card.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{card.name}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-cyan-300 tabular-nums">
                  {count}
                </span>
              </div>
              <div className="text-lg font-bold font-mono text-cyan-400">{card.price}</div>
              <div className="text-xs text-slate-400">{card.quota}</div>
            </div>
          );
        })}
      </div>

      {/* Factory Subscriptions Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">{t.founder.colFactory}</th>
                <th className="px-4 py-3 text-right">Камеры / Штат</th>
                <th className="px-4 py-3">Тарифный план</th>
                <th className="px-5 py-3">Статус оплаты</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {factories.map((fac) => (
                <tr key={fac.userId} className="hover:bg-slate-800/30">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-white">{fac.factoryName}</div>
                    <div className="text-[11px] text-slate-400">{fac.email}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">
                    {fac.camerasCount || 0} cam · {fac.employeesCount || 0} emp
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={fac.plan || 'trial'}
                      onChange={(e) =>
                        void onUpdateGovernance(fac.userId, {
                          plan: e.target.value as FactoryPlan,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="trial">{t.founder.planTrial}</option>
                      <option value="pro">{t.founder.planPro}</option>
                      <option value="enterprise">{t.founder.planEnterprise}</option>
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <select
                      value={fac.billingStatus || 'pending'}
                      onChange={(e) =>
                        void onUpdateGovernance(fac.userId, {
                          billingStatus: e.target.value as BillingStatus,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="paid">{t.founder.billingPaid}</option>
                      <option value="pending">{t.founder.billingPending}</option>
                      <option value="overdue">{t.founder.billingOverdue}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface FounderAuditViewProps {
  auditLogs: FounderAuditLog[];
  admins: AdminUser[];
  currentUserUid?: string;
  language: Language;
  onAddAdmin: (uid: string, email: string, displayName?: string) => Promise<void>;
  onRemoveAdmin: (uid: string) => Promise<void>;
}

export const FounderAuditView: React.FC<FounderAuditViewProps> = ({
  auditLogs,
  admins,
  currentUserUid,
  language,
  onAddAdmin,
  onRemoveAdmin,
}) => {
  const t = translations[language];
  const [uid, setUid] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid.trim() || !email.trim()) return;
    await onAddAdmin(uid, email, displayName);
    setUid('');
    setEmail('');
    setDisplayName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <span>{t.founder.auditTitle}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">{t.founder.auditSubtitle}</p>
      </div>

      {/* Admins Management */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-cyan-400" />
          <span>{t.founder.addAdminTitle}</span>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            required
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Firebase Auth UID"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@neurofactory.kz"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
          />
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Имя (опционально)"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 font-bold text-white whitespace-nowrap"
          >
            {t.founder.addAdminBtn}
          </button>
        </form>

        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/60">
          <div className="px-4 py-2.5 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-cyan-300">{PRIMARY_FOUNDER_EMAIL}</span>
              <span className="ml-2 text-[11px] font-mono text-slate-400">Primary Founder</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400">Protected</span>
          </div>
          {admins
            .filter((a) => a.email.toLowerCase() !== PRIMARY_FOUNDER_EMAIL)
            .map((adm) => (
              <div
                key={adm.uid}
                className="px-4 py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{adm.email}</span>
                  <span className="ml-2 font-mono text-[11px] text-slate-500">{adm.uid}</span>
                </div>
                {adm.uid !== currentUserUid && (
                  <button
                    type="button"
                    onClick={() => void onRemoveAdmin(adm.uid)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">{t.common.noData}</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {auditLogs.slice(0, 40).map((log) => (
              <div
                key={log.id}
                className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{log.action}</span>
                    <span className="text-cyan-300 font-medium">{log.targetName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {log.actorEmail} · {log.details}
                  </div>
                </div>
                <div className="font-mono text-[11px] text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface FounderSettingsViewProps {
  settings: PlatformSettings;
  language: Language;
  onSaveSettings: (next: Partial<PlatformSettings>) => Promise<void>;
}

export const FounderSettingsView: React.FC<FounderSettingsViewProps> = ({
  settings,
  language,
  onSaveSettings,
}) => {
  const t = translations[language];
  const [platformName, setPlatformName] = useState(settings.platformName);
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);
  const [trialCameraLimit, setTrialCameraLimit] = useState(settings.trialCameraLimit);
  const [trialEmployeeLimit, setTrialEmployeeLimit] = useState(settings.trialEmployeeLimit);
  const [aiModelVersion, setAiModelVersion] = useState(settings.aiModelVersion);
  const [autoErrorAlerts, setAutoErrorAlerts] = useState(settings.autoErrorAlerts);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedOk(false);
    try {
      await onSaveSettings({
        platformName,
        supportEmail,
        maintenanceMode,
        trialCameraLimit: Number(trialCameraLimit),
        trialEmployeeLimit: Number(trialEmployeeLimit),
        aiModelVersion,
        autoErrorAlerts,
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-cyan-400" />
          <span>{t.founder.settingsTitle}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">{t.founder.settingsSubtitle}</p>
      </div>

      {savedOk && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{t.founder.settingsSaved}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Название платформы</label>
            <input
              type="text"
              required
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">Email техподдержки</label>
            <input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Лимит камер на тарифе Trial
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={trialCameraLimit}
              onChange={(e) => setTrialCameraLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Лимит сотрудников на тарифе Trial
            </label>
            <input
              type="number"
              min={1}
              max={5000}
              value={trialEmployeeLimit}
              onChange={(e) => setTrialEmployeeLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-medium mb-1">Версия AI-ядра</label>
            <input
              type="text"
              value={aiModelVersion}
              onChange={(e) => setAiModelVersion(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-slate-200 font-medium">{t.founder.maintenanceLabel}</span>
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-slate-200 font-medium">{t.founder.autoAlertsLabel}</span>
            <input
              type="checkbox"
              checked={autoErrorAlerts}
              onChange={(e) => setAutoErrorAlerts(e.target.checked)}
              className="h-4 w-4 accent-cyan-500"
            />
          </label>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{t.founder.saveSettingsBtn}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
