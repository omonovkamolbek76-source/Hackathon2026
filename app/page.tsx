'use client';

import dynamic from 'next/dynamic';
import { useApp } from '@/lib/store';
import { AppShell } from '@/components/app/app-shell';
import { AuthScreen } from '@/components/screens/auth-screen';

const HomeScreen = dynamic(() => import('@/components/screens/home-screen').then((m) => m.HomeScreen), { ssr: false });
const AIScreen = dynamic(() => import('@/components/screens/ai-screen').then((m) => m.AIScreen), { ssr: false });
const BusinessPlanScreen = dynamic(
  () => import('@/components/screens/business-plan-screen').then((m) => m.BusinessPlanScreen),
  { ssr: false },
);
const AnalyticsScreen = dynamic(
  () => import('@/components/screens/analytics-screen').then((m) => m.AnalyticsScreen),
  { ssr: false },
);
const TasksScreen = dynamic(() => import('@/components/screens/tasks-screen').then((m) => m.TasksScreen), { ssr: false });
const ProfileScreen = dynamic(
  () => import('@/components/screens/profile-screen').then((m) => m.ProfileScreen),
  { ssr: false },
);
const CreditMatchingScreen = dynamic(
  () => import('@/components/screens/credit-matching-screen').then((m) => m.CreditMatchingScreen),
  { ssr: false },
);
const CreditComparisonScreen = dynamic(
  () => import('@/components/screens/credit-comparison-screen').then((m) => m.CreditComparisonScreen),
  { ssr: false },
);
const CreditAllocationScreen = dynamic(
  () => import('@/components/screens/credit-allocation-screen').then((m) => m.CreditAllocationScreen),
  { ssr: false },
);
const CreditRoadmapScreen = dynamic(
  () => import('@/components/screens/credit-roadmap-screen').then((m) => m.CreditRoadmapScreen),
  { ssr: false },
);

export default function Home() {
  const { screen, user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Yuklanmoqda...
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  const renderScreen = () => {
    switch (screen) {
      case 'home':
        return <HomeScreen />;
      case 'ai':
        return <AIScreen />;
      case 'business-plan':
        return <BusinessPlanScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'tasks':
        return <TasksScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'credit-matching':
        return <CreditMatchingScreen />;
      case 'credit-comparison':
        return <CreditComparisonScreen />;
      case 'credit-allocation':
        return <CreditAllocationScreen />;
      case 'credit-roadmap':
        return <CreditRoadmapScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return <AppShell>{renderScreen()}</AppShell>;
}
