export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export type DocumentStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  celery_task_id: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  processing_result: ProcessingResult | null;
  processing_events: ProcessingEvent[];
}

export interface ProcessingResult {
  id: string;
  document_id: string;
  title: string | null;
  category: string | null;
  summary: string | null;
  keywords: string[];
  raw_text: string | null;
  structured_data: Record<string, unknown>;
  is_finalized: boolean;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EventType =
  | 'job_queued'
  | 'job_started'
  | 'document_parsing_started'
  | 'document_parsing_completed'
  | 'field_extraction_started'
  | 'field_extraction_completed'
  | 'job_completed'
  | 'job_failed';

export interface ProcessingEvent {
  id: string;
  document_id: string;
  event_type: EventType;
  message: string;
  progress_percent: number;
  event_metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DocumentListParams {
  search?: string;
  status?: DocumentStatus;
  sort_by?: 'created_at' | 'filename' | 'status' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UpdateResultRequest {
  title?: string;
  category?: string;
  summary?: string;
  keywords?: string[];
}

export interface ProgressEvent {
  event_type: EventType;
  message: string;
  progress_percent: number;
  document_id: string;
  timestamp: string;
}

export interface ApiError {
  detail: string;
  status: number;
}
