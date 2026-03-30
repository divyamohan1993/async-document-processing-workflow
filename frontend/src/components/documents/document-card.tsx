'use client';

import { useRouter } from 'next/navigation';
import { FileText, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFileSize, formatRelativeDate, getStatusColor } from '@/lib/utils';
import type { Document } from '@/types';

interface DocumentCardProps {
  document: Document;
  onRetry?: (id: string) => void;
}

export function DocumentCard({ document, onRetry }: DocumentCardProps) {
  const router = useRouter();

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(`/documents/${document.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">
                {document.original_filename}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(document.file_size)}</span>
                <span>-</span>
                <span>{document.file_type.split('/').pop()?.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <Badge className={getStatusColor(document.status)}>
            {document.status === 'processing' && (
              <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {document.status}
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(document.created_at)}
          </div>
          {document.status === 'failed' && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(document.id);
              }}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
