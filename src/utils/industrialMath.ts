import {
  IndustrialCamera,
  PPEViolation,
  EcoSensor,
  EcoStatus,
  EcoReadingEvent,
  IndustrialMachine,
  MachineRiskLevel,
  TimeFilter,
  EmployeeRole,
  EmployeeAccessLevel,
  FactoryEmployee,
  SpecialistNotification,
  UserProfile,
  DeviceErrorLog,
  SupportTicket,
  AdminUser,
  FactoryPlan,
  FactoryAccountStatus,
  DeviceErrorSeverity,
  DeviceErrorStatus,
  DeviceErrorModule,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '../types';

/**
 * Calculates overall PPE compliance score (0-100%) across cameras
 */
export function calculatePpeComplianceRate(cameras: IndustrialCamera[]): number {
  if (!cameras.length) return 0;
  let totalEquipped = 0;
  let totalRequired = 0;

  for (const cam of cameras) {
    const d = cam.currentDetections;
    const equipped = d.helmetsOk + d.vestsOk + d.gogglesOk;
    const missing = d.helmetsMissing + d.vestsMissing + d.gogglesMissing;
    totalEquipped += equipped;
    totalRequired += equipped + missing;
  }

  if (totalRequired === 0) return 100;
  return Math.round((totalEquipped / totalRequired) * 100);
}

/**
 * Evaluates emission status for an environmental sensor reading
 */
export function evaluateEcoSensorStatus(
  value: number,
  thresholdWarning: number,
  thresholdCritical: number
): EcoStatus {
  if (value >= thresholdCritical) return 'critical';
  if (value >= thresholdWarning) return 'warning';
  return 'normal';
}

/**
 * Evaluates machine health status and Remaining Useful Life (RUL)
 * based on ISO 10816 vibration standards and thermal deviation
 */
export function evaluateMachineHealth(
  tempC: number,
  tempBase: number,
  vibMmS: number,
  vibBase: number
): {
  riskStatus: MachineRiskLevel;
  failureProbability: number;
  rulHours: number;
} {
  const tempDelta = Math.max(0, tempC - tempBase);
  const vibDelta = Math.max(0, vibMmS - vibBase);

  let failureProbability = 5;
  let riskStatus: MachineRiskLevel = 'low';
  let rulHours = 1200;

  if (vibMmS > 7.1 || tempDelta > 28) {
    riskStatus = 'critical';
    failureProbability = Math.min(98, Math.round(75 + vibDelta * 4 + tempDelta * 0.7));
    rulHours = Math.max(12, Math.round(96 - vibDelta * 10));
  } else if (vibMmS > 4.5 || tempDelta > 16) {
    riskStatus = 'high';
    failureProbability = Math.min(74, Math.round(45 + vibDelta * 5 + tempDelta * 0.8));
    rulHours = Math.max(72, Math.round(320 - vibDelta * 25));
  } else if (vibMmS > 2.8 || tempDelta > 8) {
    riskStatus = 'medium';
    failureProbability = Math.min(44, Math.round(20 + vibDelta * 6 + tempDelta * 0.6));
    rulHours = Math.round(650 - vibDelta * 40);
  } else {
    riskStatus = 'low';
    failureProbability = Math.max(2, Math.round(5 + (vibMmS / 2.8) * 10));
    rulHours = 1200 + Math.round((2.8 - vibMmS) * 100);
  }

  return { riskStatus, failureProbability, rulHours };
}

/**
 * Filter generic time logs
 */
export function isTimestampInFilter(timestampStr: string, filter: TimeFilter, nowMs: number = Date.now()): boolean {
  const ts = new Date(timestampStr).getTime();
  if (isNaN(ts)) return true;
  const deltaHours = (nowMs - ts) / (1000 * 60 * 60);

  switch (filter) {
    case '1h':
      return deltaHours <= 1.0;
    case '8h':
      return deltaHours <= 8.0;
    case '24h':
      return deltaHours <= 24.0;
    case '7d':
      return deltaHours <= 168.0;
    default:
      return true;
  }
}

/**
 * Filter SafeVision violations
 */
export function filterPpeViolations(
  violations: PPEViolation[],
  areaFilter: string,
  statusFilter: string,
  timeFilter: TimeFilter,
  nowMs: number = Date.now()
): PPEViolation[] {
  return violations.filter((v) => {
    if (areaFilter !== 'all' && v.area !== areaFilter) return false;
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    return isTimestampInFilter(v.timestamp, timeFilter, nowMs);
  });
}

/**
 * Filter Eco deviations
 */
export function filterEcoReadings(
  readings: EcoReadingEvent[],
  areaFilter: string,
  statusFilter: string,
  timeFilter: TimeFilter,
  nowMs: number = Date.now()
): EcoReadingEvent[] {
  return readings.filter((r) => {
    if (areaFilter !== 'all' && r.area !== areaFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return isTimestampInFilter(r.time, timeFilter, nowMs);
  });
}

/**
 * Filter Machines by area and risk status
 */
export function filterMachines(
  machines: IndustrialMachine[],
  areaFilter: string,
  riskFilter: string
): IndustrialMachine[] {
  return machines.filter((m) => {
    if (areaFilter !== 'all' && m.area !== areaFilter) return false;
    if (riskFilter !== 'all' && m.riskStatus !== riskFilter) return false;
    return true;
  });
}

/**
 * Maps employee role to access rights:
 * ordinary workers have zero system/module rights ('none'),
 * specialists have full access to all modules ('full').
 */
export function determineEmployeeAccessLevel(role: EmployeeRole): EmployeeAccessLevel {
  return role === 'specialist' ? 'full' : 'none';
}

/**
 * Filters factory employees by role ('all' | 'worker' | 'specialist')
 */
export function filterEmployeesByRole(
  employees: FactoryEmployee[],
  roleFilter: 'all' | EmployeeRole
): FactoryEmployee[] {
  if (roleFilter === 'all') return employees;
  return employees.filter((e) => e.role === roleFilter);
}

/**
 * Counts unread notifications for specialists
 */
export function countUnreadNotifications(notifications: SpecialistNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}

/**
 * Builds a SpecialistNotification targeting all specialists in the factory.
 */
export function buildViolationNotificationForSpecialists(params: {
  id: string;
  factoryId: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  sourceModule: 'SafeVision' | 'EcoPredict' | 'FailPredict';
  employees: FactoryEmployee[];
  violatorId?: string;
  violatorName?: string;
  createdAt?: string;
}): SpecialistNotification {
  const specialists = params.employees.filter((e) => e.role === 'specialist');
  const rawNames = specialists.map((s) => `${s.fullName} (${s.specialty})`).join(', ');
  const recipientNames = rawNames.length > 290 ? rawNames.slice(0, 287) + '...' : rawNames;

  const base: SpecialistNotification = {
    id: params.id,
    factoryId: params.factoryId,
    title: params.title.slice(0, 140),
    message: params.message.slice(0, 400),
    severity: params.severity,
    sourceModule: params.sourceModule,
    recipientCount: specialists.length,
    recipientNames: recipientNames || 'Дежурный специалист ОТ',
    read: false,
    createdAt: params.createdAt || new Date().toISOString(),
  };

  if (params.violatorId) base.violatorId = params.violatorId.slice(0, 128);
  if (params.violatorName) base.violatorName = params.violatorName.slice(0, 120);

  return base;
}

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n',
  ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u',
  ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', і: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Transliterates Russian/Kazakh Cyrillic full name or factory name into an ASCII dot/hyphen slug
 */
export function transliterateCyrillicToSlug(input: string): string {
  const lower = input.trim().toLowerCase();
  let result = '';
  for (const ch of lower) {
    if (Object.prototype.hasOwnProperty.call(CYRILLIC_MAP, ch)) {
      result += CYRILLIC_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      result += ch;
    } else if (/\s/.test(ch) || ch === '-' || ch === '.') {
      result += '.';
    }
  }
  const cleaned = result.replace(/\.{2,}/g, '.').replace(/^\.+|\.+$/g, '');
  return cleaned.slice(0, 32) || 'employee';
}

function randomFromAlphabet(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * Generates a unique corporate email and readable strong initial password for a new employee
 */
export function generateEmployeeCredentials(
  fullName: string,
  factoryName?: string
): { email: string; password: string } {
  const userSlug = transliterateCyrillicToSlug(fullName).slice(0, 24) || 'staff';
  const suffix = randomFromAlphabet('abcdefghjkmnpqrstuvwxyz23456789', 4);
  const rawDomain = factoryName ? transliterateCyrillicToSlug(factoryName).replace(/\./g, '') : '';
  const domainPart = rawDomain.length >= 3 ? `${rawDomain.slice(0, 14)}.nf.kz` : 'neurofactory.kz';
  const email = `${userSlug}.${suffix}@${domainPart}`.slice(0, 110);

  const upper = randomFromAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ', 2);
  const lower = randomFromAlphabet('abcdefghjkmnpqrstuvwxyz', 2);
  const digits = randomFromAlphabet('23456789', 4);
  const password = `NF-${upper}${lower}-${digits}`;

  return { email, password };
}

/**
 * Calculates overall Environmental Health Score (0-100%) from live EcoPredict sensors.
 * Returns 0 when no sensors are connected.
 */
export function calculateEcoHealthScore(sensors: EcoSensor[]): number {
  if (!sensors.length) return 0;

  let sum = 0;
  for (const s of sensors) {
    const crit = Math.max(0.01, s.thresholdCritical);
    const ratio = s.currentValue / crit;
    let sensorScore = 95;
    if (s.status === 'critical' || ratio >= 1) {
      sensorScore = Math.max(15, Math.round(55 - (ratio - 1) * 40));
    } else if (s.status === 'warning' || ratio >= 0.75) {
      sensorScore = Math.max(55, Math.round(82 - Math.max(0, ratio - 0.75) * 60));
    } else {
      sensorScore = Math.max(78, Math.round(100 - ratio * 15));
    }
    sum += sensorScore;
  }

  return Math.round(sum / sensors.length);
}

/**
 * Calculates average Fleet Health Score (0-100%) from live FailPredict machines.
 * Returns 0 when no machines are connected.
 */
export function calculateFleetHealthScore(machines: IndustrialMachine[]): number {
  if (!machines.length) return 0;
  const totalHealth = machines.reduce(
    (acc, m) => acc + Math.max(0, 100 - m.failureProbabilityPercent),
    0
  );
  return Math.round(totalHealth / machines.length);
}

/**
 * Calculates average Remaining Useful Life (hours) across connected machines.
 * Returns 0 when no machines are connected.
 */
export function calculateAverageRul(machines: IndustrialMachine[]): number {
  if (!machines.length) return 0;
  const total = machines.reduce((acc, m) => acc + m.remainingUsefulLifeHours, 0);
  return Math.round(total / machines.length);
}

export interface IpValidationResult {
  valid: boolean;
  normalized: string;
  host: string;
  port?: string;
}

/**
 * Validates and normalizes an IPv4 address, IP:port, or industrial protocol URI
 * (e.g., 192.168.10.45, 192.168.10.45:554, rtsp://192.168.10.45:554/stream1, modbus://10.0.1.12:502).
 */
export function normalizeAndValidateIpEndpoint(raw: string): IpValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, normalized: '', host: '' };
  }

  // Strip optional protocol (rtsp://, http://, https://, modbus://, opc.tcp://) and credentials
  const withoutProto = trimmed.replace(/^[a-zA-Z0-9.+_-]+:\/\//, '');
  const withoutAuth = withoutProto.includes('@') ? withoutProto.split('@').pop() || '' : withoutProto;
  const hostPort = withoutAuth.split('/')[0].split('?')[0].trim();

  const ipv4Match = hostPort.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?::(\d{1,5}))?$/);
  if (ipv4Match) {
    const octets = [ipv4Match[1], ipv4Match[2], ipv4Match[3], ipv4Match[4]].map(Number);
    const portNum = ipv4Match[5] ? Number(ipv4Match[5]) : undefined;
    const validOctets = octets.every((o) => o >= 0 && o <= 255);
    const validPort = portNum === undefined || (portNum >= 1 && portNum <= 65535);
    if (!validOctets || !validPort) {
      return { valid: false, normalized: trimmed, host: hostPort };
    }
    const host = `${octets[0]}.${octets[1]}.${octets[2]}.${octets[3]}`;
    const normalized = trimmed.includes('://')
      ? trimmed.slice(0, 160)
      : portNum
        ? `${host}:${portNum}`
        : host;
    return {
      valid: true,
      normalized,
      host,
      port: portNum ? String(portNum) : undefined,
    };
  }

  return { valid: false, normalized: trimmed, host: hostPort };
}

