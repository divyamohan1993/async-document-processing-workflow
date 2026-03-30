'use client';

import { useParams } from 'next/navigation';
import { DocumentDetail } from '@/components/documents/document-detail';
import { useDocument } from '@/hooks/use-documents';

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { document, isLoading, error, refetch } = useDocument(id);

  return (
    <DocumentDetail
      document={document}
      isLoading={isLoading}
      error={error}
      onRefetch={refetch}
    />
  );
}
