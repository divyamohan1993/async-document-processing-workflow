'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { registerSchema, type RegisterFormData } from '@/lib/validations';

export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSubmitError(null);
    clearError();
    try {
      await registerUser(data.email, data.password, data.full_name);
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setSubmitError(message);
    }
  };

  const displayError = submitError || error;

  return (
    <Card className="w-full max-w-md border-border/50 shadow-lg backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="font-display text-xl font-bold">Create account</CardTitle>
        <CardDescription className="text-xs">
          Set up your account to start processing documents
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {displayError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive animate-slide-down">
              {displayError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="font-mono text-[11px] uppercase tracking-wider">
              Full Name
            </Label>
            <Input
              id="full_name"
              placeholder="Rijul Chaudhary"
              autoComplete="name"
              className="h-10"
              {...register('full_name')}
            />
            {errors.full_name && (
              <p className="text-[11px] text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="font-mono text-[11px] uppercase tracking-wider">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              className="h-10"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-[11px] text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-mono text-[11px] uppercase tracking-wider">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="h-10"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-[11px] text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="font-mono text-[11px] uppercase tracking-wider">
              Confirm Password
            </Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              className="h-10"
              {...register('confirm_password')}
            />
            {errors.confirm_password && (
              <p className="text-[11px] text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full gap-2 glow-primary" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
