import React, { useState } from 'react';
import {
  DeviceErrorLog,
  FounderTab,
  Language,
  SupportTicket,
  UserProfile,
} from '../types';
import { translations } from '../i18n/translations';
import { aggregateFounderMetrics } from '../utils/industrialMath';
import {
  Factory,
  Camera,
  AlertTriangle,
  Users,
  LifeBuoy,
  ArrowRight,
  Database,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface FounderDashboardViewProps {
  factories: UserProfile[];
  errors: DeviceErrorLog[];
  tickets: SupportTicket[];
  language: Language;
  onNavigate: (tab: FounderTab) => void;
  onInspectFactory: (factoryId: string) => void;
  onOpenTicket: (ticketId: string) => void;
  onSeedPlatform: () => Promise<void>;
  onRefreshTelemetry: () => Promise<void>;
}

export const FounderDashboardView: React.FC<FounderDashboardViewProps> = ({
  factories,
  errors,
  tickets,
  language,
  onNavigate,
  onInspectFactory,
  onOpenTicket,
  onSeedPlatform,
  onRefreshTelemetry,
}) => {
  const t = translations[language];
  const metrics = aggregateFounderMetrics(factories, errors, tickets);
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedPlatform();
    } finally {
      setSeeding(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshTelemetry();
    } finally {
      setRefreshing(false);
    }
  };

  const attentionFactories = factories.filter(
    (f) =>
      (f.errorsCount || 0) > 0 ||
      f.accountStatus === 'suspended' ||
      f.accountStatus === 'pending' ||
      f.billingStatus === 'overdue'
  );

  const recentOpenErrors = errors.filter((e) => e.status !== 'resolved').slice(0, 5);
  const recentOpenTickets = tickets
    .filter((tk) => tk.status === 'open' || tk.status === 'in_progress')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {t.founder.founderTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {t.founder.founderSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {factories.length > 0 && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              {refreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>{t.founder.loadAllStaffBtn}</span>
            </button>
          )}

          {factories.length <= 1 && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              {seeding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              <span>{seeding ? t.founder.seedingPlatform : t.founder.seedPlatformBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Platform KPI Strip (Flat Single-Elevation Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('factories')}
          className="text-left rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.founder.kpiFactories}</span>
            <Factory className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {metrics.totalFactories}
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 font-mono tabular-nums">
            {metrics.activeFactories} {t.founder.kpiActiveSuffix}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('errors')}
          className="text-left rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.founder.kpiCameras}</span>
            <Camera className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {metrics.totalCameras}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono tabular-nums">
            {metrics.totalSensors} eco · {metrics.totalMachines} plc
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('errors')}
          className="text-left rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-rose-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.founder.kpiErrors}</span>
            <AlertTriangle
              className={`h-4 w-4 ${metrics.openErrors > 0 ? 'text-rose-400' : 'text-slate-500'}`}
            />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {metrics.openErrors}
          </div>
          <div
            className={`mt-1 text-[11px] font-mono tabular-nums ${
              metrics.criticalErrors > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {metrics.criticalErrors} {t.founder.kpiCriticalSuffix}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('employees')}
          className="text-left rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-cyan-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.founder.kpiEmployees}</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {metrics.totalEmployees}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {t.founder.kpiEmployeesSub}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('support')}
          className="text-left rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t.founder.kpiTickets}</span>
            <LifeBuoy
              className={`h-4 w-4 ${metrics.openTickets > 0 ? 'text-amber-400' : 'text-slate-500'}`}
            />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
            {metrics.openTickets}
          </div>
          <div
            className={`mt-1 text-[11px] font-mono tabular-nums ${
              metrics.urgentTickets > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {metrics.urgentTickets} {t.founder.kpiUrgentSuffix}
          </div>
        </button>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Camera / Device Errors */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>{t.founder.recentErrors}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('errors')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
            >
              <span>{t.founder.viewAll}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentOpenErrors.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {t.founder.noErrorsFound}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentOpenErrors.map((err) => (
                <div
                  key={err.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          err.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {err.errorCode}
                      </span>
                      <span className="font-semibold text-white truncate">{err.deviceName}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300 truncate">{err.factoryName}</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{err.message}</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                    {err.ipAddress || err.module}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Support Tickets */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-amber-400" />
              <span>{t.founder.recentTickets}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('support')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
            >
              <span>{t.founder.viewAll}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentOpenTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {t.common.noData}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {recentOpenTickets.map((tk) => (
                <button
                  key={tk.id}
                  type="button"
                  onClick={() => onOpenTicket(tk.id)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-800/40 transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {tk.subject}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        tk.priority === 'urgent'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : tk.priority === 'high'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tk.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{tk.factoryName}</span>
                    <span className="font-mono tabular-nums shrink-0">
                      {tk.repliesCount} msg
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Factories Needing Attention / Quick Registry Preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Factory className="h-4 w-4 text-cyan-400" />
            <span>
              {attentionFactories.length > 0
                ? t.founder.attentionFactories
                : t.nav.factories}
            </span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('factories')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 whitespace-nowrap"
          >
            <span>{t.founder.viewAll}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {(attentionFactories.length > 0 ? attentionFactories : factories).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {t.founder.noFactories}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">{t.founder.colFactory}</th>
                  <th className="px-4 py-3 text-right">{t.founder.colCameras}</th>
                  <th className="px-4 py-3 text-right">{t.founder.colEmployees}</th>
                  <th className="px-4 py-3 text-right">{t.founder.colErrors}</th>
                  <th className="px-4 py-3">{t.founder.colPlan}</th>
                  <th className="px-5 py-3 text-right">{t.founder.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(attentionFactories.length > 0 ? attentionFactories : factories)
                  .slice(0, 6)
                  .map((fac) => (
                    <tr key={fac.userId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-white">{fac.factoryName}</div>
                        <div className="text-[11px] text-slate-400">
                          {fac.region} · {fac.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white tabular-nums">
                        {fac.camerasCount || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white tabular-nums">
                        {fac.employeesCount || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            (fac.errorsCount || 0) > 0
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          {fac.errorsCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] uppercase text-cyan-300">
                          {fac.plan || 'trial'}
                        </span>
                        <span className="text-slate-600 mx-1.5">·</span>
                        <span
                          className={`text-[11px] font-medium ${
                            fac.accountStatus === 'suspended'
                              ? 'text-rose-400'
                              : fac.accountStatus === 'pending'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }`}
                        >
                          {fac.accountStatus || 'active'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectFactory(fac.userId)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:border-cyan-500 transition-colors whitespace-nowrap"
                        >
                          {t.founder.inspectBtn}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
