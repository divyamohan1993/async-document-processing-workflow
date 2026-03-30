'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function useAuth(requireAuth = true) {
  const router = useRouter();
  const { token, user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      checkAuth();
    }
  }, [token, user, checkAuth]);

  useEffect(() => {
    if (requireAuth && !isLoading && !token) {
      router.push('/login');
    }
  }, [requireAuth, isLoading, token, router]);

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
  };
}
