// Type declarations for EOD Portal Supabase tables
// This file extends the Supabase client types to include EOD-specific tables

import '@/integrations/supabase/client';

declare module '@/integrations/supabase/client' {
  interface Database {
    public: {
      Tables: {
        eod_clock_ins: {
          Row: {
            id: string;
            user_id: string;
            client_name: string;
            clocked_in_at: string;
            clocked_out_at: string | null;
            date: string;
            planned_shift_minutes?: number;
            planned_tasks?: number;
            actual_hours?: number;
            rounded_hours?: number;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            client_name: string;
            clocked_in_at?: string;
            clocked_out_at?: string | null;
            date?: string;
            planned_shift_minutes?: number;
            planned_tasks?: number;
            actual_hours?: number;
            rounded_hours?: number;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            client_name?: string;
            clocked_in_at?: string;
            clocked_out_at?: string | null;
            date?: string;
            planned_shift_minutes?: number;
            planned_tasks?: number;
            actual_hours?: number;
            rounded_hours?: number;
            created_at?: string;
          };
        };
        eod_reports: {
          Row: {
            id: string;
            user_id: string;
            report_date: string;
            summary: string;
            submitted: boolean;
            submitted_at: string | null;
            actual_hours?: number;
            rounded_hours?: number;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            report_date: string;
            summary?: string;
            submitted?: boolean;
            submitted_at?: string | null;
            actual_hours?: number;
            rounded_hours?: number;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            report_date?: string;
            summary?: string;
            submitted?: boolean;
            submitted_at?: string | null;
            actual_hours?: number;
            rounded_hours?: number;
            created_at?: string;
            updated_at?: string;
          };
        };
        eod_report_images: {
          Row: {
            id: string;
            report_id: string;
            public_url: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            report_id: string;
            public_url: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            report_id?: string;
            public_url?: string;
            created_at?: string;
          };
        };
        eod_time_entries: {
          Row: {
            id: string;
            user_id: string;
            client_name: string;
            client_email?: string | null;
            client_timezone?: string | null;
            task_description: string;
            started_at: string;
            ended_at: string | null;
            paused_at: string | null;
            duration_minutes: number | null;
            task_link?: string | null;
            comments?: string | null;
            comment_images?: string[];
            status?: string;
            accumulated_seconds?: number;
            task_type?: string | null;
            goal_duration_minutes?: number | null;
            task_intent?: string | null;
            task_categories?: string[] | null;
            task_enjoyment?: number | null;
            task_priority?: string | null;
            report_id?: string | null;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            client_name: string;
            client_email?: string | null;
            client_timezone?: string | null;
            task_description: string;
            started_at?: string;
            ended_at?: string | null;
            paused_at?: string | null;
            duration_minutes?: number | null;
            task_link?: string | null;
            comments?: string | null;
            comment_images?: string[];
            status?: string;
            accumulated_seconds?: number;
            task_type?: string | null;
            goal_duration_minutes?: number | null;
            task_intent?: string | null;
            task_categories?: string[] | null;
            task_enjoyment?: number | null;
            task_priority?: string | null;
            report_id?: string | null;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            client_name?: string;
            client_email?: string | null;
            client_timezone?: string | null;
            task_description?: string;
            started_at?: string;
            ended_at?: string | null;
            paused_at?: string | null;
            duration_minutes?: number | null;
            task_link?: string | null;
            comments?: string | null;
            comment_images?: string[];
            status?: string;
            accumulated_seconds?: number;
            task_type?: string | null;
            goal_duration_minutes?: number | null;
            task_intent?: string | null;
            task_categories?: string[] | null;
            task_enjoyment?: number | null;
            task_priority?: string | null;
            report_id?: string | null;
            created_at?: string;
          };
        };
        eod_submissions: {
          Row: {
            id: string;
            user_id: string;
            report_id: string;
            submitted_at: string;
            email_sent: boolean;
            actual_hours?: number;
            rounded_hours?: number;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            report_id: string;
            submitted_at?: string;
            email_sent?: boolean;
            actual_hours?: number;
            rounded_hours?: number;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            report_id?: string;
            submitted_at?: string;
            email_sent?: boolean;
            actual_hours?: number;
            rounded_hours?: number;
            created_at?: string;
          };
        };
        eod_submission_tasks: {
          Row: {
            id: string;
            submission_id: string;
            task_description: string;
            client_name: string;
            duration_minutes: number;
            task_link?: string | null;
            comments?: string | null;
            created_at: string;
          };
          Insert: {
            id?: string;
            submission_id: string;
            task_description: string;
            client_name: string;
            duration_minutes: number;
            task_link?: string | null;
            comments?: string | null;
            created_at?: string;
          };
          Update: {
            id?: string;
            submission_id?: string;
            task_description?: string;
            client_name?: string;
            duration_minutes?: number;
            task_link?: string | null;
            comments?: string | null;
            created_at?: string;
          };
        };
        eod_submission_images: {
          Row: {
            id: string;
            submission_id: string;
            image_url: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            submission_id: string;
            image_url: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            submission_id?: string;
            image_url?: string;
            created_at?: string;
          };
        };
        user_feedback: {
          Row: {
            id: string;
            user_id: string;
            feedback_type: string;
            feedback_text: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            feedback_type: string;
            feedback_text: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            feedback_type?: string;
            feedback_text?: string;
            created_at?: string;
          };
        };
        recurring_task_templates: {
          Row: {
            id: string;
            user_id: string;
            template_name: string;
            description: string;
            default_client?: string | null;
            default_task_type?: string | null;
            default_categories?: string[] | null;
            default_priority?: string | null;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            template_name: string;
            description: string;
            default_client?: string | null;
            default_task_type?: string | null;
            default_categories?: string[] | null;
            default_priority?: string | null;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            template_name?: string;
            description?: string;
            default_client?: string | null;
            default_task_type?: string | null;
            default_categories?: string[] | null;
            default_priority?: string | null;
            created_at?: string;
            updated_at?: string;
          };
        };
        eod_queue_tasks: {
          Row: {
            id: string;
            user_id: string;
            client_name: string;
            task_description: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            client_name: string;
            task_description: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            client_name?: string;
            task_description?: string;
            created_at?: string;
          };
        };
        mood_entries: {
          Row: {
            id: string;
            user_id: string;
            mood_level: string;
            timestamp: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            mood_level: string;
            timestamp?: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            mood_level?: string;
            timestamp?: string;
            created_at?: string;
          };
        };
        energy_entries: {
          Row: {
            id: string;
            user_id: string;
            energy_level: string;
            timestamp: string;
            created_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            energy_level: string;
            timestamp?: string;
            created_at?: string;
          };
          Update: {
            id?: string;
            user_id?: string;
            energy_level?: string;
            timestamp?: string;
            created_at?: string;
          };
        };
      };
    };
  }
}

