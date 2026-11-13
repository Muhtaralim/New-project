export type Language = 'ru' | 'kz';

export type TimeFilter = '1h' | '8h' | '24h' | '7d';

export type VerificationStatus = 'new' | 'verified' | 'false_positive' | 'resolved';

export type EmployeeRole = 'worker' | 'specialist';
export type EmployeeAccessLevel = 'none' | 'full';

export type FactoryPlan = 'trial' | 'pro' | 'enterprise';
export type FactoryAccountStatus = 'active' | 'pending' | 'suspended';
export type BillingStatus = 'paid' | 'pending' | 'overdue';

export type FounderTab =
  | 'dashboard'
  | 'factories'
  | 'errors'
  | 'employees'
  | 'support'
  | 'billing'
  | 'audit'
  | 'settings';

export type FactoryPortalTab = 'overview' | 'equipment' | 'employees' | 'support' | 'profile';

export interface UserProfile {
  userId: string;
  email: string;
  factoryName: string;
  region: string;
  industrySector?: string;
  contactPerson?: string;
  contactPhone?: string;
  emailVerified: boolean;
  plan?: FactoryPlan;
  accountStatus?: FactoryAccountStatus;
  billingStatus?: BillingStatus;
  camerasCount?: number;
  sensorsCount?: number;
  machinesCount?: number;
  employeesCount?: number;
  errorsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'founder' | 'admin';
  displayName?: string;
  createdAt: string;
}

export type DeviceErrorSeverity = 'critical' | 'warning' | 'info';
export type DeviceErrorStatus = 'open' | 'investigating' | 'resolved';
export type DeviceErrorModule = 'SafeVision' | 'EcoPredict' | 'FailPredict' | 'System';

export interface DeviceErrorLog {
  id: string;
  factoryId: string;
  factoryName: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'camera' | 'sensor' | 'machine' | 'system';
  ipAddress?: string;
  module: DeviceErrorModule;
  errorCode: string;
  message: string;
  severity: DeviceErrorSeverity;
  status: DeviceErrorStatus;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
}

export type SupportTicketCategory = 'cameras' | 'sensors' | 'employees' | 'billing' | 'bug' | 'other';
export type SupportTicketPriority = 'urgent' | 'high' | 'normal' | 'low';
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  factoryId: string;
  factoryName: string;
  reporterEmail?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  description: string;
  repliesCount: number;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  factoryId: string;
  senderEmail: string;
  senderRole: 'founder' | 'factory';
  text: string;
  createdAt: string;
}

export interface FounderAuditLog {
  id: string;
  actorEmail: string;
  action: string;
  targetType: 'factory' | 'ticket' | 'error' | 'settings' | 'admin';
  targetName: string;
  details: string;
  createdAt: string;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  trialCameraLimit: number;
  trialEmployeeLimit: number;
  aiModelVersion: string;
  autoErrorAlerts: boolean;
  updatedAt: string;
}

export interface FactoryInspectionData {
  factoryId: string;
  cameras: IndustrialCamera[];
  sensors: EcoSensor[];
  machines: IndustrialMachine[];
  employees: FactoryEmployee[];
  notifications: SpecialistNotification[];
  loadedAt: string;
}

export interface FactoryEmployee {
  id: string;
  factoryId: string;
  fullName: string;
  specialty: string;
  role: EmployeeRole;
  accessLevel: EmployeeAccessLevel;
  department: string;
  email: string;
  generatedPassword: string;
  authProvisioned?: boolean;
  violationsCount: number;
  lastViolationSummary?: string;
  lastViolationAt?: string;
  createdAt: string;
}

export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface SpecialistNotification {
  id: string;
  factoryId: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  sourceModule: 'SafeVision' | 'EcoPredict' | 'FailPredict';
  violatorId?: string;
  violatorName?: string;
  recipientCount: number;
  recipientNames: string;
  read: boolean;
  createdAt: string;
}

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  sourceModule?: string;
  timestamp: string;
}

// SafeVision Types
export type PPEType = 'helmet' | 'vest' | 'goggles' | 'hazard_zone';

export interface PPEViolation {
  id: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  area: string;
  violationType: 'no_helmet' | 'no_vest' | 'no_goggles' | 'hazard_zone_entry';
  confidence: number;
  workerCount: number;
  status: VerificationStatus;
  employeeId?: string;
  employeeName?: string;
  notes?: string;
}

export type DeviceConnectionMethod = 'ip' | 'qr' | 'manual' | 'demo';

export interface IndustrialCamera {
  id: string;
  factoryId?: string;
  name: string;
  area: string;
  ipAddress?: string;
  streamUrl?: string;
  connectionMethod?: DeviceConnectionMethod;
  fps: number;
  resolution: string;
  status: 'active' | 'offline' | 'calibrating';
  currentDetections: {
    helmetsOk: number;
    helmetsMissing: number;
    vestsOk: number;
    vestsMissing: number;
    gogglesOk: number;
    gogglesMissing: number;
    inHazardZone: number;
  };
}

// EcoPredict Types
export type EcoStatus = 'normal' | 'warning' | 'critical';

export interface EcoSensor {
  id: string;
  factoryId?: string;
  name: string;
  code: 'CO' | 'NO2' | 'SO2' | 'PM2_5' | 'PM10' | 'NOISE' | 'DUST' | 'TEMP';
  unit: string;
  ipAddress?: string;
  connectionMethod?: DeviceConnectionMethod;
  currentValue: number;
  thresholdWarning: number;
  thresholdCritical: number;
  area: string;
  status: EcoStatus;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface EcoReadingEvent {
  id: string;
  sensorId: string;
  indicator: string;
  value: number;
  unit: string;
  threshold: number;
  time: string;
  area: string;
  status: EcoStatus;
  predictedPeakTime?: string;
  mitigationAction?: string;
}

export interface EcoChartPoint {
  time: string;
  timestamp: number;
  CO: number;
  NO2: number;
  SO2: number;
  PM2_5: number;
}

// FailPredict Types
export type MachineRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface IndustrialMachine {
  id: string;
  factoryId?: string;
  name: string;
  type: string;
  area: string;
  ipAddress?: string;
  connectionMethod?: DeviceConnectionMethod;
  installedYear: number;
  temperatureC: number;
  temperatureBaselineC: number;
  vibrationRmsMmS: number;
  vibrationBaselineMmS: number;
  peakFrequencyHz: number;
  riskStatus: MachineRiskLevel;
  failureProbabilityPercent: number;
  remainingUsefulLifeHours: number;
  recommendations: {
    ru: string;
    kz: string;
  };
  hasActiveWorkOrder?: boolean;
  lastInspectionDate: string;
  telemetryHistory: {
    time: string;
    temp: number;
    vibration: number;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}
