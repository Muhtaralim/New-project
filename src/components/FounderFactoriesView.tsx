import React, { useEffect, useState } from 'react';
import {
  BillingStatus,
  DeviceErrorLog,
  FactoryAccountStatus,
  FactoryInspectionData,
  FactoryPlan,
  Language,
  UserProfile,
} from '../types';
import { translations } from '../i18n/translations';
import { filterFounderFactories } from '../utils/industrialMath';
import {
  Factory,
  Search,
  Camera,
  Users,
  AlertTriangle,
  Cpu,
  X,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Ban,
  Trash2,
  LifeBuoy,
  QrCode,
  Network,
} from 'lucide-react';

interface FounderFactoriesViewProps {
  factories: UserProfile[];
  errors: DeviceErrorLog[];
  inspectedFactories: Record<string, FactoryInspectionData>;
  isInspectingFactory: boolean;
  initialSelectedFactoryId?: string | null;
  language: Language;
  onInspectFactory: (factoryId: string) => Promise<FactoryInspectionData>;
  onUpdateGovernance: (
    factoryId: string,
    updates: {
      plan?: FactoryPlan;
      accountStatus?: FactoryAccountStatus;
      billingStatus?: BillingStatus;
    }
  ) => Promise<void>;
  onDeleteFactory: (factoryId: string) => Promise<void>;
  onCreateTicketForFactory: (factory: UserProfile) => void;
}

