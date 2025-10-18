import { z } from 'zod';

// Task Schema
export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
});

export type Task = z.infer<typeof TaskSchema>;

// Event Schema
export const EventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  location: z.string().optional(),
  type: z.enum(['meeting', 'appointment', 'deadline', 'reminder', 'other']).default('other'),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  attendees: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
});

export type Event = z.infer<typeof EventSchema>;

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and Filter Types
export interface TaskFilters {
  status?: Task['status'];
  priority?: Task['priority'];
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
}

export interface EventFilters {
  type?: Event['type'];
  status?: Event['status'];
  startDateFrom?: Date;
  startDateTo?: Date;
  location?: string;
  search?: string;
}

// Memory and RAG Types
export interface MemoryContext {
  userId?: string;
  sessionId?: string;
  conversationId?: string;
  context?: Record<string, any>;
}

export interface RAGQuery {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  threshold?: number;
}

export interface RAGResult<T = any> {
  content: T;
  score: number;
  metadata: Record<string, any>;
}

// Agent Types
export interface AgentRequest {
  message: string;
  context?: MemoryContext;
  userId?: string;
}

export interface AgentResponse {
  message: string;
  actions?: Array<{
    type: string;
    data: any;
  }>;
  context?: MemoryContext;
}
