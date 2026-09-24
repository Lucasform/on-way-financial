// Tipos do schema Supabase (public), gerados a partir do schema real do projeto
// czufplvixgyuxuxzgvio via mcp Supabase generate_typescript_types. Regenerar
// sempre que o schema mudar (nova tabela/coluna), em vez de editar à mão.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
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
          default_whatsapp_phone: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_whatsapp_phone?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_whatsapp_phone?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_types: {
        Row: {
          category: string | null
          created_at: string
          household_id: string
          id: string
          name: string
          unit: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          household_id: string
          id?: string
          name: string
          unit?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_types_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
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
          kind?: Database["public"]["Enums"]["module_kind"]
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
      obra_checklist_items: {
        Row: {
          category: string
          created_at: string
          estimated_value: number | null
          id: string
          is_estimate: boolean
          module_id: string
          name: string
          notes: string | null
          obra_item_id: string | null
          phase_name: string
          position: number
          status: string
          times_added: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          estimated_value?: number | null
          id?: string
          is_estimate?: boolean
          module_id: string
          name: string
          notes?: string | null
          obra_item_id?: string | null
          phase_name: string
          position?: number
          status?: string
          times_added?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          estimated_value?: number | null
          id?: string
          is_estimate?: boolean
          module_id?: string
          name?: string
          notes?: string | null
          obra_item_id?: string | null
          phase_name?: string
          position?: number
          status?: string
          times_added?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_checklist_items_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_checklist_items_obra_item_id_fkey"
            columns: ["obra_item_id"]
            isOneToOne: false
            referencedRelation: "obra_items"
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
          photo_urls: string[]
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
          photo_urls?: string[]
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
          photo_urls?: string[]
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
      obra_documents: {
        Row: {
          created_at: string
          created_by: string | null
          file_type: string | null
          file_url: string
          folder_id: string | null
          id: string
          module_id: string
          name: string
          size_bytes: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_type?: string | null
          file_url: string
          folder_id?: string | null
          id?: string
          module_id: string
          name: string
          size_bytes?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_type?: string | null
          file_url?: string
          folder_id?: string | null
          id?: string
          module_id?: string
          name?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "obra_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_documents_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_folders: {
        Row: {
          created_at: string
          id: string
          kind: string
          module_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          module_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          module_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_folders_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_gallery: {
        Row: {
          caption: string | null
          duration_seconds: number | null
          folder_id: string | null
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
          folder_id?: string | null
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
          folder_id?: string | null
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
            foreignKeyName: "obra_gallery_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "obra_folders"
            referencedColumns: ["id"]
          },
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
          expected_date: string | null
          id: string
          material_type_id: string | null
          module_id: string
          name: string
          notes: string | null
          phase_id: string | null
          quantity: number
          quote_id: string | null
          status: string
          supplier: string | null
          supplier_id: string | null
          transaction_id: string | null
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
          expected_date?: string | null
          id?: string
          material_type_id?: string | null
          module_id: string
          name: string
          notes?: string | null
          phase_id?: string | null
          quantity?: number
          quote_id?: string | null
          status?: string
          supplier?: string | null
          supplier_id?: string | null
          transaction_id?: string | null
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
          expected_date?: string | null
          id?: string
          material_type_id?: string | null
          module_id?: string
          name?: string
          notes?: string | null
          phase_id?: string | null
          quantity?: number
          quote_id?: string | null
          status?: string
          supplier?: string | null
          supplier_id?: string | null
          transaction_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_items_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "material_types"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "obra_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "price_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obra_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
      price_quotes: {
        Row: {
          accepted_at: string | null
          created_at: string
          household_id: string
          id: string
          item_name: string
          material_type_id: string | null
          notes: string | null
          quoted_at: string
          supplier_id: string
          unit: string
          unit_price: number
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          item_name: string
          material_type_id?: string | null
          notes?: string | null
          quoted_at?: string
          supplier_id: string
          unit?: string
          unit_price: number
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          item_name?: string
          material_type_id?: string | null
          notes?: string | null
          quoted_at?: string
          supplier_id?: string
          unit?: string
          unit_price?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_quotes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_material_type_id_fkey"
            columns: ["material_type_id"]
            isOneToOne: false
            referencedRelation: "material_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          cnpj: string | null
          created_at: string
          household_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          phone2: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          cnpj?: string | null
          created_at?: string
          household_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          cnpj?: string | null
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_household_id_fkey"
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
          supplier: string | null
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
          supplier?: string | null
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
          supplier?: string | null
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
      accept_invite: { Args: { invite_token: string }; Returns: string }
      has_role_in: {
        Args: {
          h_id: string
          roles: Database["public"]["Enums"]["household_role"][]
        }
        Returns: boolean
      }
      is_member: { Args: { h: string }; Returns: boolean }
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
      module_kind: "obra"
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
      tx_type: "expense" | "income" | "transfer"
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
      module_kind: ["obra"],
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
      tx_type: ["expense", "income", "transfer"],
    },
  },
} as const

export type HouseholdRole = Database["public"]["Enums"]["household_role"]
