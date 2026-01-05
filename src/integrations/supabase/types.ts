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
      [_ in never]: never
    }
    Enums: {
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
    },
  },
} as const
