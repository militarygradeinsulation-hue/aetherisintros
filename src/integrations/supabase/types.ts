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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ask_responses: {
        Row: {
          ask_id: string
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          ask_id: string
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          ask_id?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      asks: {
        Row: {
          ask: string
          author_id: string | null
          created_at: string
          detail: string
          id: string
          industry: string
          location: string
          member_id: string | null
          offer: string
          posted: string
          response_count: number
          urgency: string
          visibility: string
          why_now: string
        }
        Insert: {
          ask: string
          author_id?: string | null
          created_at?: string
          detail?: string
          id: string
          industry?: string
          location?: string
          member_id?: string | null
          offer?: string
          posted?: string
          response_count?: number
          urgency?: string
          visibility?: string
          why_now?: string
        }
        Update: {
          ask?: string
          author_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          industry?: string
          location?: string
          member_id?: string | null
          offer?: string
          posted?: string
          response_count?: number
          urgency?: string
          visibility?: string
          why_now?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          about: string
          id: string
          industry: string
          location: string
          member_ids: string[]
          name: string
        }
        Insert: {
          about?: string
          id: string
          industry?: string
          location?: string
          member_ids?: string[]
          name: string
        }
        Update: {
          about?: string
          id?: string
          industry?: string
          location?: string
          member_ids?: string[]
          name?: string
        }
        Relationships: []
      }
      intro_requests: {
        Row: {
          created_at: string
          id: string
          member_id: string
          member_opt_in: boolean
          mutual_value: string
          reason: string
          requester_opt_in: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          member_opt_in?: boolean
          mutual_value?: string
          reason?: string
          requester_opt_in?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          member_opt_in?: boolean
          mutual_value?: string
          reason?: string
          requester_opt_in?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          availability: string
          best_path: string[]
          bio: string
          company: string
          confidence: number
          created_at: string
          dont_do: string
          expertise: string[]
          focus: string
          id: string
          industry: string
          initials: string
          intro_state: string
          joined: string
          last_interaction_days: number
          location: string
          mutuals: string[]
          name: string
          needs: string[]
          next_action: string
          offers: string[]
          opportunity_high: number | null
          opportunity_low: number | null
          radar: string
          relationship_status: string
          role: string
          score: Json
          score_total: number
          tags: string[]
          thesis: string
          title: string
          why_now: string
          why_them: string
          why_you: string
        }
        Insert: {
          availability?: string
          best_path?: string[]
          bio?: string
          company: string
          confidence?: number
          created_at?: string
          dont_do?: string
          expertise?: string[]
          focus?: string
          id: string
          industry: string
          initials: string
          intro_state?: string
          joined?: string
          last_interaction_days?: number
          location: string
          mutuals?: string[]
          name: string
          needs?: string[]
          next_action?: string
          offers?: string[]
          opportunity_high?: number | null
          opportunity_low?: number | null
          radar?: string
          relationship_status?: string
          role: string
          score?: Json
          score_total?: number
          tags?: string[]
          thesis?: string
          title: string
          why_now?: string
          why_them?: string
          why_you?: string
        }
        Update: {
          availability?: string
          best_path?: string[]
          bio?: string
          company?: string
          confidence?: number
          created_at?: string
          dont_do?: string
          expertise?: string[]
          focus?: string
          id?: string
          industry?: string
          initials?: string
          intro_state?: string
          joined?: string
          last_interaction_days?: number
          location?: string
          mutuals?: string[]
          name?: string
          needs?: string[]
          next_action?: string
          offers?: string[]
          opportunity_high?: number | null
          opportunity_low?: number | null
          radar?: string
          relationship_status?: string
          role?: string
          score?: Json
          score_total?: number
          tags?: string[]
          thesis?: string
          title?: string
          why_now?: string
          why_them?: string
          why_you?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          category: string
          confidence: number
          created_at: string
          id: string
          kind: string
          member_id: string | null
          scope: Database["public"]["Enums"]["privacy_scope_v2"]
          source: string
          text: string
          user_id: string
          when_label: string
        }
        Insert: {
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          kind?: string
          member_id?: string | null
          scope?: Database["public"]["Enums"]["privacy_scope_v2"]
          source?: string
          text: string
          user_id: string
          when_label?: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          kind?: string
          member_id?: string | null
          scope?: Database["public"]["Enums"]["privacy_scope_v2"]
          source?: string
          text?: string
          user_id?: string
          when_label?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          at_label: string
          created_at: string
          id: string
          sender: string
          text: string
          thread_id: string
          user_id: string
        }
        Insert: {
          at_label?: string
          created_at?: string
          id?: string
          sender?: string
          text: string
          thread_id: string
          user_id: string
        }
        Update: {
          at_label?: string
          created_at?: string
          id?: string
          sender?: string
          text?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          created_at: string
          detail: string
          id: string
          kind: string
          member_id: string | null
          response_count: number
          text: string
          when_label: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          detail?: string
          id: string
          kind?: string
          member_id?: string | null
          response_count?: number
          text: string
          when_label?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          member_id?: string | null
          response_count?: number
          text?: string
          when_label?: string
        }
        Relationships: []
      }
      preferences: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: string
          bio: string
          boundaries: string
          can_help_with: string
          company: string
          created_at: string
          email: string | null
          expertise: string[]
          focus: string
          id: string
          industries: string[]
          initials: string
          intro_preferences: string
          location: string
          looking_for: string
          name: string
          onboarded: boolean
          portrait_key: string | null
          thesis: string
          title: string
          updated_at: string
          values_text: string
          want_to_meet: string
        }
        Insert: {
          availability?: string
          bio?: string
          boundaries?: string
          can_help_with?: string
          company?: string
          created_at?: string
          email?: string | null
          expertise?: string[]
          focus?: string
          id: string
          industries?: string[]
          initials?: string
          intro_preferences?: string
          location?: string
          looking_for?: string
          name?: string
          onboarded?: boolean
          portrait_key?: string | null
          thesis?: string
          title?: string
          updated_at?: string
          values_text?: string
          want_to_meet?: string
        }
        Update: {
          availability?: string
          bio?: string
          boundaries?: string
          can_help_with?: string
          company?: string
          created_at?: string
          email?: string | null
          expertise?: string[]
          focus?: string
          id?: string
          industries?: string[]
          initials?: string
          intro_preferences?: string
          location?: string
          looking_for?: string
          name?: string
          onboarded?: boolean
          portrait_key?: string | null
          thesis?: string
          title?: string
          updated_at?: string
          values_text?: string
          want_to_meet?: string
        }
        Relationships: []
      }
      relationships: {
        Row: {
          created_at: string
          id: string
          kind: string
          member_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          member_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          member_id?: string
          user_id?: string
        }
        Relationships: []
      }
      seed_learnings: {
        Row: {
          category: string
          confidence: number
          id: string
          scope: Database["public"]["Enums"]["privacy_scope_v2"]
          source: string
          text: string
          when_label: string
        }
        Insert: {
          category: string
          confidence?: number
          id: string
          scope?: Database["public"]["Enums"]["privacy_scope_v2"]
          source?: string
          text: string
          when_label?: string
        }
        Update: {
          category?: string
          confidence?: number
          id?: string
          scope?: Database["public"]["Enums"]["privacy_scope_v2"]
          source?: string
          text?: string
          when_label?: string
        }
        Relationships: []
      }
      seed_threads: {
        Row: {
          commitment: string
          id: string
          intro_context: string
          member_id: string
          messages: Json
          suggested: string
          unread: boolean
        }
        Insert: {
          commitment?: string
          id: string
          intro_context?: string
          member_id: string
          messages?: Json
          suggested?: string
          unread?: boolean
        }
        Update: {
          commitment?: string
          id?: string
          intro_context?: string
          member_id?: string
          messages?: Json
          suggested?: string
          unread?: boolean
        }
        Relationships: []
      }
      signals: {
        Row: {
          id: string
          kind: string
          member_id: string
          text: string
          when_label: string
        }
        Insert: {
          id: string
          kind: string
          member_id: string
          text: string
          when_label?: string
        }
        Update: {
          id?: string
          kind?: string
          member_id?: string
          text?: string
          when_label?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          commitment: string
          created_at: string
          id: string
          intro_context: string
          member_id: string
          suggested: string
          user_id: string
        }
        Insert: {
          commitment?: string
          created_at?: string
          id: string
          intro_context?: string
          member_id: string
          suggested?: string
          user_id: string
        }
        Update: {
          commitment?: string
          created_at?: string
          id?: string
          intro_context?: string
          member_id?: string
          suggested?: string
          user_id?: string
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
      privacy_scope_v2:
        | "private"
        | "team"
        | "organization"
        | "shareable"
        | "public"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      privacy_scope_v2: [
        "private",
        "team",
        "organization",
        "shareable",
        "public",
      ],
    },
  },
} as const
