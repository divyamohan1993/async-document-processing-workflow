'use client';

import { useProgress } from '@/hooks/use-progress';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Loader2, Zap } from 'lucide-react';

interface ProgressBarProps {
  documentId: string;
  enabled?: boolean;
  onComplete?: () => void;
  onError?: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  job_queued: 'Queued for processing',
  job_started: 'Processing initialized',
  document_parsing_started: 'Parsing document...',
  document_parsing_completed: 'Document parsed',
  field_extraction_started: 'Extracting structured fields...',
  field_extraction_completed: 'Fields extracted',
  job_completed: 'Processing complete',
  job_failed: 'Processing failed',
};

export function ProgressBar({
  documentId,
  enabled = true,
  onComplete,
  onError,
}: ProgressBarProps) {
  const { progress, currentStage, isConnected } = useProgress({
    documentId,
    enabled,
    onComplete,
    onError,
  });

  if (!enabled) return null;

  const stageLabel = currentStage ? (STAGE_LABELS[currentStage] || currentStage) : 'Initializing...';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-info" />
          </div>
          <div>
            <span className="text-sm font-medium">
              {stageLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold tabular-nums text-primary">
            {progress}%
          </span>
          <div className="flex items-center gap-1.5 rounded-full border bg-card/50 px-2 py-0.5">
            {isConnected ? (
              <>
                <Wifi className="h-2.5 w-2.5 text-success" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-success">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-2.5 w-2.5 text-destructive" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-destructive">Offline</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="relative">
        <Progress
          value={progress}
          className="h-2.5 bg-muted"
          indicatorClassName={cn(
            'transition-all duration-700 ease-out',
            progress < 30 && 'bg-warning',
            progress >= 30 && progress < 70 && 'bg-info',
            progress >= 70 && progress < 100 && 'bg-primary',
            progress === 100 && 'bg-success',
            progress < 100 && 'progress-striped'
          )}
        />
      </div>
    </div>
  );
}
