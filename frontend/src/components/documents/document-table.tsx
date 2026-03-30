'use client';

import { useRouter } from 'next/navigation';
import { FileText, Eye, RefreshCw, Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFileSize, formatRelativeDate, getStatusColor } from '@/lib/utils';
import type { Document } from '@/types';

interface DocumentTableProps {
  documents: Document[];
  isLoading: boolean;
  onRetry?: (id: string) => void;
  onExport?: (id: string) => void;
}

export function DocumentTable({
  documents,
  isLoading,
  onRetry,
  onExport,
}: DocumentTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No documents found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload some documents to get started, or adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Filename</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden md:table-cell">Size</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow
            key={doc.id}
            className="cursor-pointer"
            onClick={() => router.push(`/documents/${doc.id}`)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate max-w-[200px] font-medium">
                  {doc.original_filename}
                </span>
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <span className="text-xs text-muted-foreground uppercase">
                {doc.file_type.split('/').pop()}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="text-sm text-muted-foreground">
                {formatFileSize(doc.file_size)}
              </span>
            </TableCell>
            <TableCell>
              <Badge className={getStatusColor(doc.status)}>
                {doc.status === 'processing' && (
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                )}
                {doc.status}
              </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <span className="text-sm text-muted-foreground">
                {formatRelativeDate(doc.created_at)}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  title="View details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {doc.status === 'failed' && onRetry && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRetry(doc.id)}
                    title="Retry processing"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                {doc.processing_result?.is_finalized && onExport && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onExport(doc.id)}
                    title="Export"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
