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
          created_at: string
          end_date: string | null
          id: string
          plan_id: string
          start_date: string
          status: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id: string
          start_date: string
          status?: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
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
          status?: string
          subject?: string | null
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
      event_registrations: {
        Row: {
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
          contact_email: string | null
          created_at: string
          description: string | null
          end_date: string | null
          event_date: string | null
          event_mode: string | null
          event_type: string | null
          hero_image_url: string | null
          id: string
          image_url: string | null
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
          contact_email?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string | null
          event_mode?: string | null
          event_type?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
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
          contact_email?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          event_date?: string | null
          event_mode?: string | null
          event_type?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          location?: string | null
          organiser_id?: string
          rules?: string | null
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
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
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          status: string
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          status?: string
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
          email_enabled: boolean | null
          event_updates: boolean | null
          gym_updates: boolean | null
          habit_reminders: boolean | null
          id: string
          push_enabled: boolean | null
          updated_at: string
          user_id: string
          workout_reminders: boolean | null
        }
        Insert: {
          announcements?: boolean | null
          coach_messages?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          event_updates?: boolean | null
          gym_updates?: boolean | null
          habit_reminders?: boolean | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string
          user_id: string
          workout_reminders?: boolean | null
        }
        Update: {
          announcements?: boolean | null
          coach_messages?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          event_updates?: boolean | null
          gym_updates?: boolean | null
          habit_reminders?: boolean | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          workout_reminders?: boolean | null
        }
        Relationships: []
      }
      nutrition_entries: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          food_name: string
          id: string
          logged_at: string
          meal_type: string | null
          protein_g: number | null
          source: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name: string
          id?: string
          logged_at?: string
          meal_type?: string | null
          protein_g?: number | null
          source?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          food_name?: string
          id?: string
          logged_at?: string
          meal_type?: string | null
          protein_g?: number | null
          source?: string | null
          user_id?: string
        }
        Relationships: []
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
      progress_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          note?: string | null
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
          rest_duration: number | null
          rpe: number | null
          set_number: number
          target_reps: number | null
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
          rest_duration?: number | null
          rpe?: number | null
          set_number: number
          target_reps?: number | null
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
          rest_duration?: number | null
          rpe?: number | null
          set_number?: number
          target_reps?: number | null
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
      training_plans: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          duration_weeks: number | null
          id: string
          is_active: boolean
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
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          max_hr: number | null
          notes: string | null
          started_at: string
          status: string
          total_volume: number | null
          user_id: string
          workout_name: string
          workout_template_id: string | null
        }
        Insert: {
          avg_hr?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          max_hr?: number | null
          notes?: string | null
          started_at: string
          status?: string
          total_volume?: number | null
          user_id: string
          workout_name: string
          workout_template_id?: string | null
        }
        Update: {
          avg_hr?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          max_hr?: number | null
          notes?: string | null
          started_at?: string
          status?: string
          total_volume?: number | null
          user_id?: string
          workout_name?: string
          workout_template_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_coach_id: { Args: { _user_id: string }; Returns: string }
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
      role_scope: "global" | "gym" | "event"
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
      role_scope: ["global", "gym", "event"],
    },
  },
} as const
