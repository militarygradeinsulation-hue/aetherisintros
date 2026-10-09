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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      admin_network_health: { Args: never; Returns: Json }
      admin_revenue_summary: { Args: never; Returns: Json }
      append_capability_event: {
        Args: {
          p_detail?: Json
          p_event: string
          p_run_id: string
          p_summary?: string
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
      decide_capability_proposal: {
        Args: { p_decision: string; p_id: string }
        Returns: string
      }
      decline_delegate_invite: { Args: { p_id: string }; Returns: undefined }
      end_meeting: { Args: { p_meeting: string }; Returns: undefined }
      enrichment_clean: { Args: { p: Json }; Returns: Json }
      ensure_default_pipeline: { Args: never; Returns: string }
      entity_owned_by: {
        Args: { p_id: string; p_owner: string; p_type: string }
        Returns: boolean
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
      is_org_admin: { Args: { p_org: string }; Returns: boolean }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
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
      mark_approval_executed: { Args: { p_id: string }; Returns: undefined }
      mark_meeting_joined: { Args: { p_meeting: string }; Returns: undefined }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      match_reasoning: {
        Args: { p_target: string; p_viewer: string }
        Returns: Json
      }
      meeting_topic_id: { Args: { p_topic: string }; Returns: string }
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
      my_capability_usage_today: {
        Args: never
        Returns: {
          daily_limit: number
          tier: string
          used: number
        }[]
      }
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
      my_intro_outcome_notes: {
        Args: never
        Returns: {
          id: string
          private_note: string
        }[]
      }
      my_invite_code: { Args: never; Returns: string }
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
      my_top_connections: {
        Args: never
        Returns: {
          member_id: string
          reason: string
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
      new_membership_code: { Args: { p_name: string }; Returns: string }
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
      purge_verification_proof: { Args: never; Returns: number }
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
      reject_professional_candidate: {
        Args: { p_person_id: string; p_profile_url: string }
        Returns: undefined
      }
      relative_label: { Args: { ts: string }; Returns: string }
      resolve_capability_finding: {
        Args: { p_id: string; p_note?: string; p_status: string }
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
      revoke_cohort_invite: { Args: { p_invite: string }; Returns: undefined }
      run_verification_scan: { Args: { p_user: string }; Returns: string }
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
      set_org_role: {
        Args: { p_org: string; p_role: string; p_user: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
