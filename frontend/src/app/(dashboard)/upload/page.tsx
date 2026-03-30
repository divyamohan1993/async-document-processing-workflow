'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ArrowLeft, ArrowRight, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UploadZone } from '@/components/upload/upload-zone';
import { UploadProgress, type UploadFileStatus } from '@/components/upload/upload-progress';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadFileStatus[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadComplete(false);

    const statuses: UploadFileStatus[] = files.map((file) => ({
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    setUploadStatuses(statuses);

    for (let i = 0; i < files.length; i++) {
      setUploadStatuses((prev) =>
        prev.map((s, idx) =>
          idx === i ? { ...s, status: 'uploading' as const, progress: 50 } : s
        )
      );

      try {
        const result = await api.documents.upload([files[i]]);
        setUploadStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  status: 'success' as const,
                  progress: 100,
                  documentId: result[0]?.id,
                }
              : s
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadStatuses((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? { ...s, status: 'error' as const, progress: 0, error: message }
              : s
          )
        );
      }
    }

    setIsUploading(false);
    setUploadComplete(true);

    const successCount = uploadStatuses.filter((s) => s.status !== 'error').length;
    if (successCount > 0) {
      toast({
        title: 'Upload complete',
        description: `${files.length} file(s) uploaded and queued for processing.`,
        variant: 'success',
      });
    }
  };

  const handleReset = () => {
    setFiles([]);
    setUploadStatuses([]);
    setUploadComplete(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Upload Documents</h1>
          <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Add files to processing pipeline
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Select Files</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Drag and drop files or click to browse. Supports PDF, Office documents,
            text, CSV, and more. Max 50MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {!uploadComplete ? (
            <>
              <UploadZone
                files={files}
                onFilesChange={setFiles}
                disabled={isUploading}
              />

              {uploadStatuses.length > 0 && (
                <UploadProgress files={uploadStatuses} />
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleUpload}
                  disabled={files.length === 0 || isUploading}
                  className="flex-1 gap-2 glow-primary"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading
                    ? 'Uploading...'
                    : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-scale-in">
              <UploadProgress files={uploadStatuses} />

              <div className="flex flex-col items-center gap-4 pt-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 glow-success">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <div className="text-center">
                  <p className="font-display text-lg font-bold">Upload Complete</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    Documents queued for async processing
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    Upload More
                  </Button>
                  <Button onClick={() => router.push('/dashboard')} className="gap-2 glow-primary">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
