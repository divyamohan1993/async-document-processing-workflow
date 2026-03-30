'use client';

import { CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface UploadFileStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
}

interface UploadProgressProps {
  files: UploadFileStatus[];
}

export function UploadProgress({ files }: UploadProgressProps) {
  if (files.length === 0) return null;

  const completed = files.filter((f) => f.status === 'success').length;
  const failed = files.filter((f) => f.status === 'error').length;
  const total = files.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Uploading {completed}/{total} files
        </span>
        {failed > 0 && (
          <span className="text-destructive">{failed} failed</span>
        )}
      </div>

      <div className="space-y-3">
        {files.map((item, index) => (
          <div
            key={`${item.file.name}-${index}`}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            <div className="shrink-0">
              {item.status === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {item.status === 'error' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {item.status === 'uploading' && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              )}
              {item.status === 'pending' && (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{item.file.name}</p>
              {item.status === 'uploading' && (
                <Progress value={item.progress} className="mt-1 h-1" />
              )}
              {item.status === 'error' && item.error && (
                <p className="mt-0.5 text-xs text-destructive">{item.error}</p>
              )}
              {item.status === 'success' && (
                <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                  Uploaded successfully
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
