import React, { useCallback, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { FounderSidebar } from './components/FounderSidebar';
import { AuthGateView } from './components/AuthGateView';
import { FounderDashboardView } from './components/FounderDashboardView';
import { FounderFactoriesView } from './components/FounderFactoriesView';
import { FounderErrorsView } from './components/FounderErrorsView';
import { FounderEmployeesView } from './components/FounderEmployeesView';
import { FounderSupportView } from './components/FounderSupportView';
import {
  FounderBillingView,
  FounderAuditView,
  FounderSettingsView,
} from './components/FounderGovernanceViews';
import { FactoryPortalView } from './components/FactoryPortalView';
import { AuthModal } from './components/AuthModal';
import { ProfileModal, ProfileTab } from './components/ProfileModal';
import { ChatDrawer } from './components/ChatDrawer';
import { ToastContainer } from './components/ToastContainer';
import {
  DeviceErrorLog,
  FounderTab,
  Language,
  NotificationSeverity,
  ToastItem,
  UserProfile,
} from './types';
import { translations } from './i18n/translations';
import { Loader2 } from 'lucide-react';

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function MainApp() {
  const {
    currentUser,
    isFounder,
    isLoading,
    allFactories,
    deviceErrors,
    supportTickets,
    auditLogs,
    platformAdmins,
    platformSettings,
    inspectedFactories,
    isInspectingFactory,
    logout,
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
  } = useAuth();

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('neurofactory_lang') as Language) || 'ru';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('neurofactory_lang', lang);
  };

  const [founderTab, setFounderTab] = useState<FounderTab>('dashboard');
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newTicketFactory, setNewTicketFactory] = useState<UserProfile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>('profile');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const t = translations[language];

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (params: {
      title: string;
      message: string;
      severity: NotificationSeverity;
      sourceModule?: string;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setToasts((prev) => [{ id, timestamp, ...params }, ...prev].slice(0, 4));
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 6000);
    },
    []
  );

  const openProfileAtTab = (tab: ProfileTab = 'profile') => {
    setProfileInitialTab(tab);
    setIsProfileOpen(true);
  };

  const handleInspectFactoryFromDashboard = (factoryId: string) => {
    setSelectedFactoryId(factoryId);
    setFounderTab('factories');
  };

  const handleOpenTicketFromDashboard = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setFounderTab('support');
  };

  const handleEscalateErrorToTicket = async (err: DeviceErrorLog) => {
    const tk = await createSupportTicket({
      factoryId: err.factoryId,
      factoryName: err.factoryName,
      subject: `[${err.errorCode}] ${err.deviceName} — сбой (${err.module})`,
      category: err.deviceType === 'camera' ? 'cameras' : 'sensors',
      priority: err.severity === 'critical' ? 'urgent' : 'high',
      description: `${err.message} (IP: ${err.ipAddress || 'не указан'})`,
    });
    setSelectedTicketId(tk.id);
    setFounderTab('support');
    addToast({
      title: t.founder.escalateToTicket,
      message: `${tk.subject} · ${tk.factoryName}`,
      severity: 'info',
      sourceModule: 'Support',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 gap-2 text-xs">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <span>NeuroFactory AI...</span>
      </div>
    );
  }

  // Unauthenticated state -> Show branded Founder & Factory Sign-In Screen
  if (!currentUser) {
    return (
      <>
        <AuthGateView language={language} setLanguage={handleSetLanguage} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} language={language} />
      </>
    );
  }

  const openErrorsCount = deviceErrors.filter((e) => e.status !== 'resolved').length;
  const openTicketsCount = supportTickets.filter(
    (tk) => tk.status === 'open' || tk.status === 'in_progress'
  ).length;
  const totalEmployeesCount = allFactories.reduce((acc, f) => acc + (f.employeesCount || 0), 0);

  const founderSectionTitleMap: Record<FounderTab, string> = {
    dashboard: t.nav.founderDashboard,
    factories: t.nav.factories,
    errors: t.nav.errors,
    employees: t.nav.employees,
    support: t.nav.support,
    billing: t.nav.billing,
    audit: t.nav.audit,
    settings: t.nav.settings,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {isFounder && (
        <FounderSidebar
          activeTab={founderTab}
          setActiveTab={(tab) => {
            setNewTicketFactory(null);
            setFounderTab(tab);
          }}
          language={language}
          factoriesCount={allFactories.length}
          openErrorsCount={openErrorsCount}
          openTicketsCount={openTicketsCount}
          employeesCount={totalEmployeesCount}
          founderEmail={currentUser.email || ''}
          onLogout={() => void logout()}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          sectionTitle={
            isFounder ? founderSectionTitleMap[founderTab] : t.founder.portalTitle
          }
          language={language}
          setLanguage={handleSetLanguage}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => openProfileAtTab('profile')}
          onOpenNotifications={() => openProfileAtTab('notifications')}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          isChatOpen={isChatOpen}
          onOpenMobileMenu={isFounder ? () => setMobileMenuOpen(true) : undefined}
          showBrandOnDesktop={!isFounder}
        />

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {isFounder ? (
            <>
              {founderTab === 'dashboard' && (
                <FounderDashboardView
                  factories={allFactories}
                  errors={deviceErrors}
                  tickets={supportTickets}
                  language={language}
                  onNavigate={setFounderTab}
                  onInspectFactory={handleInspectFactoryFromDashboard}
                  onOpenTicket={handleOpenTicketFromDashboard}
                  onSeedPlatform={seedFounderSampleWorkspace}
                  onRefreshTelemetry={loadAllFactoriesTelemetry}
                />
              )}

              {founderTab === 'factories' && (
                <FounderFactoriesView
                  factories={allFactories}
                  errors={deviceErrors}
                  inspectedFactories={inspectedFactories}
                  isInspectingFactory={isInspectingFactory}
                  initialSelectedFactoryId={selectedFactoryId}
                  language={language}
                  onInspectFactory={inspectFactoryDetails}
                  onUpdateGovernance={updateFactoryGovernance}
                  onDeleteFactory={deleteFactoryRecord}
                  onCreateTicketForFactory={(fac) => {
                    setNewTicketFactory(fac);
                    setFounderTab('support');
                  }}
                />
              )}

              {founderTab === 'errors' && (
                <FounderErrorsView
                  factories={allFactories}
                  errors={deviceErrors}
                  inspectedFactories={inspectedFactories}
                  language={language}
                  onUpdateErrorStatus={updateDeviceErrorStatus}
                  onEscalateToTicket={handleEscalateErrorToTicket}
                  onLogDeviceError={logDeviceError}
                />
              )}

              {founderTab === 'employees' && (
                <FounderEmployeesView
                  factories={allFactories}
                  inspectedFactories={inspectedFactories}
                  isInspectingFactory={isInspectingFactory}
                  language={language}
                  onRefreshAllStaff={loadAllFactoriesTelemetry}
                />
              )}

              {founderTab === 'support' && (
                <FounderSupportView
                  isFounder={true}
                  tickets={supportTickets}
                  factories={allFactories}
                  initialTicketId={selectedTicketId}
                  initialFactoryForNewTicket={newTicketFactory}
                  language={language}
                  onCreateTicket={createSupportTicket}
                  onUpdateTicket={updateSupportTicket}
                  onReplyTicket={replyToSupportTicket}
                  subscribeMessages={subscribeTicketMessages}
                />
              )}

              {founderTab === 'billing' && (
                <FounderBillingView
                  factories={allFactories}
                  language={language}
                  onUpdateGovernance={updateFactoryGovernance}
                />
              )}

              {founderTab === 'audit' && (
                <FounderAuditView
                  auditLogs={auditLogs}
                  admins={platformAdmins}
                  currentUserUid={currentUser.uid}
                  language={language}
                  onAddAdmin={addPlatformAdmin}
                  onRemoveAdmin={removePlatformAdmin}
                />
              )}

              {founderTab === 'settings' && (
                <FounderSettingsView
                  settings={platformSettings}
                  language={language}
                  onSaveSettings={updatePlatformSettings}
                />
              )}
            </>
          ) : (
            <FactoryPortalView
              language={language}
              onOpenProfileTab={openProfileAtTab}
            />
          )}
        </main>

        <footer className="border-t border-slate-800/80 bg-slate-950 py-5 text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="font-semibold text-slate-300">
              NeuroFactory AI · {platformSettings.supportEmail}
            </div>
            <div className="font-mono text-[11px]">
              {platformSettings.aiModelVersion} · © 2026 NeuroFactory
            </div>
          </div>
        </footer>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} language={language} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        language={language}
        initialTab={profileInitialTab}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        language={language}
      />
    </div>
  );
}
