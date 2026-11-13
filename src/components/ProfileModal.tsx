import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EmployeeRole, FactoryEmployee, Language } from '../types';
import { translations } from '../i18n/translations';
import { filterEmployeesByRole } from '../utils/industrialMath';
import {
  X,
  Building2,
  MapPin,
  Briefcase,
  User,
  Phone,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  Database,
  LogOut,
  LogIn,
  Users,
  Bell,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  CheckCheck,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export type ProfileTab = 'profile' | 'employees' | 'notifications';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialTab?: ProfileTab;
  onOpenAuth: () => void;
  onWorkerViolationLogged?: (
    employeeId: string,
    employeeName: string,
    specialty: string,
    department: string,
    violationSummary: string
  ) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  language,
  initialTab = 'profile',
  onOpenAuth,
  onWorkerViolationLogged,
}) => {
  const {
    currentUser,
    profile,
    saveFactoryProfile,
    resendVerificationEmail,
    logout,
    isLoading,
    employees,
    notifications,
    unreadCount,
    addEmployee,
    deleteEmployee,
    seedSampleStaff,
    recordWorkerViolation,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAuth();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);

  // Profile form state
  const [factoryName, setFactoryName] = useState('');
  const [region, setRegion] = useState('');
  const [industrySector, setIndustrySector] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Add Employee form state
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState<EmployeeRole>('worker');
  const [empSpecialty, setEmpSpecialty] = useState('');
  const [empDepartment, setEmpDepartment] = useState('Цех №1 (Конвертерный)');
  const [roleFilter, setRoleFilter] = useState<'all' | EmployeeRole>('all');
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [lastCreatedEmployee, setLastCreatedEmployee] = useState<FactoryEmployee | null>(null);
  const [hiddenPasswords, setHiddenPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inline violation logging state
  const [loggingWorkerId, setLoggingWorkerId] = useState<string | null>(null);
  const [selectedViolationPreset, setSelectedViolationPreset] = useState<string>('');

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (profile) {
      setFactoryName(profile.factoryName || '');
      setRegion(profile.region || t.regions[0]);
      setIndustrySector(profile.industrySector || t.industries[0]);
      setContactPerson(profile.contactPerson || '');
      setContactPhone(profile.contactPhone || '');
    }
  }, [profile, t.regions, t.industries]);

  useEffect(() => {
    setSelectedViolationPreset(t.staff.violationPresets[0]);
  }, [t.staff.violationPresets]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaved(false);

    try {
      await saveFactoryProfile({
        factoryName,
        region,
        industrySector,
        contactPerson,
        contactPhone,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Error updating profile');
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empSpecialty.trim()) return;

    setStaffBusy(true);
    setStaffError(null);
    try {
      const created = await addEmployee({
        fullName: empName,
        specialty: empSpecialty,
        role: empRole,
        department: empDepartment,
      });
      setLastCreatedEmployee(created);
      setEmpName('');
      setEmpSpecialty('');
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : 'Error adding employee');
    } finally {
      setStaffBusy(false);
    }
  };

  const handleConfirmWorkerViolation = async (employeeId: string) => {
    const target = employees.find((e) => e.id === employeeId);
    if (!target || !selectedViolationPreset.trim()) return;

    setStaffBusy(true);
    setStaffError(null);
    try {
      await recordWorkerViolation(employeeId, selectedViolationPreset);
      if (onWorkerViolationLogged) {
        onWorkerViolationLogged(
          target.id,
          target.fullName,
          target.specialty,
          target.department,
          selectedViolationPreset
        );
      }
      setLoggingWorkerId(null);
    } catch (err: unknown) {
      setStaffError(err instanceof Error ? err.message : 'Error recording violation');
    } finally {
      setStaffBusy(false);
    }
  };

  const filteredEmployees = filterEmployeesByRole(employees, roleFilter);
  const workersCount = employees.filter((e) => e.role === 'worker').length;
  const specialistsCount = employees.filter((e) => e.role === 'specialist').length;
  const specialtyPresets =
    empRole === 'specialist' ? t.staff.specialistSpecialties : t.staff.workerSpecialties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="border-b border-slate-800 bg-slate-950/70 px-5 sm:px-6 py-4 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-[11px] font-semibold truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {currentUser ? (
                <span className="truncate">
                  Cloud Firestore · /factories/{currentUser.uid.substring(0, 12)}...
                </span>
              ) : (
                <span>NeuroFactory · {t.staff.cabinetTitle}</span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5 truncate">
              {profile?.factoryName || t.staff.cabinetTitle}
            </h2>
            {currentUser?.email && (
              <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">
                {currentUser.email}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-800/80 bg-rose-950/50 text-xs font-semibold text-rose-300 hover:bg-rose-900/70 hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t.auth.logoutAccount}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{t.auth.login}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label={t.common.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 sm:px-6 gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>{t.staff.tabProfile}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'employees'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{t.staff.tabEmployees}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 tabular-nums">
              {employees.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>{t.staff.tabNotifications}</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-mono font-bold text-white tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {!currentUser && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-cyan-800/70 bg-cyan-950/30 p-3.5 text-xs text-cyan-100">
              <div className="flex items-start gap-2.5">
                <Database className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>{t.staff.localPreviewNote}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 font-semibold whitespace-nowrap shrink-0"
              >
                {t.staff.loginPromptBtn}
              </button>
            </div>
          )}

          {/* TAB 1: FACTORY PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {!currentUser ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center space-y-3">
                  <Building2 className="h-10 w-10 text-cyan-400 mx-auto" />
                  <h3 className="text-base font-bold text-white">{t.auth.loginToAccess}</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {t.auth.profileDescription}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 transition-colors"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{t.auth.login}</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Cloud Security Indicator */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-slate-200">Zero-Trust Isolation: </span>
                        <span className="text-slate-400">UID matches request.auth.uid</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                      <Database className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Firestore Rules: OK</span>
                    </div>
                  </div>

                  {/* Verification Alert Banner */}
                  {!profile?.emailVerified && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-950/40 border border-amber-800/80 p-3 text-xs text-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>
                          {t.auth.unverified} ({currentUser.email})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={resendVerificationEmail}
                        disabled={isLoading}
                        className="text-xs text-amber-300 hover:text-white underline font-medium ml-2 shrink-0"
                      >
                        {t.auth.resendVerification}
                      </button>
                    </div>
                  )}

                  {isSaved && (
                    <div className="rounded-lg bg-emerald-950/60 border border-emerald-800 p-3 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{t.auth.savedSuccess}</span>
                    </div>
                  )}

                  {saveError && (
                    <div className="rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{saveError}</span>
                    </div>
                  )}

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.auth.factoryName} *
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            required
                            value={factoryName}
                            onChange={(e) => setFactoryName(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.auth.region} *
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            {t.regions.map((reg) => (
                              <option key={reg} value={reg}>
                                {reg}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.auth.industrySector}
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <select
                            value={industrySector}
                            onChange={(e) => setIndustrySector(e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            {t.industries.map((ind) => (
                              <option key={ind} value={ind}>
                                {ind}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.auth.contactPerson}
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            placeholder="Даулетов Асылбек"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {t.auth.contactPhone}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                          <input
                            type="text"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="+7 (7212) 99-88-77"
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-800/70 bg-rose-950/40 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 hover:text-white transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t.auth.logoutAccount}</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-950 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          <span>{isLoading ? t.auth.saving : t.auth.saveProfile}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB 2: EMPLOYEES & ACCESS RIGHTS */}
          {activeTab === 'employees' && (
            <div className="space-y-5">
              {/* Role Access Matrix Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{t.staff.roleWorker}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {t.staff.accessNone}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {t.staff.workerRightsDesc}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3.5 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Unlock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{t.staff.roleSpecialist}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                        {t.staff.accessFull}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {t.staff.specialistRightsDesc}
                    </p>
                  </div>
                </div>
              </div>

              {staffError && (
                <div className="rounded-lg bg-rose-950/60 border border-rose-800 p-3 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{staffError}</span>
                </div>
              )}

              {/* Add Employee Form */}
              <form
                onSubmit={handleAddEmployee}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-cyan-400" />
                    <span>{t.staff.addTitle}</span>
                  </h3>
                  {employees.length === 0 && (
                    <button
                      type="button"
                      onClick={seedSampleStaff}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium underline"
                    >
                      {t.staff.seedSampleBtn}
                    </button>
                  )}
                </div>

                {/* Role Switcher */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEmpRole('worker')}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                      empRole === 'worker'
                        ? 'border-amber-500/80 bg-amber-950/30 text-white font-semibold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      <span>{t.staff.roleWorker}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {t.staff.accessNone}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmpRole('specialist')}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                      empRole === 'specialist'
                        ? 'border-emerald-500/80 bg-emerald-950/30 text-white font-semibold'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{t.staff.roleSpecialist}</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {t.staff.accessFull}
                    </span>
                  </button>
                </div>

                {/* Quick specialty presets */}
                <div className="flex flex-wrap gap-1.5">
                  {specialtyPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEmpSpecialty(preset)}
                      className={`px-2 py-1 rounded border text-[11px] transition-colors ${
                        empSpecialty === preset
                          ? 'border-cyan-500 bg-cyan-950/60 text-cyan-300 font-semibold'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      {t.staff.fullName} *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder={t.staff.fullNamePlaceholder}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      {t.staff.specialty} *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={empSpecialty}
                      onChange={(e) => setEmpSpecialty(e.target.value)}
                      placeholder={t.staff.specialtyPlaceholder}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      {t.staff.department}
                    </label>
                    <input
                      type="text"
                      required
                      value={empDepartment}
                      onChange={(e) => setEmpDepartment(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-cyan-300 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span>{t.staff.credentialsAutoNote}</span>
                  </span>
                  <button
                    type="submit"
                    disabled={staffBusy || !empName.trim() || !empSpecialty.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50 transition-colors ml-auto"
                  >
                    {staffBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    <span>{t.staff.addButton}</span>
                  </button>
                </div>
              </form>

              {/* Newly Created Employee Auto-Credentials Banner */}
              {lastCreatedEmployee && (
                <div className="rounded-xl border border-cyan-500/60 bg-cyan-950/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-200">
                      <KeyRound className="h-4 w-4 text-cyan-400" />
                      <span>{t.staff.issuedCredentialsTitle}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLastCreatedEmployee(null)}
                      className="text-slate-400 hover:text-white p-1 rounded"
                      aria-label={t.common.close}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-200">
                    <span className="font-bold text-white">{lastCreatedEmployee.fullName}</span>{' '}
                    <span className="text-slate-400">· {lastCreatedEmployee.specialty}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400">{t.staff.loginEmailLabel}</div>
                        <div className="font-mono text-cyan-300 font-semibold truncate">
                          {lastCreatedEmployee.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText('new-email', lastCreatedEmployee.email)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                        title={t.staff.copyEmail}
                      >
                        {copiedKey === 'new-email' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400">{t.staff.passwordLabel}</div>
                        <div className="font-mono text-emerald-300 font-bold tracking-wider truncate">
                          {lastCreatedEmployee.generatedPassword}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText('new-pass', lastCreatedEmployee.generatedPassword)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0"
                        title={t.staff.copyPassword}
                      >
                        {copiedKey === 'new-pass' ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-mono text-emerald-400">
                      {lastCreatedEmployee.authProvisioned
                        ? t.staff.authStatusActive
                        : t.staff.authStatusLocal}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'new-all',
                          `ФИО: ${lastCreatedEmployee.fullName}\nEmail: ${lastCreatedEmployee.email}\nПароль: ${lastCreatedEmployee.generatedPassword}`
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-[11px] font-semibold text-white transition-colors"
                    >
                      {copiedKey === 'new-all' ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {copiedKey === 'new-all' ? t.staff.copiedLabel : t.staff.copyAllCredentials}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filter & Employee List */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setRoleFilter('all')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        roleFilter === 'all'
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.staff.filterAll} ({employees.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('worker')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        roleFilter === 'worker'
                          ? 'bg-amber-500/20 text-amber-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.staff.filterWorkers} ({workersCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleFilter('specialist')}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        roleFilter === 'specialist'
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.staff.filterSpecialists} ({specialistsCount})
                    </button>
                  </div>
                </div>

                {filteredEmployees.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400 space-y-2">
                    <div>{t.staff.emptyStaff}</div>
                    {employees.length === 0 && (
                      <button
                        type="button"
                        onClick={seedSampleStaff}
                        className="px-3 py-1.5 rounded-lg border border-cyan-700 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/60 font-medium"
                      >
                        {t.staff.seedSampleBtn}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredEmployees.map((emp) => {
                      const isSpecialist = emp.role === 'specialist';
                      const isLoggingThis = loggingWorkerId === emp.id;

                      return (
                        <div
                          key={emp.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white">
                                  {emp.fullName}
                                </span>
                                <span className="text-xs font-medium text-cyan-300">
                                  {emp.specialty}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  · {emp.department}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                {isSpecialist ? (
                                  <span className="inline-flex items-center gap-1 rounded border border-emerald-800 bg-emerald-950/70 px-2 py-0.5 font-mono text-emerald-300">
                                    <Unlock className="h-3 w-3" />
                                    <span>{t.staff.accessFull}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-slate-300">
                                    <Lock className="h-3 w-3 text-amber-400" />
                                    <span>{t.staff.accessNone}</span>
                                  </span>
                                )}

                                {!isSpecialist && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono tabular-nums ${
                                      emp.violationsCount > 0
                                        ? 'border-rose-800 bg-rose-950/70 text-rose-300 font-semibold'
                                        : 'border-slate-800 bg-slate-900 text-slate-400'
                                    }`}
                                  >
                                    <ShieldAlert className="h-3 w-3" />
                                    <span>
                                      {t.staff.violationsCount}: {emp.violationsCount}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {!isSpecialist && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLoggingWorkerId(isLoggingThis ? null : emp.id)
                                  }
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-800/80 bg-rose-950/50 text-[11px] font-semibold text-rose-300 hover:bg-rose-900/70 transition-colors"
                                >
                                  <AlertOctagon className="h-3.5 w-3.5" />
                                  <span>{t.staff.logViolationBtn}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => deleteEmployee(emp.id)}
                                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
                                title={t.staff.removeEmployee}
                                aria-label={t.staff.removeEmployee}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Auto-generated Employee Login Credentials (visible to both admin and employee) */}
                          {emp.email && emp.generatedPassword && (
                            <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <div className="flex flex-wrap items-center gap-3 min-w-0">
                                <span className="inline-flex items-center gap-1.5 text-slate-400">
                                  <KeyRound className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                  <span>{t.staff.loginEmailLabel}:</span>
                                  <span className="font-mono text-cyan-300 font-medium break-all">
                                    {emp.email}
                                  </span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 text-slate-400">
                                  <span>{t.staff.passwordLabel}:</span>
                                  <span className="font-mono text-emerald-300 font-bold tracking-wider">
                                    {hiddenPasswords[emp.id] ? '••••••••••••' : emp.generatedPassword}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHiddenPasswords((prev) => ({
                                      ...prev,
                                      [emp.id]: !prev[emp.id],
                                    }))
                                  }
                                  className="p-1 rounded border border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
                                  title={
                                    hiddenPasswords[emp.id]
                                      ? t.staff.showPassword
                                      : t.staff.hidePassword
                                  }
                                  aria-label={
                                    hiddenPasswords[emp.id]
                                      ? t.staff.showPassword
                                      : t.staff.hidePassword
                                  }
                                >
                                  {hiddenPasswords[emp.id] ? (
                                    <Eye className="h-3.5 w-3.5" />
                                  ) : (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopyText(
                                      `emp-${emp.id}`,
                                      `Email: ${emp.email}\nПароль: ${emp.generatedPassword}`
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-950 text-slate-300 hover:text-white"
                                  title={t.staff.copyAllCredentials}
                                >
                                  {copiedKey === `emp-${emp.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                  <span>
                                    {copiedKey === `emp-${emp.id}`
                                      ? t.staff.copiedLabel
                                      : t.staff.copyPassword}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Worker's latest violation history */}
                          {!isSpecialist && emp.lastViolationSummary && (
                            <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-200 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="font-semibold text-rose-300">
                                  {t.staff.lastViolation}:{' '}
                                </span>
                                <span>{emp.lastViolationSummary}</span>
                              </div>
                              {emp.lastViolationAt && (
                                <span className="font-mono text-[10px] text-rose-400 tabular-nums">
                                  {new Date(emp.lastViolationAt).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Inline violation logging panel */}
                          {isLoggingThis && (
                            <div className="rounded-lg border border-amber-700/70 bg-slate-900 p-3 space-y-2.5">
                              <div className="text-[11px] font-semibold text-amber-300">
                                {t.staff.violationTypePrompt}:
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                  value={selectedViolationPreset}
                                  onChange={(e) => setSelectedViolationPreset(e.target.value)}
                                  className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                                >
                                  {t.staff.violationPresets.map((preset) => (
                                    <option key={preset} value={preset}>
                                      {preset}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmWorkerViolation(emp.id)}
                                  disabled={staffBusy}
                                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors whitespace-nowrap"
                                >
                                  {t.staff.confirmViolation}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SPECIALIST NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bell className="h-4 w-4 text-cyan-400" />
                    <span>{t.notifications.title}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{t.notifications.subtitle}</p>
                  <div className="text-[11px] font-mono text-emerald-400 mt-1.5">
                    {t.notifications.subscribedSpecialists}: {specialistsCount}
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-700 bg-cyan-950/50 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60 transition-colors whitespace-nowrap shrink-0"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>{t.notifications.markAllRead}</span>
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
                  {t.notifications.empty}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        n.read
                          ? 'border-slate-800 bg-slate-950/40 opacity-80'
                          : 'border-rose-500/60 bg-rose-950/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                n.severity === 'critical'
                                  ? 'border-rose-700 bg-rose-950 text-rose-300'
                                  : n.severity === 'warning'
                                  ? 'border-amber-700 bg-amber-950 text-amber-300'
                                  : 'border-cyan-700 bg-cyan-950 text-cyan-300'
                              }`}
                            >
                              {n.sourceModule}
                            </span>
                            {!n.read ? (
                              <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {t.notifications.unreadBadge}
                              </span>
                            ) : (
                              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                                {t.notifications.readBadge}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                              {new Date(n.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="text-xs sm:text-sm font-bold text-white">
                            {n.title}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                            {n.violatorName && (
                              <span>
                                <strong className="text-slate-300">
                                  {t.notifications.violatorLabel}:
                                </strong>{' '}
                                {n.violatorName}
                              </span>
                            )}
                            <span>
                              <strong className="text-slate-300">
                                {t.notifications.recipientsLabel} ({n.recipientCount}):
                              </strong>{' '}
                              {n.recipientNames}
                            </span>
                          </div>
                        </div>

                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(n.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-medium text-slate-200 hover:border-cyan-500 hover:text-white transition-colors shrink-0"
                          >
                            {t.notifications.markRead}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
