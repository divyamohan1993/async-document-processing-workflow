import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const updateResultSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  summary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

export type UpdateResultFormData = z.infer<typeof updateResultSchema>;

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.tiff',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
