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
          is_demo: boolean
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
          is_demo?: boolean
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
          is_demo?: boolean
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
          visibility: string
          want_to_meet: string
        }
        Insert: {
          availability?: string
          avatar_url?: string | null
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
          visibility?: string
          want_to_meet?: string
        }
        Update: {
          availability?: string
          avatar_url?: string | null
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
          visibility?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_live_member: { Args: never; Returns: boolean }
      join_waitlist: {
        Args: { p_email: string; p_name?: string }
        Returns: undefined
      }
      relative_label: { Args: { ts: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
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
      app_role: ["admin", "moderator", "member"],
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
