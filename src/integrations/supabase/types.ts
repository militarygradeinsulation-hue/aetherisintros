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
          member_id?: string | null
          notes?: string
          starts_at?: string
          title?: string
          updated_at?: string
          user_id?: string
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
          company_id: string | null
          created_at: string
          detail: string
          due_at: string | null
          id: string
          opportunity_id: string | null
          owner_id: string
          person_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assignee?: string
          company_id?: string | null
          created_at?: string
          detail?: string
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string
          person_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assignee?: string
          company_id?: string | null
          created_at?: string
          detail?: string
          due_at?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string
          person_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
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
          target_user_id: string | null
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
          target_user_id?: string | null
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
          target_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string | null
          id: string
          max_uses: number
          revoked: boolean
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          revoked?: boolean
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          revoked?: boolean
          uses?: number
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
      [_ in never]: never
    }
    Functions: {
      add_verification_evidence: {
        Args: {
          p_evidence_type: string
          p_label?: string
          p_source_url?: string
          p_storage_path?: string
        }
        Returns: string
      }
      claim_early_access: {
        Args: { p_invite_code?: string }
        Returns: {
          founding_member_number: number
          mode: string
          status: string
        }[]
      }
      ensure_default_pipeline: { Args: never; Returns: string }
      founding_stats: {
        Args: never
        Returns: {
          approved: number
          capacity: number
          mode: string
        }[]
      }
      get_passport: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_circle_member: { Args: { p_circle: string }; Returns: boolean }
      is_live_member: { Args: never; Returns: boolean }
      is_verified_member: { Args: never; Returns: boolean }
      join_waitlist: {
        Args: { p_email: string; p_name?: string }
        Returns: undefined
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
      purge_verification_proof: { Args: never; Returns: number }
      relative_label: { Args: { ts: string }; Returns: string }
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
      set_executive_recommendation_display: {
        Args: { p_display_approved: boolean; p_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
