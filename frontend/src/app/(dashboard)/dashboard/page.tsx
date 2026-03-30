'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentTable } from '@/components/documents/document-table';
import { DocumentFilters } from '@/components/documents/document-filters';
import { useDocuments } from '@/hooks/use-documents';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { DocumentListParams, DocumentStatus } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [params, setParams] = useState<DocumentListParams>({
    search: searchParams.get('search') || undefined,
    status: (searchParams.get('status') as DocumentStatus) || undefined,
    sort_by:
      (searchParams.get('sort_by') as DocumentListParams['sort_by']) || 'created_at',
    sort_order:
      (searchParams.get('sort_order') as DocumentListParams['sort_order']) || 'desc',
    page: Number(searchParams.get('page')) || 1,
    page_size: 10,
  });

  const { documents, total, totalPages, page, isLoading, error, refetch } =
    useDocuments(params);

  const stats = {
    total,
    processing: documents.filter((d) => d.status === 'processing').length,
    completed: documents.filter((d) => d.status === 'completed').length,
    failed: documents.filter((d) => d.status === 'failed').length,
  };

  const handleRetry = async (id: string) => {
    try {
      await api.documents.retry(id);
      toast({
        title: 'Retry initiated',
        description: 'Document processing has been restarted.',
        variant: 'success',
      });
      refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      toast({ title: 'Retry failed', description: message, variant: 'destructive' });
    }
  };

  const handleExport = async (id: string) => {
    try {
      await api.documents.export('json', [id]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      toast({ title: 'Export failed', description: message, variant: 'destructive' });
    }
  };

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const statCards = [
    {
      label: 'Total Documents',
      value: total,
      icon: FileText,
      color: 'text-foreground',
      bgColor: 'bg-muted/50',
      dotClass: '',
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: Zap,
      color: 'text-info',
      bgColor: 'bg-blue-500/10',
      dotClass: 'status-dot-processing',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-emerald-500/10',
      dotClass: 'status-dot-completed',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: AlertCircle,
      color: 'text-destructive',
      bgColor: 'bg-red-500/10',
      dotClass: 'status-dot-failed',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Processing Pipeline
          </h1>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Document management & monitoring
          </p>
        </div>
        <Button onClick={() => router.push('/upload')} className="gap-2 glow-primary">
          <Upload className="h-4 w-4" />
          Upload Documents
        </Button>
      </div>

      {/* Stats cards */}
      <div className="stagger-children grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="card-hover overflow-hidden">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-mono text-2xl font-bold tabular-nums ${stat.color}`}>
                  {stat.value}
                </p>
                <div className="flex items-center gap-1.5">
                  {stat.dotClass && <span className={`status-dot ${stat.dotClass}`} />}
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <DocumentFilters params={params} onParamsChange={setParams} />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive animate-slide-down">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="link"
              className="ml-auto h-auto p-0 text-destructive underline"
              onClick={refetch}
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Document table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <DocumentTable
            documents={documents}
            isLoading={isLoading}
            onRetry={handleRetry}
            onExport={handleExport}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between animate-fade-in">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {(page - 1) * (params.page_size || 10) + 1}
              &ndash;
              {Math.min(page * (params.page_size || 10), total)}
            </span>{' '}
            of {total} records
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="h-8 gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-8 w-8 p-0 font-mono text-xs ${
                      pageNum === page ? 'glow-primary' : ''
                    }`}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="h-8 gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
