'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { DocumentListParams, DocumentStatus } from '@/types';

interface DocumentFiltersProps {
  params: DocumentListParams;
  onParamsChange: (params: DocumentListParams) => void;
}

export function DocumentFilters({ params, onParamsChange }: DocumentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(params.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== params.search) {
        onParamsChange({ ...params, search: searchValue || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const updateUrlParams = useCallback(
    (newParams: DocumentListParams) => {
      const url = new URLSearchParams();
      if (newParams.search) url.set('search', newParams.search);
      if (newParams.status) url.set('status', newParams.status);
      if (newParams.sort_by) url.set('sort_by', newParams.sort_by);
      if (newParams.sort_order) url.set('sort_order', newParams.sort_order);
      if (newParams.page && newParams.page > 1) url.set('page', String(newParams.page));
      const qs = url.toString();
      router.push(`/dashboard${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router]
  );

  const handleStatusChange = (value: string) => {
    const status = value === 'all' ? undefined : (value as DocumentStatus);
    const newParams = { ...params, status, page: 1 };
    onParamsChange(newParams);
    updateUrlParams(newParams);
  };

  const handleSortChange = (value: string) => {
    const sort_by = value as DocumentListParams['sort_by'];
    const newParams = { ...params, sort_by, page: 1 };
    onParamsChange(newParams);
    updateUrlParams(newParams);
  };

  const toggleSortOrder = () => {
    const sort_order: 'asc' | 'desc' = params.sort_order === 'asc' ? 'desc' : 'asc';
    const newParams: DocumentListParams = { ...params, sort_order };
    onParamsChange(newParams);
    updateUrlParams(newParams);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={params.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={params.sort_by || 'created_at'}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="filename">Filename</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="file_size">File Size</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleSortOrder}
          title={`Sort ${params.sort_order === 'asc' ? 'descending' : 'ascending'}`}
        >
          {params.sort_order === 'asc' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
