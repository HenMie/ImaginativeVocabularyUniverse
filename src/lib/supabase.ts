import { createClient } from '@supabase/supabase-js'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          preferred_language: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          username?: string | null
          preferred_language?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_progress: {
        Row: {
          user_id: string
          coins: number
          experience: number
          settings: Json
          last_online_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          coins?: number
          experience?: number
          settings?: Json
          last_online_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          coins?: number
          experience?: number
          settings?: Json
          last_online_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      levels: {
        Row: {
          id: string
          difficulty: 'easy' | 'medium' | 'hard' | 'expert'
          language: string[]
          version: number
          is_published: boolean
          content: Json
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          difficulty: 'easy' | 'medium' | 'hard' | 'expert'
          language?: string[]
          version?: number
          is_published?: boolean
          content: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          difficulty?: 'easy' | 'medium' | 'hard' | 'expert'
          language?: string[]
          version?: number
          is_published?: boolean
          content?: Json
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_level_progress: {
        Row: {
          id: string
          user_id: string
          level_id: string
          status: 'locked' | 'in_progress' | 'completed'
          attempts: number
          best_time_ms: number | null
          best_score: number | null
          last_played_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          level_id: string
          status?: 'locked' | 'in_progress' | 'completed'
          attempts?: number
          best_time_ms?: number | null
          best_score?: number | null
          last_played_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'locked' | 'in_progress' | 'completed'
          attempts?: number
          best_time_ms?: number | null
          best_score?: number | null
          last_played_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leaderboards: {
        Row: {
          id: string
          user_id: string
          level_id: string
          completion_time_ms: number
          coins_earned: number
          hints_spent: number
          submitted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          level_id: string
          completion_time_ms: number
          coins_earned?: number
          hints_spent?: number
          submitted_at?: string
        }
        Update: {
          completion_time_ms?: number
          coins_earned?: number
          hints_spent?: number
          submitted_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      vocabulary_book: {
        Row: {
          id: string
          user_id: string
          word: string
          translation: string
          language: string
          level_id: string | null
          group_category: string | null
          tile_id: string | null
          added_at: string
          last_reviewed_at: string | null
          review_count: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          translation: string
          language: string
          level_id?: string | null
          group_category?: string | null
          tile_id?: string | null
          added_at?: string
          last_reviewed_at?: string | null
          review_count?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          word?: string
          translation?: string
          language?: string
          level_id?: string | null
          group_category?: string | null
          tile_id?: string | null
          last_reviewed_at?: string | null
          review_count?: number
          notes?: string | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
