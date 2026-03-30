import type { Metadata } from 'next';
import { Providers } from '@/components/layout/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocProcessor — Async Document Processing Workflow',
  description: 'Production-grade async document processing workflow system with live progress tracking, built with Next.js, FastAPI, Celery & Redis.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased noise-overlay">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
