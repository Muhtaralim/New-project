import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePpeComplianceRate,
  evaluateEcoSensorStatus,
  evaluateMachineHealth,
  filterPpeViolations,
  determineEmployeeAccessLevel,
  filterEmployeesByRole,
  countUnreadNotifications,
  buildViolationNotificationForSpecialists,
  transliterateCyrillicToSlug,
  generateEmployeeCredentials,
  calculateEcoHealthScore,
  calculateFleetHealthScore,
  calculateAverageRul,
  normalizeAndValidateIpEndpoint,
  parseDeviceQrPayload,
  buildDeviceQrPayload,
  isFounderEmail,
  aggregateFounderMetrics,
  filterFounderFactories,
  filterDeviceErrors,
  filterSupportTickets,
} from './industrialMath';
import {
  IndustrialCamera,
  PPEViolation,
  FactoryEmployee,
  SpecialistNotification,
  UserProfile,
  DeviceErrorLog,
  SupportTicket,
} from '../types';

test('calculatePpeComplianceRate calculates 100% when no missing items', () => {
  const cameras: IndustrialCamera[] = [
    {
      id: 'cam-1',
      name: 'CAM 1',
      area: 'Shop 1',
      fps: 25,
      resolution: '1920x1080',
      status: 'active',
      currentDetections: {
        helmetsOk: 4,
        helmetsMissing: 0,
        vestsOk: 4,
        vestsMissing: 0,
        gogglesOk: 4,
        gogglesMissing: 0,
        inHazardZone: 0,
      },
    },
  ];
  assert.equal(calculatePpeComplianceRate(cameras), 100);
});

test('calculatePpeComplianceRate calculates accurate partial compliance', () => {
  const cameras: IndustrialCamera[] = [
    {
      id: 'cam-1',
      name: 'CAM 1',
      area: 'Shop 1',
      fps: 25,
      resolution: '1920x1080',
      status: 'active',
      currentDetections: {
        helmetsOk: 3,
        helmetsMissing: 1,
        vestsOk: 2,
        vestsMissing: 2,
        gogglesOk: 4,
        gogglesMissing: 0,
        inHazardZone: 1,
      },
    },
  ];
  assert.equal(calculatePpeComplianceRate(cameras), 75);
});

test('evaluateEcoSensorStatus assigns normal, warning, and critical states correctly', () => {
  const warningThreshold = 20;
  const criticalThreshold = 35;

  assert.equal(evaluateEcoSensorStatus(10, warningThreshold, criticalThreshold), 'normal');
  assert.equal(evaluateEcoSensorStatus(20, warningThreshold, criticalThreshold), 'warning');
  assert.equal(evaluateEcoSensorStatus(30, warningThreshold, criticalThreshold), 'warning');
  assert.equal(evaluateEcoSensorStatus(35, warningThreshold, criticalThreshold), 'critical');
  assert.equal(evaluateEcoSensorStatus(55, warningThreshold, criticalThreshold), 'critical');
});

test('evaluateMachineHealth calculates ISO vibration and thermal risk categories', () => {
  const nominal = evaluateMachineHealth(46, 45, 1.2, 1.0);
  assert.equal(nominal.riskStatus, 'low');
  assert.ok(nominal.rulHours > 1000);
  assert.ok(nominal.failureProbability < 20);

  const warning = evaluateMachineHealth(55, 45, 3.8, 1.0);
  assert.equal(warning.riskStatus, 'medium');

  const severe = evaluateMachineHealth(78, 45, 8.4, 1.0);
  assert.equal(severe.riskStatus, 'critical');
  assert.ok(severe.failureProbability >= 75);
  assert.ok(severe.rulHours < 100);
});

test('filterPpeViolations filters violations by area and status', () => {
  const sampleViolations: PPEViolation[] = [
    {
      id: 'v1',
      timestamp: new Date().toISOString(),
      cameraId: 'c1',
      cameraName: 'Cam 1',
      area: 'Area A',
      violationType: 'no_helmet',
      confidence: 0.94,
      workerCount: 1,
      status: 'new',
    },
    {
      id: 'v2',
      timestamp: new Date().toISOString(),
      cameraId: 'c2',
      cameraName: 'Cam 2',
      area: 'Area B',
      violationType: 'no_vest',
      confidence: 0.91,
      workerCount: 1,
      status: 'verified',
    },
  ];

  const filteredArea = filterPpeViolations(sampleViolations, 'Area A', 'all', '24h');
  assert.equal(filteredArea.length, 1);
  assert.equal(filteredArea[0].id, 'v1');

  const filteredStatus = filterPpeViolations(sampleViolations, 'all', 'verified', '24h');
  assert.equal(filteredStatus.length, 1);
  assert.equal(filteredStatus[0].id, 'v2');
});

test('determineEmployeeAccessLevel enforces zero rights for workers and full access for specialists', () => {
  assert.equal(determineEmployeeAccessLevel('worker'), 'none');
  assert.equal(determineEmployeeAccessLevel('specialist'), 'full');
});

