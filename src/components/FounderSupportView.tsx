import React, { useEffect, useState } from 'react';
import {
  Language,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
  UserProfile,
} from '../types';
import { translations } from '../i18n/translations';
import { filterSupportTickets } from '../utils/industrialMath';
import { CreateSupportTicketInput } from '../context/AuthContext';
import {
  LifeBuoy,
  MessageSquare,
  Plus,
  Search,
  Send,
  Loader2,
  Building2,
  X,
} from 'lucide-react';

interface FounderSupportViewProps {
  isFounder: boolean;
  tickets: SupportTicket[];
  factories?: UserProfile[];
  currentFactoryProfile?: UserProfile | null;
  initialTicketId?: string | null;
  initialFactoryForNewTicket?: UserProfile | null;
  language: Language;
  onCreateTicket: (input: CreateSupportTicketInput) => Promise<SupportTicket>;
  onUpdateTicket: (
    ticketId: string,
    updates: { status?: SupportTicketStatus; priority?: SupportTicketPriority }
  ) => Promise<void>;
  onReplyTicket: (ticketId: string, text: string) => Promise<SupportTicketMessage>;
  subscribeMessages: (
    ticketId: string,
    onMsgs: (msgs: SupportTicketMessage[]) => void
  ) => () => void;
}

export const FounderSupportView: React.FC<FounderSupportViewProps> = ({
  isFounder,
  tickets,
  factories = [],
  currentFactoryProfile,
  initialTicketId = null,
  initialFactoryForNewTicket = null,
  language,
  onCreateTicket,
  onUpdateTicket,
  onReplyTicket,
  subscribeMessages,
}) => {
  const t = translations[language];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | SupportTicketPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SupportTicketCategory>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialTicketId || tickets[0]?.id || null
  );
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Create ticket modal/panel
  const [showNewForm, setShowNewForm] = useState(Boolean(initialFactoryForNewTicket));
  const [newFactoryId, setNewFactoryId] = useState(
    initialFactoryForNewTicket?.userId || factories[0]?.userId || currentFactoryProfile?.userId || ''
  );
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>('cameras');
  const [newPriority, setNewPriority] = useState<SupportTicketPriority>('normal');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (initialTicketId) {
      setSelectedTicketId(initialTicketId);
    }
  }, [initialTicketId]);

  useEffect(() => {
    if (initialFactoryForNewTicket) {
      setNewFactoryId(initialFactoryForNewTicket.userId);
      setShowNewForm(true);
    }
  }, [initialFactoryForNewTicket]);

  useEffect(() => {
    if (!selectedTicketId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeMessages(selectedTicketId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [selectedTicketId, subscribeMessages]);

  const filtered = filterSupportTickets(
    tickets,
    search,
    statusFilter,
    priorityFilter,
    categoryFilter
  );

  const selectedTicket =
    tickets.find((tk) => tk.id === selectedTicketId) || filtered[0] || null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim()) return;
    setCreating(true);
    try {
      const targetFac =
        factories.find((f) => f.userId === newFactoryId) || currentFactoryProfile || undefined;
      const created = await onCreateTicket({
        factoryId: targetFac?.userId,
        factoryName: targetFac?.factoryName,
        subject: newSubject,
        category: newCategory,
        priority: newPriority,
        description: newDesc,
      });
      setSelectedTicketId(created.id);
      setNewSubject('');
      setNewDesc('');
      setShowNewForm(false);
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      const msg = await onReplyTicket(selectedTicket.id, replyText);
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  const categoryLabel = (cat: SupportTicketCategory) => {
    switch (cat) {
      case 'cameras':
        return t.founder.catCameras;
      case 'sensors':
        return t.founder.catSensors;
      case 'employees':
        return t.founder.catEmployees;
      case 'billing':
        return t.founder.catBilling;
      case 'bug':
        return t.founder.catBug;
      default:
        return t.founder.catOther;
    }
  };

  const statusLabel = (st: SupportTicketStatus) => {
    switch (st) {
      case 'open':
        return t.founder.tkStatusOpen;
      case 'in_progress':
        return t.founder.tkStatusProgress;
      case 'resolved':
        return t.founder.tkStatusResolved;
      default:
        return t.founder.tkStatusClosed;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-amber-400" />
            <span>{t.founder.supportTitle}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 tabular-nums">
              {filtered.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">{t.founder.supportSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewForm((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{t.founder.newTicketBtn}</span>
        </button>
      </div>

      {/* Create Ticket Form */}
      {showNewForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-cyan-500/40 bg-slate-900 p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">{t.founder.newTicketBtn}</h3>
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {isFounder && factories.length > 0 && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {t.founder.ticketFactory}
                </label>
                <select
                  value={newFactoryId}
                  onChange={(e) => setNewFactoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  {factories.map((f) => (
                    <option key={f.userId} value={f.userId}>
                      {f.factoryName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.ticketCategory}
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="cameras">{t.founder.catCameras}</option>
                <option value="sensors">{t.founder.catSensors}</option>
                <option value="employees">{t.founder.catEmployees}</option>
                <option value="billing">{t.founder.catBilling}</option>
                <option value="bug">{t.founder.catBug}</option>
                <option value="other">{t.founder.catOther}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.ticketPriority}
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as SupportTicketPriority)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="urgent">{t.founder.prioUrgent}</option>
                <option value="high">{t.founder.prioHigh}</option>
                <option value="normal">{t.founder.prioNormal}</option>
                <option value="low">{t.founder.prioLow}</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.ticketSubject} *
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Например: Не удается подключить камеру по RTSP порту 554"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t.founder.ticketDescription} *
              </label>
              <textarea
                rows={3}
                required
                minLength={2}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Опишите проблему, IP камеры или код ошибки..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t.founder.ticketCreateSubmit}</span>
            </button>
          </div>
        </form>
      )}

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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | SupportTicketStatus)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.founder.filterStatusAll}</option>
          <option value="open">{t.founder.tkStatusOpen}</option>
          <option value="in_progress">{t.founder.tkStatusProgress}</option>
          <option value="resolved">{t.founder.tkStatusResolved}</option>
          <option value="closed">{t.founder.tkStatusClosed}</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | SupportTicketPriority)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.founder.ticketPriority}: Все</option>
          <option value="urgent">{t.founder.prioUrgent}</option>
          <option value="high">{t.founder.prioHigh}</option>
          <option value="normal">{t.founder.prioNormal}</option>
          <option value="low">{t.founder.prioLow}</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | SupportTicketCategory)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">{t.founder.ticketCategory}: Все</option>
          <option value="cameras">{t.founder.catCameras}</option>
          <option value="sensors">{t.founder.catSensors}</option>
          <option value="employees">{t.founder.catEmployees}</option>
          <option value="billing">{t.founder.catBilling}</option>
          <option value="bug">{t.founder.catBug}</option>
          <option value="other">{t.founder.catOther}</option>
        </select>
      </div>

      {/* Split Helpdesk Master-Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">{t.common.noData}</div>
          ) : (
            <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
              {filtered.map((tk) => {
                const isSelected = selectedTicket?.id === tk.id;
                return (
                  <button
                    key={tk.id}
                    type="button"
                    onClick={() => setSelectedTicketId(tk.id)}
                    className={`w-full text-left p-4 space-y-1.5 transition-colors ${
                      isSelected ? 'bg-cyan-950/30' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-white line-clamp-1">
                        {tk.subject}
                      </span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                          tk.priority === 'urgent'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : tk.priority === 'high'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tk.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 truncate">
                        <Building2 className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{tk.factoryName}</span>
                      </span>
                      <span className="font-mono text-[10px] text-cyan-300 shrink-0">
                        {statusLabel(tk.status)}
                      </span>
                    </div>

                    {tk.lastMessagePreview && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {tk.lastMessagePreview}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Conversation Detail */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col min-h-[460px]">
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400 gap-2">
              <MessageSquare className="h-8 w-8 text-slate-600" />
              <span>{t.founder.selectTicketHint}</span>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-cyan-400">
                      {categoryLabel(selectedTicket.category)} · {selectedTicket.factoryName}
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) =>
                        void onUpdateTicket(selectedTicket.id, {
                          status: e.target.value as SupportTicketStatus,
                        })
                      }
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="open">{t.founder.tkStatusOpen}</option>
                      <option value="in_progress">{t.founder.tkStatusProgress}</option>
                      <option value="resolved">{t.founder.tkStatusResolved}</option>
                      <option value="closed">{t.founder.tkStatusClosed}</option>
                    </select>

                    {isFounder && (
                      <select
                        value={selectedTicket.priority}
                        onChange={(e) =>
                          void onUpdateTicket(selectedTicket.id, {
                            priority: e.target.value as SupportTicketPriority,
                          })
                        }
                        className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="urgent">{t.founder.prioUrgent}</option>
                        <option value="high">{t.founder.prioHigh}</option>
                        <option value="normal">{t.founder.prioNormal}</option>
                        <option value="low">{t.founder.prioLow}</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* Conversation Messages */}
              <div className="flex-1 p-5 space-y-3 max-h-[380px] overflow-y-auto bg-slate-950/30">
                {messages.length === 0 ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 text-xs text-slate-300">
                    {selectedTicket.description}
                  </div>
                ) : (
                  messages.map((m) => {
                    const isFounderMsg = m.senderRole === 'founder';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isFounderMsg ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs space-y-1 border ${
                            isFounderMsg
                              ? 'bg-cyan-950/60 border-cyan-700/60 text-cyan-50'
                              : 'bg-slate-800/80 border-slate-700 text-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span className={isFounderMsg ? 'text-cyan-400 font-semibold' : ''}>
                              {isFounderMsg ? 'Техподдержка / Основатель' : m.senderEmail}
                            </span>
                            <span>·</span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input */}
              <form
                onSubmit={handleSendReply}
                className="border-t border-slate-800 p-3.5 bg-slate-950/70 flex gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t.founder.ticketReplyPlaceholder}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 whitespace-nowrap"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>{t.founder.ticketSendReply}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
