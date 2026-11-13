import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FactoryPortalTab, Language } from '../types';
import { translations } from '../i18n/translations';
import { normalizeAndValidateIpEndpoint, ParsedDeviceQrPayload } from '../utils/industrialMath';
import { DeviceQrPanel, DeviceQrStickerButton } from './DeviceQrTools';
import { FounderSupportView } from './FounderSupportView';
import {
  Building2,
  Camera,
  Cpu,
  Users,
  LifeBuoy,
  Network,
  QrCode,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { ProfileTab } from './ProfileModal';

interface FactoryPortalViewProps {
  language: Language;
  onOpenProfileTab: (tab: ProfileTab) => void;
}

export const FactoryPortalView: React.FC<FactoryPortalViewProps> = ({
  language,
  onOpenProfileTab,
}) => {
  const {
    profile,
    cameras,
    ecoSensors,
    machines,
    employees,
    deviceErrors,
    supportTickets,
    platformSettings,
    connectCamera,
    deleteCamera,
    connectEcoSensor,
    deleteEcoSensor,
    connectMachine,
    deleteMachine,
    createSupportTicket,
    updateSupportTicket,
    replyToSupportTicket,
    subscribeTicketMessages,
  } = useAuth();

  const t = translations[language];
  const [tab, setTab] = useState<FactoryPortalTab>('overview');

  // Camera connect form (IP + QR)
  const [camMethod, setCamMethod] = useState<'ip' | 'qr'>('ip');
  const [camName, setCamName] = useState('');
  const [camArea, setCamArea] = useState('Цех №1');
  const [camIp, setCamIp] = useState('');
  const [camIpError, setCamIpError] = useState<string | null>(null);

  const handleConnectCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setCamIpError(null);
    const ipCheck = normalizeAndValidateIpEndpoint(camIp);
    if (!ipCheck.valid) {
      setCamIpError(t.deviceConnect.invalidIpError);
      return;
    }
    await connectCamera({
      name: camName.trim() || `CAM-${ipCheck.host}`,
      area: camArea.trim() || 'Цех №1',
      ipAddress: ipCheck.normalized,
      connectionMethod: camMethod,
    });
    setCamName('');
    setCamIp('');
  };

  const handleCameraQrDecoded = (parsed: ParsedDeviceQrPayload) => {
    if (parsed.name) setCamName(parsed.name);
    if (parsed.area) setCamArea(parsed.area);
    if (parsed.ipAddress) setCamIp(parsed.ipAddress);
    setCamMethod('qr');
  };

  const handleCameraQrImmediate = async (parsed: ParsedDeviceQrPayload) => {
    await connectCamera({
      name: parsed.name || 'CAM-QR-01',
      area: parsed.area || 'Цех №1',
      ipAddress: parsed.ipAddress,
      resolution: parsed.resolution,
      connectionMethod: 'qr',
    });
  };

  return (
    <div className="space-y-6">
      {platformSettings.maintenanceMode && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Платформа в режиме планового обслуживания ({platformSettings.aiModelVersion})</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            {t.founder.portalTitle}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-0.5">
            {profile?.factoryName || t.founder.portalTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.founder.portalSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => onOpenProfileTab('profile')}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500 whitespace-nowrap shrink-0"
        >
          {t.founder.portalTabProfile}
        </button>
      </div>

      {/* Portal Tabs */}
      <div className="flex border-b border-slate-800 gap-4 overflow-x-auto no-scrollbar text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab('overview')}
          className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            tab === 'overview'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>{t.founder.portalTabOverview}</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('equipment')}
          className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            tab === 'equipment'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>
            {t.founder.portalTabEquipment} ({cameras.length + ecoSensors.length + machines.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => onOpenProfileTab('employees')}
          className="py-3 border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-1.5 whitespace-nowrap"
        >
          <Users className="h-4 w-4" />
          <span>
            {t.founder.portalTabEmployees} ({employees.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab('support')}
          className={`py-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            tab === 'support'
              ? 'border-cyan-400 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <LifeBuoy className="h-4 w-4" />
          <span>
            {t.founder.portalTabSupport} ({supportTickets.length})
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">{t.founder.colCameras}</div>
              <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
                {cameras.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">Eco / PLC</div>
              <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
                {ecoSensors.length + machines.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">{t.founder.colEmployees}</div>
              <div className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
                {employees.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="text-xs text-slate-400">{t.founder.colErrors}</div>
              <div className="mt-2 text-2xl font-bold text-rose-400 font-mono tabular-nums">
                {deviceErrors.filter((e) => e.status !== 'resolved').length}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTab('equipment')}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left hover:border-cyan-500/40 transition-colors space-y-1.5"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Camera className="h-4 w-4 text-cyan-400" />
                <span>Подключить камеры по IP или QR-коду</span>
              </div>
              <p className="text-xs text-slate-400">
                Добавляйте и удаляйте IP-камеры, газоанализаторы и промышленные агрегаты.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTab('support')}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-left hover:border-amber-500/40 transition-colors space-y-1.5"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <LifeBuoy className="h-4 w-4 text-amber-400" />
                <span>Обратиться в техподдержку</span>
              </div>
              <p className="text-xs text-slate-400">
                Создайте тикет по настройке камер, расширению квоты или ошибкам устройств.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Equipment Connect & Delete */}
      {tab === 'equipment' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-cyan-400" />
                <span>Подключение камеры (IP-адрес / QR-код)</span>
              </h3>
              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCamMethod('ip')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded ${
                    camMethod === 'ip' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  <span>{t.deviceConnect.methodIpTab}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCamMethod('qr')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded ${
                    camMethod === 'qr' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{t.deviceConnect.methodQrTab}</span>
                </button>
              </div>
            </div>

            {camMethod === 'qr' && (
              <DeviceQrPanel
                module="camera"
                accentColor="cyan"
                defaultSample={{
                  name: 'CAM-01 Главный пролет',
                  ipAddress: '192.168.10.45:554',
                  area: 'Цех №1',
                  resolution: '1920x1080',
                }}
                onDecoded={handleCameraQrDecoded}
                onConnectImmediate={handleCameraQrImmediate}
                language={language}
              />
            )}

            <form onSubmit={handleConnectCamera} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                required
                value={camName}
                onChange={(e) => setCamName(e.target.value)}
                placeholder={t.safevision.cameraNamePlaceholder}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="text"
                required
                value={camIp}
                onChange={(e) => setCamIp(e.target.value)}
                placeholder={t.deviceConnect.ipPlaceholderCamera}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="text"
                required
                value={camArea}
                onChange={(e) => setCamArea(e.target.value)}
                placeholder={t.safevision.cameraAreaPlaceholder}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 font-bold text-white whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.safevision.connectCameraBtn}</span>
              </button>
            </form>

            {camIpError && <div className="text-xs text-rose-400">{camIpError}</div>}

            {cameras.length > 0 && (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950/60">
                {cameras.map((cam) => (
                  <div
                    key={cam.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{cam.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {cam.area} · {cam.ipAddress || cam.streamUrl || 'Local'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DeviceQrStickerButton
                        module="camera"
                        deviceName={cam.name}
                        ipAddress={cam.ipAddress}
                        area={cam.area}
                        resolution={cam.resolution}
                        language={language}
                      />
                      <button
                        type="button"
                        onClick={() => void deleteCamera(cam.id)}
                        className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title={t.deviceConnect.deleteCameraTitle}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Sensors & Machines Summary */}
          {(ecoSensors.length > 0 || machines.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Датчики ({ecoSensors.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void connectEcoSensor({
                        name: `Пост SO₂-${ecoSensors.length + 1}`,
                        code: 'SO2',
                        area: 'Цех №1',
                        ipAddress: '192.168.20.14:502',
                        connectionMethod: 'ip',
                      })
                    }
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    + Добавить
                  </button>
                </div>
                {ecoSensors.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-200">{s.name}</span>
                    <button
                      type="button"
                      onClick={() => void deleteEcoSensor(s.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-amber-400" />
                    <span>Агрегаты ({machines.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void connectMachine({
                        name: `Агрегат-${machines.length + 1}`,
                        type: 'Нагнетатель',
                        area: 'Цех №1',
                        ipAddress: '192.168.30.80:4840',
                        connectionMethod: 'ip',
                      })
                    }
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    + Добавить
                  </button>
                </div>
                {machines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-200">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => void deleteMachine(m.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Support Helpdesk */}
      {tab === 'support' && (
        <FounderSupportView
          isFounder={false}
          tickets={supportTickets}
          currentFactoryProfile={profile}
          language={language}
          onCreateTicket={createSupportTicket}
          onUpdateTicket={updateSupportTicket}
          onReplyTicket={replyToSupportTicket}
          subscribeMessages={subscribeTicketMessages}
        />
      )}
    </div>
  );
};