test('filterEmployeesByRole and buildViolationNotificationForSpecialists route alerts only to specialists', () => {
  const employees: FactoryEmployee[] = [
    {
      id: 'emp-1',
      factoryId: 'fac-1',
      fullName: 'Серик Болатов',
      specialty: 'Сварщик',
      role: 'worker',
      accessLevel: 'none',
      department: 'Цех №1',
      email: 'serik.bolatov.a1b2@neurofactory.kz',
      generatedPassword: 'NF-Kp7m-4829',
      violationsCount: 2,
      lastViolationSummary: 'Без защитной каски',
      createdAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'emp-2',
      factoryId: 'fac-1',
      fullName: 'Асылбек Даулетов',
      specialty: 'Инженер ОТ',
      role: 'specialist',
      accessLevel: 'full',
      department: 'Отдел ОТ и ТБ',
      email: 'asylbek.dauletov.c3d4@neurofactory.kz',
      generatedPassword: 'NF-Lm3r-9241',
      violationsCount: 0,
      createdAt: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'emp-3',
      factoryId: 'fac-1',
      fullName: 'Марина Ким',
      specialty: 'Эколог',
      role: 'specialist',
      accessLevel: 'full',
      department: 'Экослужба',
      email: 'marina.kim.e5f6@neurofactory.kz',
      generatedPassword: 'NF-Qr8t-6124',
      violationsCount: 0,
      createdAt: '2026-01-10T08:00:00.000Z',
    },
  ];

  assert.equal(filterEmployeesByRole(employees, 'worker').length, 1);
  assert.equal(filterEmployeesByRole(employees, 'specialist').length, 2);

  const notif = buildViolationNotificationForSpecialists({
    id: 'notif-1',
    factoryId: 'fac-1',
    title: 'Нарушение СИЗ: Серик Болатов',
    message: 'Отсутствие защитной каски в Цехе №1',
    severity: 'critical',
    sourceModule: 'SafeVision',
    employees,
    violatorId: 'emp-1',
    violatorName: 'Серик Болатов',
  });

  assert.equal(notif.recipientCount, 2);
  assert.ok(notif.recipientNames.includes('Асылбек Даулетов'));
  assert.ok(notif.recipientNames.includes('Марина Ким'));
  assert.ok(!notif.recipientNames.includes('Серик Болатов'));
  assert.equal(notif.read, false);

  const list: SpecialistNotification[] = [
    notif,
    { ...notif, id: 'notif-2', read: true },
  ];
  assert.equal(countUnreadNotifications(list), 1);
});

test('transliterateCyrillicToSlug and generateEmployeeCredentials produce valid unique email and password', () => {
  assert.equal(transliterateCyrillicToSlug('Серік Болатов'), 'serik.bolatov');
  assert.equal(transliterateCyrillicToSlug('Әлия Нұрпейісова'), 'aliya.nurpeyisova');

  const cred1 = generateEmployeeCredentials('Серик Болатов', 'ТОО Астана Пром');
  const cred2 = generateEmployeeCredentials('Серик Болатов', 'ТОО Астана Пром');

  assert.match(cred1.email, /^[a-z0-9.]+@[a-z0-9.]+\.nf\.kz$/);
  assert.match(cred1.password, /^NF-[A-Za-z]{4}-[0-9]{4}$/);
  assert.notEqual(cred1.email, cred2.email);
});

test('KPI calculators return strictly 0 when no devices are connected', () => {
  assert.equal(calculatePpeComplianceRate([]), 0);
  assert.equal(calculateEcoHealthScore([]), 0);
  assert.equal(calculateFleetHealthScore([]), 0);
  assert.equal(calculateAverageRul([]), 0);
});

test('normalizeAndValidateIpEndpoint validates IPv4, IP:port, and RTSP/Modbus URIs', () => {
  const plain = normalizeAndValidateIpEndpoint('192.168.10.45');
  assert.equal(plain.valid, true);
  assert.equal(plain.host, '192.168.10.45');
  assert.equal(plain.normalized, '192.168.10.45');

  const rtsp = normalizeAndValidateIpEndpoint('rtsp://admin:pass@10.20.1.55:554/stream1');
  assert.equal(rtsp.valid, true);
  assert.equal(rtsp.host, '10.20.1.55');
  assert.equal(rtsp.port, '554');

  const badOctet = normalizeAndValidateIpEndpoint('999.168.1.1');
  assert.equal(badOctet.valid, false);

  const badStr = normalizeAndValidateIpEndpoint('not-an-ip');
  assert.equal(badStr.valid, false);
});

