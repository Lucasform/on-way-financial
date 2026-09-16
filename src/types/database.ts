// Tipos do schema Supabase (public). Gerado à mão a partir de supabase/migrations/0001-0010
// (CLI de geração automática indisponível neste ambiente). Mantenha em sincronia ao alterar schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      households: {
        Row: { id: string; name: string; default_whatsapp_phone: string | null; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; default_whatsapp_phone?: string | null; created_by: string; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; default_whatsapp_phone?: string | null; created_by?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["household_role"];
          display_name: string | null;
          whatsapp_phone: string | null;
          telegram_chat_id: number | null;
          telegram_username: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role?: Database["public"]["Enums"]["household_role"];
          display_name?: string | null;
          whatsapp_phone?: string | null;
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["household_members"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "household_members_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          email: string | null;
          role: Database["public"]["Enums"]["household_role"];
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["household_role"];
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["household_invites"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "household_invites_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: Database["public"]["Enums"]["tx_type"];
          icon: string | null;
          color: string | null;
          parent_id: string | null;
          is_system: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          type?: Database["public"]["Enums"]["tx_type"];
          icon?: string | null;
          color?: string | null;
          parent_id?: string | null;
          is_system?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "categories_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
          { foreignKeyName: "categories_parent_id_fkey"; columns: ["parent_id"]; referencedRelation: "categories"; referencedColumns: ["id"] },
        ];
      };
      payment_methods: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          last_four: string | null;
          brand: string | null;
          credit_limit: number | null;
          closing_day: number | null;
          due_day: number | null;
          is_default: boolean;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          kind: Database["public"]["Enums"]["payment_kind"];
          last_four?: string | null;
          brand?: string | null;
          credit_limit?: number | null;
          closing_day?: number | null;
          due_day?: number | null;
          is_default?: boolean;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_methods"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "payment_methods_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          type: Database["public"]["Enums"]["tx_type"];
          amount: number;
          description: string | null;
          occurred_at: string;
          category_id: string | null;
          payment_method_id: string | null;
          module_kind: string | null;
          module_id: string | null;
          installments_total: number | null;
          installment_number: number | null;
          installments_group_id: string | null;
          receipt_url: string | null;
          notes: string | null;
          source: string;
          supplier: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          type: Database["public"]["Enums"]["tx_type"];
          amount: number;
          description?: string | null;
          occurred_at?: string;
          category_id?: string | null;
          payment_method_id?: string | null;
          module_kind?: string | null;
          module_id?: string | null;
          installments_total?: number | null;
          installment_number?: number | null;
          installments_group_id?: string | null;
          receipt_url?: string | null;
          notes?: string | null;
          source?: string;
          supplier?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "transactions_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_category_id_fkey"; columns: ["category_id"]; referencedRelation: "categories"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_payment_method_id_fkey"; columns: ["payment_method_id"]; referencedRelation: "payment_methods"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
        ];
      };
      alerts: {
        Row: {
          id: string;
          household_id: string;
          kind: Database["public"]["Enums"]["alert_kind"];
          name: string;
          config: Json;
          channels: Json;
          target_member_ids: string[];
          frequency: Database["public"]["Enums"]["alert_frequency"];
          active: boolean;
          last_triggered_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          kind: Database["public"]["Enums"]["alert_kind"];
          name: string;
          config?: Json;
          channels?: Json;
          target_member_ids?: string[];
          frequency?: Database["public"]["Enums"]["alert_frequency"];
          active?: boolean;
          last_triggered_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "alerts_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      whatsapp_sessions: {
        Row: { phone: string; member_id: string | null; household_id: string | null; state: Json; last_message_at: string };
        Insert: { phone: string; member_id?: string | null; household_id?: string | null; state?: Json; last_message_at?: string };
        Update: Partial<Database["public"]["Tables"]["whatsapp_sessions"]["Insert"]>;
        Relationships: [];
      };
      whatsapp_rate_limit: {
        Row: { phone: string; window_start: string; count: number };
        Insert: { phone: string; window_start: string; count?: number };
        Update: Partial<Database["public"]["Tables"]["whatsapp_rate_limit"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          household_id: string | null;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          household_id?: string | null;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          household_id: string;
          kind: Database["public"]["Enums"]["module_kind"];
          name: string;
          status: Database["public"]["Enums"]["module_status"];
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          cover_image_url: string | null;
          config: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          kind?: Database["public"]["Enums"]["module_kind"];
          name: string;
          status?: Database["public"]["Enums"]["module_status"];
          start_date?: string | null;
          end_date?: string | null;
          budget?: number | null;
          cover_image_url?: string | null;
          config?: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "modules_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      obra_phases: {
        Row: {
          id: string;
          module_id: string;
          name: string;
          planned_budget: number | null;
          planned_start: string | null;
          planned_end: string | null;
          actual_start: string | null;
          actual_end: string | null;
          status: string;
          position: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          name: string;
          planned_budget?: number | null;
          planned_start?: string | null;
          planned_end?: string | null;
          actual_start?: string | null;
          actual_end?: string | null;
          status?: string;
          position?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_phases"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_phases_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
        ];
      };
      obra_workers: {
        Row: {
          id: string;
          module_id: string;
          name: string;
          role: string | null;
          whatsapp_phone: string | null;
          daily_rate: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          name: string;
          role?: string | null;
          whatsapp_phone?: string | null;
          daily_rate?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_workers"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_workers_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
        ];
      };
      obra_gallery: {
        Row: {
          id: string;
          module_id: string;
          phase_id: string | null;
          image_url: string;
          caption: string | null;
          taken_at: string;
          uploaded_by: string | null;
          media_type: string;
          duration_seconds: number | null;
          thumbnail_url: string | null;
        };
        Insert: {
          id?: string;
          module_id: string;
          phase_id?: string | null;
          image_url: string;
          caption?: string | null;
          taken_at?: string;
          uploaded_by?: string | null;
          media_type?: string;
          duration_seconds?: number | null;
          thumbnail_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["obra_gallery"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_gallery_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
          { foreignKeyName: "obra_gallery_phase_id_fkey"; columns: ["phase_id"]; referencedRelation: "obra_phases"; referencedColumns: ["id"] },
        ];
      };
      obra_messages: {
        Row: { id: string; module_id: string; worker_id: string; direction: string; body: string; sent_at: string };
        Insert: { id?: string; module_id: string; worker_id: string; direction: string; body: string; sent_at?: string };
        Update: Partial<Database["public"]["Tables"]["obra_messages"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_messages_worker_id_fkey"; columns: ["worker_id"]; referencedRelation: "obra_workers"; referencedColumns: ["id"] },
        ];
      };
      obra_items: {
        Row: {
          id: string;
          module_id: string;
          phase_id: string | null;
          category: string;
          name: string;
          brand: string | null;
          supplier: string | null;
          supplier_id: string | null;
          material_type_id: string | null;
          unit: string;
          quantity: number;
          unit_price: number | null;
          actual_unit_price: number | null;
          status: string;
          bought_at: string | null;
          expected_date: string | null;
          notes: string | null;
          quote_id: string | null;
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          phase_id?: string | null;
          category: string;
          name: string;
          brand?: string | null;
          supplier?: string | null;
          supplier_id?: string | null;
          material_type_id?: string | null;
          unit?: string;
          quantity?: number;
          unit_price?: number | null;
          actual_unit_price?: number | null;
          status?: string;
          bought_at?: string | null;
          expected_date?: string | null;
          notes?: string | null;
          quote_id?: string | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_items"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_items_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
          { foreignKeyName: "obra_items_phase_id_fkey"; columns: ["phase_id"]; referencedRelation: "obra_phases"; referencedColumns: ["id"] },
          { foreignKeyName: "obra_items_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] },
          { foreignKeyName: "obra_items_material_type_id_fkey"; columns: ["material_type_id"]; referencedRelation: "material_types"; referencedColumns: ["id"] },
        ];
      };
      obra_diary: {
        Row: {
          id: string;
          module_id: string;
          phase_id: string | null;
          entry_date: string;
          weather: string | null;
          body: string;
          workers_count: number | null;
          hours_worked: number | null;
          photo_urls: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          phase_id?: string | null;
          entry_date?: string;
          weather?: string | null;
          body: string;
          workers_count?: number | null;
          hours_worked?: number | null;
          photo_urls?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_diary"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_diary_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
          { foreignKeyName: "obra_diary_phase_id_fkey"; columns: ["phase_id"]; referencedRelation: "obra_phases"; referencedColumns: ["id"] },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          category: string | null;
          phone: string | null;
          phone2: string | null;
          cnpj: string | null;
          address: string | null;
          notes: string | null;
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          category?: string | null;
          phone?: string | null;
          phone2?: string | null;
          cnpj?: string | null;
          address?: string | null;
          notes?: string | null;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "suppliers_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      material_types: {
        Row: { id: string; household_id: string; name: string; unit: string; category: string | null; created_at: string };
        Insert: { id?: string; household_id: string; name: string; unit?: string; category?: string | null; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["material_types"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "material_types_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
        ];
      };
      obra_checklist_items: {
        Row: {
          id: string;
          module_id: string;
          phase_name: string;
          category: string;
          name: string;
          unit: string | null;
          estimated_value: number | null;
          is_estimate: boolean;
          status: string;
          obra_item_id: string | null;
          notes: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          phase_name: string;
          category: string;
          name: string;
          unit?: string | null;
          estimated_value?: number | null;
          is_estimate?: boolean;
          status?: string;
          obra_item_id?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_checklist_items"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_checklist_items_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
          { foreignKeyName: "obra_checklist_items_obra_item_id_fkey"; columns: ["obra_item_id"]; referencedRelation: "obra_items"; referencedColumns: ["id"] },
        ];
      };
      obra_documents: {
        Row: {
          id: string;
          module_id: string;
          name: string;
          file_url: string;
          file_type: string | null;
          size_bytes: number | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          name: string;
          file_url: string;
          file_type?: string | null;
          size_bytes?: number | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_documents"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "obra_documents_module_id_fkey"; columns: ["module_id"]; referencedRelation: "modules"; referencedColumns: ["id"] },
        ];
      };
      price_quotes: {
        Row: {
          id: string;
          household_id: string;
          supplier_id: string;
          material_type_id: string | null;
          item_name: string;
          unit: string;
          unit_price: number;
          quoted_at: string;
          valid_until: string | null;
          notes: string | null;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          supplier_id: string;
          material_type_id?: string | null;
          item_name: string;
          unit?: string;
          unit_price: number;
          quoted_at?: string;
          valid_until?: string | null;
          notes?: string | null;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["price_quotes"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "price_quotes_household_id_fkey"; columns: ["household_id"]; referencedRelation: "households"; referencedColumns: ["id"] },
          { foreignKeyName: "price_quotes_supplier_id_fkey"; columns: ["supplier_id"]; referencedRelation: "suppliers"; referencedColumns: ["id"] },
          { foreignKeyName: "price_quotes_material_type_id_fkey"; columns: ["material_type_id"]; referencedRelation: "material_types"; referencedColumns: ["id"] },
        ];
      };
      telegram_sessions: {
        Row: { chat_id: number; member_id: string | null; household_id: string | null; state: Json; last_message_at: string };
        Insert: { chat_id: number; member_id?: string | null; household_id?: string | null; state?: Json; last_message_at?: string };
        Update: Partial<Database["public"]["Tables"]["telegram_sessions"]["Insert"]>;
        Relationships: [];
      };
      telegram_link_tokens: {
        Row: {
          token: string;
          member_id: string;
          household_id: string;
          expires_at: string;
          consumed_at: string | null;
          created_at: string;
        };
        Insert: {
          token: string;
          member_id: string;
          household_id: string;
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telegram_link_tokens"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "telegram_link_tokens_member_id_fkey"; columns: ["member_id"]; referencedRelation: "household_members"; referencedColumns: ["id"] },
        ];
      };
      telegram_rate_limit: {
        Row: { chat_id: number; window_start: string; count: number };
        Insert: { chat_id: number; window_start: string; count?: number };
        Update: Partial<Database["public"]["Tables"]["telegram_rate_limit"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      obra_phase_totals: {
        Row: {
          phase_id: string | null;
          module_id: string | null;
          planned_total: number | null;
          actual_total: number | null;
          items_count: number | null;
          planned_count: number | null;
          done_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_member_of: { Args: { h_id: string }; Returns: boolean };
      has_role_in: { Args: { h_id: string; roles: Database["public"]["Enums"]["household_role"][] }; Returns: boolean };
      module_household: { Args: { m_id: string }; Returns: string };
      set_updated_at: { Args: Record<string, never>; Returns: unknown };
    };
    Enums: {
      household_role: "owner" | "admin" | "viewer";
      tx_type: "expense" | "income" | "transfer";
      payment_kind: "cash" | "pix" | "debit_card" | "credit_card" | "bank_transfer" | "boleto" | "meal_voucher" | "other";
      alert_kind:
        | "budget_exceeded"
        | "category_threshold"
        | "large_expense"
        | "recurring_due"
        | "invoice_closing"
        | "goal_progress"
        | "custom";
      alert_frequency: "immediate" | "daily" | "weekly";
      module_kind: "obra";
      module_status: "planning" | "active" | "paused" | "completed" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
}

export type HouseholdRole = Database["public"]["Enums"]["household_role"];
