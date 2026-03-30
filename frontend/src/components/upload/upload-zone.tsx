'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, AlertCircle, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/utils';
import { ACCEPTED_FILE_TYPES, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/validations';

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ files, onFilesChange, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (newFiles: FileList | File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      Array.from(newFiles).forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 50MB limit`);
          return;
        }

        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        const isValidType =
          ACCEPTED_FILE_TYPES.includes(file.type) ||
          ACCEPTED_EXTENSIONS.includes(ext);

        if (!isValidType) {
          errors.push(`${file.name}: File type not supported`);
          return;
        }

        if (files.some((f) => f.name === file.name && f.size === file.size)) {
          errors.push(`${file.name}: File already added`);
          return;
        }

        valid.push(file);
      });

      return { valid, errors };
    },
    [files]
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const { valid, errors } = validateFiles(newFiles);
      setFileErrors(errors);
      if (valid.length > 0) {
        onFilesChange([...files, ...valid]);
      }
    },
    [files, onFilesChange, validateFiles]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300',
          isDragging
            ? 'dropzone-active'
            : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/[0.02]',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-xl bg-dot-grid opacity-50" />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className={cn(
            'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragging
              ? 'bg-primary/15 scale-110'
              : 'bg-muted/50'
          )}>
            <Upload
              className={cn(
                'h-7 w-7 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>
          <p className="font-display text-base font-semibold">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or click to browse your files
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {['PDF', 'DOCX', 'TXT', 'CSV', 'XLSX', 'JSON', 'XML', 'MD'].map((ext) => (
              <span
                key={ext}
                className="rounded-md border bg-card/50 px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
              >
                .{ext.toLowerCase()}
              </span>
            ))}
          </div>
          <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
            Max 50MB per file
          </p>
        </div>
      </div>

      {/* File errors */}
      {fileErrors.length > 0 && (
        <div className="space-y-1.5 animate-slide-down">
          {fileErrors.map((err, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <div className="stagger-children space-y-1.5">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2.5 transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <File className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {formatFileSize(file.size)} &middot;{' '}
                      {file.type || file.name.split('.').pop()?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