export const FounderFactoriesView: React.FC<FounderFactoriesViewProps> = ({
  factories,
  errors,
  inspectedFactories,
  isInspectingFactory,
  initialSelectedFactoryId = null,
  language,
  onInspectFactory,
  onUpdateGovernance,
  onDeleteFactory,
  onCreateTicketForFactory,
}) => {
  const t = translations[language];
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | FactoryPlan>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FactoryAccountStatus>('all');
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(initialSelectedFactoryId);
  const [inspectorTab, setInspectorTab] = useState<'cameras' | 'devices' | 'employees' | 'errors'>('cameras');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedFactoryId) {
      setSelectedFactoryId(initialSelectedFactoryId);
      void onInspectFactory(initialSelectedFactoryId);
    }
  }, [initialSelectedFactoryId, onInspectFactory]);

  const handleOpenInspector = (factoryId: string) => {
    setSelectedFactoryId(factoryId);
    setInspectorTab('cameras');
    void onInspectFactory(factoryId);
  };

  const filtered = filterFounderFactories(factories, search, planFilter, statusFilter);
  const selectedFactory = factories.find((f) => f.userId === selectedFactoryId) || null;
  const inspected = selectedFactoryId ? inspectedFactories[selectedFactoryId] : undefined;
  const factoryErrors = selectedFactoryId
    ? errors.filter((e) => e.factoryId === selectedFactoryId)
    : [];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Factory className="h-5 w-5 text-cyan-400" />
            <span>{t.nav.factories}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 tabular-nums">
              {filtered.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.founder.founderSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
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
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as 'all' | FactoryPlan)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">{t.founder.filterPlanAll}</option>
            <option value="trial">{t.founder.planTrial}</option>
            <option value="pro">{t.founder.planPro}</option>
            <option value="enterprise">{t.founder.planEnterprise}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | FactoryAccountStatus)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">{t.founder.filterStatusAll}</option>
            <option value="active">{t.founder.statusActive}</option>
            <option value="pending">{t.founder.statusPending}</option>
            <option value="suspended">{t.founder.statusSuspended}</option>
          </select>
        </div>
      </div>

      {/* Factories Registry Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">{t.founder.noFactories}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">{t.founder.colFactory}</th>
                  <th className="px-4 py-3 text-right">{t.founder.colCameras}</th>
                  <th className="px-4 py-3 text-right">Eco / PLC</th>
                  <th className="px-4 py-3 text-right">{t.founder.colEmployees}</th>
                  <th className="px-4 py-3 text-right">{t.founder.colErrors}</th>
                  <th className="px-4 py-3">{t.founder.colPlan}</th>
                  <th className="px-5 py-3 text-right">{t.founder.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((fac) => {
                  const isSelected = selectedFactoryId === fac.userId;
                  const liveData = inspectedFactories[fac.userId];
                  const camCount = liveData ? liveData.cameras.length : fac.camerasCount || 0;
                  const empCount = liveData ? liveData.employees.length : fac.employeesCount || 0;
                  const senMachCount = liveData
                    ? liveData.sensors.length + liveData.machines.length
                    : (fac.sensorsCount || 0) + (fac.machinesCount || 0);
                  const openErrs = errors.filter(
                    (e) => e.factoryId === fac.userId && e.status !== 'resolved'
                  ).length;

                  return (
                    <tr
                      key={fac.userId}
                      className={`transition-colors ${
                        isSelected ? 'bg-cyan-950/20' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{fac.factoryName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {fac.region} · {fac.email}
                        </div>
                        {fac.contactPerson && (
                          <div className="text-[11px] text-slate-500">
                            {fac.contactPerson} {fac.contactPhone ? `· ${fac.contactPhone}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-white tabular-nums">
                        {camCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-300 tabular-nums">
                        {senMachCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-white tabular-nums">
                        {empCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono tabular-nums">
                        <span
                          className={
                            openErrs > 0 || (fac.errorsCount || 0) > 0
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-500'
                          }
                        >
                          {openErrs || fac.errorsCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[11px] uppercase text-cyan-300 font-semibold">
                            {fac.plan || 'trial'}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              fac.accountStatus === 'suspended'
                                ? 'text-rose-400'
                                : fac.accountStatus === 'pending'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {fac.accountStatus === 'suspended'
                              ? t.founder.statusSuspended
                              : fac.accountStatus === 'pending'
                                ? t.founder.statusPending
                                : t.founder.statusActive}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenInspector(fac.userId)}
                            className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-900/60 whitespace-nowrap"
                          >
                            {t.founder.inspectBtn}
                          </button>

                          {fac.accountStatus === 'suspended' ? (
                            <button
                              type="button"
                              onClick={() =>
                                void onUpdateGovernance(fac.userId, { accountStatus: 'active' })
                              }
                              title={t.founder.activateBtn}
                              className="p-1.5 rounded-lg border border-emerald-800 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                void onUpdateGovernance(fac.userId, { accountStatus: 'suspended' })
                              }
                              title={t.founder.suspendBtn}
                              className="p-1.5 rounded-lg border border-amber-800/70 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {confirmDeleteId === fac.userId ? (
                            <button
                              type="button"
                              onClick={() => {
                                void onDeleteFactory(fac.userId);
                                setConfirmDeleteId(null);
                                if (selectedFactoryId === fac.userId) setSelectedFactoryId(null);
                              }}
                              className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-500 whitespace-nowrap"
                            >
                              {t.common.confirm}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(fac.userId)}
                              title={t.founder.deleteFactoryBtn}
                              className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-rose-400 hover:border-rose-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Factory Drill-Down Inspector Panel */}
      {selectedFactory && (
        <div className="rounded-xl border border-cyan-500/40 bg-slate-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                {t.founder.inspectorTitle} · UID: {selectedFactory.userId}
              </div>
              <h3 className="text-lg font-bold text-white truncate mt-0.5">
                {selectedFactory.factoryName}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {selectedFactory.region} · {selectedFactory.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={selectedFactory.plan || 'trial'}
                onChange={(e) =>
                  void onUpdateGovernance(selectedFactory.userId, {
                    plan: e.target.value as FactoryPlan,
                  })
                }
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="trial">{t.founder.planTrial}</option>
                <option value="pro">{t.founder.planPro}</option>
                <option value="enterprise">{t.founder.planEnterprise}</option>
              </select>

              <button
                type="button"
                onClick={() => onCreateTicketForFactory(selectedFactory)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-700/70 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-900/60 whitespace-nowrap"
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>{t.founder.newTicketBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFactoryId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Inspector Sub-Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-4 overflow-x-auto no-scrollbar text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInspectorTab('cameras')}
              className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                inspectorTab === 'cameras'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>
                {t.founder.inspectorCameras} ({inspected?.cameras.length ?? 0})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInspectorTab('devices')}
              className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                inspectorTab === 'devices'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>
                {t.founder.inspectorSensorsMach} (
                {(inspected?.sensors.length ?? 0) + (inspected?.machines.length ?? 0)})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInspectorTab('employees')}
              className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                inspectorTab === 'employees'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>
                {t.founder.inspectorEmployees} ({inspected?.employees.length ?? 0})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setInspectorTab('errors')}
              className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                inspectorTab === 'errors'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {t.founder.inspectorErrors} ({factoryErrors.length})
              </span>
            </button>
          </div>

          {/* Inspector Body */}
          <div className="p-5">
            {isInspectingFactory && !inspected ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span>{t.founder.inspectorLoading}</span>
              </div>
            ) : (
              <>
                {inspectorTab === 'cameras' && (
                  <div className="space-y-3">
                    {!inspected || inspected.cameras.length === 0 ? (
                      <div className="text-xs text-slate-400 py-4">{t.common.noData}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                            <tr>
                              <th className="py-2 pr-4">Камера</th>
                              <th className="py-2 pr-4">Участок</th>
                              <th className="py-2 pr-4">IP / Метод</th>
                              <th className="py-2 pr-4 text-right">FPS</th>
                              <th className="py-2 text-right">Статус</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {inspected.cameras.map((cam) => (
                              <tr key={cam.id}>
                                <td className="py-2.5 pr-4 font-semibold text-white">
                                  {cam.name}
                                  <div className="text-[11px] font-mono text-slate-500">
                                    {cam.resolution}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300">{cam.area}</td>
                                <td className="py-2.5 pr-4 font-mono text-[11px] text-cyan-300">
                                  <span className="inline-flex items-center gap-1">
                                    {cam.connectionMethod === 'qr' ? (
                                      <QrCode className="h-3 w-3 text-emerald-400" />
                                    ) : (
                                      <Network className="h-3 w-3 text-cyan-400" />
                                    )}
                                    <span>{cam.ipAddress || cam.streamUrl || 'RTSP Local'}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-300">
                                  {cam.fps}
                                </td>
                                <td className="py-2.5 text-right">
                                  <span
                                    className={`font-mono text-[11px] uppercase ${
                                      cam.status === 'active'
                                        ? 'text-emerald-400'
                                        : cam.status === 'offline'
                                          ? 'text-rose-400'
                                          : 'text-amber-400'
                                    }`}
                                  >
                                    {cam.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {inspectorTab === 'devices' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-white">
                        EcoSensors ({inspected?.sensors.length ?? 0})
                      </div>
                      {!inspected || inspected.sensors.length === 0 ? (
                        <div className="text-xs text-slate-500">{t.common.noData}</div>
                      ) : (
                        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/60">
                          {inspected.sensors.map((s) => (
                            <div key={s.id} className="px-3 py-2 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-semibold text-white">{s.name}</div>
                                <div className="text-[11px] text-slate-400">
                                  {s.area} · {s.ipAddress || 'Modbus'}
                                </div>
                              </div>
                              <div className="font-mono text-right tabular-nums">
                                <div className="text-cyan-300 font-semibold">
                                  {s.currentValue} {s.unit}
                                </div>
                                <div className="text-[10px] text-slate-500">{s.status}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-bold text-white">
                        Machines / PLC ({inspected?.machines.length ?? 0})
                      </div>
                      {!inspected || inspected.machines.length === 0 ? (
                        <div className="text-xs text-slate-500">{t.common.noData}</div>
                      ) : (
                        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/60">
                          {inspected.machines.map((m) => (
                            <div key={m.id} className="px-3 py-2 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-semibold text-white">{m.name}</div>
                                <div className="text-[11px] text-slate-400">
                                  {m.type} · {m.ipAddress || 'OPC-UA'}
                                </div>
                              </div>
                              <div className="font-mono text-right tabular-nums">
                                <div className="text-amber-300 font-semibold">
                                  {m.vibrationRmsMmS} мм/с
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  RUL {m.remainingUsefulLifeHours}ч
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {inspectorTab === 'employees' && (
                  <div>
                    {!inspected || inspected.employees.length === 0 ? (
                      <div className="text-xs text-slate-400 py-4">{t.common.noData}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                            <tr>
                              <th className="py-2 pr-4">ФИО</th>
                              <th className="py-2 pr-4">Специальность / Цех</th>
                              <th className="py-2 pr-4">Роль / Доступ</th>
                              <th className="py-2 pr-4">Логин (Email)</th>
                              <th className="py-2 text-right">Нарушений</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {inspected.employees.map((emp) => (
                              <tr key={emp.id}>
                                <td className="py-2.5 pr-4 font-semibold text-white">
                                  {emp.fullName}
                                </td>
                                <td className="py-2.5 pr-4 text-slate-300">
                                  {emp.specialty} · <span className="text-slate-500">{emp.department}</span>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span
                                    className={`font-mono text-[11px] ${
                                      emp.role === 'specialist'
                                        ? 'text-emerald-400'
                                        : 'text-amber-300'
                                    }`}
                                  >
                                    {emp.role === 'specialist'
                                      ? t.staff.roleSpecialist
                                      : t.staff.roleWorker}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-300">
                                  {emp.email}
                                </td>
                                <td className="py-2.5 text-right font-mono tabular-nums">
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
                )}

                {inspectorTab === 'errors' && (
                  <div>
                    {factoryErrors.length === 0 ? (
                      <div className="text-xs text-slate-400 py-4">{t.founder.noErrorsFound}</div>
                    ) : (
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/60">
                        {factoryErrors.map((err) => (
                          <div key={err.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span className="font-mono text-[10px] text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
                                  {err.errorCode}
                                </span>
                                <span>{err.deviceName}</span>
                              </div>
                              <div className="text-slate-400 mt-1">{err.message}</div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-400 shrink-0">
                              {err.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