export interface ParsedDeviceQrPayload {
  valid: boolean;
  module?: 'camera' | 'sensor' | 'machine';
  name?: string;
  ipAddress?: string;
  area?: string;
  resolution?: string;
  code?: 'CO' | 'NO2' | 'SO2' | 'PM2_5' | 'PM10' | 'NOISE';
  type?: string;
  raw: string;
}

const ALLOWED_SENSOR_CODES = ['CO', 'NO2', 'SO2', 'PM2_5', 'PM10', 'NOISE'] as const;

function sanitizeSensorCode(raw?: string): ParsedDeviceQrPayload['code'] {
  if (!raw) return undefined;
  const upper = raw.trim().toUpperCase().replace('.', '_');
  if ((ALLOWED_SENSOR_CODES as readonly string[]).includes(upper)) {
    return upper as ParsedDeviceQrPayload['code'];
  }
  return undefined;
}

/**
 * Parses QR payloads from JSON, neurofactory:// URI, key=value pairs, RTSP URL, or raw IP address.
 */
export function parseDeviceQrPayload(rawInput: string): ParsedDeviceQrPayload {
  const raw = rawInput.trim();
  if (!raw) return { valid: false, raw };

  // 1. JSON format: {"module":"camera","name":"CAM-02","ip":"192.168.10.45:554","area":"Цех №1"}
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const ipCandidate = String(obj.ip ?? obj.ipAddress ?? obj.host ?? obj.streamUrl ?? '').trim();
      const ipCheck: IpValidationResult = ipCandidate
        ? normalizeAndValidateIpEndpoint(ipCandidate)
        : { valid: false, normalized: '', host: '' };
      const name = typeof obj.name === 'string' ? obj.name.trim().slice(0, 120) : undefined;
      const area = typeof obj.area === 'string' ? obj.area.trim().slice(0, 80) : undefined;
      const mod =
        obj.module === 'camera' || obj.module === 'sensor' || obj.module === 'machine'
          ? obj.module
          : undefined;
      const resolution = typeof obj.resolution === 'string' ? obj.resolution.trim() : undefined;
      const type = typeof obj.type === 'string' ? obj.type.trim().slice(0, 100) : undefined;
      const code = sanitizeSensorCode(typeof obj.code === 'string' ? obj.code : undefined);

      if (ipCheck.valid || name) {
        return {
          valid: true,
          module: mod,
          name: name || (ipCheck.host ? `DEV-${ipCheck.host}` : undefined),
          ipAddress: ipCheck.valid ? ipCheck.normalized : ipCandidate || undefined,
          area: area || 'Цех №1',
          resolution,
          code,
          type,
          raw,
        };
      }
    } catch {
      // fall through to other parsers
    }
  }

  // 2. Custom URI format: neurofactory://connect?module=camera&name=CAM-02&ip=192.168.1.45&area=Цех%201
  if (/^(neurofactory|nf):\/\//i.test(raw)) {
    try {
      const normalizedUri = raw.replace(/^(neurofactory|nf):\/\//i, 'https://');
      const url = new URL(normalizedUri);
      const q = url.searchParams;
      const ipCandidate = (q.get('ip') || q.get('ipAddress') || q.get('host') || '').trim();
      const ipCheck: IpValidationResult = ipCandidate
        ? normalizeAndValidateIpEndpoint(ipCandidate)
        : { valid: false, normalized: '', host: '' };
      const name = q.get('name')?.trim().slice(0, 120);
      const area = q.get('area')?.trim().slice(0, 80);
      const modParam = q.get('module');
      const mod =
        modParam === 'camera' || modParam === 'sensor' || modParam === 'machine'
          ? modParam
          : undefined;
      if (ipCheck.valid || name) {
        return {
          valid: true,
          module: mod,
          name: name || (ipCheck.host ? `DEV-${ipCheck.host}` : undefined),
          ipAddress: ipCheck.valid ? ipCheck.normalized : ipCandidate || undefined,
          area: area || 'Цех №1',
          resolution: q.get('resolution') || undefined,
          code: sanitizeSensorCode(q.get('code') || undefined),
          type: q.get('type')?.trim().slice(0, 100),
          raw,
        };
      }
    } catch {
      // ignore URI parse error
    }
  }

  // 3. Key=value semicolon format: NAME=CAM-02;IP=192.168.1.45;AREA=Цех №1
  if (raw.includes('=') && (raw.includes(';') || raw.includes('&') || raw.includes('\n'))) {
    const pairs = raw.split(/[;&\n]+/);
    const map: Record<string, string> = {};
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        const k = pair.slice(0, eqIdx).trim().toLowerCase();
        const v = pair.slice(eqIdx + 1).trim();
        map[k] = v;
      }
    }
    const ipCandidate = map.ip || map.ipaddress || map.host || map.url || '';
    const ipCheck: IpValidationResult = ipCandidate
      ? normalizeAndValidateIpEndpoint(ipCandidate)
      : { valid: false, normalized: '', host: '' };
    const name = (map.name || map.title || '').slice(0, 120);
    if (ipCheck.valid || name) {
      return {
        valid: true,
        module:
          map.module === 'camera' || map.module === 'sensor' || map.module === 'machine'
            ? map.module
            : undefined,
        name: name || (ipCheck.host ? `DEV-${ipCheck.host}` : undefined),
        ipAddress: ipCheck.valid ? ipCheck.normalized : ipCandidate || undefined,
        area: (map.area || 'Цех №1').slice(0, 80),
        resolution: map.resolution,
        code: sanitizeSensorCode(map.code),
        type: map.type?.slice(0, 100),
        raw,
      };
    }
  }

  // 4. Plain IP / RTSP / Modbus endpoint encoded directly in QR
  const directIp = normalizeAndValidateIpEndpoint(raw);
  if (directIp.valid) {
    return {
      valid: true,
      name: `Node ${directIp.host}`,
      ipAddress: directIp.normalized,
      area: 'Цех №1',
      raw,
    };
  }

  return { valid: false, raw };
}

