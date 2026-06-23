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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          active: boolean
          channels: Json
          config: Json
          created_at: string
          created_by: string
          frequency: Database["public"]["Enums"]["alert_frequency"]
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["alert_kind"]
          last_triggered_at: string | null
          name: string
          target_member_ids: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          channels?: Json
          config?: Json
          created_at?: string
          created_by: string
          frequency?: Database["public"]["Enums"]["alert_frequency"]
          household_id: string
          id?: string
          kind: Database["public"]["Enums"]["alert_kind"]
          last_triggered_at?: string | null
          name: string
          target_member_ids?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          channels?: Json
          config?: Json
          created_at?: string
          created_by?: string
          frequency?: Database["public"]["Enums"]["alert_frequency"]
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["alert_kind"]
          last_triggered_at?: string | null
          name?: string
          target_member_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          household_id: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          household_id?: string | null
          id?: never
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          household_id?: string | null
          id?: never
          payload?: Json | null
        }
        Relationships: []
      }
      car_options: {
        Row: {
          cons: string | null
          created_at: string
          down_payment: number | null
          id: string
          installments: number | null
          interest_rate: number | null
          model: string
          module_id: string
          price: number
          pros: string | null
          year: number | null
        }
        Insert: {
          cons?: string | null
          created_at?: string
          down_payment?: number | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          model: string
          module_id: string
          price: number
          pros?: string | null
          year?: number | null
        }
        Update: {
          cons?: string | null
          created_at?: string
          down_payment?: number | null
          id?: string
          installments?: number | null
          interest_rate?: number | null
          model?: string
          module_id?: string
          price?: number
          pros?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "car_options_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          household_id: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          parent_id: string | null
          position: number
          type: Database["public"]["Enums"]["tx_type"]
        }
        Insert: {
          color?: string | null
          created_at?: string
          household_id: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          parent_id?: string | null
          position?: number
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Update: {
          color?: string | null
          created_at?: string
          household_id?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          parent_id?: string | null
          position?: number
          type?: Database["public"]["Enums"]["tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_items: {
        Row: {
          amount: number | null
          created_at: string
          data: Json
          due_date: string | null
          id: string
          module_id: string
          position: number
          status: string
          title: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          data?: Json
          due_date?: string | null
          id?: string
          module_id: string
          position?: number
          status?: string
          title: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          data?: Json
          due_date?: string | null
          id?: string
          module_id?: string
          position?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      education_items: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          module_id: string
          monthly_cost: number | null
          notes: string | null
          provider: string | null
          start_date: string | null
          student: string | null
          title: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          module_id: string
          monthly_cost?: number | null
          notes?: string | null
          provider?: string | null
          start_date?: string | null
          student?: string | null
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          module_id?: string
          monthly_cost?: number | null
          notes?: string | null
          provider?: string | null
          start_date?: string | null
          student?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_items: {
        Row: {
          bought: boolean
          budget: number | null
          created_at: string
          id: string
          idea: string | null
          module_id: string
          notes: string | null
          occasion: string | null
          occasion_date: string | null
          recipient: string
        }
        Insert: {
          bought?: boolean
          budget?: number | null
          created_at?: string
          id?: string
          idea?: string | null
          module_id: string
          notes?: string | null
          occasion?: string | null
          occasion_date?: string | null
          recipient: string
        }
        Update: {
          bought?: boolean
          budget?: number | null
          created_at?: string
          id?: string
          idea?: string | null
          module_id?: string
          notes?: string | null
          occasion?: string | null
          occasion_date?: string | null
          recipient?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          household_id: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          expires_at: string
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          display_name: string | null
          household_id: string
          id: string
          role: Database["public"]["Enums"]["household_role"]
          telegram_chat_id: number | null
          telegram_username: string | null
          user_id: string
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          household_id: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          telegram_chat_id?: number | null
          telegram_username?: string | null
          user_id: string
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          household_id?: string
          id?: string
          role?: Database["public"]["Enums"]["household_role"]
          telegram_chat_id?: number | null
          telegram_username?: string | null
          user_id?: string
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          budget: number | null
          config: Json
          cover_image_url: string | null
          created_at: string
          created_by: string
          end_date: string | null
          household_id: string
          id: string
          kind: Database["public"]["Enums"]["module_kind"]
          name: string
          start_date: string | null
          status: Database["public"]["Enums"]["module_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          config?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          end_date?: string | null
          household_id: string
          id?: string
          kind: Database["public"]["Enums"]["module_kind"]
          name: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["module_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          config?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          household_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["module_kind"]
          name?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["module_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_diary: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          entry_date: string
          hours_worked: number | null
          id: string
          module_id: string
          phase_id: string | null
          weather: string | null
          workers_count: number | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          hours_worked?: number | null
          id?: string
          module_id: string
          phase_id?: string | null
          weather?: string | null
          workers_count?: number | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          hours_worked?: number | null
          id?: string
          module_id?: string
          phase_id?: string | null
          weather?: string | null
          workers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_diary_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_diary_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "obra_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_gallery: {
        Row: {
          caption: string | null
          duration_seconds: number | null
          id: string
          image_url: string
          media_type: string
          module_id: string
          phase_id: string | null
          taken_at: string
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          duration_seconds?: number | null
          id?: string
          image_url: string
          media_type?: string
          module_id: string
          phase_id?: string | null
          taken_at?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          duration_seconds?: number | null
          id?: string
          image_url?: string
          media_type?: string
          module_id?: string
          phase_id?: string | null
          taken_at?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_gallery_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_gallery_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "obra_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_items: {
        Row: {
          actual_unit_price: number | null
          bought_at: string | null
          brand: string | null
          category: string
          created_at: string
          id: string
          module_id: string
          name: string
          notes: string | null
          phase_id: string | null
          quantity: number
          status: string
          supplier: string | null
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          actual_unit_price?: number | null
          bought_at?: string | null
          brand?: string | null
          category: string
          created_at?: string
          id?: string
          module_id: string
          name: string
          notes?: string | null
          phase_id?: string | null
          quantity?: number
          status?: string
          supplier?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          actual_unit_price?: number | null
          bought_at?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          module_id?: string
          name?: string
          notes?: string | null
          phase_id?: string | null
          quantity?: number
          status?: string
          supplier?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "obra_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_messages: {
        Row: {
          body: string
          direction: string
          id: string
          module_id: string
          sent_at: string
          worker_id: string
        }
        Insert: {
          body: string
          direction: string
          id?: string
          module_id: string
          sent_at?: string
          worker_id: string
        }
        Update: {
          body?: string
          direction?: string
          id?: string
          module_id?: string
          sent_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_messages_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_messages_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "obra_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_phases: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          id: string
          module_id: string
          name: string
          notes: string | null
          planned_budget: number | null
          planned_end: string | null
          planned_start: string | null
          position: number
          status: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          module_id: string
          name: string
          notes?: string | null
          planned_budget?: number | null
          planned_end?: string | null
          planned_start?: string | null
          position?: number
          status?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          module_id?: string
          name?: string
          notes?: string | null
          planned_budget?: number | null
          planned_end?: string | null
          planned_start?: string | null
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_phases_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_workers: {
        Row: {
          created_at: string
          daily_rate: number | null
          id: string
          module_id: string
          name: string
          notes: string | null
          role: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          created_at?: string
          daily_rate?: number | null
          id?: string
          module_id: string
          name: string
          notes?: string | null
          role?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          created_at?: string
          daily_rate?: number | null
          id?: string
          module_id?: string
          name?: string
          notes?: string | null
          role?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_workers_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          archived_at: string | null
          brand: string | null
          closing_day: number | null
          created_at: string
          credit_limit: number | null
          due_day: number | null
          household_id: string
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["payment_kind"]
          last_four: string | null
          name: string
        }
        Insert: {
          archived_at?: string | null
          brand?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          household_id: string
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["payment_kind"]
          last_four?: string | null
          name: string
        }
        Update: {
          archived_at?: string | null
          brand?: string | null
          closing_day?: number | null
          created_at?: string
          credit_limit?: number | null
          due_day?: number | null
          household_id?: string
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["payment_kind"]
          last_four?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_link_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          household_id: string
          member_id: string
          token: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          household_id: string
          member_id: string
          token: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          household_id?: string
          member_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_tokens_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_link_tokens_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_rate_limit: {
        Row: {
          chat_id: number
          count: number
          window_start: string
        }
        Insert: {
          chat_id: number
          count?: number
          window_start: string
        }
        Update: {
          chat_id?: number
          count?: number
          window_start?: string
        }
        Relationships: []
      }
      telegram_sessions: {
        Row: {
          chat_id: number
          household_id: string | null
          last_message_at: string
          member_id: string | null
          state: Json
        }
        Insert: {
          chat_id: number
          household_id?: string | null
          last_message_at?: string
          member_id?: string | null
          state?: Json
        }
        Update: {
          chat_id?: number
          household_id?: string | null
          last_message_at?: string
          member_id?: string | null
          state?: Json
        }
        Relationships: [
          {
            foreignKeyName: "telegram_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          day_of_month: number | null
          day_of_week: number | null
          description: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string
          id: string
          last_run: string | null
          next_run: string
          notes: string | null
          payment_method_id: string | null
          start_date: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          day_of_month?: number | null
          day_of_week?: number | null
          description: string
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurring_frequency"]
          household_id: string
          id?: string
          last_run?: string | null
          next_run: string
          notes?: string | null
          payment_method_id?: string | null
          start_date?: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_frequency"]
          household_id?: string
          id?: string
          last_run?: string | null
          next_run?: string
          notes?: string | null
          payment_method_id?: string | null
          start_date?: string
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          description: string | null
          household_id: string
          id: string
          installment_number: number | null
          installments_group_id: string | null
          installments_total: number | null
          module_id: string | null
          module_kind: string | null
          notes: string | null
          occurred_at: string
          payment_method_id: string | null
          receipt_url: string | null
          source: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          household_id: string
          id?: string
          installment_number?: number | null
          installments_group_id?: string | null
          installments_total?: number | null
          module_id?: string | null
          module_kind?: string | null
          notes?: string | null
          occurred_at?: string
          payment_method_id?: string | null
          receipt_url?: string | null
          source?: string
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          household_id?: string
          id?: string
          installment_number?: number | null
          installments_group_id?: string | null
          installments_total?: number | null
          module_id?: string | null
          module_kind?: string | null
          notes?: string | null
          occurred_at?: string
          payment_method_id?: string | null
          receipt_url?: string | null
          source?: string
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_activities: {
        Row: {
          actual_cost: number | null
          booking_ref: string | null
          created_at: string
          currency: string | null
          day_id: string | null
          duration_minutes: number | null
          id: string
          kind: string
          location: string | null
          module_id: string
          name: string
          notes: string | null
          planned_cost: number | null
          position: number
          rating: number | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          booking_ref?: string | null
          created_at?: string
          currency?: string | null
          day_id?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          location?: string | null
          module_id: string
          name: string
          notes?: string | null
          planned_cost?: number | null
          position?: number
          rating?: number | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          booking_ref?: string | null
          created_at?: string
          currency?: string | null
          day_id?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          location?: string | null
          module_id?: string
          name?: string
          notes?: string | null
          planned_cost?: number | null
          position?: number
          rating?: number | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "travel_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_activities_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_checklist: {
        Row: {
          category: string
          created_at: string
          due_date: string | null
          id: string
          item: string
          module_id: string
          notes: string | null
          position: number
          status: string
        }
        Insert: {
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          item: string
          module_id: string
          notes?: string | null
          position?: number
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          due_date?: string | null
          id?: string
          item?: string
          module_id?: string
          notes?: string | null
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_checklist_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_days: {
        Row: {
          accommodation: string | null
          city: string | null
          country: string | null
          created_at: string
          date: string | null
          day_number: number
          id: string
          module_id: string
          notes: string | null
        }
        Insert: {
          accommodation?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          day_number: number
          id?: string
          module_id: string
          notes?: string | null
        }
        Update: {
          accommodation?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string | null
          day_number?: number
          id?: string
          module_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_days_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_gallery: {
        Row: {
          caption: string | null
          id: string
          media_type: string
          module_id: string
          taken_at: string
          thumbnail_url: string | null
          uploaded_by: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          id?: string
          media_type?: string
          module_id: string
          taken_at?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          id?: string
          media_type?: string
          module_id?: string
          taken_at?: string
          thumbnail_url?: string | null
          uploaded_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_gallery_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_items: {
        Row: {
          actual_amount: number | null
          booking_ref: string | null
          created_at: string
          end_date: string | null
          id: string
          kind: string
          module_id: string
          notes: string | null
          planned_amount: number | null
          start_date: string | null
          title: string
        }
        Insert: {
          actual_amount?: number | null
          booking_ref?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          kind: string
          module_id: string
          notes?: string | null
          planned_amount?: number | null
          start_date?: string | null
          title: string
        }
        Update: {
          actual_amount?: number | null
          booking_ref?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          kind?: string
          module_id?: string
          notes?: string | null
          planned_amount?: number | null
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_rate_limit: {
        Row: {
          count: number
          phone: string
          window_start: string
        }
        Insert: {
          count?: number
          phone: string
          window_start: string
        }
        Update: {
          count?: number
          phone?: string
          window_start?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          household_id: string | null
          last_message_at: string
          member_id: string | null
          phone: string
          state: Json
        }
        Insert: {
          household_id?: string | null
          last_message_at?: string
          member_id?: string | null
          phone: string
          state?: Json
        }
        Update: {
          household_id?: string | null
          last_message_at?: string
          member_id?: string | null
          phone?: string
          state?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      obra_phase_totals: {
        Row: {
          actual_total: number | null
          done_count: number | null
          items_count: number | null
          module_id: string | null
          phase_id: string | null
          planned_count: number | null
          planned_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_items_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "obra_phases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role_in: {
        Args: {
          h_id: string
          roles: Database["public"]["Enums"]["household_role"][]
        }
        Returns: boolean
      }
      is_member_of: { Args: { h_id: string }; Returns: boolean }
      module_household: { Args: { m_id: string }; Returns: string }
    }
    Enums: {
      alert_frequency: "immediate" | "daily" | "weekly"
      alert_kind:
        | "budget_exceeded"
        | "category_threshold"
        | "large_expense"
        | "recurring_due"
        | "invoice_closing"
        | "goal_progress"
        | "custom"
      household_role: "owner" | "admin" | "viewer"
      module_kind: "obra" | "travel" | "car" | "gift" | "education" | "custom"
      module_status: "planning" | "active" | "paused" | "completed" | "archived"
      payment_kind:
        | "cash"
        | "pix"
        | "debit_card"
        | "credit_card"
        | "bank_transfer"
        | "boleto"
        | "meal_voucher"
        | "other"
      recurring_frequency: "daily" | "weekly" | "monthly" | "yearly"
      tx_type: "expense" | "income" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alert_frequency: ["immediate", "daily", "weekly"],
      alert_kind: [
        "budget_exceeded",
        "category_threshold",
        "large_expense",
        "recurring_due",
        "invoice_closing",
        "goal_progress",
        "custom",
      ],
      household_role: ["owner", "admin", "viewer"],
      module_kind: ["obra", "travel", "car", "gift", "education", "custom"],
      module_status: ["planning", "active", "paused", "completed", "archived"],
      payment_kind: [
        "cash",
        "pix",
        "debit_card",
        "credit_card",
        "bank_transfer",
        "boleto",
        "meal_voucher",
        "other",
      ],
      recurring_frequency: ["daily", "weekly", "monthly", "yearly"],
      tx_type: ["expense", "income", "transfer"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

// ===== Aliases auxiliares =====
export type HouseholdRole = Database["public"]["Enums"]["household_role"];
export type TxType = Database["public"]["Enums"]["tx_type"];
export type PaymentKind = Database["public"]["Enums"]["payment_kind"];
export type AlertKind = Database["public"]["Enums"]["alert_kind"];
export type AlertFrequency = Database["public"]["Enums"]["alert_frequency"];
export type ModuleKind = Database["public"]["Enums"]["module_kind"];
export type ModuleStatus = Database["public"]["Enums"]["module_status"];
