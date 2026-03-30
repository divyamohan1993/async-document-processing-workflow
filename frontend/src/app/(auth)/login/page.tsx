'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { useAuthStore } from '@/stores/auth-store';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      router.replace('/dashboard');
    }
  }, [token, router]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 bg-grid">
      {/* Gradient orb background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute -bottom-40 right-1/4 h-60 w-60 rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
            <Activity className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Doc<span className="text-primary glow-text">Processor</span>
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Async Document Processing
            </p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
