'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ProgressEvent } from '@/types';

interface UseProgressOptions {
  documentId: string;
  enabled?: boolean;
  onComplete?: () => void;
  onError?: () => void;
}

export function useProgress({
  documentId,
  enabled = true,
  onComplete,
  onError,
}: UseProgressOptions) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !documentId) return;

    const url = api.documents.getProgressUrl(documentId);
    const token = typeof window !== 'undefined'
      ? (() => {
          try {
            const stored = localStorage.getItem('auth-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              return parsed.state?.token || '';
            }
          } catch {
            return '';
          }
          return '';
        })()
      : '';

    const sseUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data: ProgressEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);
        setProgress(data.progress_percent);
        setCurrentStage(data.message);

        if (data.event_type === 'job_completed') {
          onComplete?.();
          es.close();
          setIsConnected(false);
        }

        if (data.event_type === 'job_failed') {
          onError?.();
          es.close();
          setIsConnected(false);
        }
      } catch {
        // Ignore parse errors from heartbeat messages
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [documentId, enabled, onComplete, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    events,
    progress,
    currentStage,
    isConnected,
  };
}