/**
 * Builds a compact JSON QR payload string for sticker generation & mobile scanning.
 */
export function buildDeviceQrPayload(params: {
  module: 'camera' | 'sensor' | 'machine';
  name: string;
  ipAddress: string;
  area: string;
  resolution?: string;
  code?: string;
  type?: string;
}): string {
  const payload: Record<string, string> = {
    module: params.module,
    name: params.name.trim(),
    ip: params.ipAddress.trim(),
    area: params.area.trim(),
  };
  if (params.resolution) payload.resolution = params.resolution;
  if (params.code) payload.code = params.code;
  if (params.type) payload.type = params.type;
  return JSON.stringify(payload);
}

export const PRIMARY_FOUNDER_EMAIL = 'dakoasylbek2003@gmail.com';

/**
 * Checks whether the signed-in email matches the platform Founder or an active Admin roster entry.
 */
export function isFounderEmail(email?: string | null, admins: AdminUser[] = []): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === PRIMARY_FOUNDER_EMAIL) return true;
  return admins.some((a) => a.email.trim().toLowerCase() === normalized);
}

export interface FounderAggregatedMetrics {
  totalFactories: number;
  activeFactories: number;
  suspendedFactories: number;
  totalCameras: number;
  totalSensors: number;
  totalMachines: number;
  totalEmployees: number;
  openErrors: number;
  criticalErrors: number;
  openTickets: number;
  urgentTickets: number;
}

