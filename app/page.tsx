'use client';

import { useApp } from '@/lib/store';
import { AppShell } from '@/components/app/app-shell';
import { HomeScreen } from '@/components/screens/home-screen';
import { AIScreen } from '@/components/screens/ai-screen';
import { BusinessPlanScreen } from '@/components/screens/business-plan-screen';
import { AnalyticsScreen } from '@/components/screens/analytics-screen';
import { TasksScreen } from '@/components/screens/tasks-screen';
import { ProfileScreen } from '@/components/screens/profile-screen';
import { CreditMatchingScreen } from '@/components/screens/credit-matching-screen';
import { CreditComparisonScreen } from '@/components/screens/credit-comparison-screen';
import { CreditAllocationScreen } from '@/components/screens/credit-allocation-screen';
import { CreditRoadmapScreen } from '@/components/screens/credit-roadmap-screen';

export default function Home() {
  const { screen } = useApp();

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
