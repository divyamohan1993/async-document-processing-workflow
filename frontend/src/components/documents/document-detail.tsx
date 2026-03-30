'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Pencil,
  CheckCircle,
  AlertCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Loader2,
  File,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProcessingTimeline } from './processing-timeline';
import { ProgressBar } from './progress-bar';
import { DocumentEditForm } from './document-edit-form';
import { ExportButton } from './export-button';
import { formatFileSize, formatDate, getStatusColor } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { Document } from '@/types';

interface DocumentDetailProps {
  document: Document | null;
  isLoading: boolean;
  error: string | null;
  onRefetch: () => void;
}

export function DocumentDetail({
  document,
  isLoading,
  error,
  onRefetch,
}: DocumentDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold">Error loading document</h3>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          {error || 'Document not found'}
        </p>
        <Button variant="outline" className="mt-6" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const result = document.processing_result;
  const isProcessing = document.status === 'processing';
  const isFailed = document.status === 'failed';
  const isCompleted = document.status === 'completed';
  const isFinalized = result?.is_finalized === true;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await api.documents.retry(document.id);
      toast({
        title: 'Retry initiated',
        description: 'Document processing has been restarted.',
        variant: 'success',
      });
      setShowRetryDialog(false);
      onRefetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      toast({ title: 'Retry failed', description: message, variant: 'destructive' });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await api.documents.finalize(document.id);
      toast({
        title: 'Document finalized',
        description: 'This document has been locked and finalized.',
        variant: 'success',
      });
      setShowFinalizeDialog(false);
      onRefetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Finalization failed';
      toast({ title: 'Finalize failed', description: message, variant: 'destructive' });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{document.original_filename}</h1>
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="uppercase">{document.file_type.split('/').pop()}</span>
                <span className="text-border">&middot;</span>
                <span>{formatFileSize(document.file_size)}</span>
                <span className="text-border">&middot;</span>
                <span>{formatDate(document.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(document.status)}>
            {isProcessing && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {document.status}
          </Badge>
          {isFinalized && (
            <Badge variant="outline" className="gap-1 border-success/30 text-success">
              <Lock className="h-3 w-3" />
              Finalized
            </Badge>
          )}
        </div>
      </div>

      {/* Error message */}
      {isFailed && document.error_message && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 animate-slide-down">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Processing Failed</p>
              <p className="mt-1 font-mono text-xs text-destructive/80">
                {document.error_message}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/10"
                onClick={() => setShowRetryDialog(true)}
              >
                <RefreshCw className="h-3 w-3" />
                Retry Processing
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live progress */}
      {isProcessing && (
        <Card className="overflow-hidden border-info/20 glow-primary">
          <CardContent className="pt-6">
            <ProgressBar
              documentId={document.id}
              enabled={isProcessing}
              onComplete={onRefetch}
              onError={onRefetch}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Processing Timeline */}
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Processing Timeline
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ProcessingTimeline
              events={document.processing_events}
              currentStatus={document.status}
            />
          </CardContent>
        </Card>

        {/* Results or placeholder */}
        {result ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Extracted Data
              </span>
              <div className="flex items-center gap-2">
                {!isFinalized && isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="h-7 gap-1 text-xs"
                  >
                    <Pencil className="h-3 w-3" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                )}
                <ExportButton
                  documentIds={[document.id]}
                  disabled={!isFinalized}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isEditing ? (
                <DocumentEditForm
                  documentId={document.id}
                  result={result}
                  onSave={() => {
                    setIsEditing(false);
                    onRefetch();
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Title</p>
                    <p className="mt-1 text-sm font-medium">{result.title || '--'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Category</p>
                    <p className="mt-1 text-sm">{result.category || '--'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Summary</p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{result.summary || '--'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Keywords</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {result.keywords.length > 0 ? (
                        result.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="font-mono text-[10px]">
                            {kw}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </div>
                  </div>

                  {result.structured_data &&
                    Object.keys(result.structured_data).length > 0 && (
                      <div>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          Structured Data
                        </p>
                        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
                          {JSON.stringify(result.structured_data, null, 2)}
                        </pre>
                      </div>
                    )}

                  {result.raw_text && (
                    <div>
                      <button
                        onClick={() => setShowRawText(!showRawText)}
                        className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Raw Text
                        {showRawText ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                      {showRawText && (
                        <pre className="mt-2 max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap animate-slide-down">
                          {result.raw_text}
                        </pre>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Finalize section */}
                  <div className="flex items-center justify-between">
                    {isFinalized ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Finalized</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {result.finalized_at ? formatDate(result.finalized_at) : ''}
                        </span>
                      </div>
                    ) : (
                      isCompleted && (
                        <Button onClick={() => setShowFinalizeDialog(true)} className="gap-2 glow-primary">
                          <Lock className="h-4 w-4" />
                          Finalize Document
                        </Button>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          !isProcessing &&
          !isFailed && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Processing results will appear here once complete.
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Finalize confirmation dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Finalize Document</DialogTitle>
            <DialogDescription>
              Once finalized, the extracted data can no longer be edited. Are you sure
              you want to finalize this document?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleFinalize} disabled={isFinalizing} className="gap-2">
              {isFinalizing && <Loader2 className="h-4 w-4 animate-spin" />}
              Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry confirmation dialog */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Retry Processing</DialogTitle>
            <DialogDescription>
              This will re-queue the document for processing. Any previous results
              will be replaced. Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRetryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRetry} disabled={isRetrying} className="gap-2">
              {isRetrying && <Loader2 className="h-4 w-4 animate-spin" />}
              Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