test('parseDeviceQrPayload and buildDeviceQrPayload round-trip JSON, URIs, and plain IPs', () => {
  const qrJson = buildDeviceQrPayload({
    module: 'camera',
    name: 'CAM-02 Литейный',
    ipAddress: '192.168.15.88:554',
    area: 'Цех №2',
    resolution: '2560x1440',
  });
  const parsedJson = parseDeviceQrPayload(qrJson);
  assert.equal(parsedJson.valid, true);
  assert.equal(parsedJson.module, 'camera');
  assert.equal(parsedJson.name, 'CAM-02 Литейный');
  assert.equal(parsedJson.ipAddress, '192.168.15.88:554');
  assert.equal(parsedJson.area, 'Цех №2');
  assert.equal(parsedJson.resolution, '2560x1440');

  const parsedUri = parseDeviceQrPayload('neurofactory://connect?module=sensor&name=SO2-Post&ip=10.5.0.12:502&area=Аглоцех&code=SO2');
  assert.equal(parsedUri.valid, true);
  assert.equal(parsedUri.module, 'sensor');
  assert.equal(parsedUri.code, 'SO2');
  assert.equal(parsedUri.ipAddress, '10.5.0.12:502');

  const parsedIpOnly = parseDeviceQrPayload('172.16.4.20:4840');
  assert.equal(parsedIpOnly.valid, true);
  assert.equal(parsedIpOnly.ipAddress, '172.16.4.20:4840');
});

test('isFounderEmail matches primary founder case-insensitively and custom admins', () => {
  assert.equal(isFounderEmail('dakoasylbek2003@gmail.com'), true);
  assert.equal(isFounderEmail('  DakoAsylbek2003@GMAIL.com '), true);
  assert.equal(isFounderEmail('factory@kazprom.kz'), false);
  assert.equal(
    isFounderEmail('co-admin@neurofactory.kz', [
      {
        uid: 'adm-1',
        email: 'co-admin@neurofactory.kz',
        role: 'admin',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
    true
  );
});

test('aggregateFounderMetrics and filters accurately summarize platform state', () => {
  const factories: UserProfile[] = [
    {
      userId: 'f1',
      email: 'f1@kz.com',
      factoryName: 'ТЭЦ-3 Астана',
      region: 'г. Астана',
      emailVerified: true,
      plan: 'enterprise',
      accountStatus: 'active',
      camerasCount: 12,
      sensorsCount: 6,
      machinesCount: 4,
      employeesCount: 45,
    },
    {
      userId: 'f2',
      email: 'f2@kz.com',
      factoryName: 'Литейный Завод №2',
      region: 'Карагандинская область',
      emailVerified: true,
      plan: 'trial',
      accountStatus: 'suspended',
      camerasCount: 3,
      sensorsCount: 1,
      machinesCount: 2,
      employeesCount: 18,
    },
  ];

  const errors: DeviceErrorLog[] = [
    {
      id: 'err-1',
      factoryId: 'f1',
      factoryName: 'ТЭЦ-3 Астана',
      deviceId: 'c1',
      deviceName: 'CAM-01',
      deviceType: 'camera',
      ipAddress: '192.168.1.50:554',
      module: 'SafeVision',
      errorCode: 'RTSP_TIMEOUT',
      message: 'Потеря RTSP-потока более 15 сек',
      severity: 'critical',
      status: 'open',
      createdAt: '2026-05-01T10:00:00.000Z',
    },
    {
      id: 'err-2',
      factoryId: 'f2',
      factoryName: 'Литейный Завод №2',
      deviceId: 's1',
      deviceName: 'SO2-Post',
      deviceType: 'sensor',
      module: 'EcoPredict',
      errorCode: 'MODBUS_CRC',
      message: 'Ошибка контрольной суммы',
      severity: 'warning',
      status: 'resolved',
      createdAt: '2026-05-01T08:00:00.000Z',
    },
  ];

  const tickets: SupportTicket[] = [
    {
      id: 'tk-1',
      factoryId: 'f1',
      factoryName: 'ТЭЦ-3 Астана',
      subject: 'Не подключается камера по IP',
      category: 'cameras',
      priority: 'urgent',
      status: 'open',
      description: 'Порт 554 заблокирован',
      repliesCount: 1,
      createdAt: '2026-05-01T10:05:00.000Z',
      updatedAt: '2026-05-01T10:05:00.000Z',
    },
    {
      id: 'tk-2',
      factoryId: 'f2',
      factoryName: 'Литейный Завод №2',
      subject: 'Вопрос по оплате тарифа',
      category: 'billing',
      priority: 'low',
      status: 'closed',
      description: 'Нужен акт',
      repliesCount: 2,
      createdAt: '2026-05-01T07:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    },
  ];

  const metrics = aggregateFounderMetrics(factories, errors, tickets);
  assert.equal(metrics.totalFactories, 2);
  assert.equal(metrics.activeFactories, 1);
  assert.equal(metrics.suspendedFactories, 1);
  assert.equal(metrics.totalCameras, 15);
  assert.equal(metrics.totalEmployees, 63);
  assert.equal(metrics.openErrors, 1);
  assert.equal(metrics.criticalErrors, 1);
  assert.equal(metrics.openTickets, 1);
  assert.equal(metrics.urgentTickets, 1);

  assert.equal(filterFounderFactories(factories, 'ТЭЦ', 'all', 'all').length, 1);
  assert.equal(filterFounderFactories(factories, '', 'trial', 'suspended').length, 1);
  assert.equal(filterDeviceErrors(errors, '192.168', 'critical', 'SafeVision', 'open').length, 1);
  assert.equal(filterSupportTickets(tickets, 'камера', 'open', 'urgent', 'cameras').length, 1);
});



