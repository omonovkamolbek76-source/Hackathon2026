'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ScreenId, Task, AIMessage, User, CreditProduct, KPI, AnalyticsData, Transaction, FundAllocation } from '@/types';
import { api } from '@/lib/client-api';
import { demoRoadmap } from '@/data/mock';

export const ALLOCATION_META: Record<string, { label: string; color: string; icon: string; defaultShare: number }> = {
  equipment: { label: 'Uskuna', color: 'hsl(160 100% 33%)', icon: 'Wrench', defaultShare: 0.45 },
  inventory: { label: 'Tovar', color: 'hsl(210 80% 55%)', icon: 'Package', defaultShare: 0.22 },
  marketing: { label: 'Marketing', color: 'hsl(30 90% 55%)', icon: 'Megaphone', defaultShare: 0.13 },
  working: { label: 'Aylanma mablag‘', color: 'hsl(270 60% 60%)', icon: 'Wallet', defaultShare: 0.12 },
  reserve: { label: 'Zaxira', color: 'hsl(200 60% 50%)', icon: 'Shield', defaultShare: 0.08 },
};

function defaultAllocationsFor(total: number): FundAllocation[] {
  return Object.entries(ALLOCATION_META).map(([category, meta]) => ({
    category,
    label: meta.label,
    amount: Math.round((total * meta.defaultShare) / 100_000) * 100_000,
    color: meta.color,
    icon: meta.icon,
  }));
}

type AuthUser = Pick<User, 'id' | 'email' | 'name' | 'phone' | 'businessName' | 'region'> & {
  role?: string;
};

interface AppStore {
  authLoading: boolean;
  user: AuthUser | null;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    businessName?: string;
    region?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;

  startOAuth: (provider: 'google' | 'microsoft', opts?: { link?: boolean }) => void;
  oauthMfaPending: boolean;
  completeOAuthMfa: (mfaCode: string) => Promise<void>;
  oauthError: string | null;
  oauthLinked: string | null;
  clearOAuthNotice: () => void;

  screen: ScreenId;
  navigate: (screen: ScreenId) => void;
  goBack: () => void;
  history: ScreenId[];

  tasks: Task[];
  loadTasks: () => Promise<void>;
  toggleTask: (id: string) => Promise<void>;

  chatMessages: AIMessage[];
  loadChat: () => Promise<void>;
  sendCoachMessage: (text: string) => Promise<void>;
  confirmAiAction: (action: NonNullable<AIMessage['action']>) => Promise<{ ok: boolean; result: { type: string } }>;
  resetChat: () => Promise<void>;
  journeyStage: number;
  setJourneyStage: (n: number) => void;
  journeyProfile: Record<string, string>;
  setJourneyProfile: (patch: Record<string, string>) => void;

  creditFlowStep: number;
  setCreditFlowStep: (step: number) => void;
  creditFlowAnswers: Record<string, string>;
  setCreditFlowAnswer: (key: string, value: string) => void;
  runCreditMatch: () => Promise<CreditProduct[]>;
  matchedCredits: CreditProduct[];
  setMatchedCredits: (products: CreditProduct[]) => void;

  selectedCreditIds: string[];
  toggleSelectedCredit: (id: string) => void;

  kpis: KPI[];
  analytics: AnalyticsData | null;
  transactions: Transaction[];
  loadAnalytics: () => Promise<void>;
  addTransaction: (input: {
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category?: string;
  }) => Promise<void>;

  actionSheetOpen: boolean;
  setActionSheetOpen: (open: boolean) => void;

  fundAllocations: FundAllocation[];
  loadAllocations: () => Promise<void>;
  adjustAllocation: (category: string, delta: number) => void;
  saveAllocations: () => Promise<void>;
  roadmap: typeof demoRoadmap;
}

const AppContext = createContext<AppStore | null>(null);