/**
 * Aggregates cross-platform operational metrics for the Founder Dashboard.
 */
export function aggregateFounderMetrics(
  factories: UserProfile[],
  errors: DeviceErrorLog[],
  tickets: SupportTicket[]
): FounderAggregatedMetrics {
  let activeFactories = 0;
  let suspendedFactories = 0;
  let totalCameras = 0;
  let totalSensors = 0;
  let totalMachines = 0;
  let totalEmployees = 0;

  for (const f of factories) {
    const status = f.accountStatus || 'active';
    if (status === 'suspended') suspendedFactories++;
    else activeFactories++;

    totalCameras += f.camerasCount || 0;
    totalSensors += f.sensorsCount || 0;
    totalMachines += f.machinesCount || 0;
    totalEmployees += f.employeesCount || 0;
  }

  let openErrors = 0;
  let criticalErrors = 0;
  for (const err of errors) {
    if (err.status !== 'resolved') {
      openErrors++;
      if (err.severity === 'critical') criticalErrors++;
    }
  }

  let openTickets = 0;
  let urgentTickets = 0;
  for (const tk of tickets) {
    if (tk.status === 'open' || tk.status === 'in_progress') {
      openTickets++;
      if (tk.priority === 'urgent' || tk.priority === 'high') urgentTickets++;
    }
  }

  return {
    totalFactories: factories.length,
    activeFactories,
    suspendedFactories,
    totalCameras,
    totalSensors,
    totalMachines,
    totalEmployees,
    openErrors,
    criticalErrors,
    openTickets,
    urgentTickets,
  };
}

