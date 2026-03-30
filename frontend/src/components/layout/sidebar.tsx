'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & pipeline',
  },
  {
    title: 'Upload',
    href: '/upload',
    icon: Upload,
    description: 'Add new documents',
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card/30 md:block">
      <nav className="flex flex-col gap-1 p-3">
        {/* Navigation label */}
        <p className="mb-1 px-3 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
          Navigation
        </p>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary glow-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'bg-primary/15'
                  : 'bg-muted/50 group-hover:bg-muted'
              )}>
                <item.icon className={cn(
                  'h-3.5 w-3.5',
                  isActive ? 'text-primary' : ''
                )} />
              </div>
              <div>
                <p className="leading-none">{item.title}</p>
                <p className={cn(
                  'mt-0.5 text-[10px] font-normal',
                  isActive ? 'text-primary/60' : 'text-muted-foreground/50'
                )}>
                  {item.description}
                </p>
              </div>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {/* Quick stats section */}
        <div className="mt-6 border-t pt-4">
          <p className="mb-2 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            Quick Access
          </p>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            All Documents
          </Link>
        </div>

        {/* System info at bottom */}
        <div className="mt-auto border-t pt-4">
          <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-3">
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Async Engine
              </span>
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">
              Celery + Redis Pub/Sub
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
}
