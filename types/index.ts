export type ScreenId =
  | 'home'
  | 'ai'
  | 'business-plan'
  | 'analytics'
  | 'tasks'
  | 'profile'
  | 'credit-matching'
  | 'credit-comparison'
  | 'credit-allocation'
  | 'credit-roadmap';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  businessName: string;
  region: string;
}

export interface Business {
  id: string;
  name: string;
  region: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export type TaskStatus = 'completed' | 'today' | 'overdue' | 'upcoming';

export interface Task {
  id: string;
  title: string;
  subtitle: string;
  category: 'tax' | 'bank' | 'hr' | 'supply' | 'marketing' | 'planning';
  status: TaskStatus;
  dueDate: string;
  completed: boolean;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  time: string;
  category: string;
}

export interface CreditProduct {
  id: string;
  name: string;
  bank: string;
  amountMin: number;
  amountMax: number;
  interestRate: number;
  termMonths: number;
  gracePeriod: number;
  collateral: string;
  purpose: string;
  matchScore: number;
  recommendedReason: string;
  badge?: string;
}

export interface CreditMatch {
  products: CreditProduct[];
  summary: string;
}

export interface FundAllocation {
  category: string;
  label: string;
  amount: number;
  color: string;
  icon: string;
}

export interface BusinessPlan {
  businessName: string;
  targetAudience: string;
  budget: number;
  description: string;
  concept: string;
  marketOpportunity: string;
  competitors: string;
  marketingPlan: string;
  operationalPlan: string;
  financialPlan: string;
  expenses: string;
  expectedRevenue: string;
  breakeven: string;
  nextSteps: string[];
}

export type AIMessageRole = 'user' | 'assistant';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  quickReplies?: string[];
  timestamp: number;
  stage?: number;
  stageName?: string;
}

export interface KPI {
  id: string;
  label: string;
  value: number;
  trend: number;
  trendLabel: string;
  format: 'currency' | 'percent';
  sparkline: number[];
  color: string;
}

export interface AnalyticsData {
  monthlyRevenue: { month: string; revenue: number; expense: number }[];
  expenseBreakdown: { name: string; value: number; color: string }[];
  netProfit: number;
  growth: number;
  topProduct: string;
  topProductShare: number;
}

export interface RoadmapStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}
