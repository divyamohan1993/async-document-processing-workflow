import type {
  AuthResponse,
  Document,
  DocumentListParams,
  LoginRequest,
  PaginatedResponse,
  RegisterRequest,
  UpdateResultRequest,
  User,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.state?.token || null;
      }
    } catch {
      return null;
    }
    return null;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: 'An unexpected error occurred',
      }));
      throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return response.blob() as unknown as T;
  }

  auth = {
    register: (data: RegisterRequest): Promise<AuthResponse> =>
      this.request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: LoginRequest): Promise<AuthResponse> =>
      this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    me: (): Promise<User> => this.request<User>('/auth/me'),
  };

  documents = {
    upload: async (files: File[]): Promise<Document[]> => {
      const results: Document[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const doc = await this.request<Document>('/documents/upload', {
          method: 'POST',
          body: formData,
        });
        results.push(doc);
      }
      return results;
    },

    list: (params: DocumentListParams = {}): Promise<PaginatedResponse<Document>> => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.status) searchParams.set('status', params.status);
      if (params.sort_by) searchParams.set('sort_by', params.sort_by);
      if (params.sort_order) searchParams.set('sort_order', params.sort_order);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.page_size) searchParams.set('page_size', String(params.page_size));
      const qs = searchParams.toString();
      return this.request<PaginatedResponse<Document>>(
        `/documents${qs ? `?${qs}` : ''}`
      );
    },

    get: (id: string): Promise<Document> =>
      this.request<Document>(`/documents/${id}`),

    update: (id: string, data: UpdateResultRequest): Promise<Document> =>
      this.request<Document>(`/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    finalize: (id: string): Promise<Document> =>
      this.request<Document>(`/documents/${id}/finalize`, {
        method: 'POST',
      }),

    retry: (id: string): Promise<Document> =>
      this.request<Document>(`/documents/${id}/retry`, {
        method: 'POST',
      }),

    export: async (format: 'json' | 'csv', documentIds?: string[]): Promise<void> => {
      const searchParams = new URLSearchParams();
      searchParams.set('format', format);
      if (documentIds?.length) {
        documentIds.forEach((id) => searchParams.append('document_ids', id));
      }

      const token = this.getToken();
      const response = await fetch(
        `${API_URL}/documents/export?${searchParams.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },

    getProgressUrl: (id: string): string =>
      `${API_URL}/documents/${id}/progress`,
  };
}

export const api = new ApiClient();
