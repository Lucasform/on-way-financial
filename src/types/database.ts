/**
 * Tipos gerados pelo Supabase. Para regenerar:
 *   pnpm db:types
 *
 * Esta versão é mantida à mão como fallback caso o `supabase gen types` não tenha
 * sido executado ainda — os campos refletem 1:1 as migrations em `supabase/migrations`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type HouseholdRole = "owner" | "admin" | "viewer";
export type TxType = "expense" | "income" | "transfer";
export type PaymentKind =
  | "cash"
  | "pix"
  | "debit_card"
  | "credit_card"
  | "bank_transfer"
  | "boleto"
  | "meal_voucher"
  | "other";
export type AlertKind =
  | "budget_exceeded"
  | "category_threshold"
  | "large_expense"
  | "recurring_due"
  | "invoice_closing"
  | "goal_progress"
  | "custom";
export type AlertFrequency = "immediate" | "daily" | "weekly";
export type ModuleKind = "obra" | "travel" | "car" | "gift" | "education" | "custom";
export type ModuleStatus = "planning" | "active" | "paused" | "completed" | "archived";

export interface Database {
  public: {
    Tables: {
      households: {
        Row: { id: string; name: string; created_by: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; created_by: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["households"]["Insert"]>;
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          display_name: string | null;
          whatsapp_phone: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["household_members"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["household_members"]["Insert"]>;
        Relationships: [];
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          email: string | null;
          role: HouseholdRole;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["household_invites"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["household_invites"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: TxType;
          icon: string | null;
          color: string | null;
          parent_id: string | null;
          is_system: boolean;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["categories"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          kind: PaymentKind;
          last_four: string | null;
          brand: string | null;
          credit_limit: number | null;
          closing_day: number | null;
          due_day: number | null;
          is_default: boolean;
          archived_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payment_methods"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payment_methods"]["Insert"]>;
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          type: TxType;
          amount: number;
          description: string | null;
          occurred_at: string;
          category_id: string | null;
          payment_method_id: string | null;
          module_kind: ModuleKind | null;
          module_id: string | null;
          installments_total: number | null;
          installment_number: number | null;
          installments_group_id: string | null;
          receipt_url: string | null;
          notes: string | null;
          source: "web" | "whatsapp" | "import";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          household_id: string;
          kind: AlertKind;
          name: string;
          config: Json;
          channels: Json;
          target_member_ids: string[];
          frequency: AlertFrequency;
          active: boolean;
          last_triggered_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["alerts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
        Relationships: [];
      };
      whatsapp_sessions: {
        Row: {
          phone: string;
          member_id: string | null;
          household_id: string | null;
          state: Json;
          last_message_at: string;
        };
        Insert: Database["public"]["Tables"]["whatsapp_sessions"]["Row"];
        Update: Partial<Database["public"]["Tables"]["whatsapp_sessions"]["Row"]>;
        Relationships: [];
      };
      whatsapp_rate_limit: {
        Row: { phone: string; window_start: string; count: number };
        Insert: Database["public"]["Tables"]["whatsapp_rate_limit"]["Row"];
        Update: Partial<Database["public"]["Tables"]["whatsapp_rate_limit"]["Row"]>;
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
        Insert: Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at"> & {
          id?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          household_id: string;
          kind: ModuleKind;
          name: string;
          status: ModuleStatus;
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          cover_image_url: string | null;
          config: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["modules"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["modules"]["Insert"]>;
        Relationships: [];
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
          status: "todo" | "doing" | "done" | "blocked";
          position: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["obra_phases"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_phases"]["Insert"]>;
        Relationships: [];
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
        Insert: Omit<Database["public"]["Tables"]["obra_workers"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_workers"]["Insert"]>;
        Relationships: [];
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
        };
        Insert: Omit<Database["public"]["Tables"]["obra_gallery"]["Row"], "id" | "taken_at"> & {
          id?: string;
          taken_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_gallery"]["Insert"]>;
        Relationships: [];
      };
      obra_messages: {
        Row: {
          id: string;
          module_id: string;
          worker_id: string;
          direction: "in" | "out";
          body: string;
          sent_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["obra_messages"]["Row"], "id" | "sent_at"> & {
          id?: string;
          sent_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["obra_messages"]["Insert"]>;
        Relationships: [];
      };
      travel_items: {
        Row: {
          id: string;
          module_id: string;
          kind: "flight" | "hotel" | "transport" | "food" | "tour" | "other";
          title: string;
          planned_amount: number | null;
          actual_amount: number | null;
          start_date: string | null;
          end_date: string | null;
          booking_ref: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["travel_items"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["travel_items"]["Insert"]>;
        Relationships: [];
      };
      car_options: {
        Row: {
          id: string;
          module_id: string;
          model: string;
          year: number | null;
          price: number;
          down_payment: number | null;
          installments: number | null;
          interest_rate: number | null;
          pros: string | null;
          cons: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["car_options"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["car_options"]["Insert"]>;
        Relationships: [];
      };
      gift_items: {
        Row: {
          id: string;
          module_id: string;
          recipient: string;
          occasion: string | null;
          occasion_date: string | null;
          idea: string | null;
          budget: number | null;
          bought: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["gift_items"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gift_items"]["Insert"]>;
        Relationships: [];
      };
      education_items: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          provider: string | null;
          student: string | null;
          monthly_cost: number | null;
          start_date: string | null;
          end_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["education_items"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["education_items"]["Insert"]>;
        Relationships: [];
      };
      custom_items: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          amount: number | null;
          due_date: string | null;
          status: string;
          position: number;
          data: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["custom_items"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["custom_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_member_of: { Args: { h_id: string }; Returns: boolean };
      has_role_in: { Args: { h_id: string; roles: HouseholdRole[] }; Returns: boolean };
      module_household: { Args: { m_id: string }; Returns: string };
    };
    Enums: {
      household_role: HouseholdRole;
      tx_type: TxType;
      payment_kind: PaymentKind;
      alert_kind: AlertKind;
      alert_frequency: AlertFrequency;
      module_kind: ModuleKind;
      module_status: ModuleStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
