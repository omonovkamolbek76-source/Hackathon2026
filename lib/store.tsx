'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ScreenId, Task, AIMessage, User, CreditProduct, KPI, AnalyticsData, Transaction } from '@/types';
import { api } from '@/lib/client-api';
import { demoRoadmap, demoFundAllocations } from '@/data/mock';

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

  fundAllocations: typeof demoFundAllocations;
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
        },
      ]);
      if (data.assistantMessage.stage != null) setJourneyStage(data.assistantMessage.stage);
    },
    [journeyStage, journeyProfile],
  );

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

  return (
    <AppContext.Provider
      value={{
        authLoading,
        user,
        login,
        register,
        logout,
        refreshSession,
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
        selectedCreditIds,
        toggleSelectedCredit,
        kpis,
        analytics,
        transactions,
        loadAnalytics,
        addTransaction,
        actionSheetOpen,
        setActionSheetOpen,
        fundAllocations: demoFundAllocations,
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
