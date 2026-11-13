import React, { useState } from 'react';
import {
  DeviceErrorLog,
  DeviceErrorModule,
  DeviceErrorSeverity,
  DeviceErrorStatus,
  FactoryInspectionData,
  IndustrialCamera,
  Language,
  UserProfile,
} from '../types';
import { translations } from '../i18n/translations';
import { filterDeviceErrors } from '../utils/industrialMath';
import { LogDeviceErrorInput } from '../context/AuthContext';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  LifeBuoy,
  Network,
  Plus,
  QrCode,
  Search,
  Wrench,
} from 'lucide-react';

interface FounderErrorsViewProps {
  factories: UserProfile[];
  errors: DeviceErrorLog[];
  inspectedFactories: Record<string, FactoryInspectionData>;
  language: Language;
  onUpdateErrorStatus: (
    errorId: string,
    status: DeviceErrorStatus,
    resolutionNote?: string
  ) => Promise<void>;
  onEscalateToTicket: (err: DeviceErrorLog) => Promise<void>;
  onLogDeviceError: (input: LogDeviceErrorInput) => Promise<DeviceErrorLog>;
}

export const FounderErrorsView: React.FC<FounderErrorsViewProps> = ({
  factories,
  errors,
  inspectedFactories,
  language,
  onUpdateErrorStatus,
  onEscalateToTicket,
  onLogDeviceError,
}) => {
  const t = translations[language];
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | DeviceErrorSeverity>('all');
  const [moduleFilter, setModuleFilter] = useState<'all' | DeviceErrorModule>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DeviceErrorStatus>('all');
  const [showLogForm, setShowLogForm] = useState(false);

  const [newErrFactoryId, setNewErrFactoryId] = useState(factories[0]?.userId || '');
  const [newErrDeviceName, setNewErrDeviceName] = useState('CAM-01 Литейный цех');
  const [newErrIp, setNewErrIp] = useState('192.168.10.45:554');
  const [newErrModule, setNewErrModule] = useState<DeviceErrorModule>('SafeVision');
  const [newErrCode, setNewErrCode] = useState('RTSP_TIMEOUT');
  const [newErrMessage, setNewErrMessage] = useState(
    'Сбой декодирования видеопотока H.264 на Edge-узле'
  );
  const [newErrSeverity, setNewErrSeverity] = useState<DeviceErrorSeverity>('critical');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('Перезапущен RTSP-коннектор и обновлен буфер.');

  const filteredErrors = filterDeviceErrors(
    errors,
    search,
    severityFilter,
    moduleFilter,
    statusFilter
  );

  // Aggregate inspected cameras across all loaded factories
  const allCameras: Array<IndustrialCamera & { factoryName: string }> = [];
  for (const fac of factories) {
    const data = inspectedFactories[fac.userId];
    if (data) {
      for (const cam of data.cameras) {
        allCameras.push({ ...cam, factoryName: fac.factoryName });
      }
    }
  }

  const handleCreateError = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFac = factories.find((f) => f.userId === newErrFactoryId) || factories[0];
    await onLogDeviceError({
      factoryId: targetFac?.userId || 'platform-node',
      factoryName: targetFac?.factoryName || 'Платформа NeuroFactory',
      deviceId: `dev-${Date.now().toString(36)}`,
      deviceName: newErrDeviceName,
      deviceType: newErrModule === 'SafeVision' ? 'camera' : 'sensor',
      ipAddress: newErrIp,
      module: newErrModule,
      errorCode: newErrCode,
      message: newErrMessage,
      severity: newErrSeverity,
    });
    setShowLogForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <span>{t.nav.errors}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 tabular-nums">
              {filteredErrors.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {t.founder.connectedCamerasInventory}: {allCameras.length} · RTSP / YOLOv11 / Modbus / OPC-UA
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLogForm((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.founder.logErrorBtn}</span>
        </button>
      </div>

      {/* Inline Log Error Form */}
      {showLogForm && (
        <form
          onSubmit={handleCreateError}
          className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.ticketFactory}
              </label>
              <select
                value={newErrFactoryId}
                onChange={(e) => setNewErrFactoryId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                {factories.map((f) => (
                  <option key={f.userId} value={f.userId}>
                    {f.factoryName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Устройство / Камера</label>
              <input
                type="text"
                required
                value={newErrDeviceName}
                onChange={(e) => setNewErrDeviceName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">IP адрес</label>
              <input
                type="text"
                value={newErrIp}
                onChange={(e) => setNewErrIp(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.errorModuleLabel}
              </label>
              <select
                value={newErrModule}
                onChange={(e) => setNewErrModule(e.target.value as DeviceErrorModule)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="SafeVision">SafeVision</option>
                <option value="EcoPredict">EcoPredict</option>
                <option value="FailPredict">FailPredict</option>
                <option value="System">System</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.errorSeverityLabel}
              </label>
              <select
                value={newErrSeverity}
                onChange={(e) => setNewErrSeverity(e.target.value as DeviceErrorSeverity)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Код ошибки</label>
              <input
                type="text"
                required
                value={newErrCode}
                onChange={(e) => setNewErrCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Сообщение</label>
              <input
                type="text"
                required
                value={newErrMessage}
                onChange={(e) => setNewErrMessage(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 text-xs font-bold text-white"
            >
              {t.common.confirm}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
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
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as 'all' | DeviceErrorSeverity)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.founder.errorSeverityLabel}: Все</option>
          <option value="critical">critical</option>
          <option value="warning">warning</option>
          <option value="info">info</option>
        </select>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value as 'all' | DeviceErrorModule)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.founder.errorModuleLabel}: Все</option>
          <option value="SafeVision">SafeVision</option>
          <option value="EcoPredict">EcoPredict</option>
          <option value="FailPredict">FailPredict</option>
          <option value="System">System</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | DeviceErrorStatus)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.founder.filterStatusAll}</option>
          <option value="open">{t.founder.errorStatusOpen}</option>
          <option value="investigating">{t.founder.errorStatusInvestigating}</option>
          <option value="resolved">{t.founder.errorStatusResolved}</option>
        </select>
      </div>

      {/* Errors Ledger */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">{t.founder.noErrorsFound}</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredErrors.map((err) => (
              <div key={err.id} className="p-4 sm:px-5 space-y-2.5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          err.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : err.severity === 'warning'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {err.errorCode}
                      </span>
                      <span className="font-bold text-white">{err.deviceName}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-cyan-300 font-medium">{err.factoryName}</span>
                      {err.ipAddress && (
                        <span className="font-mono text-[11px] text-slate-400">
                          ({err.ipAddress})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{err.message}</p>
                    {err.resolutionNote && (
                      <p className="text-[11px] text-emerald-400">
                        Резолюция: {err.resolutionNote}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                        err.status === 'resolved'
                          ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
                          : err.status === 'investigating'
                            ? 'border-amber-800 bg-amber-950/60 text-amber-300'
                            : 'border-rose-800 bg-rose-950/60 text-rose-300'
                      }`}
                    >
                      {err.status === 'resolved'
                        ? t.founder.errorStatusResolved
                        : err.status === 'investigating'
                          ? t.founder.errorStatusInvestigating
                          : t.founder.errorStatusOpen}
                    </span>

                    {err.status === 'open' && (
                      <button
                        type="button"
                        onClick={() => void onUpdateErrorStatus(err.id, 'investigating')}
                        className="flex items-center gap-1 rounded-lg border border-amber-700/70 bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-900/60 whitespace-nowrap"
                      >
                        <Wrench className="h-3 w-3" />
                        <span>{t.founder.markInvestigating}</span>
                      </button>
                    )}

                    {err.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => setResolvingId(resolvingId === err.id ? null : err.id)}
                        className="flex items-center gap-1 rounded-lg border border-emerald-700/70 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-900/60 whitespace-nowrap"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{t.founder.markResolved}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void onEscalateToTicket(err)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:border-cyan-500 whitespace-nowrap"
                    >
                      <LifeBuoy className="h-3 w-3" />
                      <span>{t.founder.escalateToTicket}</span>
                    </button>
                  </div>
                </div>

                {resolvingId === err.id && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/80">
                    <input
                      type="text"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void onUpdateErrorStatus(err.id, 'resolved', resolutionNote);
                        setResolvingId(null);
                      }}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white whitespace-nowrap"
                    >
                      {t.common.confirm}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connected Cameras Inventory */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Camera className="h-4 w-4 text-cyan-400" />
            <span>{t.founder.connectedCamerasInventory}</span>
          </h3>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            {allCameras.length}
          </span>
        </div>

        {allCameras.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">{t.common.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Камера</th>
                  <th className="px-4 py-3">Завод / Участок</th>
                  <th className="px-4 py-3">IP / Подключение</th>
                  <th className="px-4 py-3 text-right">FPS</th>
                  <th className="px-5 py-3 text-right">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allCameras.map((cam) => (
                  <tr key={`${cam.factoryId || ''}-${cam.id}`} className="hover:bg-slate-800/30">
                    <td className="px-5 py-3 font-semibold text-white">
                      {cam.name}
                      <span className="ml-2 text-[10px] font-mono text-slate-500">
                        {cam.resolution}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className="text-cyan-300">{cam.factoryName}</span> · {cam.area}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        {cam.connectionMethod === 'qr' ? (
                          <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Network className="h-3.5 w-3.5 text-cyan-400" />
                        )}
                        <span>{cam.ipAddress || cam.streamUrl || 'Local RTSP'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-300">
                      {cam.fps}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[11px] uppercase">
                      <span
                        className={
                          cam.status === 'active'
                            ? 'text-emerald-400'
                            : cam.status === 'offline'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                        }
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
    </div>
  );
};
