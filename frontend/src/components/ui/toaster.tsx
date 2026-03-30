'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Toast } from './toast';

export function Toaster() {
  const { toasts, subscribe, removeToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribe();
    return unsubscribe;
  }, [subscribe]);

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col-reverse md:max-w-[420px]">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          title={t.title}
          description={t.description}
          variant={t.variant}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
