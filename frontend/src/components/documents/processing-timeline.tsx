'use client';

import { Check, X, Loader2, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import type { ProcessingEvent, EventType } from '@/types';

interface ProcessingTimelineProps {
  events: ProcessingEvent[];
  currentStatus: string;
}

const EVENT_LABELS: Record<EventType, string> = {
  job_queued: 'Job Queued',
  job_started: 'Processing Started',
  document_parsing_started: 'Document Parsing',
  document_parsing_completed: 'Parsing Complete',
  field_extraction_started: 'Field Extraction',
  field_extraction_completed: 'Extraction Complete',
  job_completed: 'Processing Complete',
  job_failed: 'Processing Failed',
};

function getEventIcon(eventType: EventType, isLatest: boolean, currentStatus: string) {
  if (eventType === 'job_failed') {
    return <X className="h-3.5 w-3.5 text-destructive" />;
  }
  if (eventType === 'job_completed') {
    return <Check className="h-3.5 w-3.5 text-success" />;
  }
  if (isLatest && currentStatus === 'processing') {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-info" />;
  }
  if (eventType.endsWith('_completed') || eventType === 'job_started') {
    return <Check className="h-3.5 w-3.5 text-success" />;
  }
  if (eventType.endsWith('_started')) {
    return isLatest ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-info" />
    ) : (
      <Check className="h-3.5 w-3.5 text-success" />
    );
  }
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getNodeStyle(eventType: EventType, isLatest: boolean, currentStatus: string) {
  if (eventType === 'job_failed') return 'border-destructive/40 bg-destructive/5';
  if (eventType === 'job_completed') return 'border-success/40 bg-success/5';
  if (isLatest && currentStatus === 'processing') return 'border-info/40 bg-info/5 animate-pulse-glow';
  return 'border-border bg-card';
}

export function ProcessingTimeline({ events, currentStatus }: ProcessingTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
          <Zap className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">No processing events yet.</p>
        <p className="font-mono text-[10px] text-muted-foreground/50">Events appear as processing progresses</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="space-y-0">
      {sortedEvents.map((event, index) => {
        const isLatest = index === sortedEvents.length - 1;
        const isFailed = event.event_type === 'job_failed';
        const isComplete = event.event_type === 'job_completed';
        const nodeStyle = getNodeStyle(event.event_type, isLatest, currentStatus);

        return (
          <div
            key={event.id}
            className={cn(
              'relative flex gap-4 pb-6 last:pb-0',
              isLatest && 'animate-fade-in-up'
            )}
          >
            {/* Vertical line */}
            {index < sortedEvents.length - 1 && (
              <div className={cn(
                'absolute left-[15px] top-8 h-full w-px',
                isFailed ? 'bg-destructive/20' : 'bg-border'
              )} />
            )}

            {/* Icon node */}
            <div
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all',
                nodeStyle
              )}
            >
              {getEventIcon(event.event_type, isLatest, currentStatus)}
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className={cn(
                  'text-sm font-semibold',
                  isFailed && 'text-destructive',
                  isComplete && 'text-success'
                )}>
                  {EVENT_LABELS[event.event_type] || event.event_type}
                </p>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                  {formatDate(event.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {event.message}
              </p>
              {event.progress_percent > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-700 ease-out',
                        isFailed ? 'bg-destructive' : 'bg-primary'
                      )}
                      style={{ width: `${event.progress_percent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {event.progress_percent}%
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
