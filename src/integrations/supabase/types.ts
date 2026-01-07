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
      coaches: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          hourly_rate: number | null
          id: string
          is_online: boolean | null
          location: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          hourly_rate?: number | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          hourly_rate?: number | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_divisions: {
        Row: {
          created_at: string
          event_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          name?: string
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
      event_workouts: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          released_at: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          released_at?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          released_at?: string | null
          title?: string
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
          created_at: string
          description: string | null
          event_date: string | null
          id: string
          image_url: string | null
          location: string | null
          organiser_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          organiser_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          organiser_id?: string
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
      gym_staff: {
        Row: {
          created_at: string
          gym_id: string
          hire_date: string | null
          id: string
          is_active: boolean
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean
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
          created_at: string
          id: string
          membership_id: string
          note_text: string
          tag: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          membership_id: string
          note_text: string
          tag?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
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
          payment_status: string | null
          start_date: string | null
          status: string
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
          payment_status?: string | null
          start_date?: string | null
          status?: string
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
          payment_status?: string | null
          start_date?: string | null
          status?: string
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
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          max_hr: number | null
          resting_hr: number | null
          theme_mode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          max_hr?: number | null
          resting_hr?: number | null
          theme_mode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          max_hr?: number | null
          resting_hr?: number | null
          theme_mode?: string | null
          updated_at?: string
          user_id?: string
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
      staff_rotas: {
        Row: {
          created_at: string
          end_time: string
          gym_id: string
          id: string
          notes: string | null
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
            foreignKeyName: "staff_rotas_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "gym_staff"
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
      generate_membership_number: { Args: { _gym_id: string }; Returns: string }
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