/**
 * Filters registered factories by query text, SaaS plan, and account status.
 */
export function filterFounderFactories(
  factories: UserProfile[],
  search: string,
  planFilter: 'all' | FactoryPlan,
  statusFilter: 'all' | FactoryAccountStatus
): UserProfile[] {
  const q = search.trim().toLowerCase();
  return factories.filter((f) => {
    const plan = f.plan || 'trial';
    const status = f.accountStatus || 'active';
    if (planFilter !== 'all' && plan !== planFilter) return false;
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    if (!q) return true;
    return (
      f.factoryName.toLowerCase().includes(q) ||
      f.region.toLowerCase().includes(q) ||
      (f.email || '').toLowerCase().includes(q) ||
      (f.contactPerson || '').toLowerCase().includes(q)
    );
  });
}

/**
 * Filters cross-factory device & AI error logs.
 */
export function filterDeviceErrors(
  errors: DeviceErrorLog[],
  search: string,
  severityFilter: 'all' | DeviceErrorSeverity,
  moduleFilter: 'all' | DeviceErrorModule,
  statusFilter: 'all' | DeviceErrorStatus
): DeviceErrorLog[] {
  const q = search.trim().toLowerCase();
  return errors.filter((e) => {
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    if (moduleFilter !== 'all' && e.module !== moduleFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (!q) return true;
    return (
      e.factoryName.toLowerCase().includes(q) ||
      e.deviceName.toLowerCase().includes(q) ||
      e.errorCode.toLowerCase().includes(q) ||
      e.message.toLowerCase().includes(q) ||
      (e.ipAddress || '').toLowerCase().includes(q)
    );
  });
}

/**
 * Filters tech support tickets by search query, status, priority, and category.
 */
export function filterSupportTickets(
  tickets: SupportTicket[],
  search: string,
  statusFilter: 'all' | SupportTicketStatus,
  priorityFilter: 'all' | SupportTicketPriority,
  categoryFilter: 'all' | SupportTicketCategory
): SupportTicket[] {
  const q = search.trim().toLowerCase();
  return tickets.filter((tk) => {
    if (statusFilter !== 'all' && tk.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && tk.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && tk.category !== categoryFilter) return false;
    if (!q) return true;
    return (
      tk.subject.toLowerCase().includes(q) ||
      tk.factoryName.toLowerCase().includes(q) ||
      tk.description.toLowerCase().includes(q) ||
      (tk.reporterEmail || '').toLowerCase().includes(q)
    );
  });
}