function mapTask(t: {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  status: string;
  dueDate: string;
  completed: boolean;
}): Task {
  return {
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    category: t.category as Task['category'],
    status: t.status as Task['status'],
    dueDate: t.dueDate,
    completed: t.completed,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [screen, setScreen] = useState<ScreenId>('home');
  const [history, setHistory] = useState<ScreenId[]>(['home']);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [journeyStage, setJourneyStage] = useState(0);
  const [journeyProfile, setJourneyProfileState] = useState<Record<string, string>>({});
  const [creditFlowStep, setCreditFlowStep] = useState(0);
  const [creditFlowAnswers, setCreditFlowAnswers] = useState<Record<string, string>>({});
  const [matchedCredits, setMatchedCredits] = useState<CreditProduct[]>([]);
  const [selectedCreditIds, setSelectedCreditIds] = useState<string[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [fundAllocations, setFundAllocations] = useState<FundAllocation[]>([]);
  const [oauthMfaPending, setOauthMfaPending] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLinked, setOauthLinked] = useState<string | null>(null);

  const navigate = useCallback((s: ScreenId) => {
    setScreen(s);
    setHistory((h) => [...h, s]);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = [...h];
      next.pop();
      setScreen(next[next.length - 1]);
      return next;
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const data = await api<{ user: AuthUser }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    const data = await api<{ tasks: Parameters<typeof mapTask>[0][] }>('/api/tasks');
    setTasks(data.tasks.map(mapTask));
  }, []);

  const loadChat = useCallback(async () => {
    const data = await api<{
      messages: AIMessage[];
    }>('/api/coach');
    setChatMessages(
      data.messages.map((m) => ({
        ...m,
        quickReplies: Array.isArray(m.quickReplies) ? (m.quickReplies as string[]) : undefined,
      })),
    );
    const lastAssistant = [...data.messages].reverse().find((m) => m.role === 'assistant' && m.stage != null);
    if (lastAssistant?.stage != null) setJourneyStage(lastAssistant.stage);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const [a, t] = await Promise.all([
      api<{ analytics: AnalyticsData; kpis: KPI[] }>('/api/analytics'),
      api<{
        transactions: {
          id: string;
          title: string;
          amount: number;
          type: 'income' | 'expense';
          category: string;
          occurredAt: string;
        }[];
      }>('/api/transactions'),
    ]);
    setAnalytics(a.analytics);
    setKpis(a.kpis);
    setTransactions(
      t.transactions.map((tx) => ({
        id: tx.id,
        title: tx.title,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        time: new Date(tx.occurredAt).toLocaleString('uz-UZ'),
      })),
    );
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // The app is a client-side SPA (no URL-based screen routing), but the OAuth
  // callback is a real server redirect and can only communicate outcome via
  // query params. Pick those up once on load, then scrub them from the URL.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const mfaRequired = params.get('oauthMfaRequired');
    const err = params.get('authError');
    const linked = params.get('linked');
    if (!mfaRequired && !err && !linked) return;

    if (mfaRequired) setOauthMfaPending(true);
    if (err) setOauthError(err);
    if (linked) setOauthLinked(linked);

    const url = new URL(window.location.href);
    url.searchParams.delete('oauthMfaRequired');
    url.searchParams.delete('authError');
    url.searchParams.delete('linked');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const startOAuth = useCallback((provider: 'google' | 'microsoft', opts?: { link?: boolean }) => {
    if (typeof window === 'undefined') return;
    const query = opts?.link ? '?link=1' : '';
    window.location.href = `/api/auth/${provider}${query}`;
  }, []);

  const completeOAuthMfa = useCallback(async (mfaCode: string) => {
    const data = await api<{ user: AuthUser }>('/api/auth/oauth/mfa', {
      method: 'POST',
      body: JSON.stringify({ mfaCode }),
    });
    setUser(data.user);
    setOauthMfaPending(false);
  }, []);

  const clearOAuthNotice = useCallback(() => {
    setOauthError(null);
    setOauthLinked(null);
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.all([loadTasks(), loadChat(), loadAnalytics()]).catch(() => undefined);
  }, [user, loadTasks, loadChat, loadAnalytics]);

  const login = useCallback(async (email: string, password: string, mfaCode?: string) => {
    const data = await api<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, mfaCode }),
    });
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      name: string;
      businessName?: string;
      region?: string;
    }) => {
      const data = await api<{ user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setTasks([]);
    setChatMessages([]);
    setMatchedCredits([]);
    setSelectedCreditIds([]);
    setKpis([]);
    setAnalytics(null);
    setTransactions([]);
    setScreen('home');
    setHistory(['home']);
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const data = await api<{ task: Parameters<typeof mapTask>[0] }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !current.completed }),
    });
    setTasks((prev) => prev.map((t) => (t.id === id ? mapTask(data.task) : t)));
  }, [tasks]);

  const sendCoachMessage = useCallback(
    async (text: string) => {
      const data = await api<{
        userMessage: AIMessage;
        assistantMessage: AIMessage;
        action?: AIMessage['action'];
      }>('/api/coach', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          stage: journeyStage,
          profile: journeyProfile,
        }),
      });
      setChatMessages((prev) => [
        ...prev,
        data.userMessage,
        {
          ...data.assistantMessage,
          quickReplies: Array.isArray(data.assistantMessage.quickReplies)
            ? (data.assistantMessage.quickReplies as string[])
            : undefined,
          action: data.action,
        },
      ]);
      if (data.assistantMessage.stage != null) setJourneyStage(data.assistantMessage.stage);
    },
    [journeyStage, journeyProfile],
  );

  const confirmAiAction = useCallback(async (action: NonNullable<AIMessage['action']>) => {
    return api<{ ok: boolean; result: { type: string } }>('/api/coach/actions', {
      method: 'POST',
      body: JSON.stringify({ action, confirm: true }),
    });
  }, []);

  const resetChat = useCallback(async () => {
    await api('/api/coach', { method: 'DELETE' });
    setJourneyStage(0);
    setJourneyProfileState({});
    setCreditFlowStep(0);
    setCreditFlowAnswers({});
    await loadChat();
  }, [loadChat]);

  const setJourneyProfile = useCallback((patch: Record<string, string>) => {
    setJourneyProfileState((p) => ({ ...p, ...patch }));
  }, []);

  const setCreditFlowAnswer = useCallback((key: string, value: string) => {
    setCreditFlowAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const runCreditMatch = useCallback(async () => {
    const data = await api<{ products: CreditProduct[] }>('/api/credits/match', {
      method: 'POST',
      body: JSON.stringify({
        ...creditFlowAnswers,
        region: journeyProfile.region,
      }),
    });
    setMatchedCredits(data.products);
    setSelectedCreditIds(data.products.slice(0, 2).map((p) => p.id));
    return data.products;
  }, [creditFlowAnswers, journeyProfile.region]);

  const toggleSelectedCredit = useCallback((id: string) => {
    setSelectedCreditIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const addTransaction = useCallback(
    async (input: { title: string; amount: number; type: 'income' | 'expense'; category?: string }) => {
      await api('/api/transactions', { method: 'POST', body: JSON.stringify(input) });
      await loadAnalytics();
    },
    [loadAnalytics],
  );

  const loadAllocations = useCallback(async () => {
    const data = await api<{ allocations: { category: string; label: string; amount: number }[] }>('/api/allocations');
    if (data.allocations.length > 0) {
      setFundAllocations(
        data.allocations.map((a) => ({
          category: a.category,
          label: a.label,
          amount: a.amount,
          color: ALLOCATION_META[a.category]?.color || 'hsl(210 80% 55%)',
          icon: ALLOCATION_META[a.category]?.icon || 'Wallet',
        })),
      );
      return;
    }
    const selected = matchedCredits.filter((p) => selectedCreditIds.includes(p.id));
    const total =
      selected.length > 0
        ? selected.reduce((sum, p) => sum + (p.amountMin + p.amountMax) / 2, 0)
        : 50_000_000;
    setFundAllocations(defaultAllocationsFor(total));
  }, [matchedCredits, selectedCreditIds]);

  const adjustAllocation = useCallback((category: string, delta: number) => {
    setFundAllocations((prev) =>
      prev.map((a) => (a.category === category ? { ...a, amount: Math.max(0, a.amount + delta) } : a)),
    );
  }, []);

  const saveAllocations = useCallback(async () => {
    const data = await api<{ allocations: { category: string; label: string; amount: number }[] }>('/api/allocations', {
      method: 'PUT',
      body: JSON.stringify({
        allocations: fundAllocations.map((a) => ({ category: a.category, label: a.label, amount: a.amount })),
      }),
    });
    setFundAllocations(
      data.allocations.map((a) => ({
        category: a.category,
        label: a.label,
        amount: a.amount,
        color: ALLOCATION_META[a.category]?.color || 'hsl(210 80% 55%)',
        icon: ALLOCATION_META[a.category]?.icon || 'Wallet',
      })),
    );
  }, [fundAllocations]);

  return (
    <AppContext.Provider
      value={{
        authLoading,
        user,
        login,
        register,
        logout,
        refreshSession,
        startOAuth,
        oauthMfaPending,
        completeOAuthMfa,
        oauthError,
        oauthLinked,
        clearOAuthNotice,
        screen,
        navigate,
        goBack,
        history,
        tasks,
        loadTasks,
        toggleTask,
        chatMessages,
        loadChat,
        sendCoachMessage,
        confirmAiAction,
        resetChat,
        journeyStage,
        setJourneyStage,
        journeyProfile,
        setJourneyProfile,
        creditFlowStep,
        setCreditFlowStep,
        creditFlowAnswers,
        setCreditFlowAnswer,
        runCreditMatch,
        matchedCredits,
        setMatchedCredits,
        selectedCreditIds,
        toggleSelectedCredit,
        kpis,
        analytics,
        transactions,
        loadAnalytics,
        addTransaction,
        actionSheetOpen,
        setActionSheetOpen,
        fundAllocations,
        loadAllocations,
        adjustAllocation,
        saveAllocations,
        roadmap: demoRoadmap,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
