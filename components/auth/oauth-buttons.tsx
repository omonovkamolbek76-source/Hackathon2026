'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.44H12v4.62h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

export function OAuthButtons({
  loading,
  onGoogle,
  onMicrosoft,
  google = true,
  microsoft = true,
}: {
  loading: 'google' | 'microsoft' | null;
  onGoogle: () => void;
  onMicrosoft: () => void;
  google?: boolean;
  microsoft?: boolean;
}) {
  if (!google && !microsoft) return null;

  const btn =
    'flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-60';

  return (
    <div className="space-y-2">
      {google && (
        <button type="button" onClick={onGoogle} disabled={loading !== null} className={cn(btn)}>
          {loading === 'google' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <GoogleIcon />}
          Google orqali davom etish
        </button>
      )}
      {microsoft && (
        <button type="button" onClick={onMicrosoft} disabled={loading !== null} className={cn(btn)}>
          {loading === 'microsoft' ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <MicrosoftIcon />}
          Microsoft orqali davom etish
        </button>
      )}
    </div>
  );
}
