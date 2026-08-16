'use client';

import { ArrowLeft, Check, FileText, CreditCard, Users, Package, Megaphone, Sparkles, ChevronRight, Bell, Settings } from 'lucide-react';
import { useApp } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';
import { demoUser } from '@/data/mock';
import type { Task } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  tax: FileText,
  bank: CreditCard,
  hr: Users,
  supply: Package,
  marketing: Megaphone,
  planning: Sparkles,
};

const statusStyles: Record<string, string> = {
  completed: 'bg-primary/10 text-primary',
  today: 'bg-chart-4/20 text-chart-4',
  overdue: 'bg-destructive/10 text-destructive',
  upcoming: 'bg-chart-2/10 text-chart-2',
};

const statusLabels: Record<string, string> = {
  completed: 'Bajarildi',
  today: 'Bugun',
  overdue: 'Kechiktirilgan',
  upcoming: 'Rejada',
};

export function TasksScreen() {
  const { tasks, toggleTask, navigate } = useApp();

  const allTasks = tasks;
  const todayTasks = tasks.filter((t) => t.status === 'today' || (t.status === 'completed' && t.dueDate === 'Bugun'));
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');

  const renderTaskCard = (task: Task) => {
    const Icon = categoryIcons[task.category] || FileText;
    return (
      <div
        key={task.id}
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all',
          task.completed && 'opacity-60'
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => {
            toggleTask(task.id);
            toast({
              title: task.completed ? 'Vazifa bekor qilindi' : 'Vazifa bajarildi!',
              description: task.title,
            });
          }}
          className="h-6 w-6 rounded-full border-2 data-[state=checked]:bg-primary"
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className={cn('text-sm font-semibold text-foreground', task.completed && 'line-through')}>
            {task.title}
          </div>
          <div className="text-[11px] text-muted-foreground">{task.subtitle}</div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{task.dueDate}</div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
            statusStyles[task.status]
          )}
        >
          {statusLabels[task.status]}
        </span>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-lg">
        <button onClick={() => navigate('home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-foreground md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Vazifalar</h1>
        <div className="w-9 md:hidden" />
      </header>

      <div className="px-4 py-4 pb-20 md:px-6">
        {/* User Summary Card */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {demoUser.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-foreground">{demoUser.name}</div>
            <div className="text-[11px] text-muted-foreground">{demoUser.email}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Tabs */}
        <div className="mb-3 flex gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-foreground">
            Barchasi
            <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{allTasks.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-foreground">
            Bugungi
            <span className="rounded-full bg-chart-4 px-1.5 text-[10px] text-white">{todayTasks.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-foreground">
            Kechiktirilgan
            <span className="rounded-full bg-destructive px-1.5 text-[10px] text-white">{overdueTasks.length}</span>
          </div>
        </div>

        {/* All Tasks */}
        <div className="space-y-2">
          {allTasks.map(renderTaskCard)}
        </div>

        {/* Settings link */}
        <button
          onClick={() => navigate('profile')}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:bg-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-foreground">
            <Settings className="h-5 w-5" />
          </div>
          <span className="flex-1 text-left text-sm font-semibold text-foreground">Sozlamalar</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
