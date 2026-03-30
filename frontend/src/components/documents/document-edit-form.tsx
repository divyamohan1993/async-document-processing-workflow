'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { updateResultSchema, type UpdateResultFormData } from '@/lib/validations';
import type { ProcessingResult } from '@/types';

interface DocumentEditFormProps {
  documentId: string;
  result: ProcessingResult;
  onSave: () => void;
  onCancel: () => void;
}

export function DocumentEditForm({
  documentId,
  result,
  onSave,
  onCancel,
}: DocumentEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keywords, setKeywords] = useState<string[]>(result.keywords || []);
  const [newKeyword, setNewKeyword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateResultFormData>({
    resolver: zodResolver(updateResultSchema),
    defaultValues: {
      title: result.title || '',
      category: result.category || '',
      summary: result.summary || '',
    },
  });

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const onSubmit = async (data: UpdateResultFormData) => {
    setIsSubmitting(true);
    try {
      await api.documents.update(documentId, {
        ...data,
        keywords,
      });
      toast({
        title: 'Changes saved',
        description: 'Document fields have been updated.',
        variant: 'success',
      });
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes';
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} placeholder="Document title" />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          {...register('category')}
          placeholder="e.g., Invoice, Report, Contract"
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          {...register('summary')}
          placeholder="Document summary"
          rows={4}
        />
        {errors.summary && (
          <p className="text-xs text-destructive">{errors.summary.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Keywords</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="gap-1">
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="Add keyword"
          />
          <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
