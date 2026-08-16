import type {
  User,
  Business,
  Task,
  Transaction,
  CreditProduct,
  FundAllocation,
  AnalyticsData,
  KPI,
  RoadmapStep,
} from '@/types';

export const demoUser: User = {
  id: 'u1',
  name: 'Akmaljon Karimov',
  email: 'akmaljon@example.uz',
  phone: '+998 90 123 45 67',
  avatarUrl: '',
  businessName: 'Eco Trade',
  region: 'Samarqand',
};

export const demoBusiness: Business = {
  id: 'b1',
  name: 'Eco Trade',
  region: 'Samarqand',
  revenue: 128450000,
  expenses: 76230000,
  profit: 52220000,
};

export const demoKPIs: KPI[] = [
  {
    id: 'revenue',
    label: 'Daromad',
    value: 12450000,
    trend: 8.5,
    trendLabel: 'kechagiga nisbatan',
    format: 'currency',
    sparkline: [8, 9, 8.5, 10, 11, 10.5, 12.45],
    color: 'hsl(160 100% 33%)',
  },
  {
    id: 'expense',
    label: 'Xarajat',
    value: 7150000,
    trend: 3.2,
    trendLabel: 'kechagiga nisbatan',
    format: 'currency',
    sparkline: [6, 6.5, 6.2, 7, 6.8, 7.1, 7.15],
    color: 'hsl(30 90% 55%)',
  },
  {
    id: 'profit',
    label: 'Foyda',
    value: 5300000,
    trend: 12.7,
    trendLabel: 'kechagiga nisbatan',
    format: 'currency',
    sparkline: [3, 3.5, 4, 4.2, 4.8, 5, 5.3],
    color: 'hsl(210 80% 55%)',
  },
];

export const demoTasks: Task[] = [
  {
    id: 't1',
    title: 'Soliq hisobotini topshirish',
    subtitle: 'Daromad solig‘i bo‘yicha hisobot',
    category: 'tax',
    status: 'completed',
    dueDate: '2026-yil 20-may',
    completed: true,
  },
  {
    id: 't2',
    title: 'Bankdan ko‘chirma olish',
    subtitle: 'Oylik hisobvaraq ko‘chirmasi',
    category: 'bank',
    status: 'today',
    dueDate: 'Bugun',
    completed: false,
  },
  {
    id: 't3',
    title: 'Xodimlar maoshini to‘lash',
    subtitle: 'May oyi uchun maosh',
    category: 'hr',
    status: 'upcoming',
    dueDate: '3 kun qoldi',
    completed: false,
  },
  {
    id: 't4',
    title: 'Xom ashyo yetkazib berish',
    subtitle: 'Yetkazib beruvchi: Global Trade',
    category: 'supply',
    status: 'upcoming',
    dueDate: '6 kun qoldi',
    completed: false,
  },
  {
    id: 't5',
    title: 'Marketing kampaniyasi',
    subtitle: 'Yangi mahsulot uchun reklama',
    category: 'marketing',
    status: 'upcoming',
    dueDate: '8 kun qoldi',
    completed: false,
  },
  {
    id: 't6',
    title: 'Biznes reja yangilash',
    subtitle: '2026-yil uchun reja',
    category: 'planning',
    status: 'upcoming',
    dueDate: '14 kun qoldi',
    completed: false,
  },
];

export const demoTransactions: Transaction[] = [
  {
    id: 'tx1',
    title: 'Mahsulot sotish',
    amount: 1250000,
    type: 'income',
    time: 'Bugun, 09:30',
    category: 'income',
  },
  {
    id: 'tx2',
    title: 'Tovar xaridi',
    amount: 2300000,
    type: 'expense',
    time: 'Bugun, 08:15',
    category: 'supply',
  },
  {
    id: 'tx3',
    title: 'Xodimlar maoshi',
    amount: 4500000,
    type: 'expense',
    time: 'Kecha, 18:00',
    category: 'hr',
  },
  {
    id: 'tx4',
    title: 'Reklama xarajati',
    amount: 850000,
    type: 'expense',
    time: 'Kecha, 14:20',
    category: 'marketing',
  },
  {
    id: 'tx5',
    title: 'Kredit to‘lovi',
    amount: 1500000,
    type: 'expense',
    time: 'Kecha, 10:00',
    category: 'credit',
  },
];

