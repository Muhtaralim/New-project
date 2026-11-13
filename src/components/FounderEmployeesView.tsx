import React, { useState } from 'react';
import {
  EmployeeRole,
  FactoryEmployee,
  FactoryInspectionData,
  Language,
  UserProfile,
} from '../types';
import { translations } from '../i18n/translations';
import { Users, Search, RefreshCw, Loader2, Lock, Unlock, ShieldAlert } from 'lucide-react';

interface FounderEmployeesViewProps {
  factories: UserProfile[];
  inspectedFactories: Record<string, FactoryInspectionData>;
  isInspectingFactory: boolean;
  language: Language;
  onRefreshAllStaff: () => Promise<void>;
}

export const FounderEmployeesView: React.FC<FounderEmployeesViewProps> = ({
  factories,
  inspectedFactories,
  isInspectingFactory,
  language,
  onRefreshAllStaff,
}) => {
  const t = translations[language];
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeRole>('all');
  const [factoryFilter, setFactoryFilter] = useState('all');

  const aggregated: Array<FactoryEmployee & { factoryName: string }> = [];
  for (const fac of factories) {
    const data = inspectedFactories[fac.userId];
    if (data) {
      for (const emp of data.employees) {
        aggregated.push({ ...emp, factoryName: fac.factoryName });
      }
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = aggregated.filter((emp) => {
    if (roleFilter !== 'all' && emp.role !== roleFilter) return false;
    if (factoryFilter !== 'all' && emp.factoryId !== factoryFilter) return false;
    if (!q) return true;
    return (
      emp.fullName.toLowerCase().includes(q) ||
      emp.specialty.toLowerCase().includes(q) ||
      emp.factoryName.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <span>{t.nav.employees}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 tabular-nums">
              {filtered.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.founder.employeesDirectoryDesc}</p>
        </div>

        <button
          type="button"
          onClick={() => void onRefreshAllStaff()}
          disabled={isInspectingFactory}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-500 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {isInspectingFactory ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span>{t.founder.loadAllStaffBtn}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.founder.searchPlaceholder}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <select
          value={factoryFilter}
          onChange={(e) => setFactoryFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.nav.factories}: Все</option>
          {factories.map((f) => (
            <option key={f.userId} value={f.userId}>
              {f.factoryName}
            </option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | EmployeeRole)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.staff.filterAll}</option>
          <option value="worker">{t.staff.filterWorkers}</option>
          <option value="specialist">{t.staff.filterSpecialists}</option>
        </select>
      </div>

      {/* Staff Directory Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-3">
            <div>{t.common.noData}</div>
            {factories.length > 0 && aggregated.length === 0 && (
              <button
                type="button"
                onClick={() => void onRefreshAllStaff()}
                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white"
              >
                {t.founder.loadAllStaffBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Сотрудник</th>
                  <th className="px-4 py-3">Предприятие / Цех</th>
                  <th className="px-4 py-3">Роль и доступ</th>
                  <th className="px-4 py-3">Корпоративный Email</th>
                  <th className="px-5 py-3 text-right">Нарушения</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((emp) => (
                  <tr key={`${emp.factoryId}-${emp.id}`} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white">{emp.fullName}</div>
                      <div className="text-[11px] text-cyan-300">{emp.specialty}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">{emp.factoryName}</div>
                      <div className="text-[11px] text-slate-500">{emp.department}</div>
                    </td>
                    <td className="px-4 py-3">
                      {emp.role === 'specialist' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                          <Unlock className="h-3 w-3" />
                          <span>{t.staff.roleSpecialist}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-mono text-[11px]">
                          <Lock className="h-3 w-3" />
                          <span>{t.staff.roleWorker}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                      {emp.email}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">
                      <span
                        className={
                          emp.violationsCount > 0
                            ? 'inline-flex items-center gap-1 text-rose-400 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        {emp.violationsCount > 0 && <ShieldAlert className="h-3 w-3" />}
                        {emp.violationsCount}
                      </span>
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
