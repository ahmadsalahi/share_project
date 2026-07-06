export interface User {
  id: string;
  name: string;
  username?: string;
  password?: string;
  role: 'admin' | 'partner';
  isActive: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  payerId: string;
  notes?: string;
  receiptDataUrl?: string; // Storing as base64 for simplicity in LocalStorage
  acknowledgedBy?: string[]; // Array of user IDs who have seen this payment
}

export type Currency = 'USD' | 'SYP' | 'SAR' | 'EUR';

export interface ProjectStep {
  id: string;
  title: string;
  description?: string;
  date: string;
  images: string[]; // Base64 data URLs
}

export interface Project {
  id: string;
  title: string;
  currency: Currency;
  targetSplit: number; // typically 50 for 50/50, used for legacy UI
  createdAt: string;
  ownerId: string;
  partners: string[]; // User IDs of partners linked to this project
  partnerShares?: Record<string, number>;
  shareRequests?: Array<{ userId: string; percent: number; status: 'pending' | 'accepted' | 'rejected' }>;
  payments: Payment[];
  steps?: ProjectStep[];
  completionPercentage?: number; // 0 to 100
  isPrivate?: boolean;
}

export interface Notification {
  id: string;
  userId: string; // The user this notification belongs to
  message: string;
  date: string;
  isRead: boolean;
  projectId?: string; // Optional link to project
  senderId?: string;
  requestedPercent?: number;
  type?: 'system' | 'share-request' | 'payment';
}
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
