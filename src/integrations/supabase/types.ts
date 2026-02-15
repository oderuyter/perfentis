export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_laps: {
        Row: {
          created_at: string
          distance_meters_at_mark: number | null
          elapsed_seconds_at_mark: number | null
          id: string
          lap_number: number
          marked_at: string
          moving_seconds_at_mark: number | null
          session_id: string
        }
        Insert: {
          created_at?: string
          distance_meters_at_mark?: number | null
          elapsed_seconds_at_mark?: number | null
          id?: string
          lap_number: number
          marked_at: string
          moving_seconds_at_mark?: number | null
          session_id: string
        }
        Update: {
          created_at?: string
          distance_meters_at_mark?: number | null
          elapsed_seconds_at_mark?: number | null
          id?: string
          lap_number?: number
          marked_at?: string
          moving_seconds_at_mark?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_laps_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_pauses: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          paused_at: string
          resumed_at: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          paused_at: string
          resumed_at?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          paused_at?: string
          resumed_at?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_pauses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_route_points: {
        Row: {
          accuracy_m: number | null
          altitude_m: number | null
          created_at: string
          id: string
          idx: number
          lat: number
          lng: number
          session_id: string
          source: string | null
          speed_mps: number | null
          timestamp: string
        }
        Insert: {
          accuracy_m?: number | null
          altitude_m?: number | null
          created_at?: string
          id?: string
          idx: number
          lat: number
          lng: number
          session_id: string
          source?: string | null
          speed_mps?: number | null
          timestamp: string
        }
        Update: {
          accuracy_m?: number | null
          altitude_m?: number | null
          created_at?: string
          id?: string
          idx?: number
          lat?: number
          lng?: number
          session_id?: string
          source?: string | null
          speed_mps?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_route_points_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_routes: {
        Row: {
          bbox: Json | null
          created_at: string
          id: string
          polyline_simplified: string | null
          session_id: string
          total_points: number | null
        }
        Insert: {
          bbox?: Json | null
          created_at?: string
          id?: string
          polyline_simplified?: string | null
          session_id: string
          total_points?: number | null
        }
        Update: {
          bbox?: Json | null
          created_at?: string
          id?: string
          polyline_simplified?: string | null
          session_id?: string
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_routes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          metadata: Json | null
          notification_type: string
          recipients_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          target_filter: Json | null
          target_type: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipients_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          target_filter?: Json | null
          target_type: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json | null
          notification_type?: string
          recipients_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          target_filter?: Json | null
          target_type?: string
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string
          id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          message: string
          metadata: Json | null
          severity: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          category: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          message: string
          metadata?: Json | null
          severity?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          message?: string
          metadata?: Json | null
          severity?: string
        }
        Relationships: []
      }
      capabilities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          scope_type: Database["public"]["Enums"]["role_scope"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          scope_type?: Database["public"]["Enums"]["role_scope"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          scope_type?: Database["public"]["Enums"]["role_scope"]
        }
        Relationships: []
      }
      checkin_templates: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean
          name: string
          questions: Json
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name: string
          questions?: Json
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean
          name?: string
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          mood: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          mood?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          mood?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booking_date: string
          created_at: string
          id: string
          schedule_id: string
          status: string
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          id?: string
          schedule_id: string
          status?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          id?: string
          schedule_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          instructor_id: string | null
          is_active: boolean
          space_id: string | null
          start_time: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          space_id?: string | null
          start_time: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean
          space_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "gym_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_schedules_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "gym_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      class_waitlist: {
        Row: {
          booking_date: string
          created_at: string
          id: string
          notified_at: string | null
          schedule_id: string
          status: string
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          id?: string
          notified_at?: string | null
          schedule_id: string
          status?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          schedule_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_waitlist_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      client_checkins: {
        Row: {
          client_id: string
          coach_comments: string | null
          created_at: string
          due_date: string | null
          id: string
          responses: Json | null
          reviewed_at: string | null
          status: string
          submitted_at: string | null
          template_id: string | null
        }
        Insert: {
          client_id: string
          coach_comments?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          responses?: Json | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
        }
        Update: {
          client_id?: string
          coach_comments?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          responses?: Json | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_checkins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_checkins_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checkin_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plan_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          coach_name: string | null
          completed_workouts: number | null
          created_at: string
          current_week: number | null
          end_date: string | null
          id: string
          last_workout_at: string | null
          plan_id: string
          progress_percentage: number | null
          start_date: string
          status: string
          total_workouts: number | null
        }
        Insert: {
          assigned_at?: string
          client_id: string
          coach_name?: string | null
          completed_workouts?: number | null
          created_at?: string
          current_week?: number | null
          end_date?: string | null
          id?: string
          last_workout_at?: string | null
          plan_id: string
          progress_percentage?: number | null
          start_date: string
          status?: string
          total_workouts?: number | null
        }
        Update: {
          assigned_at?: string
          client_id?: string
          coach_name?: string | null
          completed_workouts?: number | null
          created_at?: string
          current_week?: number | null
          end_date?: string | null
          id?: string
          last_workout_at?: string | null
          plan_id?: string
          progress_percentage?: number | null
          start_date?: string
          status?: string
          total_workouts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_appointments: {
        Row: {
          appointment_type: string
          client_id: string | null
          coach_id: string
          created_at: string
          duration_minutes: number
          id: string
          location: string | null
          meeting_link: string | null
          mode: string
          notes: string | null
          start_time: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          client_id?: string | null
          coach_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          start_time: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          client_id?: string | null
          coach_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          location?: string | null
          meeting_link?: string | null
          mode?: string
          notes?: string | null
          start_time?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_appointments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          client_user_id: string
          coach_id: string
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          service_id: string | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          client_user_id: string
          coach_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_user_id?: string
          coach_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "coach_services"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_expenses: {
        Row: {
          amount: number
          category: string | null
          coach_id: string
          created_at: string
          currency: string | null
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          coach_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          coach_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_expenses_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_gym_affiliations: {
        Row: {
          affiliation_type: string | null
          approved_at: string | null
          coach_id: string
          created_at: string
          delivery_availability: string | null
          gym_id: string
          id: string
          status: string
        }
        Insert: {
          affiliation_type?: string | null
          approved_at?: string | null
          coach_id: string
          created_at?: string
          delivery_availability?: string | null
          gym_id: string
          id?: string
          status?: string
        }
        Update: {
          affiliation_type?: string | null
          approved_at?: string | null
          coach_id?: string
          created_at?: string
          delivery_availability?: string | null
          gym_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_gym_affiliations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_gym_affiliations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          coach_id: string
          created_at: string
          email: string
          email_error: string | null
          email_log_id: string | null
          email_sent_at: string | null
          email_status: string | null
          expires_at: string
          id: string
          message: string | null
          name: string | null
          service_id: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          coach_id: string
          created_at?: string
          email: string
          email_error?: string | null
          email_log_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string
          id?: string
          message?: string | null
          name?: string | null
          service_id?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          coach_id?: string
          created_at?: string
          email?: string
          email_error?: string | null
          email_log_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string
          id?: string
          message?: string | null
          name?: string | null
          service_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_invitations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invitations_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invitations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "coach_services"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invoices: {
        Row: {
          amount: number
          client_id: string | null
          coach_id: string
          created_at: string
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          sent_at: string | null
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          coach_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          sent_at?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          coach_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          sent_at?: string | null
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invoices_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invoices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "coach_services"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          coach_request_id: string
          created_at: string
          id: string
          sender_id: string
          text: string
        }
        Insert: {
          coach_request_id: string
          created_at?: string
          id?: string
          sender_id: string
          text: string
        }
        Update: {
          coach_request_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_coach_request_id_fkey"
            columns: ["coach_request_id"]
            isOneToOne: false
            referencedRelation: "coach_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_requests: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_services: {
        Row: {
          billing_cycle: string | null
          coach_id: string
          created_at: string
          delivery_type: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          coach_id: string
          created_at?: string
          delivery_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          coach_id?: string
          created_at?: string
          delivery_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_services_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_tasks: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_tasks_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_transactions: {
        Row: {
          amount: number
          coach_id: string
          created_at: string
          currency: string | null
          description: string | null
          id: string
          invoice_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          coach_id: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          transaction_date?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          coach_id?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_transactions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "coach_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          avatar_url: string | null
          bio: string | null
          certifications: string[] | null
          created_at: string
          delivery_type: string | null
          display_name: string
          hourly_rate: number | null
          id: string
          is_demo: boolean | null
          is_online: boolean | null
          is_public: boolean | null
          location: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          delivery_type?: string | null
          display_name: string
          hourly_rate?: number | null
          id?: string
          is_demo?: boolean | null
          is_online?: boolean | null
          is_public?: boolean | null
          location?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          delivery_type?: string | null
          display_name?: string
          hourly_rate?: number | null
          id?: string
          is_demo?: boolean | null
          is_online?: boolean | null
          is_public?: boolean | null
          location?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_user_id: string | null
          context_id: string | null
          context_type: string
          created_at: string
          id: string
          is_demo: boolean | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          context_id?: string | null
          context_type: string
          created_at?: string
          id?: string
          is_demo?: boolean | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          context_id?: string | null
          context_type?: string
          created_at?: string
          id?: string
          is_demo?: boolean | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_custom_field_values: {
        Row: {
          created_at: string
          field_id: string
          id: string
          lead_id: string
          updated_at: string
          value_boolean: boolean | null
          value_date: string | null
          value_number: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          field_id: string
          id?: string
          lead_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          field_id?: string
          id?: string
          lead_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_number?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_custom_field_values_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_fields: {
        Row: {
          context_id: string
          context_type: string
          created_at: string
          display_order: number
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          show_on_card: boolean
          show_on_overview: boolean
          updated_at: string
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string
          display_order?: number
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          show_on_card?: boolean
          show_on_overview?: boolean
          updated_at?: string
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string
          display_order?: number
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          show_on_card?: boolean
          show_on_overview?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      crm_lead_activities: {
        Row: {
          activity_type: string
          actor_user_id: string | null
          created_at: string
          description: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          actor_user_id?: string | null
          created_at?: string
          description: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          actor_user_id?: string | null
          created_at?: string
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_notes: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to_user_id: string | null
          contact_instagram: string | null
          contact_telephone: string | null
          contact_tiktok: string | null
          contact_twitter: string | null
          contact_website: string | null
          contact_youtube: string | null
          context_id: string
          context_type: string
          conversation_id: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          home_address_city: string | null
          home_address_country: string | null
          home_address_line1: string | null
          home_address_line2: string | null
          home_address_postcode: string | null
          id: string
          is_incomplete: boolean | null
          is_registered_user: boolean | null
          last_contacted_at: string | null
          lead_name: string
          metadata: Json | null
          phone: string | null
          source: string
          stage_id: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string | null
          work_address_city: string | null
          work_address_country: string | null
          work_address_line1: string | null
          work_address_line2: string | null
          work_address_postcode: string | null
          work_company: string | null
        }
        Insert: {
          assigned_to_user_id?: string | null
          contact_instagram?: string | null
          contact_telephone?: string | null
          contact_tiktok?: string | null
          contact_twitter?: string | null
          contact_website?: string | null
          contact_youtube?: string | null
          context_id: string
          context_type: string
          conversation_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          home_address_city?: string | null
          home_address_country?: string | null
          home_address_line1?: string | null
          home_address_line2?: string | null
          home_address_postcode?: string | null
          id?: string
          is_incomplete?: boolean | null
          is_registered_user?: boolean | null
          last_contacted_at?: string | null
          lead_name: string
          metadata?: Json | null
          phone?: string | null
          source?: string
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          work_address_city?: string | null
          work_address_country?: string | null
          work_address_line1?: string | null
          work_address_line2?: string | null
          work_address_postcode?: string | null
          work_company?: string | null
        }
        Update: {
          assigned_to_user_id?: string | null
          contact_instagram?: string | null
          contact_telephone?: string | null
          contact_tiktok?: string | null
          contact_twitter?: string | null
          contact_website?: string | null
          contact_youtube?: string | null
          context_id?: string
          context_type?: string
          conversation_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          home_address_city?: string | null
          home_address_country?: string | null
          home_address_line1?: string | null
          home_address_line2?: string | null
          home_address_postcode?: string | null
          id?: string
          is_incomplete?: boolean | null
          is_registered_user?: boolean | null
          last_contacted_at?: string | null
          lead_name?: string
          metadata?: Json | null
          phone?: string | null
          source?: string
          stage_id?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
          work_address_city?: string | null
          work_address_country?: string | null
          work_address_line1?: string | null
          work_address_line2?: string | null
          work_address_postcode?: string | null
          work_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          context_id: string
          context_type: string
          created_at: string
          id: string
          is_default: boolean | null
          is_lost: boolean | null
          is_won: boolean | null
          stage_name: string
          stage_order: number
          updated_at: string
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          stage_name: string
          stage_order?: number
          updated_at?: string
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          stage_name?: string
          stage_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_settings: {
        Row: {
          auto_create_leads_from_messages: boolean | null
          context_id: string
          context_type: string
          created_at: string
          default_assignee_user_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          auto_create_leads_from_messages?: boolean | null
          context_id: string
          context_type: string
          created_at?: string
          default_assignee_user_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          auto_create_leads_from_messages?: boolean | null
          context_id?: string
          context_type?: string
          created_at?: string
          default_assignee_user_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_task_templates: {
        Row: {
          context_id: string
          context_type: string
          created_at: string
          id: string
          name: string
          tasks: Json
          updated_at: string
        }
        Insert: {
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          name: string
          tasks?: Json
          updated_at?: string
        }
        Update: {
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          name?: string
          tasks?: Json
          updated_at?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          assigned_to_user_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          lead_id: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_seed_registry: {
        Row: {
          created_at: string
          demo_seed_key: string
          entity_email: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          demo_seed_key?: string
          entity_email?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          demo_seed_key?: string
          entity_email?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      edge_function_rate_limits: {
        Row: {
          actor_key: string
          function_name: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          actor_key: string
          function_name: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          actor_key?: string
          function_name?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      email_delivery_events: {
        Row: {
          created_at: string
          email_log_id: string
          event_type: string
          id: string
          occurred_at: string
          payload_json: Json | null
        }
        Insert: {
          created_at?: string
          email_log_id: string
          event_type: string
          id?: string
          occurred_at?: string
          payload_json?: Json | null
        }
        Update: {
          created_at?: string
          email_log_id?: string
          event_type?: string
          id?: string
          occurred_at?: string
          payload_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          actor_user_id: string | null
          attempt_count: number
          context_id: string | null
          context_type: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          last_attempt_at: string
          metadata: Json | null
          resend_message_id: string | null
          status: string
          subject: string
          template_key: string
          to_email: string
        }
        Insert: {
          actor_user_id?: string | null
          attempt_count?: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string
          metadata?: Json | null
          resend_message_id?: string | null
          status?: string
          subject: string
          template_key: string
          to_email: string
        }
        Update: {
          actor_user_id?: string | null
          attempt_count?: number
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string
          metadata?: Json | null
          resend_message_id?: string | null
          status?: string
          subject?: string
          template_key?: string
          to_email?: string
        }
        Relationships: []
      }
      email_template_versions: {
        Row: {
          created_at: string
          created_by: string | null
          cta_defaults_json: Json | null
          defaults_json: Json | null
          design_json: Json | null
          editor_mode: string
          html_content: string
          id: string
          notes: string | null
          preheader: string | null
          published_at: string | null
          status: string
          subject: string
          template_id: string
          theme_json: Json | null
          variables_used: string[] | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cta_defaults_json?: Json | null
          defaults_json?: Json | null
          design_json?: Json | null
          editor_mode?: string
          html_content?: string
          id?: string
          notes?: string | null
          preheader?: string | null
          published_at?: string | null
          status?: string
          subject?: string
          template_id: string
          theme_json?: Json | null
          variables_used?: string[] | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cta_defaults_json?: Json | null
          defaults_json?: Json | null
          design_json?: Json | null
          editor_mode?: string
          html_content?: string
          id?: string
          notes?: string | null
          preheader?: string | null
          published_at?: string | null
          status?: string
          subject?: string
          template_id?: string
          theme_json?: Json | null
          variables_used?: string[] | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "email_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          is_critical: boolean
          is_enabled: boolean
          name: string
          template_key: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_critical?: boolean
          is_enabled?: boolean
          name: string
          template_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_critical?: boolean
          is_enabled?: boolean
          name?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_assets: {
        Row: {
          alt_text: string | null
          asset_type: string
          created_at: string
          display_order: number | null
          event_id: string
          id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          asset_type: string
          created_at?: string
          display_order?: number | null
          event_id: string
          id?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          asset_type?: string
          created_at?: string
          display_order?: number | null
          event_id?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      event_checkins: {
        Row: {
          checked_in_at: string
          checked_in_by_user_id: string
          created_at: string
          device_id: string | null
          event_id: string
          id: string
          method: string
          operation_id: string
          registration_id: string | null
          source: string
          team_member_id: string | null
          undone_at: string | null
          undone_by_user_id: string | null
        }
        Insert: {
          checked_in_at?: string
          checked_in_by_user_id: string
          created_at?: string
          device_id?: string | null
          event_id: string
          id?: string
          method: string
          operation_id: string
          registration_id?: string | null
          source: string
          team_member_id?: string | null
          undone_at?: string | null
          undone_by_user_id?: string | null
        }
        Update: {
          checked_in_at?: string
          checked_in_by_user_id?: string
          created_at?: string
          device_id?: string | null
          event_id?: string
          id?: string
          method?: string
          operation_id?: string
          registration_id?: string | null
          source?: string
          team_member_id?: string | null
          undone_at?: string | null
          undone_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checkins_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "event_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_class_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_class_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_class_workouts: {
        Row: {
          class_id: string
          created_at: string
          display_order: number | null
          id: string
          workout_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          workout_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_class_workouts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "event_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_class_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "event_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_classes: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          event_id: string
          id: string
          name: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          event_id: string
          id?: string
          name: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          event_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_classes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_class_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_classes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_divisions: {
        Row: {
          age_group: string | null
          capacity: number | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          display_order: number | null
          event_id: string
          gender: string | null
          id: string
          is_active: boolean | null
          name: string
          team_size: number | null
        }
        Insert: {
          age_group?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          event_id: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          team_size?: number | null
        }
        Update: {
          age_group?: string | null
          capacity?: number | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          display_order?: number | null
          event_id?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          team_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_divisions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_entries: {
        Row: {
          created_at: string
          division_id: string | null
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          division_id?: string | null
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_entries_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "event_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_heats: {
        Row: {
          created_at: string
          division_id: string | null
          duration_minutes: number | null
          event_id: string
          id: string
          lane_count: number | null
          name: string | null
          start_time: string | null
          status: string | null
          updated_at: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          duration_minutes?: number | null
          event_id: string
          id?: string
          lane_count?: number | null
          name?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          division_id?: string | null
          duration_minutes?: number | null
          event_id?: string
          id?: string
          lane_count?: number | null
          name?: string | null
          start_time?: string | null
          status?: string | null
          updated_at?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_heats_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "event_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_heats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_heats_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "event_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          email_error: string | null
          email_log_id: string | null
          email_sent_at: string | null
          email_status: string | null
          event_id: string
          expires_at: string | null
          id: string
          invite_type: string
          invited_by: string
          name: string | null
          status: string | null
          team_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          email_error?: string | null
          email_log_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          invite_type?: string
          invited_by: string
          name?: string | null
          status?: string | null
          team_id?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          email_error?: string | null
          email_log_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          invite_type?: string
          invited_by?: string
          name?: string | null
          status?: string | null
          team_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_lane_assignments: {
        Row: {
          created_at: string
          heat_id: string
          id: string
          lane_number: number
          registration_id: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          heat_id: string
          id?: string
          lane_number: number
          registration_id?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          heat_id?: string
          id?: string
          lane_number?: number
          registration_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_lane_assignments_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "event_heats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lane_assignments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_lane_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_leaderboard_rows: {
        Row: {
          created_at: string
          event_id: string
          id: string
          rank: number | null
          score: number | null
          team_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          rank?: number | null
          score?: number | null
          team_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          rank?: number | null
          score?: number | null
          team_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_leaderboard_rows_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registration_passes: {
        Row: {
          created_at: string
          event_id: string
          id: string
          pass_token: string
          registration_id: string | null
          revoked_at: string | null
          status: string
          team_member_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          pass_token: string
          registration_id?: string | null
          revoked_at?: string | null
          status?: string
          team_member_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          pass_token?: string
          registration_id?: string | null
          revoked_at?: string | null
          status?: string
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registration_passes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registration_passes_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registration_passes_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "event_team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          active_for_event: boolean | null
          amount_paid: number | null
          checked_in_at: string | null
          created_at: string
          custom_fields: Json | null
          division_id: string | null
          event_id: string
          id: string
          payment_intent_id: string | null
          payment_status: string | null
          registration_type: string
          status: string
          team_id: string | null
          ticket_id: string | null
          updated_at: string
          user_id: string
          waiver_accepted: boolean | null
        }
        Insert: {
          active_for_event?: boolean | null
          amount_paid?: number | null
          checked_in_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          division_id?: string | null
          event_id: string
          id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          registration_type?: string
          status?: string
          team_id?: string | null
          ticket_id?: string | null
          updated_at?: string
          user_id: string
          waiver_accepted?: boolean | null
        }
        Update: {
          active_for_event?: boolean | null
          amount_paid?: number | null
          checked_in_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          division_id?: string | null
          event_id?: string
          id?: string
          payment_intent_id?: string | null
          payment_status?: string | null
          registration_type?: string
          status?: string
          team_id?: string | null
          ticket_id?: string | null
          updated_at?: string
          user_id?: string
          waiver_accepted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "event_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "event_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedule_blocks: {
        Row: {
          class_id: string | null
          created_at: string
          display_order: number | null
          end_time: string
          event_id: string
          id: string
          location: string | null
          notes: string | null
          start_time: string
          title: string
          workout_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          display_order?: number | null
          end_time: string
          event_id: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time: string
          title: string
          workout_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          display_order?: number | null
          end_time?: string
          event_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          title?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_schedule_blocks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "event_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedule_blocks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedule_blocks_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "event_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_scores: {
        Row: {
          created_at: string
          event_id: string
          heat_id: string | null
          id: string
          points: number | null
          rank: number | null
          registration_id: string | null
          rejection_reason: string | null
          score_distance: number | null
          score_reps: number | null
          score_time_seconds: number | null
          score_value: number | null
          score_weight: number | null
          status: string | null
          team_id: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          heat_id?: string | null
          id?: string
          points?: number | null
          rank?: number | null
          registration_id?: string | null
          rejection_reason?: string | null
          score_distance?: number | null
          score_reps?: number | null
          score_time_seconds?: number | null
          score_value?: number | null
          score_weight?: number | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          workout_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          heat_id?: string | null
          id?: string
          points?: number | null
          rank?: number | null
          registration_id?: string | null
          rejection_reason?: string | null
          score_distance?: number | null
          score_reps?: number | null
          score_time_seconds?: number | null
          score_value?: number | null
          score_weight?: number | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_scores_heat_id_fkey"
            columns: ["heat_id"]
            isOneToOne: false
            referencedRelation: "event_heats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_scores_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_scores_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "event_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sponsors: {
        Row: {
          created_at: string
          display_order: number | null
          event_id: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          tier: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          event_id: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          tier?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          tier?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sponsors_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string | null
          role: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name?: string | null
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string | null
          role?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_at: string | null
          name: string | null
          role: string | null
          status: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          name?: string | null
          role?: string | null
          status?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          name?: string | null
          role?: string | null
          status?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_teams: {
        Row: {
          created_at: string
          division_id: string | null
          event_id: string
          id: string
          leader_id: string
          name: string
          size_limit: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          event_id: string
          id?: string
          leader_id: string
          name: string
          size_limit?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          division_id?: string | null
          event_id?: string
          id?: string
          leader_id?: string
          name?: string
          size_limit?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "event_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          capacity: number | null
          created_at: string
          currency: string | null
          division_id: string | null
          early_bird_deadline: string | null
          early_bird_price: number | null
          event_id: string
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          currency?: string | null
          division_id?: string | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          event_id: string
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          currency?: string | null
          division_id?: string | null
          early_bird_deadline?: string | null
          early_bird_price?: number | null
          event_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "event_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_workouts: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          event_id: string
          exercise_data: Json | null
          id: string
          is_published: boolean | null
          released_at: string | null
          scoring_type: string | null
          stage_day: number | null
          standards: string | null
          submission_deadline: string | null
          time_cap_seconds: number | null
          title: string
          workout_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          event_id: string
          exercise_data?: Json | null
          id?: string
          is_published?: boolean | null
          released_at?: string | null
          scoring_type?: string | null
          stage_day?: number | null
          standards?: string | null
          submission_deadline?: string | null
          time_cap_seconds?: number | null
          title: string
          workout_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          event_id?: string
          exercise_data?: Json | null
          id?: string
          is_published?: boolean | null
          released_at?: string | null
          scoring_type?: string | null
          stage_day?: number | null
          standards?: string | null
          submission_deadline?: string | null
          time_cap_seconds?: number | null
          title?: string
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_workouts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          enable_checkin: boolean | null
          end_date: string | null
          event_date: string | null
          event_mode: string | null
          event_type: string | null
          gym_id: string | null
          hero_image_url: string | null
          id: string
          image_url: string | null
          is_demo: boolean | null
          is_public: boolean | null
          location: string | null
          organiser_id: string
          rules: string | null
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          enable_checkin?: boolean | null
          end_date?: string | null
          event_date?: string | null
          event_mode?: string | null
          event_type?: string | null
          gym_id?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean | null
          is_public?: boolean | null
          location?: string | null
          organiser_id: string
          rules?: string | null
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          enable_checkin?: boolean | null
          end_date?: string | null
          event_date?: string | null
          event_mode?: string | null
          event_type?: string | null
          gym_id?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_demo?: boolean | null
          is_public?: boolean | null
          location?: string | null
          organiser_id?: string
          rules?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_goals: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          target_reps: number
          target_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          target_reps?: number
          target_weight: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          target_reps?: number
          target_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_goals_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          athlete_notes: string | null
          coach_prescribed_notes: string | null
          created_at: string
          exercise_id: string
          exercise_name: string
          exercise_order: number
          exercise_version: number | null
          id: string
          notes: string | null
          session_id: string
        }
        Insert: {
          athlete_notes?: string | null
          coach_prescribed_notes?: string | null
          created_at?: string
          exercise_id: string
          exercise_name: string
          exercise_order: number
          exercise_version?: number | null
          id?: string
          notes?: string | null
          session_id: string
        }
        Update: {
          athlete_notes?: string | null
          coach_prescribed_notes?: string | null
          created_at?: string
          exercise_id?: string
          exercise_name?: string
          exercise_order?: number
          exercise_version?: number | null
          id?: string
          notes?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_submissions: {
        Row: {
          approved_exercise_id: string | null
          created_at: string
          equipment: string[] | null
          id: string
          instructions: string | null
          modality: string | null
          name: string
          primary_muscle: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_muscles: string[] | null
          status: string
          submitted_by: string
          type: string
          updated_at: string
        }
        Insert: {
          approved_exercise_id?: string | null
          created_at?: string
          equipment?: string[] | null
          id?: string
          instructions?: string | null
          modality?: string | null
          name: string
          primary_muscle?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_muscles?: string[] | null
          status?: string
          submitted_by: string
          type?: string
          updated_at?: string
        }
        Update: {
          approved_exercise_id?: string | null
          created_at?: string
          equipment?: string[] | null
          id?: string
          instructions?: string | null
          modality?: string | null
          name?: string
          primary_muscle?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_muscles?: string[] | null
          status?: string
          submitted_by?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          created_at: string
          equipment: Database["public"]["Enums"]["equipment_type"][] | null
          exercise_id: string
          id: string
          image_url: string | null
          instructions: string | null
          is_active: boolean
          modality: Database["public"]["Enums"]["cardio_modality"] | null
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"] | null
          secondary_muscles:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          source: Database["public"]["Enums"]["exercise_source"]
          supports_distance: boolean | null
          supports_intervals: boolean | null
          supports_one_rm_percent: boolean | null
          supports_reps: boolean | null
          supports_rpe: boolean | null
          supports_tempo: boolean | null
          supports_time: boolean | null
          supports_weight: boolean | null
          type: Database["public"]["Enums"]["exercise_type"]
          updated_at: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          equipment?: Database["public"]["Enums"]["equipment_type"][] | null
          exercise_id?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean
          modality?: Database["public"]["Enums"]["cardio_modality"] | null
          name: string
          primary_muscle?: Database["public"]["Enums"]["muscle_group"] | null
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          source?: Database["public"]["Enums"]["exercise_source"]
          supports_distance?: boolean | null
          supports_intervals?: boolean | null
          supports_one_rm_percent?: boolean | null
          supports_reps?: boolean | null
          supports_rpe?: boolean | null
          supports_tempo?: boolean | null
          supports_time?: boolean | null
          supports_weight?: boolean | null
          type: Database["public"]["Enums"]["exercise_type"]
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          equipment?: Database["public"]["Enums"]["equipment_type"][] | null
          exercise_id?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          is_active?: boolean
          modality?: Database["public"]["Enums"]["cardio_modality"] | null
          name?: string
          primary_muscle?: Database["public"]["Enums"]["muscle_group"] | null
          secondary_muscles?:
            | Database["public"]["Enums"]["muscle_group"][]
            | null
          source?: Database["public"]["Enums"]["exercise_source"]
          supports_distance?: boolean | null
          supports_intervals?: boolean | null
          supports_one_rm_percent?: boolean | null
          supports_reps?: boolean | null
          supports_rpe?: boolean | null
          supports_tempo?: boolean | null
          supports_time?: boolean | null
          supports_weight?: boolean | null
          type?: Database["public"]["Enums"]["exercise_type"]
          updated_at?: string
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      external_data_records: {
        Row: {
          created_at: string
          data_type: string
          end_time: string | null
          fingerprint_hash: string | null
          id: string
          is_primary: boolean
          linked_session_id: string | null
          provider: string
          source_id: string | null
          start_time: string
          user_id: string
          value_json: Json
          writeback_id: string | null
        }
        Insert: {
          created_at?: string
          data_type: string
          end_time?: string | null
          fingerprint_hash?: string | null
          id?: string
          is_primary?: boolean
          linked_session_id?: string | null
          provider: string
          source_id?: string | null
          start_time: string
          user_id: string
          value_json?: Json
          writeback_id?: string | null
        }
        Update: {
          created_at?: string
          data_type?: string
          end_time?: string | null
          fingerprint_hash?: string | null
          id?: string
          is_primary?: boolean
          linked_session_id?: string | null
          provider?: string
          source_id?: string | null
          start_time?: string
          user_id?: string
          value_json?: Json
          writeback_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_data_records_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      external_gym_membership_cards: {
        Row: {
          created_at: string
          gym_directory_id: string | null
          gym_name: string
          id: string
          membership_number: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_directory_id?: string | null
          gym_name: string
          id?: string
          membership_number: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_directory_id?: string | null
          gym_name?: string
          id?: string
          membership_number?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_gym_membership_cards_gym_directory_id_fkey"
            columns: ["gym_directory_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      external_gym_submissions: {
        Row: {
          address: string | null
          admin_reason: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          gym_directory_id: string | null
          gym_name: string
          id: string
          status: string
          submitted_by_user_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_reason?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gym_directory_id?: string | null
          gym_name: string
          id?: string
          status?: string
          submitted_by_user_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_reason?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          gym_directory_id?: string | null
          gym_name?: string
          id?: string
          status?: string
          submitted_by_user_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_gym_submissions_gym_directory_id_fkey"
            columns: ["gym_directory_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_per_100g: number | null
          carbs_per_100g: number | null
          created_at: string
          created_by: string | null
          external_id: string | null
          fat_per_100g: number | null
          id: string
          is_approved: boolean
          name: string
          protein_per_100g: number | null
          raw_payload: Json | null
          serving_size_g: number | null
          source: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          fat_per_100g?: number | null
          id?: string
          is_approved?: boolean
          name: string
          protein_per_100g?: number | null
          raw_payload?: Json | null
          serving_size_g?: number | null
          source?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          fat_per_100g?: number | null
          id?: string
          is_approved?: boolean
          name?: string
          protein_per_100g?: number | null
          raw_payload?: Json | null
          serving_size_g?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_roles: {
        Row: {
          created_at: string
          group_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["role_scope"]
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["role_scope"]
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["role_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "group_roles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gym_classes: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          duration_minutes: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_facilities: {
        Row: {
          basketball_court: boolean | null
          boxing_area: boolean | null
          cafe: boolean | null
          cardio_area: boolean | null
          climbing_wall: boolean | null
          created_at: string
          dumbbells: boolean | null
          free_weights: boolean | null
          functional_training: boolean | null
          group_exercise_studio: boolean | null
          gym_id: string
          id: string
          lockers: boolean | null
          outdoor_training: boolean | null
          parking: boolean | null
          personal_training: boolean | null
          physio: boolean | null
          sauna: boolean | null
          showers: boolean | null
          spa: boolean | null
          spin_studio: boolean | null
          sprint_track: boolean | null
          squash_court: boolean | null
          steam_room: boolean | null
          swimming_pool: boolean | null
          tennis_court: boolean | null
          towel_service: boolean | null
          turf_area: boolean | null
          updated_at: string
          weight_machines: boolean | null
          wifi: boolean | null
          yoga_studio: boolean | null
        }
        Insert: {
          basketball_court?: boolean | null
          boxing_area?: boolean | null
          cafe?: boolean | null
          cardio_area?: boolean | null
          climbing_wall?: boolean | null
          created_at?: string
          dumbbells?: boolean | null
          free_weights?: boolean | null
          functional_training?: boolean | null
          group_exercise_studio?: boolean | null
          gym_id: string
          id?: string
          lockers?: boolean | null
          outdoor_training?: boolean | null
          parking?: boolean | null
          personal_training?: boolean | null
          physio?: boolean | null
          sauna?: boolean | null
          showers?: boolean | null
          spa?: boolean | null
          spin_studio?: boolean | null
          sprint_track?: boolean | null
          squash_court?: boolean | null
          steam_room?: boolean | null
          swimming_pool?: boolean | null
          tennis_court?: boolean | null
          towel_service?: boolean | null
          turf_area?: boolean | null
          updated_at?: string
          weight_machines?: boolean | null
          wifi?: boolean | null
          yoga_studio?: boolean | null
        }
        Update: {
          basketball_court?: boolean | null
          boxing_area?: boolean | null
          cafe?: boolean | null
          cardio_area?: boolean | null
          climbing_wall?: boolean | null
          created_at?: string
          dumbbells?: boolean | null
          free_weights?: boolean | null
          functional_training?: boolean | null
          group_exercise_studio?: boolean | null
          gym_id?: string
          id?: string
          lockers?: boolean | null
          outdoor_training?: boolean | null
          parking?: boolean | null
          personal_training?: boolean | null
          physio?: boolean | null
          sauna?: boolean | null
          showers?: boolean | null
          spa?: boolean | null
          spin_studio?: boolean | null
          sprint_track?: boolean | null
          squash_court?: boolean | null
          steam_room?: boolean | null
          swimming_pool?: boolean | null
          tennis_court?: boolean | null
          towel_service?: boolean | null
          turf_area?: boolean | null
          updated_at?: string
          weight_machines?: boolean | null
          wifi?: boolean | null
          yoga_studio?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_facilities_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          email_error: string | null
          email_log_id: string | null
          email_sent_at: string | null
          email_status: string | null
          expires_at: string
          gym_id: string
          id: string
          invited_by: string
          membership_level_id: string | null
          name: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          email_error?: string | null
          email_log_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at: string
          gym_id: string
          id?: string
          invited_by: string
          membership_level_id?: string | null
          name?: string | null
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          email_error?: string | null
          email_log_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          expires_at?: string
          gym_id?: string
          id?: string
          invited_by?: string
          membership_level_id?: string | null
          name?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_invitations_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invitations_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_invitations_membership_level_id_fkey"
            columns: ["membership_level_id"]
            isOneToOne: false
            referencedRelation: "gym_membership_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_membership_levels: {
        Row: {
          access_notes: string | null
          billing_cycle: string | null
          created_at: string
          description: string | null
          display_order: number | null
          gym_id: string
          id: string
          is_active: boolean
          name: string
          price: number | null
          signup_fee: number | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          signup_fee?: number | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          billing_cycle?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          signup_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_membership_levels_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          gym_id: string
          id: string
          invoice_number: string | null
          membership_id: string
          payment_date: string
          payment_method: string | null
          payment_type: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          gym_id: string
          id?: string
          invoice_number?: string | null
          membership_id: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          gym_id?: string
          id?: string
          invoice_number?: string | null
          membership_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_payments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_spaces: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          display_order: number
          gym_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_spaces_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_staff: {
        Row: {
          accreditations: string[] | null
          bio: string | null
          certifications: string[] | null
          created_at: string
          email: string | null
          gym_id: string
          hire_date: string | null
          id: string
          is_active: boolean
          name: string | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accreditations?: string[] | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          gym_id: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accreditations?: string[] | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          email?: string | null
          gym_id?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_staff_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postcode: string | null
          approval_status: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_demo: boolean | null
          is_enrolled: boolean
          is_owner_submission: boolean | null
          logo_url: string | null
          name: string
          owner_email: string | null
          owner_id: string | null
          phone: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submission_reason: string | null
          submitted_by: string | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postcode?: string | null
          approval_status?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean | null
          is_enrolled?: boolean
          is_owner_submission?: boolean | null
          logo_url?: string | null
          name: string
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_reason?: string | null
          submitted_by?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postcode?: string | null
          approval_status?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean | null
          is_enrolled?: boolean
          is_owner_submission?: boolean | null
          logo_url?: string | null
          name?: string
          owner_email?: string | null
          owner_id?: string | null
          phone?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submission_reason?: string | null
          submitted_by?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_at: string
          habit_id: string
          id: string
        }
        Insert: {
          completed_at?: string
          habit_id: string
          id?: string
        }
        Update: {
          completed_at?: string
          habit_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          frequency: string | null
          id: string
          is_active: boolean | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_devices: {
        Row: {
          created_at: string
          device_identifier: string | null
          id: string
          is_preferred: boolean
          last_connected_at: string | null
          manufacturer: string | null
          name: string
          transport: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_identifier?: string | null
          id?: string
          is_preferred?: boolean
          last_connected_at?: string | null
          manufacturer?: string | null
          name: string
          transport?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_identifier?: string | null
          id?: string
          is_preferred?: boolean
          last_connected_at?: string | null
          manufacturer?: string | null
          name?: string
          transport?: string
          user_id?: string
        }
        Relationships: []
      }
      hr_samples: {
        Row: {
          bpm: number
          created_at: string
          id: string
          session_id: string
          source_device_id: string | null
          timestamp: string
        }
        Insert: {
          bpm: number
          created_at?: string
          id?: string
          session_id: string
          source_device_id?: string | null
          timestamp?: string
        }
        Update: {
          bpm?: number
          created_at?: string
          id?: string
          session_id?: string
          source_device_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_samples_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_samples_source_device_id_fkey"
            columns: ["source_device_id"]
            isOneToOne: false
            referencedRelation: "hr_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_count: number | null
          entity_type: string
          error_count: number | null
          errors: Json | null
          file_name: string | null
          id: string
          imported_by: string
          metadata: Json | null
          skipped_count: number | null
          status: string
          total_rows: number | null
          updated_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_count?: number | null
          entity_type: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          imported_by: string
          metadata?: Json | null
          skipped_count?: number | null
          status?: string
          total_rows?: number | null
          updated_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_count?: number | null
          entity_type?: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          id?: string
          imported_by?: string
          metadata?: Json | null
          skipped_count?: number | null
          status?: string
          total_rows?: number | null
          updated_count?: number | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_entity_id: string | null
          created_entity_type: string | null
          custom_exercises_created: number | null
          detected_format: string | null
          error_message: string | null
          file_name: string
          file_type: string
          id: string
          mapping_decisions: Json | null
          matched_exercises: number | null
          metadata: Json | null
          parse_confidence: number | null
          status: string
          submissions_created: number | null
          total_exercises: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_entity_id?: string | null
          created_entity_type?: string | null
          custom_exercises_created?: number | null
          detected_format?: string | null
          error_message?: string | null
          file_name: string
          file_type: string
          id?: string
          mapping_decisions?: Json | null
          matched_exercises?: number | null
          metadata?: Json | null
          parse_confidence?: number | null
          status?: string
          submissions_created?: number | null
          total_exercises?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_entity_id?: string | null
          created_entity_type?: string | null
          custom_exercises_created?: number | null
          detected_format?: string | null
          error_message?: string | null
          file_name?: string
          file_type?: string
          id?: string
          mapping_decisions?: Json | null
          matched_exercises?: number | null
          metadata?: Json | null
          parse_confidence?: number | null
          status?: string
          submissions_created?: number | null
          total_exercises?: number | null
          user_id?: string
        }
        Relationships: []
      }
      integration_connections: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_sync_at: string | null
          provider: string
          scopes_granted: Json | null
          status: string
          sync_error: string | null
          sync_error_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          provider: string
          scopes_granted?: Json | null
          status?: string
          sync_error?: string | null
          sync_error_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_sync_at?: string | null
          provider?: string
          scopes_granted?: Json | null
          status?: string
          sync_error?: string | null
          sync_error_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_preferences: {
        Row: {
          created_at: string
          enabled_metrics: Json
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_metrics?: Json
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_metrics?: Json
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_priority: {
        Row: {
          created_at: string
          id: string
          metric_key: string
          ordered_providers: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_key: string
          ordered_providers?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_key?: string
          ordered_providers?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_template_items: {
        Row: {
          created_at: string
          food_id: string
          id: string
          meal_template_id: string
          quantity_grams: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          food_id: string
          id?: string
          meal_template_id: string
          quantity_grams?: number
          sort_order?: number
        }
        Update: {
          created_at?: string
          food_id?: string
          id?: string
          meal_template_id?: string
          quantity_grams?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_template_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_template_items_meal_template_id_fkey"
            columns: ["meal_template_id"]
            isOneToOne: false
            referencedRelation: "meal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          fingerprint: string | null
          id: string
          is_approved: boolean
          is_public: boolean
          name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fingerprint?: string | null
          id?: string
          is_approved?: boolean
          is_public?: boolean
          name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          fingerprint?: string | null
          id?: string
          is_approved?: boolean
          is_public?: boolean
          name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      meditation_sessions: {
        Row: {
          completed_at: string
          duration_seconds: number
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration_seconds: number
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          duration_seconds?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      member_contacts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          id: string
          membership_id: string
          phone: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          id?: string
          membership_id: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          id?: string
          membership_id?: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_contacts_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notes: {
        Row: {
          author_id: string
          author_name: string | null
          created_at: string
          id: string
          membership_id: string
          note_text: string
          tag: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string | null
          created_at?: string
          id?: string
          membership_id: string
          note_text: string
          tag?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string | null
          created_at?: string
          id?: string
          membership_id?: string
          note_text?: string
          tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_checkins: {
        Row: {
          checked_in_at: string
          id: string
          membership_id: string
        }
        Insert: {
          checked_in_at?: string
          id?: string
          membership_id: string
        }
        Update: {
          checked_in_at?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_checkins_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          invitation_id: string | null
          is_demo: boolean | null
          membership_level_id: string | null
          membership_number: string | null
          membership_token: string
          next_payment_date: string | null
          offboarded_at: string | null
          payment_status: string | null
          start_date: string | null
          status: string
          suspended_at: string | null
          suspended_until: string | null
          suspension_reason: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          invitation_id?: string | null
          is_demo?: boolean | null
          membership_level_id?: string | null
          membership_number?: string | null
          membership_token?: string
          next_payment_date?: string | null
          offboarded_at?: string | null
          payment_status?: string | null
          start_date?: string | null
          status?: string
          suspended_at?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          invitation_id?: string | null
          is_demo?: boolean | null
          membership_level_id?: string | null
          membership_number?: string | null
          membership_token?: string
          next_payment_date?: string | null
          offboarded_at?: string | null
          payment_status?: string | null
          start_date?: string | null
          status?: string
          suspended_at?: string | null
          suspended_until?: string | null
          suspension_reason?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "gym_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_membership_level_id_fkey"
            columns: ["membership_level_id"]
            isOneToOne: false
            referencedRelation: "gym_membership_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      message_email_throttle: {
        Row: {
          conversation_id: string
          id: string
          last_email_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          last_email_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          last_email_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body_text: string
          conversation_id: string
          created_at: string
          id: string
          is_system_message: boolean
          sender_user_id: string | null
        }
        Insert: {
          body_text: string
          conversation_id: string
          created_at?: string
          id?: string
          is_system_message?: boolean
          sender_user_id?: string | null
        }
        Update: {
          body_text?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_system_message?: boolean
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      music_provider_connections: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          provider: string
          refresh_token: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          announcements: boolean | null
          coach_messages: boolean | null
          created_at: string
          email_coach: boolean | null
          email_enabled: boolean | null
          email_event: boolean | null
          email_gym: boolean | null
          email_messages: boolean | null
          email_system: boolean | null
          email_workout: boolean | null
          event_updates: boolean | null
          gym_updates: boolean | null
          habit_reminders: boolean | null
          id: string
          message_email_throttle_minutes: number | null
          push_enabled: boolean | null
          updated_at: string
          user_id: string
          workout_reminders: boolean | null
        }
        Insert: {
          announcements?: boolean | null
          coach_messages?: boolean | null
          created_at?: string
          email_coach?: boolean | null
          email_enabled?: boolean | null
          email_event?: boolean | null
          email_gym?: boolean | null
          email_messages?: boolean | null
          email_system?: boolean | null
          email_workout?: boolean | null
          event_updates?: boolean | null
          gym_updates?: boolean | null
          habit_reminders?: boolean | null
          id?: string
          message_email_throttle_minutes?: number | null
          push_enabled?: boolean | null
          updated_at?: string
          user_id: string
          workout_reminders?: boolean | null
        }
        Update: {
          announcements?: boolean | null
          coach_messages?: boolean | null
          created_at?: string
          email_coach?: boolean | null
          email_enabled?: boolean | null
          email_event?: boolean | null
          email_gym?: boolean | null
          email_messages?: boolean | null
          email_system?: boolean | null
          email_workout?: boolean | null
          event_updates?: boolean | null
          gym_updates?: boolean | null
          habit_reminders?: boolean | null
          id?: string
          message_email_throttle_minutes?: number | null
          push_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          workout_reminders?: boolean | null
        }
        Relationships: []
      }
      nutrition_api_providers: {
        Row: {
          api_key_encrypted: string | null
          base_url: string | null
          call_count_24h: number | null
          config: Json | null
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          last_error: string | null
          last_ok_at: string | null
          priority: number
          provider_key: string
          rate_limit_per_min: number | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          base_url?: string | null
          call_count_24h?: number | null
          config?: Json | null
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_ok_at?: string | null
          priority?: number
          provider_key: string
          rate_limit_per_min?: number | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          base_url?: string | null
          call_count_24h?: number | null
          config?: Json | null
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_ok_at?: string | null
          priority?: number
          provider_key?: string
          rate_limit_per_min?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_days: {
        Row: {
          created_at: string
          date: string
          goal_profile_id: string | null
          id: string
          total_calories: number
          total_carbs_g: number
          total_fat_g: number
          total_protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          goal_profile_id?: string | null
          id?: string
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          goal_profile_id?: string | null
          id?: string
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_days_goal_profile_id_fkey"
            columns: ["goal_profile_id"]
            isOneToOne: false
            referencedRelation: "nutrition_goal_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_favorites: {
        Row: {
          created_at: string
          food_id: string | null
          id: string
          item_type: string
          meal_template_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          id?: string
          item_type: string
          meal_template_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          id?: string
          item_type?: string
          meal_template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_favorites_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_favorites_meal_template_id_fkey"
            columns: ["meal_template_id"]
            isOneToOne: false
            referencedRelation: "meal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_fingerprint_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rule_version: string
          settings_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_version?: string
          settings_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_version?: string
          settings_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_goal_profiles: {
        Row: {
          calories: number
          carbs_g: number
          created_at: string
          fat_g: number
          id: string
          is_default: boolean
          name: string
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          is_default?: boolean
          name?: string
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          is_default?: boolean
          name?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_log_entries: {
        Row: {
          computed_calories: number
          computed_carbs_g: number
          computed_fat_g: number
          computed_protein_g: number
          created_at: string
          entry_type: string
          food_id: string | null
          food_name: string | null
          id: string
          meal_template_id: string | null
          nutrition_meal_id: string
          quantity_grams: number | null
          servings: number | null
        }
        Insert: {
          computed_calories?: number
          computed_carbs_g?: number
          computed_fat_g?: number
          computed_protein_g?: number
          created_at?: string
          entry_type?: string
          food_id?: string | null
          food_name?: string | null
          id?: string
          meal_template_id?: string | null
          nutrition_meal_id: string
          quantity_grams?: number | null
          servings?: number | null
        }
        Update: {
          computed_calories?: number
          computed_carbs_g?: number
          computed_fat_g?: number
          computed_protein_g?: number
          created_at?: string
          entry_type?: string
          food_id?: string | null
          food_name?: string | null
          id?: string
          meal_template_id?: string | null
          nutrition_meal_id?: string
          quantity_grams?: number | null
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_log_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_log_entries_meal_template_id_fkey"
            columns: ["meal_template_id"]
            isOneToOne: false
            referencedRelation: "meal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_log_entries_nutrition_meal_id_fkey"
            columns: ["nutrition_meal_id"]
            isOneToOne: false
            referencedRelation: "nutrition_meals"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_mapping_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          mapping_json: Json
          provider_key: string
          rule_version: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mapping_json?: Json
          provider_key: string
          rule_version?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mapping_json?: Json
          provider_key?: string
          rule_version?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_mapping_rules_provider_key_fkey"
            columns: ["provider_key"]
            isOneToOne: false
            referencedRelation: "nutrition_api_providers"
            referencedColumns: ["provider_key"]
          },
        ]
      }
      nutrition_matching_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rule_version: string
          settings_json: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_version?: string
          settings_json?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_version?: string
          settings_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_meals: {
        Row: {
          created_at: string
          id: string
          meal_type: string
          nutrition_day_id: string
          total_calories: number
          total_carbs_g: number
          total_fat_g: number
          total_protein_g: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_type: string
          nutrition_day_id: string
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_protein_g?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_type?: string
          nutrition_day_id?: string
          total_calories?: number
          total_carbs_g?: number
          total_fat_g?: number
          total_protein_g?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meals_nutrition_day_id_fkey"
            columns: ["nutrition_day_id"]
            isOneToOne: false
            referencedRelation: "nutrition_days"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_submissions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          submitted_by: string | null
          target_food_id: string | null
          target_meal_template_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_by?: string | null
          target_food_id?: string | null
          target_meal_template_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_by?: string | null
          target_food_id?: string | null
          target_meal_template_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_submissions_target_food_id_fkey"
            columns: ["target_food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_submissions_target_meal_template_id_fkey"
            columns: ["target_meal_template_id"]
            isOneToOne: false
            referencedRelation: "meal_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      offer_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["offer_event_type"]
          id: string
          metadata: Json | null
          offer_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["offer_event_type"]
          id?: string
          metadata?: Json | null
          offer_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["offer_event_type"]
          id?: string
          metadata?: Json | null
          offer_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          affiliate_url: string | null
          brand_name: string
          category_id: string | null
          created_at: string
          created_by_user_id: string
          description_full: string | null
          description_short: string | null
          discount_code: string | null
          expires_at: string | null
          featured: boolean | null
          gym_id: string | null
          id: string
          media_cover_url: string | null
          media_logo_url: string | null
          offer_type: Database["public"]["Enums"]["offer_type"]
          regions: string[] | null
          scope: Database["public"]["Enums"]["offer_scope"]
          starts_at: string | null
          status: Database["public"]["Enums"]["offer_status"]
          terms_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          affiliate_url?: string | null
          brand_name: string
          category_id?: string | null
          created_at?: string
          created_by_user_id: string
          description_full?: string | null
          description_short?: string | null
          discount_code?: string | null
          expires_at?: string | null
          featured?: boolean | null
          gym_id?: string | null
          id?: string
          media_cover_url?: string | null
          media_logo_url?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          regions?: string[] | null
          scope?: Database["public"]["Enums"]["offer_scope"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          affiliate_url?: string | null
          brand_name?: string
          category_id?: string | null
          created_at?: string
          created_by_user_id?: string
          description_full?: string | null
          description_short?: string | null
          discount_code?: string | null
          expires_at?: string | null
          featured?: boolean | null
          gym_id?: string | null
          id?: string
          media_cover_url?: string | null
          media_logo_url?: string | null
          offer_type?: Database["public"]["Enums"]["offer_type"]
          regions?: string[] | null
          scope?: Database["public"]["Enums"]["offer_scope"]
          starts_at?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          terms_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          created_at: string
          exercise_id: string
          exercise_name: string
          id: string
          record_type: string
          reps: number | null
          session_id: string | null
          user_id: string
          value: number
          weight: number | null
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          exercise_id: string
          exercise_name: string
          id?: string
          record_type: string
          reps?: number | null
          session_id?: string | null
          user_id: string
          value: number
          weight?: number | null
        }
        Update: {
          achieved_at?: string
          created_at?: string
          exercise_id?: string
          exercise_name?: string
          id?: string
          record_type?: string
          reps?: number | null
          session_id?: string | null
          user_id?: string
          value?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_weeks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          notes: string | null
          plan_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          plan_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          plan_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_workout_overrides: {
        Row: {
          assignment_id: string
          created_at: string
          exercise_overrides: Json | null
          id: string
          plan_workout_id: string
          updated_at: string
          workout_notes: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          exercise_overrides?: Json | null
          id?: string
          plan_workout_id: string
          updated_at?: string
          workout_notes?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          exercise_overrides?: Json | null
          id?: string
          plan_workout_id?: string
          updated_at?: string
          workout_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_workout_overrides_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "athlete_assigned_plans"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "plan_workout_overrides_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "client_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_workout_overrides_plan_workout_id_fkey"
            columns: ["plan_workout_id"]
            isOneToOne: false
            referencedRelation: "plan_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_workouts: {
        Row: {
          coach_notes: string | null
          created_at: string
          day_of_week: number | null
          description: string | null
          exercise_data: Json | null
          id: string
          name: string
          order_index: number
          week_id: string
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          exercise_data?: Json | null
          id?: string
          name: string
          order_index?: number
          week_id: string
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          exercise_data?: Json | null
          id?: string
          name?: string
          order_index?: number
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_workouts_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_library: {
        Row: {
          approved_by: string | null
          cover_art_url: string | null
          created_at: string
          description: string | null
          genre: string
          id: string
          name: string
          platform: string
          playlist_url: string
          submitted_by: string | null
          track_count: number | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string
          id?: string
          name: string
          platform: string
          playlist_url: string
          submitted_by?: string | null
          track_count?: number | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string
          id?: string
          name?: string
          platform?: string
          playlist_url?: string
          submitted_by?: string | null
          track_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      playlist_submissions: {
        Row: {
          cover_art_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          platform: string
          playlist_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_genre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          platform: string
          playlist_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_genre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          platform?: string
          playlist_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_genre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          artist: string
          artwork_url: string | null
          created_at: string
          duration_seconds: number | null
          external_track_id: string
          id: string
          position_index: number
          saved_playlist_id: string
          title: string
        }
        Insert: {
          artist: string
          artwork_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          external_track_id: string
          id?: string
          position_index: number
          saved_playlist_id: string
          title: string
        }
        Update: {
          artist?: string
          artwork_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          external_track_id?: string
          id?: string
          position_index?: number
          saved_playlist_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_saved_playlist_id_fkey"
            columns: ["saved_playlist_id"]
            isOneToOne: false
            referencedRelation: "saved_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          created_at: string
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string | null
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postcode: string | null
          admin_notes: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          first_name: string | null
          hr_zone1_max: number | null
          hr_zone2_max: number | null
          hr_zone3_max: number | null
          hr_zone4_max: number | null
          hr_zone5_max: number | null
          hr_zones_mode: string | null
          id: string
          instagram_handle: string | null
          is_demo: boolean | null
          last_active_at: string | null
          last_name: string | null
          max_hr: number | null
          phone: string | null
          privacy_analytics: boolean | null
          privacy_insights: boolean | null
          resting_hr: number | null
          status: string | null
          telephone: string | null
          theme_mode: string | null
          tiktok_handle: string | null
          training_goal: string | null
          twitter_handle: string | null
          units: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          work_address_city: string | null
          work_address_country: string | null
          work_address_line1: string | null
          work_address_line2: string | null
          work_address_postcode: string | null
          work_company: string | null
          youtube_handle: string | null
        }
        Insert: {
          accent_color?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postcode?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          hr_zone1_max?: number | null
          hr_zone2_max?: number | null
          hr_zone3_max?: number | null
          hr_zone4_max?: number | null
          hr_zone5_max?: number | null
          hr_zones_mode?: string | null
          id?: string
          instagram_handle?: string | null
          is_demo?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          max_hr?: number | null
          phone?: string | null
          privacy_analytics?: boolean | null
          privacy_insights?: boolean | null
          resting_hr?: number | null
          status?: string | null
          telephone?: string | null
          theme_mode?: string | null
          tiktok_handle?: string | null
          training_goal?: string | null
          twitter_handle?: string | null
          units?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          work_address_city?: string | null
          work_address_country?: string | null
          work_address_line1?: string | null
          work_address_line2?: string | null
          work_address_postcode?: string | null
          work_company?: string | null
          youtube_handle?: string | null
        }
        Update: {
          accent_color?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postcode?: string | null
          admin_notes?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          hr_zone1_max?: number | null
          hr_zone2_max?: number | null
          hr_zone3_max?: number | null
          hr_zone4_max?: number | null
          hr_zone5_max?: number | null
          hr_zones_mode?: string | null
          id?: string
          instagram_handle?: string | null
          is_demo?: boolean | null
          last_active_at?: string | null
          last_name?: string | null
          max_hr?: number | null
          phone?: string | null
          privacy_analytics?: boolean | null
          privacy_insights?: boolean | null
          resting_hr?: number | null
          status?: string | null
          telephone?: string | null
          theme_mode?: string | null
          tiktok_handle?: string | null
          training_goal?: string | null
          twitter_handle?: string | null
          units?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          work_address_city?: string | null
          work_address_country?: string | null
          work_address_line1?: string | null
          work_address_line2?: string | null
          work_address_postcode?: string | null
          work_company?: string | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
      progress_photo_categories: {
        Row: {
          created_at: string
          id: string
          label: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string
          note: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          note?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registration_requests: {
        Row: {
          coach_bio: string | null
          coach_certifications: string[] | null
          coach_delivery_type: string | null
          coach_hourly_rate: number | null
          coach_location: string | null
          coach_specialties: string[] | null
          created_at: string
          created_entity_id: string | null
          description: string | null
          event_date: string | null
          event_end_date: string | null
          event_location: string | null
          event_mode: string | null
          event_start_date: string | null
          event_type: string | null
          gym_address: string | null
          gym_address_city: string | null
          gym_address_country: string | null
          gym_address_line1: string | null
          gym_address_line2: string | null
          gym_address_postcode: string | null
          gym_email: string | null
          gym_phone: string | null
          gym_website: string | null
          id: string
          is_owner_or_manager: boolean | null
          name: string
          reason: string | null
          rejection_reason: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_bio?: string | null
          coach_certifications?: string[] | null
          coach_delivery_type?: string | null
          coach_hourly_rate?: number | null
          coach_location?: string | null
          coach_specialties?: string[] | null
          created_at?: string
          created_entity_id?: string | null
          description?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_mode?: string | null
          event_start_date?: string | null
          event_type?: string | null
          gym_address?: string | null
          gym_address_city?: string | null
          gym_address_country?: string | null
          gym_address_line1?: string | null
          gym_address_line2?: string | null
          gym_address_postcode?: string | null
          gym_email?: string | null
          gym_phone?: string | null
          gym_website?: string | null
          id?: string
          is_owner_or_manager?: boolean | null
          name: string
          reason?: string | null
          rejection_reason?: string | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_bio?: string | null
          coach_certifications?: string[] | null
          coach_delivery_type?: string | null
          coach_hourly_rate?: number | null
          coach_location?: string | null
          coach_specialties?: string[] | null
          created_at?: string
          created_entity_id?: string | null
          description?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_mode?: string | null
          event_start_date?: string | null
          event_type?: string | null
          gym_address?: string | null
          gym_address_city?: string | null
          gym_address_country?: string | null
          gym_address_line1?: string | null
          gym_address_line2?: string | null
          gym_address_postcode?: string | null
          gym_email?: string | null
          gym_phone?: string | null
          gym_website?: string | null
          id?: string
          is_owner_or_manager?: boolean | null
          name?: string
          reason?: string | null
          rejection_reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_capabilities: {
        Row: {
          capability_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          capability_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          capability_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_announcements: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          is_pinned: boolean | null
          published_at: string | null
          run_club_id: string
          send_email: boolean | null
          send_notification: boolean | null
          title: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          published_at?: string | null
          run_club_id: string
          send_email?: boolean | null
          send_notification?: boolean | null
          title: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          published_at?: string | null
          run_club_id?: string
          send_email?: boolean | null
          send_notification?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_announcements_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_applications: {
        Row: {
          applicant_email: string | null
          applicant_name: string | null
          applicant_phone: string | null
          applied_at: string
          conversation_id: string | null
          created_at: string
          crm_lead_id: string | null
          id: string
          message: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_club_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          applied_at?: string
          conversation_id?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_club_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_email?: string | null
          applicant_name?: string | null
          applicant_phone?: string | null
          applied_at?: string
          conversation_id?: string | null
          created_at?: string
          crm_lead_id?: string | null
          id?: string
          message?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_club_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_applications_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_attendance: {
        Row: {
          attended: boolean | null
          created_at: string
          id: string
          notes: string | null
          recorded_at: string
          recorded_by: string | null
          run_club_id: string
          run_id: string
          run_instance_id: string | null
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          run_club_id: string
          run_id: string
          run_instance_id?: string | null
          user_id: string
        }
        Update: {
          attended?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_at?: string
          recorded_by?: string | null
          run_club_id?: string
          run_id?: string
          run_instance_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_attendance_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_club_attendance_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_club_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_club_attendance_run_instance_id_fkey"
            columns: ["run_instance_id"]
            isOneToOne: false
            referencedRelation: "run_club_run_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_event_registrations: {
        Row: {
          event_id: string
          id: string
          registered_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          registered_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          registered_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "run_club_events"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_events: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          distances: string[] | null
          end_time: string | null
          event_date: string
          event_type: string | null
          external_registration_url: string | null
          ical_uid: string | null
          id: string
          location: string | null
          location_coords: Json | null
          registration_deadline: string | null
          registration_required: boolean | null
          run_club_id: string
          start_time: string | null
          status: string | null
          sync_version: number | null
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          distances?: string[] | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          external_registration_url?: string | null
          ical_uid?: string | null
          id?: string
          location?: string | null
          location_coords?: Json | null
          registration_deadline?: string | null
          registration_required?: boolean | null
          run_club_id: string
          start_time?: string | null
          status?: string | null
          sync_version?: number | null
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          distances?: string[] | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          external_registration_url?: string | null
          ical_uid?: string | null
          id?: string
          location?: string | null
          location_coords?: Json | null
          registration_deadline?: string | null
          registration_required?: boolean | null
          run_club_id?: string
          start_time?: string | null
          status?: string | null
          sync_version?: number | null
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_events_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_members: {
        Row: {
          created_at: string
          id: string
          internal_notes: string | null
          joined_at: string
          run_club_id: string
          status: string
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          internal_notes?: string | null
          joined_at?: string
          run_club_id: string
          status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          internal_notes?: string | null
          joined_at?: string
          run_club_id?: string
          status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_members_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_organisers: {
        Row: {
          created_at: string
          id: string
          role: string
          run_club_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          run_club_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          run_club_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_club_organisers_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_run_instances: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          id: string
          notes: string | null
          run_club_id: string
          run_id: string
          scheduled_date: string
          scheduled_time: string | null
          status: string | null
          updated_at: string
          weather_conditions: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          run_club_id: string
          run_id: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          run_club_id?: string
          run_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string | null
          updated_at?: string
          weather_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_club_run_instances_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_club_run_instances_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_club_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_club_runs: {
        Row: {
          attendance_tracking_enabled: boolean | null
          can_link_to_workout: boolean | null
          created_at: string
          day_of_week: number | null
          description: string | null
          difficulty: string | null
          distances: string[] | null
          end_time: string | null
          ical_uid: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          meeting_point: string | null
          meeting_point_coords: Json | null
          notes: string | null
          one_off_date: string | null
          pace_groups: Json | null
          recurrence_rule: string | null
          route_description: string | null
          run_club_id: string
          start_time: string | null
          sync_version: number | null
          timezone: string | null
          title: string
          updated_at: string
          workout_linkable: boolean | null
        }
        Insert: {
          attendance_tracking_enabled?: boolean | null
          can_link_to_workout?: boolean | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          difficulty?: string | null
          distances?: string[] | null
          end_time?: string | null
          ical_uid?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          meeting_point?: string | null
          meeting_point_coords?: Json | null
          notes?: string | null
          one_off_date?: string | null
          pace_groups?: Json | null
          recurrence_rule?: string | null
          route_description?: string | null
          run_club_id: string
          start_time?: string | null
          sync_version?: number | null
          timezone?: string | null
          title: string
          updated_at?: string
          workout_linkable?: boolean | null
        }
        Update: {
          attendance_tracking_enabled?: boolean | null
          can_link_to_workout?: boolean | null
          created_at?: string
          day_of_week?: number | null
          description?: string | null
          difficulty?: string | null
          distances?: string[] | null
          end_time?: string | null
          ical_uid?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          meeting_point?: string | null
          meeting_point_coords?: Json | null
          notes?: string | null
          one_off_date?: string | null
          pace_groups?: Json | null
          recurrence_rule?: string | null
          route_description?: string | null
          run_club_id?: string
          start_time?: string | null
          sync_version?: number | null
          timezone?: string | null
          title?: string
          updated_at?: string
          workout_linkable?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "run_club_runs_run_club_id_fkey"
            columns: ["run_club_id"]
            isOneToOne: false
            referencedRelation: "run_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_clubs: {
        Row: {
          applications_enabled: boolean | null
          auto_approve_applications: boolean | null
          calendar_sync_enabled: boolean | null
          club_style: string | null
          contact_email: string | null
          contact_phone: string | null
          cover_image_url: string | null
          created_at: string
          days_of_week: number[] | null
          description: string | null
          distances_offered: string[] | null
          facebook_url: string | null
          ical_uid: string | null
          id: string
          instagram_handle: string | null
          logo_url: string | null
          meeting_locations: Json | null
          membership_benefits: string | null
          membership_expectations: string | null
          membership_fee: number | null
          membership_fee_cadence: string | null
          membership_type: string | null
          name: string
          owner_user_id: string
          pace_groups: Json | null
          primary_city: string | null
          primary_country: string | null
          primary_postcode: string | null
          slug: string | null
          status: string
          strava_club_url: string | null
          sync_version: number | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          applications_enabled?: boolean | null
          auto_approve_applications?: boolean | null
          calendar_sync_enabled?: boolean | null
          club_style?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          distances_offered?: string[] | null
          facebook_url?: string | null
          ical_uid?: string | null
          id?: string
          instagram_handle?: string | null
          logo_url?: string | null
          meeting_locations?: Json | null
          membership_benefits?: string | null
          membership_expectations?: string | null
          membership_fee?: number | null
          membership_fee_cadence?: string | null
          membership_type?: string | null
          name: string
          owner_user_id: string
          pace_groups?: Json | null
          primary_city?: string | null
          primary_country?: string | null
          primary_postcode?: string | null
          slug?: string | null
          status?: string
          strava_club_url?: string | null
          sync_version?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          applications_enabled?: boolean | null
          auto_approve_applications?: boolean | null
          calendar_sync_enabled?: boolean | null
          club_style?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cover_image_url?: string | null
          created_at?: string
          days_of_week?: number[] | null
          description?: string | null
          distances_offered?: string[] | null
          facebook_url?: string | null
          ical_uid?: string | null
          id?: string
          instagram_handle?: string | null
          logo_url?: string | null
          meeting_locations?: Json | null
          membership_benefits?: string | null
          membership_expectations?: string | null
          membership_fee?: number | null
          membership_fee_cadence?: string | null
          membership_type?: string | null
          name?: string
          owner_user_id?: string
          pace_groups?: Json | null
          primary_city?: string | null
          primary_country?: string | null
          primary_postcode?: string | null
          slug?: string | null
          status?: string
          strava_club_url?: string | null
          sync_version?: number | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      saved_playlists: {
        Row: {
          cached_tracks_json: Json | null
          cover_art_url: string | null
          created_at: string
          external_playlist_id: string
          id: string
          name: string
          provider: string
          track_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cached_tracks_json?: Json | null
          cover_art_url?: string | null
          created_at?: string
          external_playlist_id: string
          id?: string
          name: string
          provider: string
          track_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cached_tracks_json?: Json | null
          cover_art_url?: string | null
          created_at?: string
          external_playlist_id?: string
          id?: string
          name?: string
          provider?: string
          track_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          completed_reps: number | null
          completed_weight: number | null
          created_at: string
          exercise_log_id: string
          exercise_version: number | null
          id: string
          is_completed: boolean | null
          load_guidance: string | null
          rest_duration: number | null
          rpe: number | null
          set_number: number
          target_reps: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_weight: number | null
          tempo: string | null
        }
        Insert: {
          completed_reps?: number | null
          completed_weight?: number | null
          created_at?: string
          exercise_log_id: string
          exercise_version?: number | null
          id?: string
          is_completed?: boolean | null
          load_guidance?: string | null
          rest_duration?: number | null
          rpe?: number | null
          set_number: number
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_weight?: number | null
          tempo?: string | null
        }
        Update: {
          completed_reps?: number | null
          completed_weight?: number | null
          created_at?: string
          exercise_log_id?: string
          exercise_version?: number | null
          id?: string
          is_completed?: boolean | null
          load_guidance?: string | null
          rest_duration?: number | null
          rpe?: number | null
          set_number?: number
          target_reps?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_weight?: number | null
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_log_id_fkey"
            columns: ["exercise_log_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_config: {
        Row: {
          created_at: string
          enabled: boolean
          encrypted_password: string
          from_email: string
          from_name: string
          host: string
          id: string
          password_iv: string
          port: number
          reply_to: string | null
          secure: boolean
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          encrypted_password?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password_iv?: string
          port?: number
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          encrypted_password?: string
          from_email?: string
          from_name?: string
          host?: string
          id?: string
          password_iv?: string
          port?: number
          reply_to?: string | null
          secure?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          comments_count: number
          content: string
          created_at: string
          flagged_at: string | null
          flagged_reason: string | null
          id: string
          is_flagged: boolean
          is_removed: boolean
          likes_count: number
          media_urls: string[] | null
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comments_count?: number
          content: string
          created_at?: string
          flagged_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean
          is_removed?: boolean
          likes_count?: number
          media_urls?: string[] | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comments_count?: number
          content?: string
          created_at?: string
          flagged_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_flagged?: boolean
          is_removed?: boolean
          likes_count?: number
          media_urls?: string[] | null
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      split_weeks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          notes: string | null
          split_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          split_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          split_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "split_weeks_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "training_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      split_workout_completions: {
        Row: {
          completed_at: string
          id: string
          split_id: string
          split_workout_id: string
          user_id: string
          week_id: string
          workout_session_id: string | null
        }
        Insert: {
          completed_at?: string
          id?: string
          split_id: string
          split_workout_id: string
          user_id: string
          week_id: string
          workout_session_id?: string | null
        }
        Update: {
          completed_at?: string
          id?: string
          split_id?: string
          split_workout_id?: string
          user_id?: string
          week_id?: string
          workout_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "split_workout_completions_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "training_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_workout_completions_split_workout_id_fkey"
            columns: ["split_workout_id"]
            isOneToOne: false
            referencedRelation: "split_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_workout_completions_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "split_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_workout_completions_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      split_workouts: {
        Row: {
          created_at: string
          day_label: string | null
          day_number: number | null
          embedded_workout_data: Json | null
          id: string
          notes: string | null
          order_index: number
          week_id: string
          workout_template_id: string | null
        }
        Insert: {
          created_at?: string
          day_label?: string | null
          day_number?: number | null
          embedded_workout_data?: Json | null
          id?: string
          notes?: string | null
          order_index?: number
          week_id: string
          workout_template_id?: string | null
        }
        Update: {
          created_at?: string
          day_label?: string | null
          day_number?: number | null
          embedded_workout_data?: Json | null
          id?: string
          notes?: string | null
          order_index?: number
          week_id?: string
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "split_workouts_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "split_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_workouts_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_rotas: {
        Row: {
          created_at: string
          end_time: string
          gym_id: string
          id: string
          notes: string | null
          pattern_id: string | null
          shift_date: string
          staff_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          gym_id: string
          id?: string
          notes?: string | null
          pattern_id?: string | null
          shift_date: string
          staff_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          gym_id?: string
          id?: string
          notes?: string | null
          pattern_id?: string | null
          shift_date?: string
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_rotas_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_rotas_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "staff_shift_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_rotas_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "gym_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shift_patterns: {
        Row: {
          created_at: string
          description: string | null
          gym_id: string
          id: string
          is_active: boolean | null
          name: string
          pattern_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gym_id: string
          id?: string
          is_active?: boolean | null
          name: string
          pattern_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          pattern_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shift_patterns_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_submissions: {
        Row: {
          admin_notes: string | null
          category_id: string | null
          company_name: string
          contact_name: string
          created_at: string
          description: string
          email: string
          expires_at: string | null
          id: string
          phone: string | null
          proposed_affiliate_url: string | null
          proposed_code: string | null
          regions: string[] | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          status: Database["public"]["Enums"]["submission_status"]
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          category_id?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          description: string
          email: string
          expires_at?: string | null
          id?: string
          phone?: string | null
          proposed_affiliate_url?: string | null
          proposed_code?: string | null
          regions?: string[] | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          category_id?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          description?: string
          email?: string
          expires_at?: string | null
          id?: string
          phone?: string | null
          proposed_affiliate_url?: string | null
          proposed_code?: string | null
          regions?: string[] | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "offer_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          duration_weeks: number | null
          id: string
          is_active: boolean
          is_demo: boolean | null
          is_template: boolean
          name: string
          parent_plan_id: string | null
          plan_type: string
          updated_at: string
          version: number
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          is_template?: boolean
          name: string
          parent_plan_id?: string | null
          plan_type?: string
          updated_at?: string
          version?: number
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          is_template?: boolean
          name?: string
          parent_plan_id?: string | null
          plan_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_parent_plan_id_fkey"
            columns: ["parent_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_splits: {
        Row: {
          created_at: string
          days_per_week: number | null
          description: string | null
          difficulty_level: string | null
          equipment_needed: string[] | null
          goal_tags: string[] | null
          id: string
          is_curated: boolean
          is_ongoing: boolean
          owner_user_id: string | null
          parent_split_id: string | null
          published_version: number | null
          rejection_reason: string | null
          source: string
          status: string
          title: string
          updated_at: string
          use_count: number
          version: number
          view_count: number
          weeks_count: number | null
          workout_type: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number | null
          description?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          goal_tags?: string[] | null
          id?: string
          is_curated?: boolean
          is_ongoing?: boolean
          owner_user_id?: string | null
          parent_split_id?: string | null
          published_version?: number | null
          rejection_reason?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
          use_count?: number
          version?: number
          view_count?: number
          weeks_count?: number | null
          workout_type?: string
        }
        Update: {
          created_at?: string
          days_per_week?: number | null
          description?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          goal_tags?: string[] | null
          id?: string
          is_curated?: boolean
          is_ongoing?: boolean
          owner_user_id?: string | null
          parent_split_id?: string | null
          published_version?: number | null
          rejection_reason?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          use_count?: number
          version?: number
          view_count?: number
          weeks_count?: number | null
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_splits_parent_split_id_fkey"
            columns: ["parent_split_id"]
            isOneToOne: false
            referencedRelation: "training_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_active_split: {
        Row: {
          activated_at: string
          current_week: number
          id: string
          split_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          current_week?: number
          id?: string
          split_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          current_week?: number
          id?: string
          split_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_split_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "training_splits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          notification_id: string | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_id?: string | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_id?: string | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["role_scope"]
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["role_scope"]
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["role_scope"]
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          avg_hr: number | null
          avg_pace_sec_per_km: number | null
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          elevation_gain_m: number | null
          elevation_loss_m: number | null
          ended_at: string | null
          hr_device_id: string | null
          id: string
          is_demo: boolean | null
          max_hr: number | null
          min_hr: number | null
          modality: string
          moving_seconds: number | null
          notes: string | null
          operation_id: string | null
          plan_assignment_id: string | null
          plan_week_number: number | null
          plan_workout_id: string | null
          privacy_level: string
          route_summary: Json | null
          session_type: string | null
          split_id: string | null
          split_week_id: string | null
          split_workout_id: string | null
          started_at: string
          status: string
          synced_at: string | null
          template_id: string | null
          time_in_zones: Json | null
          total_volume: number | null
          user_id: string
          workout_name: string
          workout_template_id: string | null
        }
        Insert: {
          avg_hr?: number | null
          avg_pace_sec_per_km?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          elevation_gain_m?: number | null
          elevation_loss_m?: number | null
          ended_at?: string | null
          hr_device_id?: string | null
          id?: string
          is_demo?: boolean | null
          max_hr?: number | null
          min_hr?: number | null
          modality?: string
          moving_seconds?: number | null
          notes?: string | null
          operation_id?: string | null
          plan_assignment_id?: string | null
          plan_week_number?: number | null
          plan_workout_id?: string | null
          privacy_level?: string
          route_summary?: Json | null
          session_type?: string | null
          split_id?: string | null
          split_week_id?: string | null
          split_workout_id?: string | null
          started_at: string
          status?: string
          synced_at?: string | null
          template_id?: string | null
          time_in_zones?: Json | null
          total_volume?: number | null
          user_id: string
          workout_name: string
          workout_template_id?: string | null
        }
        Update: {
          avg_hr?: number | null
          avg_pace_sec_per_km?: number | null
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          elevation_gain_m?: number | null
          elevation_loss_m?: number | null
          ended_at?: string | null
          hr_device_id?: string | null
          id?: string
          is_demo?: boolean | null
          max_hr?: number | null
          min_hr?: number | null
          modality?: string
          moving_seconds?: number | null
          notes?: string | null
          operation_id?: string | null
          plan_assignment_id?: string | null
          plan_week_number?: number | null
          plan_workout_id?: string | null
          privacy_level?: string
          route_summary?: Json | null
          session_type?: string | null
          split_id?: string | null
          split_week_id?: string | null
          split_workout_id?: string | null
          started_at?: string
          status?: string
          synced_at?: string | null
          template_id?: string | null
          time_in_zones?: Json | null
          total_volume?: number | null
          user_id?: string
          workout_name?: string
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_hr_device_id_fkey"
            columns: ["hr_device_id"]
            isOneToOne: false
            referencedRelation: "hr_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_plan_assignment_id_fkey"
            columns: ["plan_assignment_id"]
            isOneToOne: false
            referencedRelation: "athlete_assigned_plans"
            referencedColumns: ["assignment_id"]
          },
          {
            foreignKeyName: "workout_sessions_plan_assignment_id_fkey"
            columns: ["plan_assignment_id"]
            isOneToOne: false
            referencedRelation: "client_plan_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_plan_workout_id_fkey"
            columns: ["plan_workout_id"]
            isOneToOne: false
            referencedRelation: "plan_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_split_id_fkey"
            columns: ["split_id"]
            isOneToOne: false
            referencedRelation: "training_splits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_split_week_id_fkey"
            columns: ["split_week_id"]
            isOneToOne: false
            referencedRelation: "split_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_split_workout_id_fkey"
            columns: ["split_workout_id"]
            isOneToOne: false
            referencedRelation: "split_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sync_queue: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          operation_id: string
          operation_type: string
          payload: Json
          retry_count: number | null
          status: string
          synced_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation_id: string
          operation_type: string
          payload: Json
          retry_count?: number | null
          status?: string
          synced_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation_id?: string
          operation_type?: string
          payload?: Json
          retry_count?: number | null
          status?: string
          synced_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string
          description: string | null
          difficulty_level: string | null
          equipment_needed: string[] | null
          estimated_duration_minutes: number | null
          exercise_data: Json | null
          id: string
          is_curated: boolean
          owner_user_id: string | null
          parent_template_id: string | null
          published_version: number | null
          rejection_reason: string | null
          source: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          use_count: number
          version: number
          view_count: number
          workout_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          estimated_duration_minutes?: number | null
          exercise_data?: Json | null
          id?: string
          is_curated?: boolean
          owner_user_id?: string | null
          parent_template_id?: string | null
          published_version?: number | null
          rejection_reason?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          use_count?: number
          version?: number
          view_count?: number
          workout_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          estimated_duration_minutes?: number | null
          exercise_data?: Json | null
          id?: string
          is_curated?: boolean
          owner_user_id?: string | null
          parent_template_id?: string | null
          published_version?: number | null
          rejection_reason?: string | null
          source?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          use_count?: number
          version?: number
          view_count?: number
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      athlete_assigned_plans: {
        Row: {
          assigned_at: string | null
          assignment_id: string | null
          client_id: string | null
          coach_avatar: string | null
          coach_name: string | null
          completed_workouts: number | null
          current_week: number | null
          duration_weeks: number | null
          end_date: string | null
          last_workout_at: string | null
          plan_description: string | null
          plan_id: string | null
          plan_name: string | null
          plan_type: string | null
          progress_percentage: number | null
          start_date: string | null
          status: string | null
          total_workouts: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_plan_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles_secure: {
        Row: {
          accent_color: string | null
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_line2: string | null
          address_postcode: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          first_name: string | null
          hr_zone1_max: number | null
          hr_zone2_max: number | null
          hr_zone3_max: number | null
          hr_zone4_max: number | null
          hr_zone5_max: number | null
          hr_zones_mode: string | null
          id: string | null
          instagram_handle: string | null
          last_active_at: string | null
          last_name: string | null
          max_hr: number | null
          phone: string | null
          privacy_analytics: boolean | null
          privacy_insights: boolean | null
          resting_hr: number | null
          status: string | null
          telephone: string | null
          theme_mode: string | null
          tiktok_handle: string | null
          training_goal: string | null
          twitter_handle: string | null
          units: string | null
          updated_at: string | null
          user_id: string | null
          website_url: string | null
          work_address_city: string | null
          work_address_country: string | null
          work_address_line1: string | null
          work_address_line2: string | null
          work_address_postcode: string | null
          work_company: string | null
          youtube_handle: string | null
        }
        Insert: {
          accent_color?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postcode?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          hr_zone1_max?: number | null
          hr_zone2_max?: number | null
          hr_zone3_max?: number | null
          hr_zone4_max?: number | null
          hr_zone5_max?: number | null
          hr_zones_mode?: string | null
          id?: string | null
          instagram_handle?: string | null
          last_active_at?: string | null
          last_name?: string | null
          max_hr?: number | null
          phone?: string | null
          privacy_analytics?: boolean | null
          privacy_insights?: boolean | null
          resting_hr?: number | null
          status?: string | null
          telephone?: string | null
          theme_mode?: string | null
          tiktok_handle?: string | null
          training_goal?: string | null
          twitter_handle?: string | null
          units?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          work_address_city?: string | null
          work_address_country?: string | null
          work_address_line1?: string | null
          work_address_line2?: string | null
          work_address_postcode?: string | null
          work_company?: string | null
          youtube_handle?: string | null
        }
        Update: {
          accent_color?: string | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_postcode?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          hr_zone1_max?: number | null
          hr_zone2_max?: number | null
          hr_zone3_max?: number | null
          hr_zone4_max?: number | null
          hr_zone5_max?: number | null
          hr_zones_mode?: string | null
          id?: string | null
          instagram_handle?: string | null
          last_active_at?: string | null
          last_name?: string | null
          max_hr?: number | null
          phone?: string | null
          privacy_analytics?: boolean | null
          privacy_insights?: boolean | null
          resting_hr?: number | null
          status?: string | null
          telephone?: string | null
          theme_mode?: string | null
          tiktok_handle?: string | null
          training_goal?: string | null
          twitter_handle?: string | null
          units?: string | null
          updated_at?: string | null
          user_id?: string | null
          website_url?: string | null
          work_address_city?: string | null
          work_address_country?: string | null
          work_address_line1?: string | null
          work_address_line2?: string | null
          work_address_postcode?: string | null
          work_company?: string | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_run_club_application: {
        Args: { p_application_id: string }
        Returns: string
      }
      can_manage_gym_offers: {
        Args: { _gym_id: string; _user_id: string }
        Returns: boolean
      }
      can_send_message_email: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_conversation_rpc: {
        Args: {
          p_context_id: string
          p_context_type: string
          p_initial_message?: string
          p_subject?: string
        }
        Returns: string
      }
      create_event_pass: {
        Args: {
          p_event_id: string
          p_registration_id?: string
          p_team_member_id?: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          _action_url?: string
          _body: string
          _entity_id?: string
          _entity_type?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
      generate_membership_number: { Args: { _gym_id: string }; Returns: string }
      generate_pass_token: { Args: never; Returns: string }
      get_athlete_current_workout: {
        Args: { p_user_id: string }
        Returns: {
          assignment_id: string
          coach_name: string
          coach_notes: string
          current_week: number
          day_of_week: number
          exercise_data: Json
          override_data: Json
          plan_name: string
          workout_description: string
          workout_id: string
          workout_name: string
        }[]
      }
      get_coach_id: { Args: { _user_id: string }; Returns: string }
      has_active_gym_membership: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_capability: {
        Args: { _capability_name: string; _scope_id?: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _scope_id?: string
          _scope_type?: Database["public"]["Enums"]["role_scope"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach: { Args: { _user_id: string }; Returns: boolean }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_run_club_member: {
        Args: { _run_club_id: string; _user_id: string }
        Returns: boolean
      }
      is_run_club_organiser: {
        Args: { _run_club_id: string; _user_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _category?: string
          _entity_id?: string
          _entity_type?: string
          _message: string
          _metadata?: Json
          _severity?: string
        }
        Returns: string
      }
      reject_run_club_application: {
        Args: { p_application_id: string; p_reason?: string }
        Returns: undefined
      }
      should_send_notification_email: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_has_crm_access: {
        Args: { p_context_id: string; p_context_type: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "athlete"
        | "gym_manager"
        | "gym_staff"
        | "gym_user"
        | "coach"
        | "coach_client"
        | "event_organiser"
        | "event_member"
        | "run_club_organiser"
        | "run_club_member"
      cardio_modality:
        | "run"
        | "bike"
        | "row"
        | "swim"
        | "elliptical"
        | "stair_climber"
        | "jump_rope"
        | "walking"
        | "hiking"
        | "other"
      equipment_type:
        | "barbell"
        | "dumbbell"
        | "kettlebell"
        | "cable"
        | "machine"
        | "bodyweight"
        | "resistance_band"
        | "suspension"
        | "medicine_ball"
        | "pull_up_bar"
        | "dip_bars"
        | "bench"
        | "box"
        | "cardio_machine"
        | "none"
      exercise_source: "system" | "user"
      exercise_type: "strength" | "cardio"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "forearms"
        | "quadriceps"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "abs"
        | "obliques"
        | "lower_back"
        | "traps"
        | "lats"
        | "hip_flexors"
        | "adductors"
        | "abductors"
        | "full_body"
      offer_event_type:
        | "view"
        | "affiliate_click"
        | "code_copy"
        | "unlock_click"
        | "report_expired"
      offer_scope: "global" | "gym"
      offer_status: "active" | "archived" | "disabled"
      offer_type: "code" | "affiliate" | "both"
      role_scope: "global" | "gym" | "event" | "run_club"
      submission_status: "new" | "contacted" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "athlete",
        "gym_manager",
        "gym_staff",
        "gym_user",
        "coach",
        "coach_client",
        "event_organiser",
        "event_member",
        "run_club_organiser",
        "run_club_member",
      ],
      cardio_modality: [
        "run",
        "bike",
        "row",
        "swim",
        "elliptical",
        "stair_climber",
        "jump_rope",
        "walking",
        "hiking",
        "other",
      ],
      equipment_type: [
        "barbell",
        "dumbbell",
        "kettlebell",
        "cable",
        "machine",
        "bodyweight",
        "resistance_band",
        "suspension",
        "medicine_ball",
        "pull_up_bar",
        "dip_bars",
        "bench",
        "box",
        "cardio_machine",
        "none",
      ],
      exercise_source: ["system", "user"],
      exercise_type: ["strength", "cardio"],
      muscle_group: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "forearms",
        "quadriceps",
        "hamstrings",
        "glutes",
        "calves",
        "abs",
        "obliques",
        "lower_back",
        "traps",
        "lats",
        "hip_flexors",
        "adductors",
        "abductors",
        "full_body",
      ],
      offer_event_type: [
        "view",
        "affiliate_click",
        "code_copy",
        "unlock_click",
        "report_expired",
      ],
      offer_scope: ["global", "gym"],
      offer_status: ["active", "archived", "disabled"],
      offer_type: ["code", "affiliate", "both"],
      role_scope: ["global", "gym", "event", "run_club"],
      submission_status: ["new", "contacted", "approved", "rejected"],
    },
  },
} as const
