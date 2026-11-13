import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import {
  auth,
  db,
  isFirebaseConfigured,
  handleFirestoreError,
  OperationType,
  provisionEmployeeAuthAccount,
} from '../services/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AdminUser,
  BillingStatus,
  DeviceConnectionMethod,
  DeviceErrorLog,
  DeviceErrorModule,
  DeviceErrorSeverity,
  DeviceErrorStatus,
  EcoChartPoint,
  EcoReadingEvent,
  EcoSensor,
  EmployeeRole,
  FactoryAccountStatus,
  FactoryEmployee,
  FactoryInspectionData,
  FactoryPlan,
  FounderAuditLog,
  IndustrialCamera,
  IndustrialMachine,
  PPEViolation,
  PlatformSettings,
  SpecialistNotification,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
  UserProfile,
  VerificationStatus,
} from '../types';
import {
  buildViolationNotificationForSpecialists,
  countUnreadNotifications,
  determineEmployeeAccessLevel,
  evaluateEcoSensorStatus,
  generateEmployeeCredentials,
  isFounderEmail,
  PRIMARY_FOUNDER_EMAIL,
} from '../utils/industrialMath';
import {
  INITIAL_CAMERAS,
  INITIAL_ECO_CHART_DATA,
  INITIAL_ECO_READINGS,
  INITIAL_ECO_SENSORS,
  INITIAL_MACHINES,
} from '../data/mockData';

export interface AddEmployeeInput {
  fullName: string;
  specialty: string;
  role: EmployeeRole;
  department: string;
}

export interface ConnectCameraInput {
  name: string;
  area: string;
  resolution?: string;
  ipAddress?: string;
  connectionMethod?: DeviceConnectionMethod;
}

export interface ConnectEcoSensorInput {
  name: string;
  code: 'CO' | 'NO2' | 'SO2' | 'PM2_5' | 'PM10' | 'NOISE';
  area: string;
  ipAddress?: string;
  connectionMethod?: DeviceConnectionMethod;
  thresholdWarning?: number;
  thresholdCritical?: number;
}

export interface ConnectMachineInput {
  name: string;
  type: string;
  area: string;
  ipAddress?: string;
  connectionMethod?: DeviceConnectionMethod;
  installedYear?: number;
}

export interface NotifySpecialistsInput {
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  sourceModule: 'SafeVision' | 'EcoPredict' | 'FailPredict';
  violatorId?: string;
  violatorName?: string;
}

export interface LogDeviceErrorInput {
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
}

export interface CreateSupportTicketInput {
  factoryId?: string;
  factoryName?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  description: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  isFounder: boolean;
  isLoading: boolean;
  isFirebaseReady: boolean;
  error: string | null;
  employees: FactoryEmployee[];
  notifications: SpecialistNotification[];
  unreadCount: number;
  cameras: IndustrialCamera[];
  violations: PPEViolation[];
  ecoSensors: EcoSensor[];
  ecoReadings: EcoReadingEvent[];
  ecoChartData: EcoChartPoint[];
  machines: IndustrialMachine[];
  // Founder Platform State
  allFactories: UserProfile[];
  deviceErrors: DeviceErrorLog[];
  supportTickets: SupportTicket[];
  auditLogs: FounderAuditLog[];
  platformAdmins: AdminUser[];
  platformSettings: PlatformSettings;
  inspectedFactories: Record<string, FactoryInspectionData>;
  isInspectingFactory: boolean;
  // Auth Methods
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, factoryName: string, region: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  logout: () => Promise<void>;
  // Factory Profile & Staff Methods
  saveFactoryProfile: (updated: Partial<UserProfile>) => Promise<void>;
  addEmployee: (input: AddEmployeeInput) => Promise<FactoryEmployee>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  seedSampleStaff: () => Promise<void>;
  recordWorkerViolation: (employeeId: string, violationSummary: string) => Promise<SpecialistNotification>;
  addSpecialistNotification: (input: NotifySpecialistsInput) => Promise<SpecialistNotification>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  // Equipment Methods
  connectCamera: (input: ConnectCameraInput) => Promise<IndustrialCamera>;
  deleteCamera: (cameraId: string) => Promise<void>;
  connectEcoSensor: (input: ConnectEcoSensorInput) => Promise<EcoSensor>;
  deleteEcoSensor: (sensorId: string) => Promise<void>;
  connectMachine: (input: ConnectMachineInput) => Promise<IndustrialMachine>;
  deleteMachine: (machineId: string) => Promise<void>;
  loadDemoCameras: () => Promise<void>;
  loadDemoEcoSensors: () => Promise<void>;
  loadDemoMachines: () => Promise<void>;
  updateViolationStatus: (id: string, newStatus: VerificationStatus) => void;
  prependViolation: (violation: PPEViolation, cameraIdToIncrement?: string) => void;
  prependEcoReading: (reading: EcoReadingEvent, sensorCode?: EcoSensor['code'], newValue?: number) => void;
  dispatchWorkOrder: (machineId: string) => void;
  triggerMachineAnomaly: (machineId: string) => void;
  // Founder Governance & Operations Methods
  inspectFactoryDetails: (factoryId: string) => Promise<FactoryInspectionData>;
  loadAllFactoriesTelemetry: () => Promise<void>;
  updateFactoryGovernance: (
    factoryId: string,
    updates: {
      plan?: FactoryPlan;
      accountStatus?: FactoryAccountStatus;
      billingStatus?: BillingStatus;
    }
  ) => Promise<void>;
  deleteFactoryRecord: (factoryId: string) => Promise<void>;
  logDeviceError: (input: LogDeviceErrorInput) => Promise<DeviceErrorLog>;
  updateDeviceErrorStatus: (
    errorId: string,
    status: DeviceErrorStatus,
    resolutionNote?: string
  ) => Promise<void>;
  createSupportTicket: (input: CreateSupportTicketInput) => Promise<SupportTicket>;
  updateSupportTicket: (
    ticketId: string,
    updates: { status?: SupportTicketStatus; priority?: SupportTicketPriority }
  ) => Promise<void>;
  replyToSupportTicket: (ticketId: string, text: string) => Promise<SupportTicketMessage>;
  subscribeTicketMessages: (
    ticketId: string,
    onMessages: (msgs: SupportTicketMessage[]) => void
  ) => () => void;
  updatePlatformSettings: (next: Partial<PlatformSettings>) => Promise<void>;
  addPlatformAdmin: (uid: string, email: string, displayName?: string) => Promise<void>;
  removePlatformAdmin: (adminUid: string) => Promise<void>;
  seedFounderSampleWorkspace: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'neurofactory_demo_user';
const LOCAL_STORAGE_PROFILE_KEY = 'neurofactory_demo_profile';

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  id: 'global',
  platformName: 'NeuroFactory AI',
  supportEmail: PRIMARY_FOUNDER_EMAIL,
  maintenanceMode: false,
  trialCameraLimit: 8,
  trialEmployeeLimit: 30,
  aiModelVersion: 'YOLOv11-Edge-v2.4 · LSTM-Eco-v1.8',
  autoErrorAlerts: true,
  updatedAt: new Date().toISOString(),
};

function scopedKey(prefix: string, uid: string): string {
  return `neurofactory_${prefix}_${uid}`;
}

