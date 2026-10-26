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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      account_deletions: {
        Row: {
          deleted_at: string
          id: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      account_security_events: {
        Row: {
          actor_id: string | null
          created_at: string
          device_hint: string
          event: string
          id: string
          ip_hint: string
          summary: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          device_hint?: string
          event: string
          id?: string
          ip_hint?: string
          summary?: string
          user_id?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          device_hint?: string
          event?: string
          id?: string
          ip_hint?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          action: string
          created_at: string
          detail: string
          id: string
          key_id: string | null
          result: string
          target: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string
          id?: string
          key_id?: string | null
          result: string
          target?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string
          id?: string
          key_id?: string | null
          result?: string
          target?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "agent_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_blocked_domains: {
        Row: {
          created_at: string
          domain: string
          user_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          user_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_inbound_hashes: {
        Row: {
          created_at: string
          text_hash: string
        }
        Insert: {
          created_at?: string
          text_hash: string
        }
        Update: {
          created_at?: string
          text_hash?: string
        }
        Relationships: []
      }
      agent_inbound_requests: {
        Row: {
          created_at: string
          crm_person_id: string | null
          decided_at: string | null
          id: string
          links: string[]
          member_id: string
          offer: string
          on_behalf_of: string
          reason: string
          reasons: string[]
          requester_company: string
          requester_domain: string
          requester_email: string
          requester_member: string | null
          requester_name: string
          score: number
          status: string
          text_hash: string
        }
        Insert: {
          created_at?: string
          crm_person_id?: string | null
          decided_at?: string | null
          id?: string
          links?: string[]
          member_id: string
          offer?: string
          on_behalf_of?: string
          reason: string
          reasons?: string[]
          requester_company?: string
          requester_domain: string
          requester_email: string
          requester_member?: string | null
          requester_name: string
          score?: number
          status: string
          text_hash: string
        }
        Update: {
          created_at?: string
          crm_person_id?: string | null
          decided_at?: string | null
          id?: string
          links?: string[]
          member_id?: string
          offer?: string
          on_behalf_of?: string
          reason?: string
          reasons?: string[]
          requester_company?: string
          requester_domain?: string
          requester_email?: string
          requester_member?: string | null
          requester_name?: string
          score?: number
          status?: string
          text_hash?: string
        }
        Relationships: []
      }
      agent_keys: {
        Row: {
          created_at: string
          id: string
          intros_per_day: number
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_per_hour: number
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intros_per_day?: number
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_per_hour?: number
          revoked_at?: string | null
          scopes: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intros_per_day?: number
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_per_hour?: number
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      agent_policies: {
        Row: {
          daily_cap: number
          handle: string | null
          min_context: number
          mode: string
          refuse_topics: string[]
          updated_at: string
          user_id: string
          welcome_topics: string[]
        }
        Insert: {
          daily_cap?: number
          handle?: string | null
          min_context?: number
          mode?: string
          refuse_topics?: string[]
          updated_at?: string
          user_id: string
          welcome_topics?: string[]
        }
        Update: {
          daily_cap?: number
          handle?: string | null
          min_context?: number
          mode?: string
          refuse_topics?: string[]
          updated_at?: string
          user_id?: string
          welcome_topics?: string[]
        }
        Relationships: []
      }
      agent_rate_counters: {
        Row: {
          bucket: string
          hits: number
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          window_start?: string
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          created_at: string
          id: string
          message: string
          source: string
          stack: string
          url: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          source: string
          stack?: string
          url?: string
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          source?: string
          stack?: string
          url?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      approval_queue: {
        Row: {
          acted_at: string | null
          action_type: string
          created_at: string
          id: string
          payload: Json
          proposal_id: string | null
          run_id: string | null
          source: string
          status: string
          summary: string
          user_id: string
        }
        Insert: {
          acted_at?: string | null
          action_type: string
          created_at?: string
          id?: string
          payload?: Json
          proposal_id?: string | null
          run_id?: string | null
          source?: string
          status?: string
          summary: string
          user_id?: string
        }
        Update: {
          acted_at?: string | null
          action_type?: string
          created_at?: string
          id?: string
          payload?: Json
          proposal_id?: string | null
          run_id?: string | null
          source?: string
          status?: string
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
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
          category: string
          company: string
          created_at: string
          detail: string
          expires_at: string | null
          id: string
          industry: string
          is_demo: boolean
          location: string
          member_id: string | null
          mission_id: string | null
          offer: string
          posted: string
          response_count: number
          reveal_identity: boolean
          status: string
          urgency: string
          visibility: string
          why_now: string
        }
        Insert: {
          ask: string
          author_id?: string | null
          category?: string
          company?: string
          created_at?: string
          detail?: string
          expires_at?: string | null
          id: string
          industry?: string
          is_demo?: boolean
          location?: string
          member_id?: string | null
          mission_id?: string | null
          offer?: string
          posted?: string
          response_count?: number
          reveal_identity?: boolean
          status?: string
          urgency?: string
          visibility?: string
          why_now?: string
        }
        Update: {
          ask?: string
          author_id?: string | null
          category?: string
          company?: string
          created_at?: string
          detail?: string
          expires_at?: string | null
          id?: string
          industry?: string
          is_demo?: boolean
          location?: string
          member_id?: string | null
          mission_id?: string | null
          offer?: string
          posted?: string
          response_count?: number
          reveal_identity?: boolean
          status?: string
          urgency?: string
          visibility?: string
          why_now?: string
        }
        Relationships: []
      }
      business_diagnostics: {
        Row: {
          completed_at: string | null
          created_at: string
          diagnostic_type: string
          findings: Json | null
          id: string
          member_id: string
          raw_data: Json | null
          recommendations: Json | null
          score: number | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          diagnostic_type: string
          findings?: Json | null
          id?: string
          member_id: string
          raw_data?: Json | null
          recommendations?: Json | null
          score?: number | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          diagnostic_type?: string
          findings?: Json | null
          id?: string
          member_id?: string
          raw_data?: Json | null
          recommendations?: Json | null
          score?: number | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_diagnostics_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_lobby_knocks: {
        Row: {
          created_at: string
          decided_at: string | null
          expires_at: string
          id: string
          intro_request_id: string
          meeting_id: string | null
          note: string
          recipient_id: string
          requester_id: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          intro_request_id: string
          meeting_id?: string | null
          note?: string
          recipient_id: string
          requester_id: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          expires_at?: string
          id?: string
          intro_request_id?: string
          meeting_id?: string | null
          note?: string
          recipient_id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_lobby_knocks_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_lobby_knocks_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      business_lobby_windows: {
        Row: {
          available_until: string
          headline: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_until: string
          headline?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_until?: string
          headline?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_tool_drafts: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          output: string
          title: string
          tool_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          inputs?: Json
          output?: string
          title: string
          tool_id: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          output?: string
          title?: string
          tool_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_tool_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          ends_at: string
          id: string
          kind: string
          location: string
          meeting_id: string | null
          member_id: string | null
          notes: string
          starts_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          ends_at: string
          id?: string
          kind?: string
          location?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string
          starts_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          kind?: string
          location?: string
          meeting_id?: string | null
          member_id?: string | null
          notes?: string
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_dismissals: {
        Row: {
          capability_id: string
          created_at: string
          id: string
          owner_id: string
          subject_id: string
          subject_type: string
          until: string | null
        }
        Insert: {
          capability_id: string
          created_at?: string
          id?: string
          owner_id?: string
          subject_id: string
          subject_type: string
          until?: string | null
        }
        Update: {
          capability_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          subject_id?: string
          subject_type?: string
          until?: string | null
        }
        Relationships: []
      }
      capability_findings: {
        Row: {
          actual_outcome: Json | null
          baseline_metric: Json | null
          capability_id: string
          cause_chain: Json
          claim: string
          confidence: number
          created_at: string
          currency: string | null
          evidence: Json
          financial_classification: string | null
          financial_high: number | null
          financial_low: number | null
          id: string
          kind: string
          layer: string
          overlap_group: string | null
          overlap_ids: string[]
          owner_id: string
          provider: string
          recovered_value: number | null
          resolved_at: string | null
          resolved_note: string
          root_cause: string
          run_id: string
          severity: string
          status: string
          subject_id: string
          subject_type: string
          target_metric: Json | null
          unknowns: Json
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          actual_outcome?: Json | null
          baseline_metric?: Json | null
          capability_id: string
          cause_chain?: Json
          claim: string
          confidence?: number
          created_at?: string
          currency?: string | null
          evidence?: Json
          financial_classification?: string | null
          financial_high?: number | null
          financial_low?: number | null
          id?: string
          kind: string
          layer?: string
          overlap_group?: string | null
          overlap_ids?: string[]
          owner_id: string
          provider?: string
          recovered_value?: number | null
          resolved_at?: string | null
          resolved_note?: string
          root_cause?: string
          run_id: string
          severity?: string
          status?: string
          subject_id: string
          subject_type: string
          target_metric?: Json | null
          unknowns?: Json
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          actual_outcome?: Json | null
          baseline_metric?: Json | null
          capability_id?: string
          cause_chain?: Json
          claim?: string
          confidence?: number
          created_at?: string
          currency?: string | null
          evidence?: Json
          financial_classification?: string | null
          financial_high?: number | null
          financial_low?: number | null
          id?: string
          kind?: string
          layer?: string
          overlap_group?: string | null
          overlap_ids?: string[]
          owner_id?: string
          provider?: string
          recovered_value?: number | null
          resolved_at?: string | null
          resolved_note?: string
          root_cause?: string
          run_id?: string
          severity?: string
          status?: string
          subject_id?: string
          subject_type?: string
          target_metric?: Json | null
          unknowns?: Json
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capability_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "capability_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_limits: {
        Row: {
          heavy_daily: number
          id: number
          light_daily: number
          medium_daily: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          heavy_daily?: number
          id?: number
          light_daily?: number
          medium_daily?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          heavy_daily?: number
          id?: number
          light_daily?: number
          medium_daily?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      capability_proposals: {
        Row: {
          action: Json
          approval_id: string | null
          created_at: string
          created_by: string
          created_by_kind: string
          decided_at: string | null
          finding_id: string | null
          id: string
          impact: string
          owner_id: string
          run_id: string
          status: string
          summary: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action?: Json
          approval_id?: string | null
          created_at?: string
          created_by: string
          created_by_kind: string
          decided_at?: string | null
          finding_id?: string | null
          id?: string
          impact: string
          owner_id: string
          run_id: string
          status?: string
          summary: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: Json
          approval_id?: string | null
          created_at?: string
          created_by?: string
          created_by_kind?: string
          decided_at?: string | null
          finding_id?: string | null
          id?: string
          impact?: string
          owner_id?: string
          run_id?: string
          status?: string
          summary?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_proposals_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "capability_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "capability_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_runs: {
        Row: {
          actor_id: string
          actor_kind: string
          capability_id: string
          cost_tier: string
          created_at: string
          engine: string | null
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          granted_scopes: string[]
          id: string
          input: Json
          input_hash: string
          owner_id: string
          progress: number
          result: Json | null
          started_at: string | null
          status: string
          step_label: string
          subject_id: string
          subject_type: string
          updated_at: string
          verb: string
          web_domains: string[]
        }
        Insert: {
          actor_id: string
          actor_kind?: string
          capability_id: string
          cost_tier?: string
          created_at?: string
          engine?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          granted_scopes?: string[]
          id?: string
          input?: Json
          input_hash?: string
          owner_id: string
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          step_label?: string
          subject_id: string
          subject_type: string
          updated_at?: string
          verb: string
          web_domains?: string[]
        }
        Update: {
          actor_id?: string
          actor_kind?: string
          capability_id?: string
          cost_tier?: string
          created_at?: string
          engine?: string | null
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          granted_scopes?: string[]
          id?: string
          input?: Json
          input_hash?: string
          owner_id?: string
          progress?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          step_label?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string
          verb?: string
          web_domains?: string[]
        }
        Relationships: []
      }
      capability_usage: {
        Row: {
          created_at: string
          detail: Json
          id: string
          owner_id: string
          provider: string
          run_id: string | null
          tier: string
          units: number
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          owner_id: string
          provider?: string
          run_id?: string | null
          tier: string
          units?: number
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          owner_id?: string
          provider?: string
          run_id?: string | null
          tier?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "capability_usage_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "capability_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ceo_relationship_marks: {
        Row: {
          cadence_days: number | null
          company_id: string | null
          created_at: string
          id: string
          kind: string
          label: string
          mission_id: string | null
          next_action: string
          next_touch: string | null
          notes: string
          outcome: string
          subject_id: string
          updated_at: string
          user_id: string
          value_give: string
          value_need: string
        }
        Insert: {
          cadence_days?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          kind: string
          label?: string
          mission_id?: string | null
          next_action?: string
          next_touch?: string | null
          notes?: string
          outcome?: string
          subject_id: string
          updated_at?: string
          user_id?: string
          value_give?: string
          value_need?: string
        }
        Update: {
          cadence_days?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          label?: string
          mission_id?: string | null
          next_action?: string
          next_touch?: string | null
          notes?: string
          outcome?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
          value_give?: string
          value_need?: string
        }
        Relationships: []
      }
      circle_memberships: {
        Row: {
          circle_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          circle_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          about: string
          id: string
          industry: string
          is_demo: boolean
          location: string
          member_ids: string[]
          name: string
        }
        Insert: {
          about?: string
          id: string
          industry?: string
          is_demo?: boolean
          location?: string
          member_ids?: string[]
          name: string
        }
        Update: {
          about?: string
          id?: string
          industry?: string
          is_demo?: boolean
          location?: string
          member_ids?: string[]
          name?: string
        }
        Relationships: []
      }
      concierge_suggestions: {
        Row: {
          ask_id: string | null
          created_at: string
          created_by: string | null
          for_user_id: string
          id: string
          note: string
          suggested_user_id: string
        }
        Insert: {
          ask_id?: string | null
          created_at?: string
          created_by?: string | null
          for_user_id: string
          id?: string
          note: string
          suggested_user_id: string
        }
        Update: {
          ask_id?: string | null
          created_at?: string
          created_by?: string | null
          for_user_id?: string
          id?: string
          note?: string
          suggested_user_id?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          account_id: string | null
          calendar_event_id: string | null
          company_id: string | null
          created_at: string
          detail: string
          id: string
          intro_request_id: string | null
          kind: string
          occurred_at: string
          opportunity_id: string | null
          owner_id: string
          person_id: string | null
          subject: string
          thread_id: string | null
        }
        Insert: {
          account_id?: string | null
          calendar_event_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          intro_request_id?: string | null
          kind?: string
          occurred_at?: string
          opportunity_id?: string | null
          owner_id?: string
          person_id?: string | null
          subject: string
          thread_id?: string | null
        }
        Update: {
          account_id?: string | null
          calendar_event_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          intro_request_id?: string | null
          kind?: string
          occurred_at?: string
          opportunity_id?: string | null
          owner_id?: string
          person_id?: string | null
          subject?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          account_id: string | null
          archived: boolean
          created_at: string
          custom: Json
          directory_company_id: string | null
          domain: string
          employees: string
          id: string
          industry: string
          location: string
          name: string
          network_company_id: string | null
          notes: string
          owner_id: string
          phone: string
          revenue_band: string
          updated_at: string
          website: string
        }
        Insert: {
          account_id?: string | null
          archived?: boolean
          created_at?: string
          custom?: Json
          directory_company_id?: string | null
          domain?: string
          employees?: string
          id?: string
          industry?: string
          location?: string
          name: string
          network_company_id?: string | null
          notes?: string
          owner_id?: string
          phone?: string
          revenue_band?: string
          updated_at?: string
          website?: string
        }
        Update: {
          account_id?: string | null
          archived?: boolean
          created_at?: string
          custom?: Json
          directory_company_id?: string | null
          domain?: string
          employees?: string
          id?: string
          industry?: string
          location?: string
          name?: string
          network_company_id?: string | null
          notes?: string
          owner_id?: string
          phone?: string
          revenue_band?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      crm_custom_field_values: {
        Row: {
          entity_id: string
          entity_type: string
          field_id: string
          id: string
          owner_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          entity_id: string
          entity_type: string
          field_id: string
          id?: string
          owner_id?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          entity_id?: string
          entity_type?: string
          field_id?: string
          id?: string
          owner_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_fields: {
        Row: {
          created_at: string
          entity_type: string
          id: string
          key: string
          label: string
          options: string[]
          owner_id: string
          position: number
          type: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          id?: string
          key: string
          label: string
          options?: string[]
          owner_id?: string
          position?: number
          type?: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          id?: string
          key?: string
          label?: string
          options?: string[]
          owner_id?: string
          position?: number
          type?: string
        }
        Relationships: []
      }
      crm_entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          owner_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          owner_id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          owner_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          account_id: string | null
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_opportunities: {
        Row: {
          account_id: string | null
          amount: number
          archived: boolean
          company_id: string | null
          created_at: string
          currency: string
          custom: Json
          detail: string
          expected_close: string | null
          id: string
          name: string
          next_action: string
          owner_id: string
          person_id: string | null
          pipeline_id: string | null
          probability: number
          source: string
          stage_id: string | null
          stage_name: string
          status: string
          updated_at: string
          value_state: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          archived?: boolean
          company_id?: string | null
          created_at?: string
          currency?: string
          custom?: Json
          detail?: string
          expected_close?: string | null
          id?: string
          name: string
          next_action?: string
          owner_id?: string
          person_id?: string | null
          pipeline_id?: string | null
          probability?: number
          source?: string
          stage_id?: string | null
          stage_name?: string
          status?: string
          updated_at?: string
          value_state?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          archived?: boolean
          company_id?: string | null
          created_at?: string
          currency?: string
          custom?: Json
          detail?: string
          expected_close?: string | null
          id?: string
          name?: string
          next_action?: string
          owner_id?: string
          person_id?: string | null
          pipeline_id?: string | null
          probability?: number
          source?: string
          stage_id?: string | null
          stage_name?: string
          status?: string
          updated_at?: string
          value_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_people: {
        Row: {
          account_id: string | null
          archived: boolean
          company_id: string | null
          company_name: string
          created_at: string
          custom: Json
          directory_contact_id: string | null
          email: string
          full_name: string
          id: string
          last_activity_at: string | null
          lifecycle: string
          linkedin_url: string
          location: string
          member_id: string | null
          notes: string
          owner_id: string
          phone: string
          profile_id: string | null
          source: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          archived?: boolean
          company_id?: string | null
          company_name?: string
          created_at?: string
          custom?: Json
          directory_contact_id?: string | null
          email?: string
          full_name: string
          id?: string
          last_activity_at?: string | null
          lifecycle?: string
          linkedin_url?: string
          location?: string
          member_id?: string | null
          notes?: string
          owner_id?: string
          phone?: string
          profile_id?: string | null
          source?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          archived?: boolean
          company_id?: string | null
          company_name?: string
          created_at?: string
          custom?: Json
          directory_contact_id?: string | null
          email?: string
          full_name?: string
          id?: string
          last_activity_at?: string | null
          lifecycle?: string
          linkedin_url?: string
          location?: string
          member_id?: string | null
          notes?: string
          owner_id?: string
          phone?: string
          profile_id?: string | null
          source?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_people_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          owner_id: string
          pipeline_id: string
          position: number
          probability: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          owner_id?: string
          pipeline_id: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          owner_id?: string
          pipeline_id?: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          account_id: string | null
          archived: boolean
          created_at: string
          id: string
          is_default: boolean
          name: string
          owner_id: string
          position: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          archived?: boolean
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      crm_tasks: {
        Row: {
          account_id: string | null
          assignee: string
          calendar_event_id: string | null
          company_id: string | null
          created_at: string
          detail: string
          due_at: string | null
          id: string
          kind: string
          opportunity_id: string | null
          owed_to: string
          owner_id: string
          person_id: string | null
          priority: string
          status: string
          thread_id: string | null
          title: string
          updated_at: string
          waiting_on: string
        }
        Insert: {
          account_id?: string | null
          assignee?: string
          calendar_event_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: string
          due_at?: string | null
          id?: string
          kind?: string
          opportunity_id?: string | null
          owed_to?: string
          owner_id?: string
          person_id?: string | null
          priority?: string
          status?: string
          thread_id?: string | null
          title: string
          updated_at?: string
          waiting_on?: string
        }
        Update: {
          account_id?: string | null
          assignee?: string
          calendar_event_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: string
          due_at?: string | null
          id?: string
          kind?: string
          opportunity_id?: string | null
          owed_to?: string
          owner_id?: string
          person_id?: string | null
          priority?: string
          status?: string
          thread_id?: string | null
          title?: string
          updated_at?: string
          waiting_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_documents: {
        Row: {
          created_at: string
          deal_room_id: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          uploaded_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          deal_room_id: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          uploaded_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          deal_room_id?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_documents_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_members: {
        Row: {
          created_at: string
          deal_room_id: string
          id: string
          invited_by: string | null
          member_id: string
          role: string
        }
        Insert: {
          created_at?: string
          deal_room_id: string
          id?: string
          invited_by?: string | null
          member_id: string
          role?: string
        }
        Update: {
          created_at?: string
          deal_room_id?: string
          id?: string
          invited_by?: string | null
          member_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_members_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_messages: {
        Row: {
          content: string
          created_at: string
          deal_room_id: string
          id: string
          message_type: string
          sender_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          deal_room_id: string
          id?: string
          message_type?: string
          sender_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          deal_room_id?: string
          id?: string
          message_type?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_messages_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_room_milestones: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          deal_room_id: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deal_room_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          deal_room_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_room_milestones_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_room_milestones_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_rooms: {
        Row: {
          created_at: string
          deal_type: string | null
          description: string | null
          estimated_value: number | null
          id: string
          owner_id: string
          status: string
          target_close_date: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          deal_type?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          owner_id: string
          status?: string
          target_close_date?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          deal_type?: string | null
          description?: string | null
          estimated_value?: number | null
          id?: string
          owner_id?: string
          status?: string
          target_close_date?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_rooms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_workspace_files: {
        Row: {
          created_at: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          uploaded_by: string | null
          url: string
          version: number | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          uploaded_by?: string | null
          url: string
          version?: number | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          uploaded_by?: string | null
          url?: string
          version?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_workspace_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_workspace_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "deal_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_workspace_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          role: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          role?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_workspace_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "deal_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_workspace_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_workspace_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_workspace_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_workspace_tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "deal_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_workspaces: {
        Row: {
          created_at: string
          deal_room_id: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          status: string
          updated_at: string
          workspace_type: string
        }
        Insert: {
          created_at?: string
          deal_room_id?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          status?: string
          updated_at?: string
          workspace_type?: string
        }
        Update: {
          created_at?: string
          deal_room_id?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
          workspace_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_workspaces_deal_room_id_fkey"
            columns: ["deal_room_id"]
            isOneToOne: false
            referencedRelation: "deal_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          actual_outcome: string
          assumption_review: string
          assumptions: string
          chosen_option: string
          confidence: number | null
          context: string
          created_at: string
          decided_at: string | null
          expected_outcome: string
          id: string
          linked_company_ids: string[]
          linked_event_ids: string[]
          linked_opportunity_ids: string[]
          linked_person_ids: string[]
          options: Json
          prediction: string
          rationale: string
          review_date: string | null
          risks: string
          same_again: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_outcome?: string
          assumption_review?: string
          assumptions?: string
          chosen_option?: string
          confidence?: number | null
          context?: string
          created_at?: string
          decided_at?: string | null
          expected_outcome?: string
          id?: string
          linked_company_ids?: string[]
          linked_event_ids?: string[]
          linked_opportunity_ids?: string[]
          linked_person_ids?: string[]
          options?: Json
          prediction?: string
          rationale?: string
          review_date?: string | null
          risks?: string
          same_again?: string
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          actual_outcome?: string
          assumption_review?: string
          assumptions?: string
          chosen_option?: string
          confidence?: number | null
          context?: string
          created_at?: string
          decided_at?: string | null
          expected_outcome?: string
          id?: string
          linked_company_ids?: string[]
          linked_event_ids?: string[]
          linked_opportunity_ids?: string[]
          linked_person_ids?: string[]
          options?: Json
          prediction?: string
          rationale?: string
          review_date?: string | null
          risks?: string
          same_again?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delegate_capability_grants: {
        Row: {
          access: string
          capability_id: string
          created_at: string
          delegate_id: string
          id: string
          principal_id: string
          subject_id: string | null
          subject_type: string | null
        }
        Insert: {
          access: string
          capability_id: string
          created_at?: string
          delegate_id: string
          id?: string
          principal_id?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Update: {
          access?: string
          capability_id?: string
          created_at?: string
          delegate_id?: string
          id?: string
          principal_id?: string
          subject_id?: string | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delegate_capability_grants_delegate_id_fkey"
            columns: ["delegate_id"]
            isOneToOne: false
            referencedRelation: "delegates"
            referencedColumns: ["id"]
          },
        ]
      }
      delegate_message_drafts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          principal_id: string
          recipient_label: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          id?: string
          principal_id: string
          recipient_label?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          principal_id?: string
          recipient_label?: string
        }
        Relationships: []
      }
      delegates: {
        Row: {
          created_at: string
          delegate_email: string
          delegate_user_id: string | null
          id: string
          permissions: string[]
          principal_id: string
          role_label: string
          status: string
        }
        Insert: {
          created_at?: string
          delegate_email: string
          delegate_user_id?: string | null
          id?: string
          permissions?: string[]
          principal_id?: string
          role_label?: string
          status?: string
        }
        Update: {
          created_at?: string
          delegate_email?: string
          delegate_user_id?: string | null
          id?: string
          permissions?: string[]
          principal_id?: string
          role_label?: string
          status?: string
        }
        Relationships: []
      }
      digital_you_rules: {
        Row: {
          action: string
          created_at: string
          enabled: boolean
          id: string
          owner_id: string
          params: Json
          rule_kind: string
        }
        Insert: {
          action?: string
          created_at?: string
          enabled?: boolean
          id?: string
          owner_id?: string
          params?: Json
          rule_kind: string
        }
        Update: {
          action?: string
          created_at?: string
          enabled?: boolean
          id?: string
          owner_id?: string
          params?: Json
          rule_kind?: string
        }
        Relationships: []
      }
      directory_companies: {
        Row: {
          city: string
          country: string
          created_at: string
          employees: string
          id: string
          industry: string
          name: string
          phone: string
          region: string
          revenue: string
          source: string
          updated_at: string
          website: string
        }
        Insert: {
          city?: string
          country?: string
          created_at?: string
          employees?: string
          id?: string
          industry?: string
          name: string
          phone?: string
          region?: string
          revenue?: string
          source?: string
          updated_at?: string
          website?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          employees?: string
          id?: string
          industry?: string
          name?: string
          phone?: string
          region?: string
          revenue?: string
          source?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      directory_contacts: {
        Row: {
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          industry: string
          is_member: boolean
          linkedin_url: string
          location: string
          phone: string
          seniority: string
          source: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_name?: string
          created_at?: string
          email?: string
          full_name: string
          id?: string
          industry?: string
          is_member?: boolean
          linkedin_url?: string
          location?: string
          phone?: string
          seniority?: string
          source?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          industry?: string
          is_member?: boolean
          linkedin_url?: string
          location?: string
          phone?: string
          seniority?: string
          source?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          created_at: string
          id: string
          sender_id: string
          text: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sender_id: string
          text: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sender_id?: string
          text?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_thread_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          intro_context: string
          member_a: string
          member_b: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          intro_context?: string
          member_a: string
          member_b: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          intro_context?: string
          member_a?: string
          member_b?: string
          updated_at?: string
        }
        Relationships: []
      }
      early_access_members: {
        Row: {
          approved_at: string | null
          created_at: string
          email: string
          founding_member_number: number | null
          id: string
          invite_id: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          email: string
          founding_member_number?: number | null
          id?: string
          invite_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          email?: string
          founding_member_number?: number | null
          id?: string
          invite_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          last_digest_at: string | null
          unsubscribe_token: string
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          last_digest_at?: string | null
          unsubscribe_token?: string
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          last_digest_at?: string | null
          unsubscribe_token?: string
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
      }
      entity_events: {
        Row: {
          created_at: string
          detail: Json
          entity_id: string
          entity_type: string
          event: string
          id: string
          owner_id: string
          source: string
          summary: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          entity_id: string
          entity_type: string
          event: string
          id?: string
          owner_id?: string
          source?: string
          summary?: string
        }
        Update: {
          created_at?: string
          detail?: Json
          entity_id?: string
          entity_type?: string
          event?: string
          id?: string
          owner_id?: string
          source?: string
          summary?: string
        }
        Relationships: []
      }
      entity_links: {
        Row: {
          created_at: string
          from_id: string
          from_type: string
          id: string
          owner_id: string
          relation: string
          to_id: string
          to_type: string
        }
        Insert: {
          created_at?: string
          from_id: string
          from_type: string
          id?: string
          owner_id?: string
          relation?: string
          to_id: string
          to_type: string
        }
        Update: {
          created_at?: string
          from_id?: string
          from_type?: string
          id?: string
          owner_id?: string
          relation?: string
          to_id?: string
          to_type?: string
        }
        Relationships: []
      }
      event_invites: {
        Row: {
          created_at: string
          event_id: string
          invited_by: string | null
          notified_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          invited_by?: string | null
          notified_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          invited_by?: string | null
          notified_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "member_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          queued_at: string
          reminded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          queued_at?: string
          reminded_at?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          queued_at?: string
          reminded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "member_events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          confidence: number
          created_at: string
          id: string
          occurred_at: string
          payload: Json
          person_id: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json
          person_id?: string | null
          source?: string
          type: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          occurred_at?: string
          payload?: Json
          person_id?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      evidence_preferences: {
        Row: {
          newcomer: boolean
          owner_id: string
          ranking: boolean
          timing: boolean
          updated_at: string
        }
        Insert: {
          newcomer?: boolean
          owner_id: string
          ranking?: boolean
          timing?: boolean
          updated_at?: string
        }
        Update: {
          newcomer?: boolean
          owner_id?: string
          ranking?: boolean
          timing?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      executive_applications: {
        Row: {
          company: string
          created_at: string
          full_name: string
          profile_url: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          full_name: string
          profile_url: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          full_name?: string
          profile_url?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      executive_office_hours: {
        Row: {
          capacity: number
          created_at: string
          duration_minutes: number
          enabled: boolean
          ends_at: string
          id: string
          label: string
          owner_id: string
          purpose: string
          relevance: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          duration_minutes?: number
          enabled?: boolean
          ends_at: string
          id?: string
          label: string
          owner_id?: string
          purpose?: string
          relevance?: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          duration_minutes?: number
          enabled?: boolean
          ends_at?: string
          id?: string
          label?: string
          owner_id?: string
          purpose?: string
          relevance?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      executive_recommendations: {
        Row: {
          author_id: string
          body: string
          created_at: string
          display_approved: boolean
          id: string
          outcome: string
          recipient_approved_at: string | null
          recipient_id: string
          relationship_context: string
          updated_at: string
          who_should_meet: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          display_approved?: boolean
          id?: string
          outcome?: string
          recipient_approved_at?: string | null
          recipient_id: string
          relationship_context?: string
          updated_at?: string
          who_should_meet?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          display_approved?: boolean
          id?: string
          outcome?: string
          recipient_approved_at?: string | null
          recipient_id?: string
          relationship_context?: string
          updated_at?: string
          who_should_meet?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_recommendations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_recommendations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          id: string
          kind: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          id?: string
          kind?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          id?: string
          kind?: string
        }
        Relationships: []
      }
      google_connections: {
        Row: {
          connected_at: string
          google_email: string
          last_error: string
          last_sync_at: string | null
          refresh_token_enc: string
          scopes: string[]
          user_id: string
        }
        Insert: {
          connected_at?: string
          google_email?: string
          last_error?: string
          last_sync_at?: string | null
          refresh_token_enc: string
          scopes?: string[]
          user_id: string
        }
        Update: {
          connected_at?: string
          google_email?: string
          last_error?: string
          last_sync_at?: string | null
          refresh_token_enc?: string
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      grid_columns: {
        Row: {
          created_at: string
          default_value: string
          formula: string
          id: string
          key: string
          name: string
          options: string[]
          owner_id: string
          position: number
          relation_type: string | null
          sheet_id: string
          source_field: string | null
          type: string
          updated_at: string
          width: number
          writable: boolean
        }
        Insert: {
          created_at?: string
          default_value?: string
          formula?: string
          id?: string
          key: string
          name: string
          options?: string[]
          owner_id?: string
          position?: number
          relation_type?: string | null
          sheet_id: string
          source_field?: string | null
          type?: string
          updated_at?: string
          width?: number
          writable?: boolean
        }
        Update: {
          created_at?: string
          default_value?: string
          formula?: string
          id?: string
          key?: string
          name?: string
          options?: string[]
          owner_id?: string
          position?: number
          relation_type?: string | null
          sheet_id?: string
          source_field?: string | null
          type?: string
          updated_at?: string
          width?: number
          writable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "grid_columns_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "grid_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_rows: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          owner_id: string
          position: number
          sheet_id: string
          updated_at: string
          values: Json
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          owner_id?: string
          position?: number
          sheet_id: string
          updated_at?: string
          values?: Json
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          owner_id?: string
          position?: number
          sheet_id?: string
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "grid_rows_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "grid_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_sheets: {
        Row: {
          archived: boolean
          config: Json
          created_at: string
          entity_type: string | null
          id: string
          mode: string
          name: string
          owner_id: string
          position: number
          updated_at: string
          workbook_id: string
        }
        Insert: {
          archived?: boolean
          config?: Json
          created_at?: string
          entity_type?: string | null
          id?: string
          mode?: string
          name: string
          owner_id?: string
          position?: number
          updated_at?: string
          workbook_id: string
        }
        Update: {
          archived?: boolean
          config?: Json
          created_at?: string
          entity_type?: string | null
          id?: string
          mode?: string
          name?: string
          owner_id?: string
          position?: number
          updated_at?: string
          workbook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grid_sheets_workbook_id_fkey"
            columns: ["workbook_id"]
            isOneToOne: false
            referencedRelation: "grid_workbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_views: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          owner_id: string
          sheet_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          owner_id?: string
          sheet_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          sheet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grid_views_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "grid_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      grid_workbooks: {
        Row: {
          account_id: string | null
          archived: boolean
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          archived?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_audit: {
        Row: {
          action: string
          created_at: string
          id: number
          kind: string | null
          owner_id: string
          record_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          kind?: string | null
          owner_id: string
          record_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          kind?: string | null
          owner_id?: string
          record_id?: string | null
        }
        Relationships: []
      }
      hr_records: {
        Row: {
          fields: Json
          id: string
          kind: string
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          fields: Json
          id: string
          kind: string
          owner_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          fields?: Json
          id?: string
          kind?: string
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "hr_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "hr_workspaces"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      hr_workspaces: {
        Row: {
          context: Json
          owner_id: string
          updated_at: string
          version: number
        }
        Insert: {
          context: Json
          owner_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          context?: Json
          owner_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      impact_reports: {
        Row: {
          created_at: string
          created_by: string | null
          frozen_at: string
          headline: string
          id: string
          metrics: Json
          period_from: string
          period_label: string
          period_to: string
          published: boolean
          published_at: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          frozen_at?: string
          headline?: string
          id?: string
          metrics: Json
          period_from: string
          period_label: string
          period_to: string
          published?: boolean
          published_at?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          frozen_at?: string
          headline?: string
          id?: string
          metrics?: Json
          period_from?: string
          period_label?: string
          period_to?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      intro_context_capsules: {
        Row: {
          author_id: string
          created_at: string
          excluded_context: string
          first_goal: string
          id: string
          intro_request_id: string
          mission_title: string
          requester_approved: boolean
          shared_context: string
          signal_text: string
          target_approved: boolean
          updated_at: string
          why_exists: string
          why_now: string
          why_requester: string
          why_target: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          excluded_context?: string
          first_goal?: string
          id?: string
          intro_request_id: string
          mission_title?: string
          requester_approved?: boolean
          shared_context?: string
          signal_text?: string
          target_approved?: boolean
          updated_at?: string
          why_exists?: string
          why_now?: string
          why_requester?: string
          why_target?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          excluded_context?: string
          first_goal?: string
          id?: string
          intro_request_id?: string
          mission_title?: string
          requester_approved?: boolean
          shared_context?: string
          signal_text?: string
          target_approved?: boolean
          updated_at?: string
          why_exists?: string
          why_now?: string
          why_requester?: string
          why_target?: string
        }
        Relationships: [
          {
            foreignKeyName: "intro_context_capsules_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: true
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_deals: {
        Row: {
          created_at: string
          currency: string
          disputed: boolean
          id: string
          intro_request_id: string
          recorded_by: string
          status: string
          title: string
          updated_at: string
          value_cents: number
        }
        Insert: {
          created_at?: string
          currency?: string
          disputed?: boolean
          id?: string
          intro_request_id: string
          recorded_by?: string
          status?: string
          title: string
          updated_at?: string
          value_cents: number
        }
        Update: {
          created_at?: string
          currency?: string
          disputed?: boolean
          id?: string
          intro_request_id?: string
          recorded_by?: string
          status?: string
          title?: string
          updated_at?: string
          value_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "intro_deals_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_feedback: {
        Row: {
          author_id: string
          connector_name: string
          context_accurate: boolean | null
          created_at: string
          id: string
          intro_request_id: string | null
          member_id: string
          outcome_category: string
          private_note: string
          relevant: boolean | null
          shareable: boolean
          would_take_again: boolean | null
        }
        Insert: {
          author_id?: string
          connector_name?: string
          context_accurate?: boolean | null
          created_at?: string
          id?: string
          intro_request_id?: string | null
          member_id?: string
          outcome_category?: string
          private_note?: string
          relevant?: boolean | null
          shareable?: boolean
          would_take_again?: boolean | null
        }
        Update: {
          author_id?: string
          connector_name?: string
          context_accurate?: boolean | null
          created_at?: string
          id?: string
          intro_request_id?: string | null
          member_id?: string
          outcome_category?: string
          private_note?: string
          relevant?: boolean | null
          shareable?: boolean
          would_take_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "intro_feedback_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_outcomes: {
        Row: {
          attribution: string
          author_id: string
          created_at: string
          id: string
          intro_request_id: string
          occurred_on: string
          outcome_category: string | null
          private_note: string
          shareable: boolean
          stage: string
          value_band: string
        }
        Insert: {
          attribution?: string
          author_id?: string
          created_at?: string
          id?: string
          intro_request_id: string
          occurred_on?: string
          outcome_category?: string | null
          private_note?: string
          shareable?: boolean
          stage: string
          value_band?: string
        }
        Update: {
          attribution?: string
          author_id?: string
          created_at?: string
          id?: string
          intro_request_id?: string
          occurred_on?: string
          outcome_category?: string | null
          private_note?: string
          shareable?: boolean
          stage?: string
          value_band?: string
        }
        Relationships: [
          {
            foreignKeyName: "intro_outcomes_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_request_nudges: {
        Row: {
          intro_request_id: string
          nudged_at: string
        }
        Insert: {
          intro_request_id: string
          nudged_at?: string
        }
        Update: {
          intro_request_id?: string
          nudged_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intro_request_nudges_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: true
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_requests: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          member_id: string
          member_opt_in: boolean
          mutual_value: string
          reason: string
          requester_opt_in: boolean
          status: string
          target_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          member_id: string
          member_opt_in?: boolean
          mutual_value?: string
          reason?: string
          requester_opt_in?: boolean
          status?: string
          target_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          member_id?: string
          member_opt_in?: boolean
          mutual_value?: string
          reason?: string
          requester_opt_in?: boolean
          status?: string
          target_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          code: string
          cohort_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          invitee_company: string
          invitee_name: string
          max_uses: number
          personal: boolean
          revoked: boolean
          uses: number
        }
        Insert: {
          code: string
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invitee_company?: string
          invitee_name?: string
          max_uses?: number
          personal?: boolean
          revoked?: boolean
          uses?: number
        }
        Update: {
          code?: string
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invitee_company?: string
          invitee_name?: string
          max_uses?: number
          personal?: boolean
          revoked?: boolean
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitations_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "invite_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_cohorts: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          source_label: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          source_label?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          source_label?: string
        }
        Relationships: []
      }
      launch_settings: {
        Row: {
          capacity: number
          id: number
          mode: string
          owner_user_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          capacity?: number
          id?: number
          mode?: string
          owner_user_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          capacity?: number
          id?: number
          mode?: string
          owner_user_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      leak_checks: {
        Row: {
          answers: Json
          company_name: string
          created_at: string
          id: string
          leak_index: number
          owner_id: string
        }
        Insert: {
          answers: Json
          company_name?: string
          created_at?: string
          id?: string
          leak_index: number
          owner_id?: string
        }
        Update: {
          answers?: Json
          company_name?: string
          created_at?: string
          id?: string
          leak_index?: number
          owner_id?: string
        }
        Relationships: []
      }
      marketplace_pilot_interests: {
        Row: {
          created_at: string
          id: string
          intent: string
          response: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent: string
          response: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intent?: string
          response?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_briefs: {
        Row: {
          attendee_context: Json | null
          brief_type: string
          content: string
          created_at: string
          generated_by: string | null
          id: string
          key_points: Json | null
          meeting_id: string
          status: string
          talking_points: Json | null
          updated_at: string
        }
        Insert: {
          attendee_context?: Json | null
          brief_type?: string
          content: string
          created_at?: string
          generated_by?: string | null
          id?: string
          key_points?: Json | null
          meeting_id: string
          status?: string
          talking_points?: Json | null
          updated_at?: string
        }
        Update: {
          attendee_context?: Json | null
          brief_type?: string
          content?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          key_points?: Json | null
          meeting_id?: string
          status?: string
          talking_points?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_briefs_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_briefs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_invite_links: {
        Row: {
          expires_at: string
          meeting_id: string
          token_hash: string
        }
        Insert: {
          expires_at: string
          meeting_id: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          meeting_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_invite_links_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          action_items: Json
          decisions: Json
          generated_at: string | null
          id: string
          meeting_id: string
          owner_id: string
          private_note: string
          summary: string
          updated_at: string
        }
        Insert: {
          action_items?: Json
          decisions?: Json
          generated_at?: string | null
          id?: string
          meeting_id: string
          owner_id?: string
          private_note?: string
          summary?: string
          updated_at?: string
        }
        Update: {
          action_items?: Json
          decisions?: Json
          generated_at?: string | null
          id?: string
          meeting_id?: string
          owner_id?: string
          private_note?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          consented_at: string | null
          joined_at: string | null
          meeting_id: string
          notes_consent: boolean
          role: string
          user_id: string
        }
        Insert: {
          consented_at?: string | null
          joined_at?: string | null
          meeting_id: string
          notes_consent?: boolean
          role?: string
          user_id: string
        }
        Update: {
          consented_at?: string | null
          joined_at?: string | null
          meeting_id?: string
          notes_consent?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_transcript_lines: {
        Row: {
          id: string
          meeting_id: string
          speaker_id: string
          spoken_at: string
          text: string
        }
        Insert: {
          id?: string
          meeting_id: string
          speaker_id?: string
          spoken_at?: string
          text: string
        }
        Update: {
          id?: string
          meeting_id?: string
          speaker_id?: string
          spoken_at?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_transcript_lines_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string
          archived_at: string | null
          created_at: string
          deleted_at: string | null
          ended_at: string | null
          host_id: string
          id: string
          intro_request_id: string | null
          recording_started_at: string | null
          recording_started_by: string | null
          scheduled_for: string | null
          started_at: string | null
          title: string
        }
        Insert: {
          agenda?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          intro_request_id?: string | null
          recording_started_at?: string | null
          recording_started_by?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          title: string
        }
        Update: {
          agenda?: string
          archived_at?: string | null
          created_at?: string
          deleted_at?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          intro_request_id?: string | null
          recording_started_at?: string | null
          recording_started_by?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: false
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      member_activation: {
        Row: {
          dismissed_at: string | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      member_activity_days: {
        Row: {
          day: string
          user_id: string
        }
        Insert: {
          day: string
          user_id: string
        }
        Update: {
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      member_events: {
        Row: {
          capacity: number | null
          city: string | null
          created_at: string
          created_by: string | null
          description: string
          ends_at: string
          format: string
          host_id: string | null
          id: string
          join_url: string | null
          starts_at: string
          status: string
          timezone: string
          title: string
          updated_at: string
          venue: string | null
          visibility: string
        }
        Insert: {
          capacity?: number | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at: string
          format?: string
          host_id?: string | null
          id?: string
          join_url?: string | null
          starts_at: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          venue?: string | null
          visibility?: string
        }
        Update: {
          capacity?: number | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string
          format?: string
          host_id?: string | null
          id?: string
          join_url?: string | null
          starts_at?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          venue?: string | null
          visibility?: string
        }
        Relationships: []
      }
      member_goals: {
        Row: {
          created_at: string
          goal: string
          position: number
          quarter: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal: string
          position: number
          quarter?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string
          position?: number
          quarter?: string
          user_id?: string
        }
        Relationships: []
      }
      member_phones: {
        Row: {
          code_attempts: number
          code_expires_at: string | null
          code_hash: string | null
          codes_day: string | null
          codes_sent_today: number
          phone_e164: string
          sent_day: string | null
          sent_today: number
          sms_kinds: string[]
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          code_attempts?: number
          code_expires_at?: string | null
          code_hash?: string | null
          codes_day?: string | null
          codes_sent_today?: number
          phone_e164: string
          sent_day?: string | null
          sent_today?: number
          sms_kinds?: string[]
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          code_attempts?: number
          code_expires_at?: string | null
          code_hash?: string | null
          codes_day?: string | null
          codes_sent_today?: number
          phone_e164?: string
          sent_day?: string | null
          sent_today?: number
          sms_kinds?: string[]
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      member_quick_menu: {
        Row: {
          items: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          items?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          items?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_tiers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          tier: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          tier?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      member_verifications: {
        Row: {
          account_id: string | null
          business_dba: string
          business_domain: string
          business_location: string
          business_name: string
          claimed_role: string
          created_at: string
          decision_reason: string
          display_name: string
          id: string
          legal_name: string
          professional_url: string
          proof_retention: string
          public_summary: string
          registration_jurisdiction: string
          registration_number: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string
          risk_flags: Json
          scanned_at: string | null
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          verification_level: number
          verified_at: string | null
          verified_role: Database["public"]["Enums"]["verified_role"] | null
          work_email: string
        }
        Insert: {
          account_id?: string | null
          business_dba?: string
          business_domain?: string
          business_location?: string
          business_name?: string
          claimed_role?: string
          created_at?: string
          decision_reason?: string
          display_name?: string
          id?: string
          legal_name?: string
          professional_url?: string
          proof_retention?: string
          public_summary?: string
          registration_jurisdiction?: string
          registration_number?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string
          risk_flags?: Json
          scanned_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          verification_level?: number
          verified_at?: string | null
          verified_role?: Database["public"]["Enums"]["verified_role"] | null
          work_email?: string
        }
        Update: {
          account_id?: string | null
          business_dba?: string
          business_domain?: string
          business_location?: string
          business_name?: string
          claimed_role?: string
          created_at?: string
          decision_reason?: string
          display_name?: string
          id?: string
          legal_name?: string
          professional_url?: string
          proof_retention?: string
          public_summary?: string
          registration_jurisdiction?: string
          registration_number?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string
          risk_flags?: Json
          scanned_at?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          verification_level?: number
          verified_at?: string | null
          verified_role?: Database["public"]["Enums"]["verified_role"] | null
          work_email?: string
        }
        Relationships: []
      }
      member_workspace_state: {
        Row: {
          data: Json
          store_key: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          data?: Json
          store_key: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          data?: Json
          store_key?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      members_base: {
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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
      membership_cards: {
        Row: {
          code: string
          email_attempts: number
          email_due: boolean
          emailed_at: string | null
          holder_name: string
          image_token: string
          issued_at: string
          revoked_at: string | null
          status: string
          user_id: string
          verified_at: string
        }
        Insert: {
          code: string
          email_attempts?: number
          email_due?: boolean
          emailed_at?: string | null
          holder_name: string
          image_token?: string
          issued_at?: string
          revoked_at?: string | null
          status?: string
          user_id: string
          verified_at: string
        }
        Update: {
          code?: string
          email_attempts?: number
          email_due?: boolean
          emailed_at?: string | null
          holder_name?: string
          image_token?: string
          issued_at?: string
          revoked_at?: string | null
          status?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          active: boolean
          amount_cents: number
          billing_interval: string
          currency: string
          description: string
          id: string
          name: string
          sort: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          billing_interval?: string
          currency?: string
          description?: string
          id: string
          name: string
          sort?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          billing_interval?: string
          currency?: string
          description?: string
          id?: string
          name?: string
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          amount_cents: number
          billing_interval: string
          cancel_at_period_end: boolean
          currency: string
          current_period_end: string | null
          plan_id: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          billing_interval?: string
          cancel_at_period_end?: boolean
          currency?: string
          current_period_end?: string | null
          plan_id?: string | null
          started_at?: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          billing_interval?: string
          cancel_at_period_end?: boolean
          currency?: string
          current_period_end?: string | null
          plan_id?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          category: string
          confidence: number
          created_at: string
          fact_key: string | null
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
          fact_key?: string | null
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
          fact_key?: string | null
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
      messaging_settings: {
        Row: {
          show_read_receipts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          show_read_receipts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          show_read_receipts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      missions: {
        Row: {
          created_at: string
          horizon: string
          id: string
          linked_ask_id: string | null
          linked_company_id: string | null
          linked_opportunity_id: string | null
          mission_type: string
          objective: string
          owner_id: string
          privacy: string
          status: string
          success_definition: string
          target_company: string
          target_date: string | null
          target_geography: string
          target_industry: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          horizon?: string
          id?: string
          linked_ask_id?: string | null
          linked_company_id?: string | null
          linked_opportunity_id?: string | null
          mission_type?: string
          objective?: string
          owner_id?: string
          privacy?: string
          status?: string
          success_definition?: string
          target_company?: string
          target_date?: string | null
          target_geography?: string
          target_industry?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          horizon?: string
          id?: string
          linked_ask_id?: string | null
          linked_company_id?: string | null
          linked_opportunity_id?: string | null
          mission_type?: string
          objective?: string
          owner_id?: string
          privacy?: string
          status?: string
          success_definition?: string
          target_company?: string
          target_date?: string | null
          target_geography?: string
          target_industry?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      negotiation_rooms: {
        Row: {
          batna: string
          concessions: Json
          counterpart_priorities: string
          created_at: string
          desired_outcome: string
          id: string
          leverage_evidence: string
          linked_company_id: string | null
          linked_company_key: string | null
          linked_opportunity_id: string | null
          linked_opportunity_key: string | null
          linked_person_id: string | null
          linked_person_key: string | null
          meeting_prep: string
          must_haves: string
          nice_to_haves: string
          objective: string
          outcome: string
          owner_id: string
          status: string
          title: string
          unknowns: string
          updated_at: string
          walk_away: string
        }
        Insert: {
          batna?: string
          concessions?: Json
          counterpart_priorities?: string
          created_at?: string
          desired_outcome?: string
          id?: string
          leverage_evidence?: string
          linked_company_id?: string | null
          linked_company_key?: string | null
          linked_opportunity_id?: string | null
          linked_opportunity_key?: string | null
          linked_person_id?: string | null
          linked_person_key?: string | null
          meeting_prep?: string
          must_haves?: string
          nice_to_haves?: string
          objective?: string
          outcome?: string
          owner_id?: string
          status?: string
          title: string
          unknowns?: string
          updated_at?: string
          walk_away?: string
        }
        Update: {
          batna?: string
          concessions?: Json
          counterpart_priorities?: string
          created_at?: string
          desired_outcome?: string
          id?: string
          leverage_evidence?: string
          linked_company_id?: string | null
          linked_company_key?: string | null
          linked_opportunity_id?: string | null
          linked_opportunity_key?: string | null
          linked_person_id?: string | null
          linked_person_key?: string | null
          meeting_prep?: string
          must_haves?: string
          nice_to_haves?: string
          objective?: string
          outcome?: string
          owner_id?: string
          status?: string
          title?: string
          unknowns?: string
          updated_at?: string
          walk_away?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          kind: string
          link: string
          read: boolean
          text: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string
          read?: boolean
          text: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string
          read?: boolean
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      nv_benchmark_contributions: {
        Row: {
          business_key: string
          consent_at: string
          metric: string
          period: string
          region: string
          size_band: string
          trade: string
          user_id: string
          value: number
        }
        Insert: {
          business_key: string
          consent_at?: string
          metric: string
          period: string
          region: string
          size_band: string
          trade: string
          user_id: string
          value: number
        }
        Update: {
          business_key?: string
          consent_at?: string
          metric?: string
          period?: string
          region?: string
          size_band?: string
          trade?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "nv_benchmark_contributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nv_benchmark_enrollments"
            referencedColumns: ["user_id"]
          },
        ]
      }
      nv_benchmark_enrollments: {
        Row: {
          business_key: string
          region: string
          size_band: string
          trade: string
          user_id: string
          verified_at: string
        }
        Insert: {
          business_key: string
          region: string
          size_band: string
          trade: string
          user_id: string
          verified_at?: string
        }
        Update: {
          business_key?: string
          region?: string
          size_band?: string
          trade?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      nv_benchmark_releases: {
        Row: {
          companies_at_least: number
          median: number
          metric: string
          p25: number
          p75: number
          period: string
          published_at: string
          region: string
          size_band: string
          trade: string
        }
        Insert: {
          companies_at_least: number
          median: number
          metric: string
          p25: number
          p75: number
          period: string
          published_at?: string
          region: string
          size_band: string
          trade: string
        }
        Update: {
          companies_at_least?: number
          median?: number
          metric?: string
          p25?: number
          p75?: number
          period?: string
          published_at?: string
          region?: string
          size_band?: string
          trade?: string
        }
        Relationships: []
      }
      nv_capacity_letters: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          note: string
          offered_at: string | null
          post_id: string
          requester_id: string
          state: string
          terms: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          note: string
          offered_at?: string | null
          post_id: string
          requester_id: string
          state?: string
          terms?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          note?: string
          offered_at?: string | null
          post_id?: string
          requester_id?: string
          state?: string
          terms?: string
        }
        Relationships: [
          {
            foreignKeyName: "nv_capacity_letters_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "nv_capacity_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      nv_capacity_posts: {
        Row: {
          city: string
          closed_at: string | null
          created_at: string
          details: string
          expires_at: string
          id: string
          kind: string
          latitude: number
          longitude: number
          owner_id: string
          radius: number
          starts_at: string
          title: string
        }
        Insert: {
          city: string
          closed_at?: string | null
          created_at?: string
          details: string
          expires_at: string
          id: string
          kind: string
          latitude: number
          longitude: number
          owner_id: string
          radius: number
          starts_at: string
          title: string
        }
        Update: {
          city?: string
          closed_at?: string | null
          created_at?: string
          details?: string
          expires_at?: string
          id?: string
          kind?: string
          latitude?: number
          longitude?: number
          owner_id?: string
          radius?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      nv_locations: {
        Row: {
          city: string
          latitude: number
          longitude: number
          user_id: string
        }
        Insert: {
          city: string
          latitude: number
          longitude: number
          user_id: string
        }
        Update: {
          city?: string
          latitude?: number
          longitude?: number
          user_id?: string
        }
        Relationships: []
      }
      nv_settlement_events: {
        Row: {
          actor_id: string
          agreement_id: string
          created_at: string
          evidence: string
          invoice_cents: number | null
          step: string
        }
        Insert: {
          actor_id: string
          agreement_id: string
          created_at?: string
          evidence: string
          invoice_cents?: number | null
          step: string
        }
        Update: {
          actor_id?: string
          agreement_id?: string
          created_at?: string
          evidence?: string
          invoice_cents?: number | null
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "nv_settlement_events_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "nv_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      nv_settlement_signatures: {
        Row: {
          agreement_id: string
          consent_text: string
          signed_at: string
          terms_hash: string
          typed_name: string
          user_id: string
        }
        Insert: {
          agreement_id: string
          consent_text: string
          signed_at?: string
          terms_hash: string
          typed_name: string
          user_id: string
        }
        Update: {
          agreement_id?: string
          consent_text?: string
          signed_at?: string
          terms_hash?: string
          typed_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nv_settlement_signatures_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "nv_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      nv_settlements: {
        Row: {
          buyer_id: string
          cancelled_at: string | null
          cap_cents: number
          connector_id: string
          created_at: string
          id: string
          platform_bps: number
          rate_bps: number
          referral_id: string | null
          released_at: string | null
          seller_id: string
          terms: Json
          terms_hash: string
          title: string
          window_months: number
        }
        Insert: {
          buyer_id: string
          cancelled_at?: string | null
          cap_cents: number
          connector_id: string
          created_at?: string
          id: string
          platform_bps?: number
          rate_bps: number
          referral_id?: string | null
          released_at?: string | null
          seller_id: string
          terms: Json
          terms_hash: string
          title: string
          window_months: number
        }
        Update: {
          buyer_id?: string
          cancelled_at?: string | null
          cap_cents?: number
          connector_id?: string
          created_at?: string
          id?: string
          platform_bps?: number
          rate_bps?: number
          referral_id?: string | null
          released_at?: string | null
          seller_id?: string
          terms?: Json
          terms_hash?: string
          title?: string
          window_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "nv_settlements_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      office_hour_requests: {
        Row: {
          acted_at: string | null
          created_at: string
          id: string
          owner_id: string
          reason: string
          requester_id: string
          status: string
          window_id: string
        }
        Insert: {
          acted_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          reason: string
          requester_id?: string
          status?: string
          window_id: string
        }
        Update: {
          acted_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          reason?: string
          requester_id?: string
          status?: string
          window_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hour_requests_window_id_fkey"
            columns: ["window_id"]
            isOneToOne: false
            referencedRelation: "executive_office_hours"
            referencedColumns: ["id"]
          },
        ]
      }
      org_handovers: {
        Row: {
          approved: boolean
          approved_at: string | null
          author_id: string
          created_at: string
          id: string
          note: string
          open_loops: string
          org_id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          open_loops?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          open_loops?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_handovers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          max_uses: number
          org_id: string
          revoked: boolean
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string
          max_uses?: number
          org_id: string
          revoked?: boolean
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          max_uses?: number
          org_id?: string
          revoked?: boolean
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          departed_at: string | null
          joined_at: string
          org_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          departed_at?: string | null
          joined_at?: string
          org_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          departed_at?: string | null
          joined_at?: string
          org_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_shared_relationships: {
        Row: {
          contact_company: string
          contact_member_id: string | null
          contact_name: string
          context: string
          created_at: string
          id: string
          org_id: string
          owner_id: string
          strength: string
          updated_at: string
        }
        Insert: {
          contact_company?: string
          contact_member_id?: string | null
          contact_name: string
          context?: string
          created_at?: string
          id?: string
          org_id: string
          owner_id?: string
          strength?: string
          updated_at?: string
        }
        Update: {
          contact_company?: string
          contact_member_id?: string | null
          contact_name?: string
          context?: string
          created_at?: string
          id?: string
          org_id?: string
          owner_id?: string
          strength?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_shared_relationships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          domain: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          domain?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          domain?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      passports: {
        Row: {
          created_at: string
          fields: string[]
          id: string
          kind: string
          label: string
          owner_id: string
          revoked: boolean
          selected_ask_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          fields?: string[]
          id?: string
          kind?: string
          label?: string
          owner_id?: string
          revoked?: boolean
          selected_ask_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          fields?: string[]
          id?: string
          kind?: string
          label?: string
          owner_id?: string
          revoked?: boolean
          selected_ask_id?: string | null
          token?: string
        }
        Relationships: []
      }
      peer_group_issues: {
        Row: {
          context: string
          created_at: string
          group_id: string
          help_needed: string
          id: string
          outcome: string | null
          owner_id: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          context?: string
          created_at?: string
          group_id: string
          help_needed?: string
          id?: string
          outcome?: string | null
          owner_id?: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          context?: string
          created_at?: string
          group_id?: string
          help_needed?: string
          id?: string
          outcome?: string | null
          owner_id?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_issues_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_members: {
        Row: {
          added_by: string | null
          agreement_accepted_at: string | null
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          agreement_accepted_at?: string | null
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          agreement_accepted_at?: string | null
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_perspectives: {
        Row: {
          author_id: string
          body: string
          created_at: string
          group_id: string
          id: string
          issue_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          group_id: string
          id?: string
          issue_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          issue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_perspectives_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_group_perspectives_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "peer_group_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          group_id: string
          id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string
          body: string
          created_at?: string
          group_id: string
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_group_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "peer_group_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          group_id: string | null
          id: string
          note: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          group_id?: string | null
          id?: string
          note: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          group_id?: string | null
          id?: string
          note?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_group_sessions: {
        Row: {
          agenda: string
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          meeting_url: string | null
          starts_at: string
        }
        Insert: {
          agenda?: string
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          meeting_url?: string | null
          starts_at: string
        }
        Update: {
          agenda?: string
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          meeting_url?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "peer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_groups: {
        Row: {
          cadence: string
          created_at: string
          created_by: string | null
          description: string
          facilitator_id: string | null
          id: string
          max_size: number
          name: string
          updated_at: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          created_by?: string | null
          description?: string
          facilitator_id?: string | null
          id?: string
          max_size?: number
          name: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          created_by?: string | null
          description?: string
          facilitator_id?: string | null
          id?: string
          max_size?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      person_enrichment_snapshots: {
        Row: {
          checked_at: string
          content_hash: string
          created_at: string
          external_profile_id: string | null
          id: string
          match_confidence: number
          match_reasons: string[]
          normalized: Json
          owner_id: string
          person_id: string
          provider: string
          query: Json
          run_id: string | null
          source_channel: string
        }
        Insert: {
          checked_at?: string
          content_hash: string
          created_at?: string
          external_profile_id?: string | null
          id?: string
          match_confidence?: number
          match_reasons?: string[]
          normalized: Json
          owner_id: string
          person_id: string
          provider?: string
          query?: Json
          run_id?: string | null
          source_channel: string
        }
        Update: {
          checked_at?: string
          content_hash?: string
          created_at?: string
          external_profile_id?: string | null
          id?: string
          match_confidence?: number
          match_reasons?: string[]
          normalized?: Json
          owner_id?: string
          person_id?: string
          provider?: string
          query?: Json
          run_id?: string | null
          source_channel?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_enrichment_snapshots_external_profile_id_fkey"
            columns: ["external_profile_id"]
            isOneToOne: false
            referencedRelation: "person_external_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_enrichment_snapshots_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_enrichment_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "capability_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      person_external_profiles: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          external_handle: string | null
          external_url: string
          id: string
          last_changed_at: string | null
          last_checked_at: string
          latest_snapshot_id: string | null
          owner_id: string
          person_id: string
          provider: string
          status: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          external_handle?: string | null
          external_url?: string
          id?: string
          last_changed_at?: string | null
          last_checked_at?: string
          latest_snapshot_id?: string | null
          owner_id: string
          person_id: string
          provider?: string
          status?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          external_handle?: string | null
          external_url?: string
          id?: string
          last_changed_at?: string | null
          last_checked_at?: string
          latest_snapshot_id?: string | null
          owner_id?: string
          person_id?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_external_profiles_latest_fk"
            columns: ["latest_snapshot_id"]
            isOneToOne: false
            referencedRelation: "person_enrichment_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_external_profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "crm_people"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          post_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          post_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          post_id?: string
          text?: string
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string | null
          business: Json | null
          created_at: string
          detail: string
          id: string
          is_demo: boolean
          kind: string
          media: Json
          member_id: string | null
          response_count: number
          text: string
          visibility: string
          when_label: string
        }
        Insert: {
          author_id?: string | null
          business?: Json | null
          created_at?: string
          detail?: string
          id: string
          is_demo?: boolean
          kind?: string
          media?: Json
          member_id?: string | null
          response_count?: number
          text: string
          visibility?: string
          when_label?: string
        }
        Update: {
          author_id?: string | null
          business?: Json | null
          created_at?: string
          detail?: string
          id?: string
          is_demo?: boolean
          kind?: string
          media?: Json
          member_id?: string | null
          response_count?: number
          text?: string
          visibility?: string
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
      private_contact_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_contact_categories_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_contact_notes: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          id: string
          note_type: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          id?: string
          note_type?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "private_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_contact_notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_contact_shares: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          permission: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          permission?: string
          shared_by: string
          shared_with: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          permission?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_contact_shares_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "private_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_contact_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_contact_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      private_contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "private_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      private_contacts: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          owner_id: string
          phone: string | null
          relationship_strength: number | null
          source: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          owner_id: string
          phone?: string | null
          relationship_strength?: number | null
          source?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          relationship_strength?: number | null
          source?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_opportunities: {
        Row: {
          created_at: string
          data: Json
          id: string
          owner_id: string
          scope: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id: string
          owner_id: string
          scope?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          owner_id?: string
          scope?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      professional_opportunity_interests: {
        Row: {
          created_at: string
          note: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          note: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_opportunity_interests_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "professional_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_opportunity_saves: {
        Row: {
          opportunity_id: string
          user_id: string
        }
        Insert: {
          opportunity_id: string
          user_id: string
        }
        Update: {
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_opportunity_saves_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "professional_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability: string
          avatar_url: string | null
          bio: string
          boundaries: string
          building: string
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
          linkedin_url: string
          location: string
          looking_for: string
          name: string
          onboarded: boolean
          open_to: string[]
          portrait_key: string | null
          scheduling_enabled: boolean
          thesis: string
          title: string
          updated_at: string
          values_text: string
          verification_public_summary: string
          verified_at: string | null
          verified_business: string
          verified_role: Database["public"]["Enums"]["verified_role"] | null
          visibility: string
          want_to_meet: string
          what_i_do: string
        }
        Insert: {
          availability?: string
          avatar_url?: string | null
          bio?: string
          boundaries?: string
          building?: string
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
          linkedin_url?: string
          location?: string
          looking_for?: string
          name?: string
          onboarded?: boolean
          open_to?: string[]
          portrait_key?: string | null
          scheduling_enabled?: boolean
          thesis?: string
          title?: string
          updated_at?: string
          values_text?: string
          verification_public_summary?: string
          verified_at?: string | null
          verified_business?: string
          verified_role?: Database["public"]["Enums"]["verified_role"] | null
          visibility?: string
          want_to_meet?: string
          what_i_do?: string
        }
        Update: {
          availability?: string
          avatar_url?: string | null
          bio?: string
          boundaries?: string
          building?: string
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
          linkedin_url?: string
          location?: string
          looking_for?: string
          name?: string
          onboarded?: boolean
          open_to?: string[]
          portrait_key?: string | null
          scheduling_enabled?: boolean
          thesis?: string
          title?: string
          updated_at?: string
          values_text?: string
          verification_public_summary?: string
          verified_at?: string | null
          verified_business?: string
          verified_role?: Database["public"]["Enums"]["verified_role"] | null
          visibility?: string
          want_to_meet?: string
          what_i_do?: string
        }
        Relationships: []
      }
      provider_endorsements: {
        Row: {
          created_at: string
          id: string
          note: string
          provider_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          provider_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          provider_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_endorsements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_fees: {
        Row: {
          fee_pct: number
          provider_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          fee_pct: number
          provider_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          fee_pct?: number
          provider_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_fees_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_request_matches: {
        Row: {
          created_at: string
          note: string
          provider_id: string
          request_id: string
          routed_by: string | null
        }
        Insert: {
          created_at?: string
          note?: string
          provider_id: string
          request_id: string
          routed_by?: string | null
        }
        Update: {
          created_at?: string
          note?: string
          provider_id?: string
          request_id?: string
          routed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_request_matches_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_request_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "provider_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_requests: {
        Row: {
          budget_range: string | null
          category: string
          created_at: string
          deal_value_cents: number | null
          engaged_at: string | null
          engaged_provider_id: string | null
          finished_at: string | null
          id: string
          matched_at: string | null
          need: string
          private_notes: string
          status: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          budget_range?: string | null
          category: string
          created_at?: string
          deal_value_cents?: number | null
          engaged_at?: string | null
          engaged_provider_id?: string | null
          finished_at?: string | null
          id?: string
          matched_at?: string | null
          need: string
          private_notes?: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Update: {
          budget_range?: string | null
          category?: string
          created_at?: string
          deal_value_cents?: number | null
          engaged_at?: string | null
          engaged_provider_id?: string | null
          finished_at?: string | null
          id?: string
          matched_at?: string | null
          need?: string
          private_notes?: string
          status?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_requests_engaged_provider_id_fkey"
            columns: ["engaged_provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_sent_at: string | null
          p256dh: string
          user_agent: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_sent_at?: string | null
          p256dh: string
          user_agent?: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_sent_at?: string | null
          p256dh?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      reciprocity_settings: {
        Row: {
          cooling_nudges: boolean
          last_nudge_at: string | null
          show_band: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cooling_nudges?: boolean
          last_nudge_at?: string | null
          show_band?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          cooling_nudges?: boolean
          last_nudge_at?: string | null
          show_band?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_requests: {
        Row: {
          connector_id: string | null
          created_at: string
          decline_reason: string | null
          id: string
          message: string | null
          requester_id: string
          responded_at: string | null
          status: string
          suggestion_id: string | null
          target_id: string | null
          target_member_id: string
          updated_at: string
        }
        Insert: {
          connector_id?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          message?: string | null
          requester_id: string
          responded_at?: string | null
          status?: string
          suggestion_id?: string | null
          target_id?: string | null
          target_member_id: string
          updated_at?: string
        }
        Update: {
          connector_id?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          message?: string | null
          requester_id?: string
          responded_at?: string | null
          status?: string
          suggestion_id?: string | null
          target_id?: string | null
          target_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_requests_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_requests_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "referral_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_requests_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_suggestions: {
        Row: {
          acted_at: string | null
          actioned_at: string | null
          connector_user_id: string | null
          context: Json | null
          created_at: string
          dismissed_at: string | null
          for_member_id: string
          for_user_id: string | null
          generated_at: string
          id: string
          path_explanation: string | null
          reason: string | null
          score: number | null
          shared_context: string | null
          snoozed_until: string | null
          status: string
          strength_score: number | null
          suggested_member_id: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          actioned_at?: string | null
          connector_user_id?: string | null
          context?: Json | null
          created_at?: string
          dismissed_at?: string | null
          for_member_id: string
          for_user_id?: string | null
          generated_at?: string
          id?: string
          path_explanation?: string | null
          reason?: string | null
          score?: number | null
          shared_context?: string | null
          snoozed_until?: string | null
          status?: string
          strength_score?: number | null
          suggested_member_id: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          actioned_at?: string | null
          connector_user_id?: string | null
          context?: Json | null
          created_at?: string
          dismissed_at?: string | null
          for_member_id?: string
          for_user_id?: string | null
          generated_at?: string
          id?: string
          path_explanation?: string | null
          reason?: string | null
          score?: number | null
          shared_context?: string | null
          snoozed_until?: string | null
          status?: string
          strength_score?: number | null
          suggested_member_id?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_suggestions_connector_user_id_fkey"
            columns: ["connector_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_suggestions_for_member_id_fkey"
            columns: ["for_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_suggestions_suggested_member_id_fkey"
            columns: ["suggested_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_suggestions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          conversion_date: string | null
          created_at: string
          id: string
          notes: string | null
          referral_code: string | null
          referred_email: string | null
          referred_id: string | null
          referrer_id: string
          reward_amount: number | null
          reward_paid_at: string | null
          reward_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conversion_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          referral_code?: string | null
          referred_email?: string | null
          referred_id?: string | null
          referrer_id: string
          reward_amount?: number | null
          reward_paid_at?: string | null
          reward_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conversion_date?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          referral_code?: string | null
          referred_email?: string | null
          referred_id?: string | null
          referrer_id?: string
          reward_amount?: number | null
          reward_paid_at?: string | null
          reward_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_rooms: {
        Row: {
          commitments: Json
          created_at: string
          id: string
          intro_request_id: string
          meeting_at: string | null
          next_steps: Json
          outcome: string
          participant_a: string
          participant_b: string
          shared_links: Json
          status: string
          updated_at: string
        }
        Insert: {
          commitments?: Json
          created_at?: string
          id?: string
          intro_request_id: string
          meeting_at?: string | null
          next_steps?: Json
          outcome?: string
          participant_a: string
          participant_b: string
          shared_links?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          commitments?: Json
          created_at?: string
          id?: string
          intro_request_id?: string
          meeting_at?: string | null
          next_steps?: Json
          outcome?: string
          participant_a?: string
          participant_b?: string
          shared_links?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_rooms_intro_request_id_fkey"
            columns: ["intro_request_id"]
            isOneToOne: true
            referencedRelation: "intro_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_signals: {
        Row: {
          count_90d: number
          last_at: string | null
          member_id: string
          next_at: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count_90d?: number
          last_at?: string | null
          member_id: string
          next_at?: string | null
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count_90d?: number
          last_at?: string | null
          member_id?: string
          next_at?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      relationship_snoozes: {
        Row: {
          created_at: string
          mode: string
          subject_id: string
          subject_kind: string
          until: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          mode: string
          subject_id: string
          subject_kind: string
          until?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          mode?: string
          subject_id?: string
          subject_kind?: string
          until?: string | null
          user_id?: string
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
      reputation_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          member_id: string
          points_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          member_id: string
          points_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          member_id?: string
          points_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reputation_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reputation_scores: {
        Row: {
          created_at: string
          id: string
          intro_score: number | null
          member_id: string
          negative_outcomes: number | null
          overall_score: number
          positive_outcomes: number | null
          quality_score: number | null
          reliability_score: number | null
          response_score: number | null
          total_intros_given: number | null
          total_intros_received: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro_score?: number | null
          member_id: string
          negative_outcomes?: number | null
          overall_score?: number
          positive_outcomes?: number | null
          quality_score?: number | null
          reliability_score?: number | null
          response_score?: number | null
          total_intros_given?: number | null
          total_intros_received?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intro_score?: number | null
          member_id?: string
          negative_outcomes?: number | null
          overall_score?: number
          positive_outcomes?: number | null
          quality_score?: number | null
          reliability_score?: number | null
          response_score?: number | null
          total_intros_given?: number | null
          total_intros_received?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reputation_scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_rooms: {
        Row: {
          assumptions: Json
          baseline: Json
          created_at: string
          id: string
          linked_opportunity_id: string | null
          linked_opportunity_key: string | null
          notes: string
          owner_id: string
          recorded_inputs: Json
          scenario_result: Json
          scenario_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          baseline?: Json
          created_at?: string
          id?: string
          linked_opportunity_id?: string | null
          linked_opportunity_key?: string | null
          notes?: string
          owner_id?: string
          recorded_inputs?: Json
          scenario_result?: Json
          scenario_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          baseline?: Json
          created_at?: string
          id?: string
          linked_opportunity_id?: string | null
          linked_opportunity_key?: string | null
          notes?: string
          owner_id?: string
          recorded_inputs?: Json
          scenario_result?: Json
          scenario_type?: string
          title?: string
          updated_at?: string
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
      service_providers: {
        Row: {
          category: string
          client_size: string
          contact_user_id: string | null
          created_at: string
          description: string
          id: string
          name: string
          nominated_by: string | null
          nomination_note: string
          regions: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          category: string
          client_size?: string
          contact_user_id?: string | null
          created_at?: string
          description: string
          id?: string
          name: string
          nominated_by?: string | null
          nomination_note?: string
          regions?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string
          client_size?: string
          contact_user_id?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          nominated_by?: string | null
          nomination_note?: string
          regions?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          id: string
          is_demo: boolean
          kind: string
          member_id: string
          text: string
          when_label: string
        }
        Insert: {
          id: string
          is_demo?: boolean
          kind: string
          member_id: string
          text: string
          when_label?: string
        }
        Update: {
          id?: string
          is_demo?: boolean
          kind?: string
          member_id?: string
          text?: string
          when_label?: string
        }
        Relationships: []
      }
      storefront_proposals: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          line_items: Json | null
          recipient_id: string | null
          responded_at: string | null
          response_notes: string | null
          sender_id: string
          sent_at: string | null
          status: string
          storefront_id: string
          terms: string | null
          title: string
          updated_at: string
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          line_items?: Json | null
          recipient_id?: string | null
          responded_at?: string | null
          response_notes?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string
          storefront_id: string
          terms?: string | null
          title: string
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          line_items?: Json | null
          recipient_id?: string | null
          responded_at?: string | null
          response_notes?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string
          storefront_id?: string
          terms?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefront_proposals_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_proposals_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_proposals_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefronts: {
        Row: {
          banner_url: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          headline: string | null
          id: string
          logo_url: string | null
          metadata: Json | null
          name: string
          owner_id: string
          primary_color: string | null
          published_at: string | null
          slug: string | null
          status: string
          tags: string[] | null
          updated_at: string
          visibility: string
          website_url: string | null
        }
        Insert: {
          banner_url?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name: string
          owner_id: string
          primary_color?: string | null
          published_at?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          visibility?: string
          website_url?: string | null
        }
        Update: {
          banner_url?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          owner_id?: string
          primary_color?: string | null
          published_at?: string | null
          slug?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          visibility?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storefronts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndication_interests: {
        Row: {
          created_at: string
          follow_up_date: string | null
          id: string
          intended_amount: number | null
          interest_level: string
          member_id: string
          notes: string | null
          room_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_up_date?: string | null
          id?: string
          intended_amount?: number | null
          interest_level?: string
          member_id: string
          notes?: string | null
          room_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_up_date?: string | null
          id?: string
          intended_amount?: number | null
          interest_level?: string
          member_id?: string
          notes?: string | null
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndication_interests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndication_interests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "syndication_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      syndication_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          room_id: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndication_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "syndication_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndication_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndication_room_members: {
        Row: {
          commitment_amount: number | null
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          member_id: string
          role: string
          room_id: string
          status: string
          updated_at: string
          user_id: string | null
          vote: string | null
          vote_note: string | null
          voted_at: string | null
        }
        Insert: {
          commitment_amount?: number | null
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          member_id: string
          role?: string
          room_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vote?: string | null
          vote_note?: string | null
          voted_at?: string | null
        }
        Update: {
          commitment_amount?: number | null
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          member_id?: string
          role?: string
          room_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vote?: string | null
          vote_note?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndication_room_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndication_room_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndication_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "syndication_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndication_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syndication_rooms: {
        Row: {
          close_date: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          deadline: string | null
          deal_type: string | null
          decision: string | null
          description: string | null
          documents: Json | null
          id: string
          max_investors: number | null
          metadata: Json | null
          min_investment: number | null
          opportunity_size: string | null
          room_type: string
          status: string
          target_raise: number | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          close_date?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          deal_type?: string | null
          decision?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          max_investors?: number | null
          metadata?: Json | null
          min_investment?: number | null
          opportunity_size?: string | null
          room_type?: string
          status?: string
          target_raise?: number | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          close_date?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          deal_type?: string | null
          decision?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          max_investors?: number | null
          metadata?: Json | null
          min_investment?: number | null
          opportunity_size?: string | null
          room_type?: string
          status?: string
          target_raise?: number | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndication_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_records: {
        Row: {
          active_seconds: number
          baseline_kind: string | null
          baseline_samples: number
          baseline_seconds: number | null
          finished_at: string | null
          id: string
          owner_id: string
          started_at: string
          task: string
        }
        Insert: {
          active_seconds?: number
          baseline_kind?: string | null
          baseline_samples?: number
          baseline_seconds?: number | null
          finished_at?: string | null
          id?: string
          owner_id: string
          started_at?: string
          task: string
        }
        Update: {
          active_seconds?: number
          baseline_kind?: string | null
          baseline_samples?: number
          baseline_seconds?: number | null
          finished_at?: string | null
          id?: string
          owner_id?: string
          started_at?: string
          task?: string
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
      track_record_settings: {
        Row: {
          show_on_profile: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          show_on_profile?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          show_on_profile?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_checks: {
        Row: {
          check_type: string
          checked_at: string
          confidence: number
          evidence_summary: string
          id: string
          result: string
          source_type: string
          verification_id: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          confidence?: number
          evidence_summary?: string
          id?: string
          result?: string
          source_type?: string
          verification_id: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          confidence?: number
          evidence_summary?: string
          id?: string
          result?: string
          source_type?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_checks_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "member_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: Json
          event: string
          id: string
          summary: string
          user_id: string | null
          verification_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: string
          summary?: string
          user_id?: string | null
          verification_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          summary?: string
          user_id?: string | null
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_events_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "member_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_evidence: {
        Row: {
          confidence: number
          created_at: string
          evidence_type: string
          expires_at: string | null
          id: string
          label: string
          private_storage_path: string | null
          purged: boolean
          result: string
          source_url: string
          status: string
          user_id: string
          verification_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          evidence_type: string
          expires_at?: string | null
          id?: string
          label?: string
          private_storage_path?: string | null
          purged?: boolean
          result?: string
          source_url?: string
          status?: string
          user_id?: string
          verification_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          evidence_type?: string
          expires_at?: string | null
          id?: string
          label?: string
          private_storage_path?: string | null
          purged?: boolean
          result?: string
          source_url?: string
          status?: string
          user_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_evidence_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "member_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          email: string
          id: string
          name: string
          requested_at: string
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          email: string
          id?: string
          name?: string
          requested_at?: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          email?: string
          id?: string
          name?: string
          requested_at?: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      warm_path_optouts: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whitelist_entries: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
          note: string
          status: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
          note?: string
          status?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
          note?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      members: {
        Row: {
          availability: string | null
          best_path: string[] | null
          bio: string | null
          company: string | null
          confidence: number | null
          created_at: string | null
          dont_do: string | null
          expertise: string[] | null
          focus: string | null
          id: string | null
          industry: string | null
          initials: string | null
          intro_state: string | null
          is_demo: boolean | null
          joined: string | null
          last_interaction_days: number | null
          location: string | null
          mutuals: string[] | null
          name: string | null
          needs: string[] | null
          next_action: string | null
          offers: string[] | null
          opportunity_high: number | null
          opportunity_low: number | null
          radar: string | null
          relationship_status: string | null
          role: string | null
          score: Json | null
          score_total: number | null
          tags: string[] | null
          thesis: string | null
          title: string | null
          why_now: string | null
          why_them: string | null
          why_you: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_delegate_invite: { Args: { p_id: string }; Returns: undefined }
      accept_peer_group_agreement: {
        Args: { p_group: string }
        Returns: string
      }
      act_on_exchange_opportunity: {
        Args: { p_action: string; p_id: string; p_note?: string }
        Returns: undefined
      }
      activation_flags: { Args: { p_user: string }; Returns: Json }
      add_capability_finding: {
        Args: {
          p_claim: string
          p_confidence?: number
          p_evidence?: Json
          p_kind: string
          p_run_id: string
          p_severity?: string
          p_unknowns?: Json
        }
        Returns: string
      }
      add_capability_finding_v2: {
        Args: { p: Json; p_run_id: string }
        Returns: string
      }
      add_capability_proposal: {
        Args: {
          p_action: Json
          p_finding_id?: string
          p_impact: string
          p_run_id: string
          p_summary: string
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      add_verification_evidence: {
        Args: {
          p_evidence_type: string
          p_label?: string
          p_source_url?: string
          p_storage_path?: string
        }
        Returns: string
      }
      admin_concierge_queue: { Args: never; Returns: Json }
      admin_decide_peer_group_request: {
        Args: { p_accept: boolean; p_group?: string; p_request: string }
        Returns: string
      }
      admin_delete_impact_report: { Args: { p_id: string }; Returns: undefined }
      admin_executive_applications: { Args: never; Returns: Json }
      admin_growth_metrics: { Args: { p_weeks?: number }; Returns: Json }
      admin_impact_report: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      admin_network_health: { Args: never; Returns: Json }
      admin_platform_overview: { Args: never; Returns: Json }
      admin_provider_requests: { Args: never; Returns: Json }
      admin_provider_summary: { Args: never; Returns: Json }
      admin_revenue_summary: { Args: never; Returns: Json }
      admin_save_impact_report: {
        Args: {
          p_from: string
          p_headline?: string
          p_label: string
          p_slug?: string
          p_to: string
        }
        Returns: string
      }
      admin_set_impact_report_published: {
        Args: { p_id: string; p_published: boolean }
        Returns: undefined
      }
      admin_set_provider_fee: {
        Args: { p_pct: number; p_provider: string }
        Returns: undefined
      }
      agent_inbound_prepare: {
        Args: { p_domain: string; p_handle: string; p_text_hash: string }
        Returns: Json
      }
      agent_inbound_record: {
        Args: {
          p: Json
          p_member: string
          p_reasons: string[]
          p_score: number
          p_status: string
        }
        Returns: string
      }
      agent_key_lookup: { Args: { p_hash: string }; Returns: Json }
      agent_rate_hit: {
        Args: { p_bucket: string; p_limit: number; p_window_start: string }
        Returns: boolean
      }
      agent_request_contact: { Args: { p_id: string }; Returns: string }
      agent_topics_ok: { Args: { p: string[] }; Returns: boolean }
      answer_business_lobby: {
        Args: { p_accept: boolean; p_knock: string }
        Returns: string
      }
      append_capability_event: {
        Args: {
          p_detail?: Json
          p_event: string
          p_run_id: string
          p_summary?: string
        }
        Returns: string
      }
      apply_for_executive: {
        Args: {
          p_company: string
          p_name: string
          p_profile_url: string
          p_reason: string
          p_title: string
        }
        Returns: string
      }
      apply_professional_field: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      auto_verify_invited: {
        Args: { p_email: string; p_uid: string }
        Returns: undefined
      }
      business_post_valid: {
        Args: {
          p_business: Json
          p_detail: string
          p_kind: string
          p_title: string
        }
        Returns: boolean
      }
      call_app: { Args: { p_body?: Json; p_path: string }; Returns: undefined }
      can_delegate: {
        Args: {
          p_access: string
          p_capability: string
          p_principal: string
          p_subject_id: string
          p_subject_type: string
        }
        Returns: boolean
      }
      can_read_peer_group: { Args: { p_group: string }; Returns: boolean }
      can_see_member_event: { Args: { p_event: string }; Returns: boolean }
      capability_record_owned_by: {
        Args: { p_id: string; p_owner: string; p_type: string }
        Returns: boolean
      }
      capability_transition_allowed: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      capability_usage_totals: {
        Args: { p_days?: number }
        Returns: {
          day: string
          runs: number
          tier: string
        }[]
      }
      claim_basic_membership: { Args: never; Returns: string }
      claim_early_access: {
        Args: { p_invite_code?: string }
        Returns: {
          founding_member_number: number
          mode: string
          status: string
        }[]
      }
      cohort_activation: {
        Args: { p_cohort: string }
        Returns: {
          code: string
          email: string
          expires_at: string
          invite_id: string
          invitee_company: string
          invitee_name: string
          stage: string
          user_id: string
        }[]
      }
      concierge_suggest: {
        Args: {
          p_ask?: string
          p_for: string
          p_note: string
          p_suggested: string
        }
        Returns: string
      }
      confirm_professional_profile: {
        Args: {
          p_candidate: Json
          p_channel: string
          p_confidence: number
          p_person_id: string
          p_query: Json
          p_reasons: string[]
          p_run_id: string
        }
        Returns: Json
      }
      cooling_candidates: {
        Args: { p_user: string }
        Returns: {
          c_cadence: number
          c_id: string
          c_kind: string
          c_last: string
          c_name: string
          c_quiet: number
          c_touches: number
        }[]
      }
      create_agent_key: {
        Args: {
          p_key_hash: string
          p_key_prefix: string
          p_name: string
          p_scopes: string[]
          p_user: string
        }
        Returns: string
      }
      create_cohort_invites: {
        Args: { p_cohort: string; p_days?: number; p_rows: Json }
        Returns: {
          code: string
          email: string
          outcome: string
        }[]
      }
      create_meeting: {
        Args: {
          p_agenda?: string
          p_intro?: string
          p_invitees: string[]
          p_scheduled_for?: string
          p_title: string
        }
        Returns: string
      }
      create_org_invite: {
        Args: { p_max_uses?: number; p_org: string }
        Returns: string
      }
      create_organization: {
        Args: { p_domain?: string; p_name: string }
        Returns: string
      }
      decide_agent_request: {
        Args: { p_decision: string; p_id: string }
        Returns: Json
      }
      decide_capability_proposal: {
        Args: { p_decision: string; p_id: string }
        Returns: string
      }
      decline_delegate_invite: { Args: { p_id: string }; Returns: undefined }
      dismiss_activation: { Args: never; Returns: undefined }
      dm_receipts_enabled: { Args: { p_user: string }; Returns: boolean }
      dm_thread_receipts_visible: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      end_meeting: { Args: { p_meeting: string }; Returns: undefined }
      enrichment_clean: { Args: { p: Json }; Returns: Json }
      ensure_default_pipeline: { Args: never; Returns: string }
      entity_owned_by: {
        Args: { p_id: string; p_owner: string; p_type: string }
        Returns: boolean
      }
      event_attendees: { Args: { p_event: string }; Returns: Json }
      evidence_workspace: {
        Args: { p_action?: string; p_data?: Json }
        Returns: Json
      }
      exchange_visible: {
        Args: {
          p: Database["public"]["Tables"]["professional_opportunities"]["Row"]
        }
        Returns: boolean
      }
      find_warm_paths: {
        Args: { p_company?: string; p_limit?: number; p_target_member?: string }
        Returns: {
          band: string
          connector_id: string
          connector_name: string
          connector_reasons: string[]
          kind: string
          reasons: string[]
          score: number
          target_company: string
          target_id: string
          target_name: string
          target_title: string
        }[]
      }
      founding_stats: {
        Args: never
        Returns: {
          approved: number
          capacity: number
          mode: string
        }[]
      }
      get_passport: { Args: { p_token: string }; Returns: Json }
      giver_band: {
        Args: { p_confirmed: number; p_people: number; p_score: number }
        Returns: string
      }
      giver_band_of: { Args: { p_user: string }; Returns: string }
      giver_bands: {
        Args: { p_members: string[] }
        Returns: {
          band: string
          member_id: string
        }[]
      }
      has_delegate_permission: {
        Args: { p_perm: string; p_principal: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      help_tokens: { Args: { p_text: string }; Returns: string[] }
      hr_workspace: { Args: { p_action: string; p_data?: Json }; Returns: Json }
      icp_save: {
        Args: { p_data: Json; p_expected?: number; p_key: string }
        Returns: Json
      }
      impact_freeze: { Args: { p: Json }; Returns: Json }
      impact_metrics: { Args: { p_from: string; p_to: string }; Returns: Json }
      impact_suppress_counts: { Args: { p: Json }; Returns: Json }
      intro_member_uuid: { Args: { p_member_id: string }; Returns: string }
      invite_preview: {
        Args: { p_code: string }
        Returns: {
          inviter_name: string
          valid: boolean
        }[]
      }
      invite_to_meeting: {
        Args: { p_meeting: string; p_user: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved_member: { Args: { p_user: string }; Returns: boolean }
      is_circle_member: { Args: { p_circle: string }; Returns: boolean }
      is_intro_party: { Args: { p_intro: string }; Returns: boolean }
      is_live_member: { Args: never; Returns: boolean }
      is_meeting_participant: { Args: { p_meeting: string }; Returns: boolean }
      is_member_event_host: { Args: { p_event: string }; Returns: boolean }
      is_member_event_invitee: { Args: { p_event: string }; Returns: boolean }
      is_network_avatar_visible: {
        Args: { p_owner_path: string }
        Returns: boolean
      }
      is_org_admin: { Args: { p_org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      is_peer_group_facilitator: { Args: { p_group: string }; Returns: boolean }
      is_peer_group_member: { Args: { p_group: string }; Returns: boolean }
      is_syndication_room_creator: {
        Args: { p_room: string }
        Returns: boolean
      }
      is_syndication_room_member: { Args: { p_room: string }; Returns: boolean }
      is_uuid_text: { Args: { p: string }; Returns: boolean }
      is_verified_member: { Args: never; Returns: boolean }
      issue_membership_card: {
        Args: { p_announce?: boolean; p_user: string }
        Returns: undefined
      }
      join_organization: { Args: { p_code: string }; Returns: string }
      join_waitlist: {
        Args: { p_email: string; p_name?: string }
        Returns: undefined
      }
      knock_business_lobby: {
        Args: { p_intro: string; p_note?: string }
        Returns: string
      }
      link_entities: {
        Args: {
          p_from_id: string
          p_from_type: string
          p_relation?: string
          p_to_id: string
          p_to_type: string
        }
        Returns: string
      }
      linkedin_handle: { Args: { p_url: string }; Returns: string }
      list_exchange_opportunities: { Args: never; Returns: Json }
      list_member_events: { Args: never; Returns: Json }
      log_app_error: {
        Args: {
          p_message: string
          p_stack?: string
          p_url?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      lookup_membership_code: {
        Args: { p_code: string }
        Returns: {
          holder_name: string
          member_id: string
          status: string
          verified_at: string
        }[]
      }
      manage_meeting_record: {
        Args: {
          p_action: string
          p_agenda?: string
          p_meeting: string
          p_scheduled?: string
          p_title?: string
        }
        Returns: undefined
      }
      mark_approval_executed: { Args: { p_id: string }; Returns: undefined }
      mark_meeting_joined: { Args: { p_meeting: string }; Returns: undefined }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      mark_thread_read: { Args: { p_thread_id: string }; Returns: string }
      match_evidence_signals: {
        Args: { p_members: string[] }
        Returns: {
          approved_vouches: number
          confirmed_partners: number
          member_id: string
          newcomer_until: string
          successful_partners: number
        }[]
      }
      match_reasoning: {
        Args: { p_target: string; p_viewer: string }
        Returns: Json
      }
      meeting_topic_id: { Args: { p_topic: string }; Returns: string }
      member_directory_facets: {
        Args: never
        Returns: {
          kind: string
          members: number
          value: string
        }[]
      }
      member_giver_band: { Args: { p_member: string }; Returns: string }
      member_ids_for_emails: {
        Args: { p_emails: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      member_profile_strength: { Args: { p_user: string }; Returns: number }
      member_track_record: { Args: { p_member: string }; Returns: Json }
      membership_card_name: { Args: { p_user: string }; Returns: string }
      my_activation: { Args: never; Returns: Json }
      my_business_lobby_contacts: {
        Args: never
        Returns: {
          available_until: string
          headline: string
          intro_request_id: string
          other_id: string
          other_name: string
        }[]
      }
      my_capability_usage_today: {
        Args: never
        Returns: {
          daily_limit: number
          tier: string
          used: number
        }[]
      }
      my_cooling_relationships: { Args: { p_limit?: number }; Returns: Json }
      my_delegate_invites: {
        Args: never
        Returns: {
          created_at: string
          id: string
          permissions: string[]
          principal_name: string
          role_label: string
          status: string
        }[]
      }
      my_due_outcome_checkins: {
        Args: never
        Returns: {
          accepted_at: string
          checkpoint: number
          counterpart_id: string
          days_since: number
          intro_request_id: string
          last_stage: string
        }[]
      }
      my_executive_application: { Args: never; Returns: Json }
      my_impact_card: { Args: never; Returns: Json }
      my_intro_allowance: { Args: never; Returns: Json }
      my_intro_outcome_notes: {
        Args: never
        Returns: {
          id: string
          private_note: string
        }[]
      }
      my_intro_participant_names: {
        Args: { p_intro_ids?: string[] }
        Returns: {
          intro_request_id: string
          other_id: string
          other_name: string
        }[]
      }
      my_invite_code: { Args: never; Returns: string }
      my_membership_tier: { Args: never; Returns: string }
      my_pending_intro_requests: {
        Args: never
        Returns: {
          can_nudge: boolean
          created_at: string
          days_waiting: number
          id: string
          nudged_at: string
          reason: string
          target_name: string
          target_user_id: string
        }[]
      }
      my_provider_requests: { Args: never; Returns: Json }
      my_reciprocity: { Args: never; Returns: Json }
      my_referrals: {
        Args: never
        Returns: {
          approved: boolean
          joined_at: string
          member_id: string
          name: string
          verified: boolean
        }[]
      }
      my_relationship_evidence: {
        Args: { p_members?: string[] }
        Returns: {
          accepted_intro_count: number
          connection_saved: boolean
          introduction_count: number
          joined_meetings: number
          last_meeting_at: string
          last_message_at: string
          member_id: string
          message_count: number
        }[]
      }
      my_top_connections: {
        Args: never
        Returns: {
          member_id: string
          reason: string
        }[]
      }
      my_unread_counts: {
        Args: never
        Returns: {
          peer_read_at: string
          seen_message_id: string
          thread_id: string
          unread: number
        }[]
      }
      my_verification: {
        Args: never
        Returns: {
          business_domain: string
          business_name: string
          claimed_role: string
          decision_reason: string
          evidence_count: number
          proof_retention: string
          public_summary: string
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
          verification_level: number
          verified_at: string
          verified_role: Database["public"]["Enums"]["verified_role"]
        }[]
      }
      network_brief: {
        Args: { p_days?: number; p_user: string }
        Returns: Json
      }
      network_health: { Args: never; Returns: Json }
      network_proof_metrics: { Args: { p_days?: number }; Returns: Json }
      network_value: {
        Args: { p_action: string; p_data?: Json }
        Returns: Json
      }
      new_membership_code: { Args: { p_name: string }; Returns: string }
      normalize_company_name: { Args: { p: string }; Returns: string }
      nudge_incomplete_onboarding: { Args: never; Returns: number }
      nudge_intro_request: { Args: { p_id: string }; Returns: string }
      org_relationship_coverage: {
        Args: { p_org: string }
        Returns: {
          active_owners: number
          contact_company: string
          contact_key: string
          contact_member_id: string
          contact_name: string
          coverage: string
          departed_owners: number
        }[]
      }
      owns_entity: { Args: { p_id: string; p_type: string }; Returns: boolean }
      owns_provider_request: { Args: { p_request: string }; Returns: boolean }
      promote_event_waitlist: { Args: { p_event: string }; Returns: number }
      provider_contact_is_me: { Args: { p_provider: string }; Returns: boolean }
      provider_directory: { Args: never; Returns: Json }
      provider_inbox: { Args: never; Returns: Json }
      provider_is_approved: { Args: { p_provider: string }; Returns: boolean }
      provider_request_engage: {
        Args: { p_provider: string; p_request: string }
        Returns: undefined
      }
      provider_request_route: {
        Args: { p_note?: string; p_providers: string[]; p_request: string }
        Returns: number
      }
      provider_request_update: {
        Args: {
          p_deal_value_cents?: number
          p_request: string
          p_status: string
        }
        Returns: undefined
      }
      publish_exchange_opportunity: { Args: { p_input: Json }; Returns: string }
      purge_verification_proof: { Args: never; Returns: number }
      reciprocity_events: {
        Args: { p_user: string }
        Returns: {
          ev_at: string
          ev_confirmed: boolean
          ev_counterpart: string
          ev_direction: string
          ev_kind: string
          ev_weight: number
        }[]
      }
      record_capability_web_domain: {
        Args: { p_domain: string; p_run_id: string }
        Returns: undefined
      }
      record_finding_outcome: {
        Args: {
          p_actual: Json
          p_evidence: Json
          p_id: string
          p_recovered: number
        }
        Returns: undefined
      }
      record_org_departure: {
        Args: { p_org: string; p_user: string }
        Returns: undefined
      }
      redeem_meeting_invite: { Args: { p_code: string }; Returns: string }
      reject_professional_candidate: {
        Args: { p_person_id: string; p_profile_url: string }
        Returns: undefined
      }
      relative_label: { Args: { ts: string }; Returns: string }
      request_verified_intro: {
        Args: { p_note?: string; p_target: string }
        Returns: Json
      }
      resolve_capability_finding: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      review_executive_application: {
        Args: { p_approve: boolean; p_user: string }
        Returns: undefined
      }
      review_member_verification: {
        Args: {
          p_notes?: string
          p_public_summary?: string
          p_reason?: string
          p_status: string
          p_user_id: string
          p_verified_role?: string
        }
        Returns: undefined
      }
      revoke_agent_key: { Args: { p_id: string }; Returns: boolean }
      revoke_cohort_invite: { Args: { p_invite: string }; Returns: undefined }
      revoke_meeting_invite: { Args: { p_meeting: string }; Returns: undefined }
      rotate_meeting_invite: { Args: { p_meeting: string }; Returns: Json }
      rsvp_event: {
        Args: { p_choice: string; p_event: string }
        Returns: string
      }
      run_verification_scan: { Args: { p_user: string }; Returns: string }
      save_workspace_state: {
        Args: { p_base_version: number; p_data: Json; p_key: string }
        Returns: {
          current_data: Json
          current_version: number
          saved: boolean
          saved_at: string
        }[]
      }
      search_members: {
        Args: {
          p_expertise?: string[]
          p_industries?: string[]
          p_limit?: number
          p_location?: string
          p_looking_for?: string
          p_offset?: number
          p_query?: string
          p_verified_only?: boolean
        }
        Returns: {
          avatar_url: string
          can_help_with: string
          company: string
          expertise: string[]
          id: string
          industries: string[]
          initials: string
          location: string
          looking_for: string
          name: string
          title: string
          total_count: number
          verified: boolean
        }[]
      }
      send_cooling_nudges: { Args: never; Returns: number }
      send_event_reminders: { Args: never; Returns: number }
      set_business_lobby: {
        Args: { p_headline?: string; p_minutes: number }
        Returns: string
      }
      set_capability_run_status: {
        Args: {
          p_engine?: string
          p_error_code?: string
          p_error_message?: string
          p_progress?: number
          p_result?: Json
          p_run_id: string
          p_status: string
          p_step_label?: string
        }
        Returns: undefined
      }
      set_executive_recommendation_display: {
        Args: { p_display_approved: boolean; p_id: string }
        Returns: undefined
      }
      set_finding_baseline: {
        Args: { p_baseline: Json; p_id: string; p_target: Json }
        Returns: undefined
      }
      set_meeting_notes_consent: {
        Args: { p_meeting: string; p_on: boolean }
        Returns: undefined
      }
      set_meeting_recording: {
        Args: { p_meeting: string; p_on: boolean }
        Returns: undefined
      }
      set_my_goals: { Args: { p_goals: string[] }; Returns: number }
      set_org_role: {
        Args: { p_org: string; p_role: string; p_user: string }
        Returns: undefined
      }
      set_read_receipts: { Args: { p_on: boolean }; Returns: boolean }
      set_reciprocity_settings: {
        Args: { p_cooling_nudges?: boolean; p_show_band?: boolean }
        Returns: Json
      }
      set_relationship_snooze: {
        Args: { p_id: string; p_kind: string; p_mode: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sms_group: { Args: { p_kind: string }; Returns: string }
      start_capability_run: {
        Args: {
          p_capability_id: string
          p_cost_tier?: string
          p_input?: Json
          p_input_hash?: string
          p_principal?: string
          p_scopes?: string[]
          p_subject_id: string
          p_subject_type: string
          p_verb: string
        }
        Returns: string
      }
      submit_marketplace_pilot_interest: {
        Args: { p_response: Json }
        Returns: string
      }
      submit_member_verification: {
        Args: {
          p_business_dba: string
          p_business_domain: string
          p_business_location: string
          p_business_name: string
          p_claimed_role: string
          p_display_name: string
          p_legal_name: string
          p_professional_url: string
          p_registration_jurisdiction?: string
          p_registration_number?: string
          p_work_email: string
        }
        Returns: string
      }
      touch_activity: { Args: never; Returns: undefined }
      track_record_band: {
        Args: { p_part: number; p_whole: number }
        Returns: string
      }
      update_my_executive_recommendation: {
        Args: {
          p_body: string
          p_id: string
          p_outcome?: string
          p_relationship_context?: string
          p_who_should_meet?: string
        }
        Returns: undefined
      }
      visible_member_profiles: {
        Args: { p_limit?: number; p_member_ids?: string[]; p_offset?: number }
        Returns: {
          profile: Json
        }[]
      }
      ways_to_give: { Args: never; Returns: Json }
      wp_connected: { Args: { p_a: string; p_b: string }; Returns: boolean }
      wp_response_band: {
        Args: { p_accepted: number; p_decided: number }
        Returns: string
      }
      wp_warmth: { Args: { p_score: number }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
      privacy_scope_v2:
        | "private"
        | "team"
        | "organization"
        | "shareable"
        | "public"
      verification_status:
        | "pending"
        | "scanning"
        | "manual_review"
        | "needs_more_proof"
        | "verified"
        | "rejected"
        | "suspended"
      verified_role:
        | "ceo"
        | "founder"
        | "owner"
        | "managing_partner"
        | "principal"
        | "other"
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
      app_role: ["admin", "moderator", "member"],
      privacy_scope_v2: [
        "private",
        "team",
        "organization",
        "shareable",
        "public",
      ],
      verification_status: [
        "pending",
        "scanning",
        "manual_review",
        "needs_more_proof",
        "verified",
        "rejected",
        "suspended",
      ],
      verified_role: [
        "ceo",
        "founder",
        "owner",
        "managing_partner",
        "principal",
        "other",
      ],
    },
  },
} as const