export const demoCreditProducts: CreditProduct[] = [
  {
    id: 'c1',
    name: 'Biznesni rivojlantirish krediti',
    bank: 'TBC Bank',
    amountMin: 25000000,
    amountMax: 200000000,
    interestRate: 22,
    termMonths: 24,
    gracePeriod: 3,
    collateral: 'Ko‘chmas mulk yoki uskuna',
    purpose: 'Biznesni kengaytirish, uskuna xaridi',
    matchScore: 91,
    recommendedReason:
      'Sizning daromadingiz va biznes tajribangiz bu kreditni qaytarish uchun mos keladi. Imtiyozli davr sizga birinchi 3 oy to‘lovlarni osonlashtiradi.',
    badge: 'Eng yaxshi moslik',
  },
  {
    id: 'c2',
    name: 'Aylanma mablag‘ krediti',
    bank: 'Kapitalbank',
    amountMin: 10000000,
    amountMax: 100000000,
    interestRate: 26,
    termMonths: 12,
    gracePeriod: 1,
    collateral: 'Tovar aylanmasi',
    purpose: 'Tovar xaridi, aylanma mablag‘',
    matchScore: 85,
    recommendedReason:
      'Qisqa muddatli ehtiyoj uchun mos. Tez tasdiqlash va mos garov talablari.',
  },
  {
    id: 'c3',
    name: 'Mikro biznes krediti',
    bank: 'Hamkorbank',
    amountMin: 5000000,
    amountMax: 50000000,
    interestRate: 28,
    termMonths: 18,
    gracePeriod: 2,
    collateral: 'Garovsiz (kichik summa uchun)',
    purpose: 'Kichik biznes boshlash, asbob-uskuna',
    matchScore: 78,
    recommendedReason:
      'Garovsiz olish imkoniyati bor, lekin foiz stavkasi yuqoriroq. Kichik summalar uchun mos.',
  },
];

export const demoFundAllocations: FundAllocation[] = [
  {
    category: 'equipment',
    label: 'Uskuna',
    amount: 50000000,
    color: 'hsl(160 100% 33%)',
    icon: 'Wrench',
  },
  {
    category: 'inventory',
    label: 'Tovar',
    amount: 20000000,
    color: 'hsl(210 80% 55%)',
    icon: 'Package',
  },
  {
    category: 'marketing',
    label: 'Marketing',
    amount: 10000000,
    color: 'hsl(30 90% 55%)',
    icon: 'Megaphone',
  },
  {
    category: 'working',
    label: 'Aylanma mablag‘',
    amount: 5000000,
    color: 'hsl(270 60% 60%)',
    icon: 'Wallet',
  },
  {
    category: 'reserve',
    label: 'Zaxira',
    amount: 5000000,
    color: 'hsl(200 60% 50%)',
    icon: 'Shield',
  },
];

export const demoAnalytics: AnalyticsData = {
  monthlyRevenue: [
    { month: 'Yan', revenue: 95000000, expense: 60000000 },
    { month: 'Fev', revenue: 102000000, expense: 63000000 },
    { month: 'Mar', revenue: 108000000, expense: 68000000 },
    { month: 'Apr', revenue: 108300000, expense: 70000000 },
    { month: 'May', revenue: 115000000, expense: 72000000 },
    { month: 'Iyun', revenue: 121000000, expense: 74000000 },
    { month: 'Iyul', revenue: 128450000, expense: 76230000 },
  ],
  expenseBreakdown: [
    { name: 'Xodimlar maoshi', value: 32000000, color: 'hsl(160 100% 33%)' },
    { name: 'Xom ashyo', value: 22000000, color: 'hsl(210 80% 55%)' },
    { name: 'Marketing', value: 12000000, color: 'hsl(30 90% 55%)' },
    { name: 'Ijara', value: 8000000, color: 'hsl(270 60% 60%)' },
    { name: 'Boshqa xarajatlar', value: 2230000, color: 'hsl(200 60% 50%)' },
  ],
  netProfit: 52220000,
  growth: 18.6,
  topProduct: 'Premium paket',
  topProductShare: 34,
};

export const demoRoadmap: RoadmapStep[] = [
  {
    id: 1,
    title: 'Kredit olish',
    description: 'Mos kreditni tanlang va rasmiylashtiring',
    icon: 'CreditCard',
  },
  {
    id: 2,
    title: 'Mablag‘ni taqsimlash',
    description: 'Kreditni maqsadlarga muvofiq rejalashtiring',
    icon: 'Wallet',
  },
  {
    id: 3,
    title: 'Uskuna / tovar',
    description: 'Kerakli resurslarni xarid qiling',
    icon: 'Package',
  },
  {
    id: 4,
    title: 'Savdoni boshlash',
    description: 'Yangi mahsulot yoki xizmatni ishga tushiring',
    icon: 'ShoppingCart',
  },
  {
    id: 5,
    title: 'Daromadni o‘lchash',
    description: 'Natijalarni kuzating va tahlil qiling',
    icon: 'BarChart3',
  },
  {
    id: 6,
    title: 'Kredit to‘lovlarini nazorat qilish',
    description: 'To‘lov jadvalini avtomatik kuzating',
    icon: 'Calendar',
  },
  {
    id: 7,
    title: 'Foydani oshirish',
    description: 'Samaradorlikni yaxshilang va optimallashtiring',
    icon: 'TrendingUp',
  },
  {
    id: 8,
    title: 'Kengayish',
    description: 'Yangi bozorlarga chiqing va o‘sing',
    icon: 'Rocket',
  },
];