function readScopedJson<T>(prefix: string, uid: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(scopedKey(prefix, uid));
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function writeScopedJson<T>(prefix: string, uid: string, data: T): void {
  try {
    localStorage.setItem(scopedKey(prefix, uid), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function sanitizeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 6)}`;
}

function defaultThresholdsForGas(code: ConnectEcoSensorInput['code']): {
  unit: string;
  warning: number;
  critical: number;
} {
  switch (code) {
    case 'SO2':
      return { unit: 'мг/м³', warning: 0.4, critical: 0.5 };
    case 'CO':
      return { unit: 'мг/м³', warning: 4.0, critical: 5.0 };
    case 'NO2':
      return { unit: 'мг/м³', warning: 0.15, critical: 0.2 };
    case 'PM2_5':
      return { unit: 'мг/м³', warning: 0.12, critical: 0.15 };
    case 'PM10':
      return { unit: 'мг/м³', warning: 0.24, critical: 0.3 };
    case 'NOISE':
      return { unit: 'дБ', warning: 78, critical: 85 };
    default:
      return { unit: 'мг/м³', warning: 0.4, critical: 0.5 };
  }
}

function createInitialSampleEmployees(factoryId: string, factoryName?: string): FactoryEmployee[] {
  const c1 = generateEmployeeCredentials('Серик Болатов', factoryName);
  const c2 = generateEmployeeCredentials('Ерлан Нурпеисов', factoryName);
  const c3 = generateEmployeeCredentials('Асылбек Даулетов', factoryName);
  const c4 = generateEmployeeCredentials('Марина Ким', factoryName);

  return [
    {
      id: `emp-${factoryId.slice(0, 6)}-w1`,
      factoryId,
      fullName: 'Серик Болатов',
      specialty: 'Сварщик',
      role: 'worker',
      accessLevel: 'none',
      department: 'Цех №1 (Конвертерный)',
      email: c1.email,
      generatedPassword: c1.password,
      authProvisioned: false,
      violationsCount: 1,
      lastViolationSummary: 'Работа без защитных очков при шлифовке',
      lastViolationAt: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      createdAt: '2026-02-01T08:00:00.000Z',
    },
    {
      id: `emp-${factoryId.slice(0, 6)}-w2`,
      factoryId,
      fullName: 'Ерлан Нурпеисов',
      specialty: 'Крановщик',
      role: 'worker',
      accessLevel: 'none',
      department: 'Цех №1 (Конвертерный)',
      email: c2.email,
      generatedPassword: c2.password,
      authProvisioned: false,
      violationsCount: 0,
      createdAt: '2026-02-02T08:00:00.000Z',
    },
    {
      id: `emp-${factoryId.slice(0, 6)}-s1`,
      factoryId,
      fullName: 'Асылбек Даулетов',
      specialty: 'Инженер по ОТ и ТБ',
      role: 'specialist',
      accessLevel: 'full',
      department: 'Служба охраны труда',
      email: c3.email,
      generatedPassword: c3.password,
      authProvisioned: false,
      violationsCount: 0,
      createdAt: '2026-01-20T08:00:00.000Z',
    },
    {
      id: `emp-${factoryId.slice(0, 6)}-s2`,
      factoryId,
      fullName: 'Марина Ким',
      specialty: 'Главный эколог',
      role: 'specialist',
      accessLevel: 'full',
      department: 'Экологический контроль',
      email: c4.email,
      generatedPassword: c4.password,
      authProvisioned: false,
      violationsCount: 0,
      createdAt: '2026-01-22T08:00:00.000Z',
    },
  ];
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isRegisteringRef = useRef<boolean>(false);

  // Factory-scoped equipment & staff
  const [employees, setEmployees] = useState<FactoryEmployee[]>([]);
  const [notifications, setNotifications] = useState<SpecialistNotification[]>([]);
  const [cameras, setCameras] = useState<IndustrialCamera[]>([]);
  const [violations, setViolations] = useState<PPEViolation[]>([]);
  const [ecoSensors, setEcoSensors] = useState<EcoSensor[]>([]);
  const [ecoReadings, setEcoReadings] = useState<EcoReadingEvent[]>([]);
  const [ecoChartData, setEcoChartData] = useState<EcoChartPoint[]>([]);
  const [machines, setMachines] = useState<IndustrialMachine[]>([]);

  // Platform / Founder state
  const [allFactories, setAllFactories] = useState<UserProfile[]>([]);
  const [deviceErrors, setDeviceErrors] = useState<DeviceErrorLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<FounderAuditLog[]>([]);
  const [platformAdmins, setPlatformAdmins] = useState<AdminUser[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [inspectedFactories, setInspectedFactories] = useState<Record<string, FactoryInspectionData>>({});
  const [isInspectingFactory, setIsInspectingFactory] = useState<boolean>(false);

  const isFounder = Boolean(
    currentUser &&
      (isFounderEmail(currentUser.email, platformAdmins) ||
        platformAdmins.some((a) => a.uid === currentUser.uid))
  );

  const resetToZeroWorkspace = useCallback(() => {
    setEmployees([]);
    setNotifications([]);
    setCameras([]);
    setViolations([]);
    setEcoSensors([]);
    setEcoReadings([]);
    setEcoChartData([]);
    setMachines([]);
  }, []);

  const syncOwnFactoryCounts = useCallback(
    async (
      partialCounts: Partial<
        Pick<UserProfile, 'camerasCount' | 'sensorsCount' | 'machinesCount' | 'employeesCount' | 'errorsCount'>
      >
    ) => {
      if (!currentUser) return;
      const nowIso = new Date().toISOString();
      setProfile((prev) => (prev ? { ...prev, ...partialCounts, updatedAt: nowIso } : prev));
      if (isFirebaseConfigured && db) {
        try {
          await updateDoc(doc(db, 'factories', currentUser.uid), {
            ...partialCounts,
            updatedAt: nowIso,
          });
        } catch {
          // Non-fatal counter sync
        }
      } else {
        setAllFactories((prev) => {
          const next = prev.map((f) =>
            f.userId === currentUser.uid ? { ...f, ...partialCounts, updatedAt: nowIso } : f
          );
          writeScopedJson('platform_factories', 'global', next);
          return next;
        });
      }
    },
    [currentUser]
  );

  const recordAudit = useCallback(
    async (
      action: string,
      targetType: FounderAuditLog['targetType'],
      targetName: string,
      details: string
    ) => {
      const id = sanitizeId('aud');
      const entry: FounderAuditLog = {
        id,
        actorEmail: (currentUser?.email || PRIMARY_FOUNDER_EMAIL).slice(0, 120),
        action: action.slice(0, 120),
        targetType,
        targetName: targetName.slice(0, 140),
        details: details.slice(0, 400),
        createdAt: new Date().toISOString(),
      };
      if (isFirebaseConfigured && db && currentUser) {
        try {
          await setDoc(doc(db, 'audit_logs', id), entry);
        } catch {
          // Non-fatal if audit rules reject non-admin
        }
      } else {
        setAuditLogs((prev) => {
          const next = [entry, ...prev].slice(0, 150);
          writeScopedJson('platform_audit', 'global', next);
          return next;
        });
      }
    },
    [currentUser]
  );

  // Initialize Auth listener
  useEffect(() => {
    if (isFirebaseConfigured && auth && db) {
      const firestore = db;
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        if (user) {
          resetToZeroWorkspace();
          setViolations(readScopedJson<PPEViolation[]>('violations', user.uid, []));
          setEcoReadings(readScopedJson<EcoReadingEvent[]>('eco_readings', user.uid, []));
          setEcoChartData(readScopedJson<EcoChartPoint[]>('eco_chart', user.uid, []));

          // Auto-provision primary founder admin record when verified
          if (isFounderEmail(user.email) && user.emailVerified) {
            const adminRef = doc(firestore, 'admins', user.uid);
            try {
              const adminSnap = await getDoc(adminRef);
              if (!adminSnap.exists()) {
                await setDoc(adminRef, {
                  uid: user.uid,
                  email: user.email || PRIMARY_FOUNDER_EMAIL,
                  role: 'founder',
                  displayName: (user.displayName || 'Основатель NeuroFactory AI').slice(0, 100),
                  createdAt: new Date().toISOString(),
                });
              }
            } catch {
              // Ignore if admin check throws
            }
          }

          try {
            const docPath = `factories/${user.uid}`;
            const docRef = doc(firestore, 'factories', user.uid);
            let snap;
            try {
              snap = await getDoc(docRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.GET, docPath, auth);
            }

            if (snap && snap.exists()) {
              setProfile(snap.data() as UserProfile);
            } else if (!isRegisteringRef.current) {
              const newProfile: UserProfile = {
                userId: user.uid,
                email: user.email || '',
                factoryName: isFounderEmail(user.email)
                  ? 'Головной офис NeuroFactory AI'
                  : 'Новое производственное предприятие',
                region: 'г. Астана',
                emailVerified: user.emailVerified,
                plan: isFounderEmail(user.email) ? 'enterprise' : 'trial',
                accountStatus: 'active',
                billingStatus: 'paid',
                camerasCount: 0,
                sensorsCount: 0,
                machinesCount: 0,
                employeesCount: 0,
                errorsCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              try {
                await setDoc(docRef, newProfile);
                setProfile(newProfile);
              } catch (writeErr) {
                handleFirestoreError(writeErr, OperationType.CREATE, docPath, auth);
              }
            }
          } catch (fetchErr: unknown) {
            console.error('Error fetching profile:', fetchErr);
            setError(fetchErr instanceof Error ? fetchErr.message : 'Error fetching profile');
          }
        } else {
          setProfile(null);
          resetToZeroWorkspace();
          setAllFactories([]);
          setDeviceErrors([]);
          setSupportTickets([]);
          setAuditLogs([]);
          setPlatformAdmins([]);
          setInspectedFactories({});
        }
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else {
      try {
        const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const storedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);

        if (storedUser && storedProfile) {
          const parsedUser = JSON.parse(storedUser);
          const parsedProfile = JSON.parse(storedProfile);
          setCurrentUser(parsedUser);
          setProfile(parsedProfile);
          const uid = parsedUser.uid;
          setEmployees(readScopedJson<FactoryEmployee[]>('employees', uid, []));
          setNotifications(readScopedJson<SpecialistNotification[]>('notifications', uid, []));
          setCameras(readScopedJson<IndustrialCamera[]>('cameras', uid, []));
          setViolations(readScopedJson<PPEViolation[]>('violations', uid, []));
          setEcoSensors(readScopedJson<EcoSensor[]>('sensors', uid, []));
          setEcoReadings(readScopedJson<EcoReadingEvent[]>('eco_readings', uid, []));
          setEcoChartData(readScopedJson<EcoChartPoint[]>('eco_chart', uid, []));
          setMachines(readScopedJson<IndustrialMachine[]>('machines', uid, []));
          setAllFactories(readScopedJson<UserProfile[]>('platform_factories', 'global', []));
          setDeviceErrors(readScopedJson<DeviceErrorLog[]>('platform_errors', 'global', []));
          setSupportTickets(readScopedJson<SupportTicket[]>('platform_tickets', 'global', []));
          setAuditLogs(readScopedJson<FounderAuditLog[]>('platform_audit', 'global', []));
          setPlatformAdmins(readScopedJson<AdminUser[]>('platform_admins', 'global', []));
          setPlatformSettings(
            readScopedJson<PlatformSettings>('platform_settings', 'global', DEFAULT_PLATFORM_SETTINGS)
          );
        } else {
          setCurrentUser(null);
          setProfile(null);
          resetToZeroWorkspace();
        }
      } catch {
        resetToZeroWorkspace();
      }
      setIsLoading(false);
    }
  }, [resetToZeroWorkspace]);

  // Subscribe to own factory subcollections + factory-relevant tickets/errors
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser || !profile) {
      return;
    }

    const firestore = db;
    const uid = currentUser.uid;

    const empQuery = query(
      collection(firestore, 'factories', uid, 'employees'),
      where('factoryId', '==', uid)
    );
    const notifQuery = query(
      collection(firestore, 'factories', uid, 'notifications'),
      where('factoryId', '==', uid)
    );
    const camQuery = query(
      collection(firestore, 'factories', uid, 'cameras'),
      where('factoryId', '==', uid)
    );
    const sensorQuery = query(
      collection(firestore, 'factories', uid, 'sensors'),
      where('factoryId', '==', uid)
    );
    const machineQuery = query(
      collection(firestore, 'factories', uid, 'machines'),
      where('factoryId', '==', uid)
    );

    const unsubEmp = onSnapshot(
      empQuery,
      (snapshot) => {
        const list: FactoryEmployee[] = snapshot.docs.map((d) => d.data() as FactoryEmployee);
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setEmployees(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `factories/${uid}/employees`, auth);
      }
    );

    const unsubNotif = onSnapshot(
      notifQuery,
      (snapshot) => {
        const list: SpecialistNotification[] = snapshot.docs.map(
          (d) => d.data() as SpecialistNotification
        );
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setNotifications(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `factories/${uid}/notifications`, auth);
      }
    );

    const unsubCam = onSnapshot(
      camQuery,
      (snapshot) => {
        setCameras(snapshot.docs.map((d) => d.data() as IndustrialCamera));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `factories/${uid}/cameras`, auth);
      }
    );

    const unsubSensor = onSnapshot(
      sensorQuery,
      (snapshot) => {
        setEcoSensors(snapshot.docs.map((d) => d.data() as EcoSensor));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `factories/${uid}/sensors`, auth);
      }
    );

    const unsubMachine = onSnapshot(
      machineQuery,
      (snapshot) => {
        setMachines(snapshot.docs.map((d) => d.data() as IndustrialMachine));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `factories/${uid}/machines`, auth);
      }
    );

    // Load global platform settings (allowed get for signed-in users)
    getDoc(doc(firestore, 'platform_settings', 'global'))
      .then((snap) => {
        if (snap.exists()) {
          setPlatformSettings(snap.data() as PlatformSettings);
        }
      })
      .catch(() => {
        // Use default if not initialized yet
      });

    return () => {
      unsubEmp();
      unsubNotif();
      unsubCam();
      unsubSensor();
      unsubMachine();
    };
  }, [currentUser, profile]);

  // Subscribe to Platform-Wide collections (Founder sees all; non-founder factory sees own tickets & errors)
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentUser || !profile) {
      return;
    }

    const firestore = db;
    const uid = currentUser.uid;

    if (isFounder) {
      const unsubFactories = onSnapshot(
        collection(firestore, 'factories'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as UserProfile);
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setAllFactories(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'factories', auth)
      );

      const unsubErrors = onSnapshot(
        collection(firestore, 'device_errors'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as DeviceErrorLog);
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setDeviceErrors(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'device_errors', auth)
      );

      const unsubTickets = onSnapshot(
        collection(firestore, 'support_tickets'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as SupportTicket);
          list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          setSupportTickets(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets', auth)
      );

      const unsubAudit = onSnapshot(
        collection(firestore, 'audit_logs'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as FounderAuditLog);
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setAuditLogs(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs', auth)
      );

      const unsubAdmins = onSnapshot(
        collection(firestore, 'admins'),
        (snap) => {
          setPlatformAdmins(snap.docs.map((d) => d.data() as AdminUser));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'admins', auth)
      );

      return () => {
        unsubFactories();
        unsubErrors();
        unsubTickets();
        unsubAudit();
        unsubAdmins();
      };
    } else {
      const ownErrorsQuery = query(
        collection(firestore, 'device_errors'),
        where('factoryId', '==', uid)
      );
      const ownTicketsQuery = query(
        collection(firestore, 'support_tickets'),
        where('factoryId', '==', uid)
      );

      const unsubOwnErrors = onSnapshot(
        ownErrorsQuery,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as DeviceErrorLog);
          list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setDeviceErrors(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'device_errors', auth)
      );

      const unsubOwnTickets = onSnapshot(
        ownTicketsQuery,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as SupportTicket);
          list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          setSupportTickets(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'support_tickets', auth)
      );

      return () => {
        unsubOwnErrors();
        unsubOwnTickets();
      };
    }
  }, [currentUser, profile, isFounder]);

  const clearError = () => setError(null);

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isFirebaseConfigured && auth) {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        const cleanEmail = email.trim().toLowerCase();
        const isFounderUser = isFounderEmail(cleanEmail);
        const mockUid = isFounderUser
          ? 'founder-primary'
          : 'usr-' + cleanEmail.replace(/[^a-z0-9]/gi, '').slice(0, 12);
        const mockUser = {
          uid: mockUid,
          email: cleanEmail,
          emailVerified: true,
          displayName: isFounderUser ? 'Основатель NeuroFactory AI' : cleanEmail.split('@')[0],
        } as unknown as FirebaseUser;

        const currentP: UserProfile = {
          userId: mockUser.uid,
          email: cleanEmail,
          factoryName: isFounderUser ? 'Головной офис NeuroFactory AI' : 'Производственное предприятие',
          region: 'г. Астана',
          emailVerified: true,
          plan: isFounderUser ? 'enterprise' : 'trial',
          accountStatus: 'active',
          billingStatus: 'paid',
          camerasCount: 0,
          sensorsCount: 0,
          machinesCount: 0,
          employeesCount: 0,
          errorsCount: 0,
          updatedAt: new Date().toISOString(),
        };

        setCurrentUser(mockUser);
        setProfile(currentP);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(currentP));
        setEmployees(readScopedJson<FactoryEmployee[]>('employees', mockUid, []));
        setNotifications(readScopedJson<SpecialistNotification[]>('notifications', mockUid, []));
        setCameras(readScopedJson<IndustrialCamera[]>('cameras', mockUid, []));
        setViolations(readScopedJson<PPEViolation[]>('violations', mockUid, []));
        setEcoSensors(readScopedJson<EcoSensor[]>('sensors', mockUid, []));
        setEcoReadings(readScopedJson<EcoReadingEvent[]>('eco_readings', mockUid, []));
        setEcoChartData(readScopedJson<EcoChartPoint[]>('eco_chart', mockUid, []));
        setMachines(readScopedJson<IndustrialMachine[]>('machines', mockUid, []));
        setAllFactories(readScopedJson<UserProfile[]>('platform_factories', 'global', [currentP]));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    pass: string,
    factoryName: string,
    region: string
  ) => {
    setIsLoading(true);
    setError(null);
    isRegisteringRef.current = true;
    try {
      resetToZeroWorkspace();
      if (isFirebaseConfigured && auth && db) {
        const firestore = db;
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;
        try {
          await sendEmailVerification(user);
        } catch {
          // Non-fatal
        }

        const newProfile: UserProfile = {
          userId: user.uid,
          email,
          factoryName: factoryName.trim().slice(0, 120) || 'Новое производственное предприятие',
          region: region.trim().slice(0, 80) || 'г. Астана',
          emailVerified: false,
          plan: 'trial',
          accountStatus: 'active',
          billingStatus: 'pending',
          camerasCount: 0,
          sensorsCount: 0,
          machinesCount: 0,
          employeesCount: 0,
          errorsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const docPath = `factories/${user.uid}`;
        try {
          await setDoc(doc(firestore, 'factories', user.uid), newProfile);
        } catch (writeErr) {
          handleFirestoreError(writeErr, OperationType.CREATE, docPath, auth);
        }

        setProfile(newProfile);
      } else {
        const mockUid = 'usr-' + Date.now().toString(36);
        const mockUser = {
          uid: mockUid,
          email,
          emailVerified: false,
          displayName: email.split('@')[0],
        } as unknown as FirebaseUser;

        const newProfile: UserProfile = {
          userId: mockUser.uid,
          email,
          factoryName: factoryName.trim().slice(0, 120),
          region: region.trim().slice(0, 80),
          emailVerified: false,
          plan: 'trial',
          accountStatus: 'active',
          billingStatus: 'pending',
          camerasCount: 0,
          sensorsCount: 0,
          machinesCount: 0,
          employeesCount: 0,
          errorsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setCurrentUser(mockUser);
        setProfile(newProfile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(newProfile));
        setAllFactories((prev) => {
          const next = [newProfile, ...prev.filter((f) => f.userId !== newProfile.userId)];
          writeScopedJson('platform_factories', 'global', next);
          return next;
        });
        resetToZeroWorkspace();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      throw err;
    } finally {
      isRegisteringRef.current = false;
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    isRegisteringRef.current = true;
    try {
      if (isFirebaseConfigured && auth && db) {
        const firestore = db;
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        const user = res.user;

        if (isFounderEmail(user.email) && user.emailVerified) {
          const adminRef = doc(firestore, 'admins', user.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            await setDoc(adminRef, {
              uid: user.uid,
              email: user.email || PRIMARY_FOUNDER_EMAIL,
              role: 'founder',
              displayName: (user.displayName || 'Основатель NeuroFactory AI').slice(0, 100),
              createdAt: new Date().toISOString(),
            });
          }
        }

        const docPath = `factories/${user.uid}`;
        const docRef = doc(firestore, 'factories', user.uid);
        let snap;
        try {
          snap = await getDoc(docRef);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, docPath, auth);
        }

        if (!snap || !snap.exists()) {
          resetToZeroWorkspace();
          const newProfile: UserProfile = {
            userId: user.uid,
            email: user.email || '',
            factoryName: isFounderEmail(user.email)
              ? 'Головной офис NeuroFactory AI'
              : ('Завод ' + (user.displayName || 'Партнер')).slice(0, 120),
            region: 'г. Астана',
            contactPerson: (user.displayName || '').slice(0, 100),
            emailVerified: user.emailVerified,
            plan: isFounderEmail(user.email) ? 'enterprise' : 'trial',
            accountStatus: 'active',
            billingStatus: isFounderEmail(user.email) ? 'paid' : 'pending',
            camerasCount: 0,
            sensorsCount: 0,
            machinesCount: 0,
            employeesCount: 0,
            errorsCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          try {
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          } catch (wErr) {
            handleFirestoreError(wErr, OperationType.CREATE, docPath, auth);
          }
        } else {
          setProfile(snap.data() as UserProfile);
        }
      } else {
        const mockUid = 'founder-primary';
        const mockUser = {
          uid: mockUid,
          email: PRIMARY_FOUNDER_EMAIL,
          emailVerified: true,
          displayName: 'Основатель NeuroFactory AI',
        } as unknown as FirebaseUser;

        const googleProfile: UserProfile = {
          userId: mockUser.uid,
          email: PRIMARY_FOUNDER_EMAIL,
          factoryName: 'Головной офис NeuroFactory AI',
          region: 'г. Астана',
          contactPerson: 'Дако Асылбек',
          emailVerified: true,
          plan: 'enterprise',
          accountStatus: 'active',
          billingStatus: 'paid',
          camerasCount: 0,
          sensorsCount: 0,
          machinesCount: 0,
          employeesCount: 0,
          errorsCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setCurrentUser(mockUser);
        setProfile(googleProfile);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(googleProfile));
        resetToZeroWorkspace();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      throw err;
    } finally {
      isRegisteringRef.current = false;
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (isFirebaseConfigured && auth) {
        await sendPasswordResetEmail(auth, email);
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      } else if (profile) {
        const updated = { ...profile, emailVerified: true };
        setProfile(updated);
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        await firebaseSignOut(auth);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      }
      setCurrentUser(null);
      setProfile(null);
      resetToZeroWorkspace();
      setAllFactories([]);
      setDeviceErrors([]);
      setSupportTickets([]);
      setAuditLogs([]);
      setInspectedFactories({});
    } finally {
      setIsLoading(false);
    }
  };

  const saveFactoryProfile = async (updatedData: Partial<UserProfile>) => {
    if (!currentUser || !profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const merged: UserProfile = {
        ...profile,
        ...updatedData,
        userId: currentUser.uid,
        updatedAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured && db) {
        const docPath = `factories/${currentUser.uid}`;
        try {
          await setDoc(doc(db, 'factories', currentUser.uid), merged, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, docPath, auth);
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(merged));
      }

      setProfile(merged);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save factory profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addEmployee = async (input: AddEmployeeInput): Promise<FactoryEmployee> => {
    const id = sanitizeId('emp');
    const factoryId = currentUser?.uid || 'guest-factory';
    const creds = generateEmployeeCredentials(input.fullName, profile?.factoryName);

    const authProvisioned =
      isFirebaseConfigured && currentUser
        ? await provisionEmployeeAuthAccount(creds.email, creds.password)
        : false;

    const newEmployee: FactoryEmployee = {
      id,
      factoryId,
      fullName: input.fullName.trim().slice(0, 120),
      specialty: input.specialty.trim().slice(0, 80),
      role: input.role,
      accessLevel: determineEmployeeAccessLevel(input.role),
      department: (input.department.trim() || 'Цех №1').slice(0, 80),
      email: creds.email,
      generatedPassword: creds.password,
      authProvisioned,
      violationsCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/employees/${id}`;
      try {
        await setDoc(doc(db, 'factories', currentUser.uid, 'employees', id), newEmployee);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, docPath, auth);
      }
      await syncOwnFactoryCounts({ employeesCount: employees.length + 1 });
    } else {
      const next = [newEmployee, ...employees];
      setEmployees(next);
      if (currentUser) {
        writeScopedJson('employees', currentUser.uid, next);
        await syncOwnFactoryCounts({ employeesCount: next.length });
      }
    }

    return newEmployee;
  };

  const deleteEmployee = async (employeeId: string): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/employees/${employeeId}`;
      try {
        await deleteDoc(doc(db, 'factories', currentUser.uid, 'employees', employeeId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath, auth);
      }
      await syncOwnFactoryCounts({ employeesCount: Math.max(0, employees.length - 1) });
    } else {
      const next = employees.filter((e) => e.id !== employeeId);
      setEmployees(next);
      if (currentUser) {
        writeScopedJson('employees', currentUser.uid, next);
        await syncOwnFactoryCounts({ employeesCount: next.length });
      }
    }
  };

  const seedSampleStaff = async (): Promise<void> => {
    const factoryId = currentUser?.uid || 'guest-factory';
    const samples = createInitialSampleEmployees(factoryId, profile?.factoryName);

    if (isFirebaseConfigured && db && currentUser) {
      for (const emp of samples) {
        const docPath = `factories/${currentUser.uid}/employees/${emp.id}`;
        try {
          await setDoc(doc(db, 'factories', currentUser.uid, 'employees', emp.id), emp);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, docPath, auth);
        }
      }
      await syncOwnFactoryCounts({ employeesCount: samples.length });
    } else {
      const existingIds = new Set(employees.map((e) => e.id));
      const merged = [...samples.filter((s) => !existingIds.has(s.id)), ...employees];
      setEmployees(merged);
      if (currentUser) {
        writeScopedJson('employees', currentUser.uid, merged);
        await syncOwnFactoryCounts({ employeesCount: merged.length });
      }
    }
  };

  const addSpecialistNotification = async (
    input: NotifySpecialistsInput
  ): Promise<SpecialistNotification> => {
    const id = sanitizeId('notif');
    const factoryId = currentUser?.uid || 'guest-factory';
    const notification = buildViolationNotificationForSpecialists({
      id,
      factoryId,
      title: input.title,
      message: input.message,
      severity: input.severity,
      sourceModule: input.sourceModule,
      employees,
      violatorId: input.violatorId,
      violatorName: input.violatorName,
    });

    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/notifications/${id}`;
      try {
        await setDoc(
          doc(db, 'factories', currentUser.uid, 'notifications', id),
          notification
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, docPath, auth);
      }
    } else {
      const next = [notification, ...notifications];
      setNotifications(next);
      if (currentUser) writeScopedJson('notifications', currentUser.uid, next);
    }

    return notification;
  };

  const recordWorkerViolation = async (
    employeeId: string,
    violationSummary: string
  ): Promise<SpecialistNotification> => {
    const target = employees.find((e) => e.id === employeeId);
    const nowIso = new Date().toISOString();
    const safeSummary = violationSummary.trim().slice(0, 240);
    const nextCount = (target?.violationsCount || 0) + 1;

    if (target) {
      if (isFirebaseConfigured && db && currentUser) {
        const docPath = `factories/${currentUser.uid}/employees/${employeeId}`;
        try {
          await updateDoc(doc(db, 'factories', currentUser.uid, 'employees', employeeId), {
            violationsCount: nextCount,
            lastViolationSummary: safeSummary,
            lastViolationAt: nowIso,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, docPath, auth);
        }
      } else {
        const next = employees.map((emp) =>
          emp.id === employeeId
            ? {
                ...emp,
                violationsCount: nextCount,
                lastViolationSummary: safeSummary,
                lastViolationAt: nowIso,
              }
            : emp
        );
        setEmployees(next);
        if (currentUser) writeScopedJson('employees', currentUser.uid, next);
      }
    }

    const violatorDisplay = target ? `${target.fullName} (${target.specialty})` : 'Сотрудник цеха';
    return addSpecialistNotification({
      title: `Нарушение: ${violatorDisplay}`,
      message: `${safeSummary}. Участок: ${target?.department || 'Цех №1'}. Всего нарушений у сотрудника: ${nextCount}.`,
      severity: 'critical',
      sourceModule: 'SafeVision',
      violatorId: target?.id,
      violatorName: target?.fullName,
    });
  };

  const markNotificationRead = async (notificationId: string): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/notifications/${notificationId}`;
      try {
        await updateDoc(
          doc(db, 'factories', currentUser.uid, 'notifications', notificationId),
          { read: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath, auth);
      }
    } else {
      const next = notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
      setNotifications(next);
      if (currentUser) writeScopedJson('notifications', currentUser.uid, next);
    }
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    if (isFirebaseConfigured && db && currentUser) {
      for (const n of unread) {
        const docPath = `factories/${currentUser.uid}/notifications/${n.id}`;
        try {
          await updateDoc(
            doc(db, 'factories', currentUser.uid, 'notifications', n.id),
            { read: true }
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, docPath, auth);
        }
      }
    } else {
      const next = notifications.map((n) => ({ ...n, read: true }));
      setNotifications(next);
      if (currentUser) writeScopedJson('notifications', currentUser.uid, next);
    }
  };

  // --- Equipment Connection Methods ---

  const connectCamera = async (input: ConnectCameraInput): Promise<IndustrialCamera> => {
    const id = sanitizeId('cam');
    const cleanIp = input.ipAddress?.trim().slice(0, 160);
    const streamUrl = cleanIp
      ? (cleanIp.includes('://') ? cleanIp : `rtsp://${cleanIp}:554/stream1`).slice(0, 240)
      : undefined;
    const newCam: IndustrialCamera & { factoryId?: string; createdAt?: string } = {
      id,
      name: input.name.trim().slice(0, 120),
      area: input.area.trim().slice(0, 80),
      ...(cleanIp ? { ipAddress: cleanIp } : {}),
      ...(streamUrl ? { streamUrl } : {}),
      connectionMethod: input.connectionMethod || (cleanIp ? 'ip' : 'manual'),
      fps: 25,
      resolution: input.resolution || '1920x1080',
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
    };

    if (isFirebaseConfigured && db && currentUser) {
      const docData = {
        ...newCam,
        factoryId: currentUser.uid,
        createdAt: new Date().toISOString(),
      };
      try {
        await setDoc(doc(db, 'factories', currentUser.uid, 'cameras', id), docData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `factories/${currentUser.uid}/cameras/${id}`, auth);
      }
      await syncOwnFactoryCounts({ camerasCount: cameras.length + 1 });
    } else {
      const next = [newCam, ...cameras];
      setCameras(next);
      if (currentUser) {
        writeScopedJson('cameras', currentUser.uid, next);
        await syncOwnFactoryCounts({ camerasCount: next.length });
      }
    }

    return newCam;
  };

  const deleteCamera = async (cameraId: string): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/cameras/${cameraId}`;
      try {
        await deleteDoc(doc(db, 'factories', currentUser.uid, 'cameras', cameraId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath, auth);
      }
      await syncOwnFactoryCounts({ camerasCount: Math.max(0, cameras.length - 1) });
    } else {
      const next = cameras.filter((c) => c.id !== cameraId);
      setCameras(next);
      if (currentUser) {
        writeScopedJson('cameras', currentUser.uid, next);
        await syncOwnFactoryCounts({ camerasCount: next.length });
      }
    }
  };

  const loadDemoCameras = async (): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      for (const cam of INITIAL_CAMERAS) {
        const docData = {
          ...cam,
          factoryId: currentUser.uid,
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(doc(db, 'factories', currentUser.uid, 'cameras', cam.id), docData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `factories/${currentUser.uid}/cameras/${cam.id}`, auth);
        }
      }
      await syncOwnFactoryCounts({ camerasCount: INITIAL_CAMERAS.length });
    } else {
      setCameras(INITIAL_CAMERAS);
      if (currentUser) {
        writeScopedJson('cameras', currentUser.uid, INITIAL_CAMERAS);
        await syncOwnFactoryCounts({ camerasCount: INITIAL_CAMERAS.length });
      }
    }
  };

  const connectEcoSensor = async (input: ConnectEcoSensorInput): Promise<EcoSensor> => {
    const id = sanitizeId('eco');
    const cleanIp = input.ipAddress?.trim().slice(0, 160);
    const defaults = defaultThresholdsForGas(input.code);
    const thresholdWarning = input.thresholdWarning ?? defaults.warning;
    const thresholdCritical = input.thresholdCritical ?? defaults.critical;
    const initialVal = Number((thresholdCritical * 0.42).toFixed(2));
    const status = evaluateEcoSensorStatus(initialVal, thresholdWarning, thresholdCritical);

    const newSensor: EcoSensor & { factoryId?: string } = {
      id,
      name: input.name.trim().slice(0, 120),
      code: input.code,
      unit: defaults.unit,
      ...(cleanIp ? { ipAddress: cleanIp } : {}),
      connectionMethod: input.connectionMethod || (cleanIp ? 'ip' : 'manual'),
      currentValue: initialVal,
      thresholdWarning,
      thresholdCritical,
      area: input.area.trim().slice(0, 80),
      status,
      trend: 'stable',
      lastUpdated: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db && currentUser) {
      const docData = { ...newSensor, factoryId: currentUser.uid };
      try {
        await setDoc(doc(db, 'factories', currentUser.uid, 'sensors', id), docData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `factories/${currentUser.uid}/sensors/${id}`, auth);
      }
      await syncOwnFactoryCounts({ sensorsCount: ecoSensors.length + 1 });
    } else {
      const next = [newSensor, ...ecoSensors];
      setEcoSensors(next);
      if (currentUser) {
        writeScopedJson('sensors', currentUser.uid, next);
        await syncOwnFactoryCounts({ sensorsCount: next.length });
      }
    }

    return newSensor;
  };

  const deleteEcoSensor = async (sensorId: string): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/sensors/${sensorId}`;
      try {
        await deleteDoc(doc(db, 'factories', currentUser.uid, 'sensors', sensorId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath, auth);
      }
      await syncOwnFactoryCounts({ sensorsCount: Math.max(0, ecoSensors.length - 1) });
    } else {
      const next = ecoSensors.filter((s) => s.id !== sensorId);
      setEcoSensors(next);
      if (currentUser) {
        writeScopedJson('sensors', currentUser.uid, next);
        await syncOwnFactoryCounts({ sensorsCount: next.length });
      }
    }
  };

  const loadDemoEcoSensors = async (): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      for (const sensor of INITIAL_ECO_SENSORS) {
        const docData = { ...sensor, factoryId: currentUser.uid };
        try {
          await setDoc(doc(db, 'factories', currentUser.uid, 'sensors', sensor.id), docData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `factories/${currentUser.uid}/sensors/${sensor.id}`, auth);
        }
      }
      await syncOwnFactoryCounts({ sensorsCount: INITIAL_ECO_SENSORS.length });
    } else {
      setEcoSensors(INITIAL_ECO_SENSORS);
      setEcoChartData(INITIAL_ECO_CHART_DATA);
      if (currentUser) {
        writeScopedJson('sensors', currentUser.uid, INITIAL_ECO_SENSORS);
        await syncOwnFactoryCounts({ sensorsCount: INITIAL_ECO_SENSORS.length });
      }
    }
  };

  const connectMachine = async (input: ConnectMachineInput): Promise<IndustrialMachine> => {
    const id = sanitizeId('mach');
    const cleanIp = input.ipAddress?.trim().slice(0, 160);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMachine: IndustrialMachine = {
      id,
      name: input.name.trim().slice(0, 120),
      type: input.type.trim().slice(0, 100),
      area: input.area.trim().slice(0, 80),
      ...(cleanIp ? { ipAddress: cleanIp } : {}),
      connectionMethod: input.connectionMethod || (cleanIp ? 'ip' : 'manual'),
      installedYear: input.installedYear || new Date().getFullYear(),
      temperatureC: 46.5,
      temperatureBaselineC: 45.0,
      vibrationRmsMmS: 1.4,
      vibrationBaselineMmS: 1.2,
      peakFrequencyHz: 145,
      riskStatus: 'low',
      failureProbabilityPercent: 8,
      remainingUsefulLifeHours: 1320,
      recommendations: {
        ru: 'Оборудование подключено к вибродиагностике. Показатели в штатной зоне ISO 10816-3.',
        kz: 'Жабдық діріл диагностикасына қосылды. Көрсеткіштер ISO 10816-3 қалыпты аймағында.',
      },
      hasActiveWorkOrder: false,
      lastInspectionDate: new Date().toISOString().slice(0, 10),
      telemetryHistory: [
        { time: '08:00', temp: 45.2, vibration: 1.2 },
        { time: '12:00', temp: 46.0, vibration: 1.3 },
        { time: nowTime, temp: 46.5, vibration: 1.4 },
      ],
    };

    if (isFirebaseConfigured && db && currentUser) {
      const docData = { ...newMachine, factoryId: currentUser.uid };
      try {
        await setDoc(doc(db, 'factories', currentUser.uid, 'machines', id), docData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `factories/${currentUser.uid}/machines/${id}`, auth);
      }
      await syncOwnFactoryCounts({ machinesCount: machines.length + 1 });
    } else {
      const next = [newMachine, ...machines];
      setMachines(next);
      if (currentUser) {
        writeScopedJson('machines', currentUser.uid, next);
        await syncOwnFactoryCounts({ machinesCount: next.length });
      }
    }

    return newMachine;
  };

  const deleteMachine = async (machineId: string): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      const docPath = `factories/${currentUser.uid}/machines/${machineId}`;
      try {
        await deleteDoc(doc(db, 'factories', currentUser.uid, 'machines', machineId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, docPath, auth);
      }
      await syncOwnFactoryCounts({ machinesCount: Math.max(0, machines.length - 1) });
    } else {
      const next = machines.filter((m) => m.id !== machineId);
      setMachines(next);
      if (currentUser) {
        writeScopedJson('machines', currentUser.uid, next);
        await syncOwnFactoryCounts({ machinesCount: next.length });
      }
    }
  };

  const loadDemoMachines = async (): Promise<void> => {
    if (isFirebaseConfigured && db && currentUser) {
      for (const m of INITIAL_MACHINES) {
        const docData = { ...m, factoryId: currentUser.uid };
        try {
          await setDoc(doc(db, 'factories', currentUser.uid, 'machines', m.id), docData);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `factories/${currentUser.uid}/machines/${m.id}`, auth);
        }
      }
      await syncOwnFactoryCounts({ machinesCount: INITIAL_MACHINES.length });
    } else {
      setMachines(INITIAL_MACHINES);
      if (currentUser) {
        writeScopedJson('machines', currentUser.uid, INITIAL_MACHINES);
        await syncOwnFactoryCounts({ machinesCount: INITIAL_MACHINES.length });
      }
    }
  };

  const updateViolationStatus = (id: string, newStatus: VerificationStatus) => {
    setViolations((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, status: newStatus } : v));
      if (currentUser) writeScopedJson('violations', currentUser.uid, next);
      return next;
    });
  };

  const prependViolation = (violation: PPEViolation, cameraIdToIncrement?: string) => {
    setViolations((prev) => {
      const next = [violation, ...prev];
      if (currentUser) writeScopedJson('violations', currentUser.uid, next);
      return next;
    });
    if (cameraIdToIncrement) {
      setCameras((prev) =>
        prev.map((cam) =>
          cam.id === cameraIdToIncrement
            ? {
                ...cam,
                currentDetections: {
                  ...cam.currentDetections,
                  helmetsMissing: cam.currentDetections.helmetsMissing + 1,
                },
              }
            : cam
        )
      );
    }
  };

  const prependEcoReading = (
    reading: EcoReadingEvent,
    sensorCode?: EcoSensor['code'],
    newValue?: number
  ) => {
    setEcoReadings((prev) => {
      const next = [reading, ...prev];
      if (currentUser) writeScopedJson('eco_readings', currentUser.uid, next);
      return next;
    });
    if (sensorCode && newValue !== undefined) {
      setEcoSensors((prev) =>
        prev.map((s) =>
          s.code === sensorCode
            ? { ...s, currentValue: newValue, status: 'critical' as const, trend: 'up' as const }
            : s
        )
      );
    }
  };

  const dispatchWorkOrder = (machineId: string) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === machineId ? { ...m, hasActiveWorkOrder: true } : m))
    );
  };

  const triggerMachineAnomaly = (machineId: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMachines((prev) =>
      prev.map((m) =>
        m.id === machineId
          ? {
              ...m,
              vibrationRmsMmS: 8.4,
              temperatureC: 86.0,
              riskStatus: 'critical' as const,
              failureProbabilityPercent: 94,
              remainingUsefulLifeHours: 24,
              telemetryHistory: [
                ...m.telemetryHistory.slice(-20),
                { time: nowTime, temp: 86.0, vibration: 8.4 },
              ],
            }
          : m
      )
    );
  };

  // --- Founder Governance & Operations Methods ---

  const inspectFactoryDetails = useCallback(
    async (factoryId: string): Promise<FactoryInspectionData> => {
      setIsInspectingFactory(true);
      try {
        if (isFirebaseConfigured && db) {
          const [camSnap, senSnap, machSnap, empSnap, notifSnap] = await Promise.all([
            getDocs(collection(db, 'factories', factoryId, 'cameras')),
            getDocs(collection(db, 'factories', factoryId, 'sensors')),
            getDocs(collection(db, 'factories', factoryId, 'machines')),
            getDocs(collection(db, 'factories', factoryId, 'employees')),
            getDocs(collection(db, 'factories', factoryId, 'notifications')),
          ]);

          const data: FactoryInspectionData = {
            factoryId,
            cameras: camSnap.docs.map((d) => ({ ...(d.data() as IndustrialCamera), factoryId })),
            sensors: senSnap.docs.map((d) => ({ ...(d.data() as EcoSensor), factoryId })),
            machines: machSnap.docs.map((d) => ({ ...(d.data() as IndustrialMachine), factoryId })),
            employees: empSnap.docs.map((d) => d.data() as FactoryEmployee),
            notifications: notifSnap.docs.map((d) => d.data() as SpecialistNotification),
            loadedAt: new Date().toISOString(),
          };

          setInspectedFactories((prev) => ({ ...prev, [factoryId]: data }));

          // Update cached counters on the factory doc if Founder is inspecting
          if (isFounder) {
            updateDoc(doc(db, 'factories', factoryId), {
              camerasCount: data.cameras.length,
              sensorsCount: data.sensors.length,
              machinesCount: data.machines.length,
              employeesCount: data.employees.length,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
          }

          return data;
        } else {
          const existingLocal = inspectedFactories[factoryId] || {
            factoryId,
            cameras: readScopedJson<IndustrialCamera[]>('cameras', factoryId, []),
            sensors: readScopedJson<EcoSensor[]>('sensors', factoryId, []),
            machines: readScopedJson<IndustrialMachine[]>('machines', factoryId, []),
            employees: readScopedJson<FactoryEmployee[]>('employees', factoryId, []),
            notifications: readScopedJson<SpecialistNotification[]>('notifications', factoryId, []),
            loadedAt: new Date().toISOString(),
          };
          setInspectedFactories((prev) => ({ ...prev, [factoryId]: existingLocal }));
          return existingLocal;
        }
      } finally {
        setIsInspectingFactory(false);
      }
    },
    [inspectedFactories, isFounder]
  );

  const loadAllFactoriesTelemetry = useCallback(async () => {
    if (!allFactories.length) return;
    setIsInspectingFactory(true);
    try {
      await Promise.all(allFactories.slice(0, 25).map((f) => inspectFactoryDetails(f.userId)));
    } finally {
      setIsInspectingFactory(false);
    }
  }, [allFactories, inspectFactoryDetails]);

  const updateFactoryGovernance = async (
    factoryId: string,
    updates: {
      plan?: FactoryPlan;
      accountStatus?: FactoryAccountStatus;
      billingStatus?: BillingStatus;
    }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const targetFactory = allFactories.find((f) => f.userId === factoryId);
    const cleanUpdates: Record<string, string> = { updatedAt: nowIso };
    if (updates.plan) cleanUpdates.plan = updates.plan;
    if (updates.accountStatus) cleanUpdates.accountStatus = updates.accountStatus;
    if (updates.billingStatus) cleanUpdates.billingStatus = updates.billingStatus;

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'factories', factoryId), cleanUpdates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `factories/${factoryId}`, auth);
      }
    } else {
      setAllFactories((prev) => {
        const next = prev.map((f) => (f.userId === factoryId ? { ...f, ...cleanUpdates } : f));
        writeScopedJson('platform_factories', 'global', next);
        return next;
      });
    }

    await recordAudit(
      'Изменение параметров завода',
      'factory',
      targetFactory?.factoryName || factoryId,
      JSON.stringify(updates)
    );
  };

  const deleteFactoryRecord = async (factoryId: string): Promise<void> => {
    const targetFactory = allFactories.find((f) => f.userId === factoryId);
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'factories', factoryId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `factories/${factoryId}`, auth);
      }
    } else {
      setAllFactories((prev) => {
        const next = prev.filter((f) => f.userId !== factoryId);
        writeScopedJson('platform_factories', 'global', next);
        return next;
      });
    }
    await recordAudit(
      'Удаление записи предприятия',
      'factory',
      targetFactory?.factoryName || factoryId,
      `Удален UID ${factoryId}`
    );
  };

  const logDeviceError = async (input: LogDeviceErrorInput): Promise<DeviceErrorLog> => {
    const id = sanitizeId('err');
    const cleanIp = input.ipAddress?.trim().slice(0, 160);
    const newErr: DeviceErrorLog = {
      id,
      factoryId: input.factoryId,
      factoryName: input.factoryName.slice(0, 120),
      deviceId: input.deviceId.slice(0, 128),
      deviceName: input.deviceName.slice(0, 120),
      deviceType: input.deviceType,
      ...(cleanIp ? { ipAddress: cleanIp } : {}),
      module: input.module,
      errorCode: input.errorCode.slice(0, 48),
      message: input.message.slice(0, 400),
      severity: input.severity,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'device_errors', id), newErr);
        const factory = allFactories.find((f) => f.userId === input.factoryId);
        if (factory) {
          await updateDoc(doc(db, 'factories', input.factoryId), {
            errorsCount: (factory.errorsCount || 0) + 1,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `device_errors/${id}`, auth);
      }
    } else {
      setDeviceErrors((prev) => {
        const next = [newErr, ...prev];
        writeScopedJson('platform_errors', 'global', next);
        return next;
      });
    }

    await recordAudit(
      'Регистрация сбоя устройства',
      'error',
      `${input.deviceName} (${input.factoryName})`,
      `${input.errorCode}: ${input.message}`
    );

    return newErr;
  };

  const updateDeviceErrorStatus = async (
    errorId: string,
    status: DeviceErrorStatus,
    resolutionNote?: string
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const targetErr = deviceErrors.find((e) => e.id === errorId);
    const cleanNote = resolutionNote?.trim().slice(0, 300);

    const payload: Record<string, string> = { status };
    if (cleanNote) payload.resolutionNote = cleanNote;
    if (status === 'resolved') payload.resolvedAt = nowIso;

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'device_errors', errorId), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `device_errors/${errorId}`, auth);
      }
    } else {
      setDeviceErrors((prev) => {
        const next = prev.map((e) => (e.id === errorId ? { ...e, ...payload } : e));
        writeScopedJson('platform_errors', 'global', next);
        return next;
      });
    }

    await recordAudit(
      `Статус ошибки -> ${status}`,
      'error',
      targetErr ? `${targetErr.deviceName} (${targetErr.errorCode})` : errorId,
      cleanNote || 'Обновление статуса инцидента оборудования'
    );
  };

  const createSupportTicket = async (
    input: CreateSupportTicketInput
  ): Promise<SupportTicket> => {
    const id = sanitizeId('tkt');
    const nowIso = new Date().toISOString();
    const factoryId = input.factoryId || currentUser?.uid || 'guest-factory';
    const factoryName = (input.factoryName || profile?.factoryName || 'Предприятие').slice(0, 120);
    const desc = input.description.trim().slice(0, 1000);

    const newTicket: SupportTicket = {
      id,
      factoryId,
      factoryName,
      ...(currentUser?.email ? { reporterEmail: currentUser.email.slice(0, 120) } : {}),
      subject: input.subject.trim().slice(0, 160),
      category: input.category,
      priority: input.priority,
      status: 'open',
      description: desc,
      repliesCount: 1,
      lastMessagePreview: desc.slice(0, 290),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const initialMsg: SupportTicketMessage = {
      id: sanitizeId('msg'),
      ticketId: id,
      factoryId,
      senderEmail: (currentUser?.email || 'factory@neurofactory.kz').slice(0, 120),
      senderRole: isFounder ? 'founder' : 'factory',
      text: desc,
      createdAt: nowIso,
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'support_tickets', id), newTicket);
        await setDoc(doc(db, 'support_tickets', id, 'messages', initialMsg.id), initialMsg);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `support_tickets/${id}`, auth);
      }
    } else {
      setSupportTickets((prev) => {
        const next = [newTicket, ...prev];
        writeScopedJson('platform_tickets', 'global', next);
        return next;
      });
      writeScopedJson(`ticket_msgs_${id}`, 'global', [initialMsg]);
    }

    if (isFounder) {
      await recordAudit('Создание тикета ТП', 'ticket', newTicket.subject, factoryName);
    }

    return newTicket;
  };

  const updateSupportTicket = async (
    ticketId: string,
    updates: { status?: SupportTicketStatus; priority?: SupportTicketPriority }
  ): Promise<void> => {
    const nowIso = new Date().toISOString();
    const target = supportTickets.find((tk) => tk.id === ticketId);
    const payload: Record<string, string> = { updatedAt: nowIso };
    if (updates.status) payload.status = updates.status;
    if (updates.priority) payload.priority = updates.priority;

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'support_tickets', ticketId), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `support_tickets/${ticketId}`, auth);
      }
    } else {
      setSupportTickets((prev) => {
        const next = prev.map((tk) => (tk.id === ticketId ? { ...tk, ...payload } : tk));
        writeScopedJson('platform_tickets', 'global', next);
        return next;
      });
    }

    if (isFounder) {
      await recordAudit(
        'Обновление тикета ТП',
        'ticket',
        target?.subject || ticketId,
        JSON.stringify(updates)
      );
    }
  };

  const subscribeTicketMessages = useCallback(
    (ticketId: string, onMessages: (msgs: SupportTicketMessage[]) => void): (() => void) => {
      if (isFirebaseConfigured && db) {
        const q = collection(db, 'support_tickets', ticketId, 'messages');
        const unsub = onSnapshot(
          q,
          (snap) => {
            const list = snap.docs.map((d) => d.data() as SupportTicketMessage);
            list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
            onMessages(list);
          },
          (err) => {
            handleFirestoreError(err, OperationType.LIST, `support_tickets/${ticketId}/messages`, auth);
          }
        );
        return unsub;
      } else {
        const localMsgs = readScopedJson<SupportTicketMessage[]>(`ticket_msgs_${ticketId}`, 'global', []);
        onMessages(localMsgs);
        return () => {};
      }
    },
    []
  );

  const replyToSupportTicket = async (
    ticketId: string,
    text: string
  ): Promise<SupportTicketMessage> => {
    const target = supportTickets.find((tk) => tk.id === ticketId);
    const nowIso = new Date().toISOString();
    const cleanText = text.trim().slice(0, 1000);

    const msg: SupportTicketMessage = {
      id: sanitizeId('msg'),
      ticketId,
      factoryId: target?.factoryId || currentUser?.uid || 'guest-factory',
      senderEmail: (currentUser?.email || PRIMARY_FOUNDER_EMAIL).slice(0, 120),
      senderRole: isFounder ? 'founder' : 'factory',
      text: cleanText,
      createdAt: nowIso,
    };

    const nextRepliesCount = Math.min(500, (target?.repliesCount || 0) + 1);
    const ticketUpdates: Partial<SupportTicket> = {
      repliesCount: nextRepliesCount,
      lastMessagePreview: cleanText.slice(0, 290),
      updatedAt: nowIso,
      ...(isFounder && target?.status === 'open' ? { status: 'in_progress' } : {}),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'support_tickets', ticketId, 'messages', msg.id), msg);
        await updateDoc(doc(db, 'support_tickets', ticketId), ticketUpdates);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.CREATE,
          `support_tickets/${ticketId}/messages/${msg.id}`,
          auth
        );
      }
    } else {
      const existingMsgs = readScopedJson<SupportTicketMessage[]>(
        `ticket_msgs_${ticketId}`,
        'global',
        []
      );
      writeScopedJson(`ticket_msgs_${ticketId}`, 'global', [...existingMsgs, msg]);
      setSupportTickets((prev) => {
        const next = prev.map((tk) => (tk.id === ticketId ? { ...tk, ...ticketUpdates } : tk));
        writeScopedJson('platform_tickets', 'global', next);
        return next;
      });
    }

    return msg;
  };

  const updatePlatformSettings = async (nextPartial: Partial<PlatformSettings>): Promise<void> => {
    const merged: PlatformSettings = {
      ...platformSettings,
      ...nextPartial,
      id: 'global',
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'platform_settings', 'global'), merged);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'platform_settings/global', auth);
      }
    } else {
      writeScopedJson('platform_settings', 'global', merged);
    }

    setPlatformSettings(merged);
    await recordAudit(
      'Обновление настроек платформы',
      'settings',
      merged.platformName,
      `Обслуживание: ${merged.maintenanceMode ? 'ВКЛ' : 'ВЫКЛ'}, Модель: ${merged.aiModelVersion}`
    );
  };

  const addPlatformAdmin = async (
    uid: string,
    email: string,
    displayName?: string
  ): Promise<void> => {
    const cleanUid = uid.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanUid || !cleanEmail) return;

    const newAdmin: AdminUser = {
      uid: cleanUid,
      email: cleanEmail.slice(0, 120),
      role: 'admin',
      ...(displayName?.trim() ? { displayName: displayName.trim().slice(0, 100) } : {}),
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'admins', cleanUid), newAdmin);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `admins/${cleanUid}`, auth);
      }
    } else {
      setPlatformAdmins((prev) => {
        const next = [newAdmin, ...prev.filter((a) => a.uid !== cleanUid)];
        writeScopedJson('platform_admins', 'global', next);
        return next;
      });
    }

    await recordAudit('Выдача прав администратора', 'admin', cleanEmail, `UID: ${cleanUid}`);
  };

  const removePlatformAdmin = async (adminUid: string): Promise<void> => {
    if (currentUser?.uid === adminUid) return;
    const target = platformAdmins.find((a) => a.uid === adminUid);
    if (isFirebaseConfigured && db) {
      try {
        await deleteDoc(doc(db, 'admins', adminUid));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `admins/${adminUid}`, auth);
      }
    } else {
      setPlatformAdmins((prev) => {
        const next = prev.filter((a) => a.uid !== adminUid);
        writeScopedJson('platform_admins', 'global', next);
        return next;
      });
    }

    await recordAudit(
      'Отзыв прав администратора',
      'admin',
      target?.email || adminUid,
      `Удален UID: ${adminUid}`
    );
  };

  const seedFounderSampleWorkspace = async (): Promise<void> => {
    const now = Date.now();
    const sampleFactories: Array<{
      profile: UserProfile;
      cameras: IndustrialCamera[];
      sensors: EcoSensor[];
      machines: IndustrialMachine[];
      employees: FactoryEmployee[];
    }> = [
      {
        profile: {
          userId: 'fac-karaganda-steel',
          email: 'dispatch@karmet-prom.kz',
          factoryName: 'ТОО «Сарыарка СтальПром»',
          region: 'Карагандинская область',
          industrySector: 'Черная и цветная металлургия',
          contactPerson: 'Алихан Сериков',
          contactPhone: '+7 (7212) 55-14-90',
          emailVerified: true,
          plan: 'enterprise',
          accountStatus: 'active',
          billingStatus: 'paid',
          camerasCount: 3,
          sensorsCount: 2,
          machinesCount: 2,
          employeesCount: 4,
          errorsCount: 2,
          createdAt: new Date(now - 86400000 * 18).toISOString(),
          updatedAt: new Date(now - 3600000).toISOString(),
        },
        cameras: INITIAL_CAMERAS.map((c) => ({ ...c, factoryId: 'fac-karaganda-steel' })),
        sensors: INITIAL_ECO_SENSORS.slice(0, 2).map((s) => ({
          ...s,
          factoryId: 'fac-karaganda-steel',
        })),
        machines: INITIAL_MACHINES.slice(0, 2).map((m) => ({
          ...m,
          factoryId: 'fac-karaganda-steel',
        })),
        employees: createInitialSampleEmployees('fac-karaganda-steel', 'ТОО «Сарыарка СтальПром»'),
      },
      {
        profile: {
          userId: 'fac-pavlodar-alumina',
          email: 'safety@ertis-alumina.kz',
          factoryName: 'АО «Ертіс Алюминий»',
          region: 'Павлодарская область',
          industrySector: 'Черная и цветная металлургия',
          contactPerson: 'Ермек Касымбеков',
          contactPhone: '+7 (7182) 32-80-11',
          emailVerified: true,
          plan: 'pro',
          accountStatus: 'active',
          billingStatus: 'paid',
          camerasCount: 2,
          sensorsCount: 2,
          machinesCount: 1,
          employeesCount: 4,
          errorsCount: 1,
          createdAt: new Date(now - 86400000 * 11).toISOString(),
          updatedAt: new Date(now - 7200000).toISOString(),
        },
        cameras: INITIAL_CAMERAS.slice(0, 2).map((c, idx) => ({
          ...c,
          id: `cam-pvl-${idx + 1}`,
          factoryId: 'fac-pavlodar-alumina',
          ipAddress: `10.14.22.${40 + idx}:554`,
          connectionMethod: idx === 0 ? 'ip' : 'qr',
          status: idx === 1 ? 'offline' : 'active',
        })),
        sensors: INITIAL_ECO_SENSORS.slice(1, 3).map((s, idx) => ({
          ...s,
          id: `eco-pvl-${idx + 1}`,
          factoryId: 'fac-pavlodar-alumina',
        })),
        machines: INITIAL_MACHINES.slice(0, 1).map((m) => ({
          ...m,
          id: 'mach-pvl-1',
          factoryId: 'fac-pavlodar-alumina',
        })),
        employees: createInitialSampleEmployees('fac-pavlodar-alumina', 'АО «Ертіс Алюминий»'),
      },
      {
        profile: {
          userId: 'fac-atyrau-neft',
          email: 'asu@caspiy-neftekhim.kz',
          factoryName: 'ТОО «Каспий НефтеХим Переработка»',
          region: 'Атырауская область',
          industrySector: 'Нефтегазопереработка и нефтехимия',
          contactPerson: 'Нурлан Жумабаев',
          contactPhone: '+7 (7122) 70-44-05',
          emailVerified: true,
          plan: 'trial',
          accountStatus: 'pending',
          billingStatus: 'overdue',
          camerasCount: 1,
          sensorsCount: 1,
          machinesCount: 1,
          employeesCount: 4,
          errorsCount: 1,
          createdAt: new Date(now - 86400000 * 4).toISOString(),
          updatedAt: new Date(now - 10800000).toISOString(),
        },
        cameras: [
          {
            ...INITIAL_CAMERAS[0],
            id: 'cam-atr-1',
            factoryId: 'fac-atyrau-neft',
            name: 'CAM-AT-01 Эстакада налива',
            area: 'Резервуарный парк',
            ipAddress: '172.20.8.15:554',
            connectionMethod: 'qr',
          },
        ],
        sensors: [
          {
            ...INITIAL_ECO_SENSORS[0],
            id: 'eco-atr-1',
            factoryId: 'fac-atyrau-neft',
          },
        ],
        machines: [
          {
            ...INITIAL_MACHINES[0],
            id: 'mach-atr-1',
            factoryId: 'fac-atyrau-neft',
          },
        ],
        employees: createInitialSampleEmployees('fac-atyrau-neft', 'ТОО «Каспий НефтеХим»'),
      },
    ];

    const sampleErrors: DeviceErrorLog[] = [
      {
        id: 'err-sample-rtsp-1',
        factoryId: 'fac-karaganda-steel',
        factoryName: 'ТОО «Сарыарка СтальПром»',
        deviceId: 'cam-02',
        deviceName: 'CAM-02 Литейный двор',
        deviceType: 'camera',
        ipAddress: '192.168.10.46:554',
        module: 'SafeVision',
        errorCode: 'RTSP_STREAM_DROP',
        message: 'Потеря RTSP-потока (таймаут 15с) при высокой запыленности в пролете.',
        severity: 'critical',
        status: 'open',
        createdAt: new Date(now - 1000 * 60 * 18).toISOString(),
      },
      {
        id: 'err-sample-yolo-2',
        factoryId: 'fac-pavlodar-alumina',
        factoryName: 'АО «Ертіс Алюминий»',
        deviceId: 'cam-pvl-2',
        deviceName: 'CAM-02 Печь кальцинации',
        deviceType: 'camera',
        ipAddress: '10.14.22.41:554',
        module: 'SafeVision',
        errorCode: 'INFERENCE_FPS_LOW',
        message: 'Падение скорости YOLOv11 Edge ниже 6 FPS на узле обработки видеопотока.',
        severity: 'warning',
        status: 'investigating',
        createdAt: new Date(now - 1000 * 60 * 75).toISOString(),
      },
      {
        id: 'err-sample-modbus-3',
        factoryId: 'fac-karaganda-steel',
        factoryName: 'ТОО «Сарыарка СтальПром»',
        deviceId: 'eco-so2-1',
        deviceName: 'Пост №1 Дымовая труба (SO₂)',
        deviceType: 'sensor',
        ipAddress: '192.168.20.14:502',
        module: 'EcoPredict',
        errorCode: 'MODBUS_CRC_ERR',
        message: 'Периодическая ошибка контрольной суммы Modbus TCP от газоанализатора.',
        severity: 'warning',
        status: 'open',
        createdAt: new Date(now - 1000 * 60 * 140).toISOString(),
      },
      {
        id: 'err-sample-plc-4',
        factoryId: 'fac-atyrau-neft',
        factoryName: 'ТОО «Каспий НефтеХим Переработка»',
        deviceId: 'mach-atr-1',
        deviceName: 'Насосный агрегат ЦН-120',
        deviceType: 'machine',
        ipAddress: '172.20.8.80:4840',
        module: 'FailPredict',
        errorCode: 'OPCUA_AUTH_FAIL',
        message: 'Истек сертификат OPC-UA шлюза для передачи виброспектра.',
        severity: 'critical',
        status: 'open',
        createdAt: new Date(now - 1000 * 60 * 220).toISOString(),
      },
    ];

    const sampleTickets: Array<{ ticket: SupportTicket; messages: SupportTicketMessage[] }> = [
      {
        ticket: {
          id: 'tkt-sample-1',
          factoryId: 'fac-karaganda-steel',
          factoryName: 'ТОО «Сарыарка СтальПром»',
          reporterEmail: 'dispatch@karmet-prom.kz',
          subject: 'Обрыв RTSP потока на камере CAM-02 после обновления прошивки',
          category: 'cameras',
          priority: 'urgent',
          status: 'open',
          description:
            'Здравствуйте! После ночной перезагрузки коммутатора камера 192.168.10.46:554 отдает ошибку RTSP_STREAM_DROP каждые 3 минуты.',
          repliesCount: 2,
          lastMessagePreview: 'Инженер приложил трассировку порта 554, ждем рекомендаций.',
          createdAt: new Date(now - 1000 * 60 * 42).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 15).toISOString(),
        },
        messages: [
          {
            id: 'msg-s1-1',
            ticketId: 'tkt-sample-1',
            factoryId: 'fac-karaganda-steel',
            senderEmail: 'dispatch@karmet-prom.kz',
            senderRole: 'factory',
            text: 'Здравствуйте! После ночной перезагрузки коммутатора камера 192.168.10.46:554 отдает ошибку RTSP_STREAM_DROP каждые 3 минуты.',
            createdAt: new Date(now - 1000 * 60 * 42).toISOString(),
          },
          {
            id: 'msg-s1-2',
            ticketId: 'tkt-sample-1',
            factoryId: 'fac-karaganda-steel',
            senderEmail: 'dispatch@karmet-prom.kz',
            senderRole: 'factory',
            text: 'Инженер приложил трассировку порта 554, ждем рекомендаций по буферу TCP.',
            createdAt: new Date(now - 1000 * 60 * 15).toISOString(),
          },
        ],
      },
      {
        ticket: {
          id: 'tkt-sample-2',
          factoryId: 'fac-pavlodar-alumina',
          factoryName: 'АО «Ертіс Алюминий»',
          reporterEmail: 'safety@ertis-alumina.kz',
          subject: 'Расширение квоты сотрудников до 120 человек на тарифе Pro',
          category: 'employees',
          priority: 'high',
          status: 'in_progress',
          description:
            'Просим увеличить лимит рабочих и инженеров для второго электролизного корпуса.',
          repliesCount: 2,
          lastMessagePreview: 'Проверяем заявку на расширение квоты, обновим в течение часа.',
          createdAt: new Date(now - 1000 * 60 * 190).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 50).toISOString(),
        },
        messages: [
          {
            id: 'msg-s2-1',
            ticketId: 'tkt-sample-2',
            factoryId: 'fac-pavlodar-alumina',
            senderEmail: 'safety@ertis-alumina.kz',
            senderRole: 'factory',
            text: 'Просим увеличить лимит рабочих и инженеров для второго электролизного корпуса.',
            createdAt: new Date(now - 1000 * 60 * 190).toISOString(),
          },
          {
            id: 'msg-s2-2',
            ticketId: 'tkt-sample-2',
            factoryId: 'fac-pavlodar-alumina',
            senderEmail: PRIMARY_FOUNDER_EMAIL,
            senderRole: 'founder',
            text: 'Проверяем заявку на расширение квоты, обновим параметры подписки в течение часа.',
            createdAt: new Date(now - 1000 * 60 * 50).toISOString(),
          },
        ],
      },
      {
        ticket: {
          id: 'tkt-sample-3',
          factoryId: 'fac-atyrau-neft',
          factoryName: 'ТОО «Каспий НефтеХим Переработка»',
          reporterEmail: 'asu@caspiy-neftekhim.kz',
          subject: 'Счет на переход с Trial на Industrial Pro',
          category: 'billing',
          priority: 'normal',
          status: 'open',
          description: 'Необходим счет на оплату годовой подписки Industrial Pro и акт сверки.',
          repliesCount: 1,
          lastMessagePreview: 'Необходим счет на оплату годовой подписки Industrial Pro.',
          createdAt: new Date(now - 1000 * 60 * 320).toISOString(),
          updatedAt: new Date(now - 1000 * 60 * 320).toISOString(),
        },
        messages: [
          {
            id: 'msg-s3-1',
            ticketId: 'tkt-sample-3',
            factoryId: 'fac-atyrau-neft',
            senderEmail: 'asu@caspiy-neftekhim.kz',
            senderRole: 'factory',
            text: 'Необходим счет на оплату годовой подписки Industrial Pro и акт сверки.',
            createdAt: new Date(now - 1000 * 60 * 320).toISOString(),
          },
        ],
      },
    ];

    if (isFirebaseConfigured && db) {
      for (const item of sampleFactories) {
        const fid = item.profile.userId;
        await setDoc(doc(db, 'factories', fid), item.profile);
        for (const cam of item.cameras) {
          await setDoc(doc(db, 'factories', fid, 'cameras', cam.id), { ...cam, factoryId: fid });
        }
        for (const sen of item.sensors) {
          await setDoc(doc(db, 'factories', fid, 'sensors', sen.id), { ...sen, factoryId: fid });
        }
        for (const mach of item.machines) {
          await setDoc(doc(db, 'factories', fid, 'machines', mach.id), { ...mach, factoryId: fid });
        }
        for (const emp of item.employees) {
          await setDoc(doc(db, 'factories', fid, 'employees', emp.id), emp);
        }
      }
      for (const err of sampleErrors) {
        await setDoc(doc(db, 'device_errors', err.id), err);
      }
      for (const entry of sampleTickets) {
        await setDoc(doc(db, 'support_tickets', entry.ticket.id), entry.ticket);
        for (const m of entry.messages) {
          await setDoc(doc(db, 'support_tickets', entry.ticket.id, 'messages', m.id), m);
        }
      }
    } else {
      const mergedFactories = [
        ...sampleFactories.map((s) => s.profile),
        ...allFactories.filter((f) => !sampleFactories.some((s) => s.profile.userId === f.userId)),
      ];
      setAllFactories(mergedFactories);
      writeScopedJson('platform_factories', 'global', mergedFactories);

      for (const item of sampleFactories) {
        writeScopedJson('cameras', item.profile.userId, item.cameras);
        writeScopedJson('sensors', item.profile.userId, item.sensors);
        writeScopedJson('machines', item.profile.userId, item.machines);
        writeScopedJson('employees', item.profile.userId, item.employees);
        setInspectedFactories((prev) => ({
          ...prev,
          [item.profile.userId]: {
            factoryId: item.profile.userId,
            cameras: item.cameras,
            sensors: item.sensors,
            machines: item.machines,
            employees: item.employees,
            notifications: [],
            loadedAt: new Date().toISOString(),
          },
        }));
      }

      setDeviceErrors(sampleErrors);
      writeScopedJson('platform_errors', 'global', sampleErrors);

      const ticketList = sampleTickets.map((s) => s.ticket);
      setSupportTickets(ticketList);
      writeScopedJson('platform_tickets', 'global', ticketList);
      for (const s of sampleTickets) {
        writeScopedJson(`ticket_msgs_${s.ticket.id}`, 'global', s.messages);
      }
    }

    await recordAudit(
      'Инициализация тестовой базы платформы',
      'settings',
      'NeuroFactory Platform',
      'Создано 3 завода, 6 камер, 4 ошибки оборудования и 3 тикета ТП'
    );
  };

  const unreadCount = countUnreadNotifications(notifications);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        isFounder,
        isLoading,
        isFirebaseReady: isFirebaseConfigured,
        error,
        employees,
        notifications,
        unreadCount,
        cameras,
        violations,
        ecoSensors,
        ecoReadings,
        ecoChartData,
        machines,
        allFactories,
        deviceErrors,
        supportTickets,
        auditLogs,
        platformAdmins,
        platformSettings,
        inspectedFactories,
        isInspectingFactory,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPasswordReset,
        resendVerificationEmail,
        logout,
        saveFactoryProfile,
        addEmployee,
        deleteEmployee,
        seedSampleStaff,
        recordWorkerViolation,
        addSpecialistNotification,
        markNotificationRead,
        markAllNotificationsRead,
        connectCamera,
        deleteCamera,
        connectEcoSensor,
        deleteEcoSensor,
        connectMachine,
        deleteMachine,
        loadDemoCameras,
        loadDemoEcoSensors,
        loadDemoMachines,
        updateViolationStatus,
        prependViolation,
        prependEcoReading,
        dispatchWorkOrder,
        triggerMachineAnomaly,
        inspectFactoryDetails,
        loadAllFactoriesTelemetry,
        updateFactoryGovernance,
        deleteFactoryRecord,
        logDeviceError,
        updateDeviceErrorStatus,
        createSupportTicket,
        updateSupportTicket,
        replyToSupportTicket,
        subscribeTicketMessages,
        updatePlatformSettings,
        addPlatformAdmin,
        removePlatformAdmin,
        seedFounderSampleWorkspace,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
