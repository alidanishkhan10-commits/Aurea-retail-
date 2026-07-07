// Hand-written types for the tables Phase 1 code touches directly.
// Once you have a real Supabase project, replace this file by running:
//   npx supabase gen types typescript --project-id <your-project-id> > src/types/database.types.ts
// That will give you exact, always-in-sync types for every table in schema.sql.

export type UserRole = "admin" | "retailer";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; role: UserRole; created_at: string };
        Insert: { id: string; role?: UserRole };
        Update: { role?: UserRole };
      };
      retailers: {
        Row: {
          id: string;
          user_id: string | null;
          shop_name: string;
          owner_name: string;
          phone_number: string;
          gst_number: string | null;
          address: string | null;
          state: string | null;
          city: string | null;
          pincode: string | null;
          credit_limit: number;
          outstanding_balance: number;
          discount_percent: number;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["retailers"]["Row"]> & {
          shop_name: string;
          owner_name: string;
          phone_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["retailers"]["Row"]>;
      };
      registered_devices: {
        Row: {
          id: string;
          retailer_id: string;
          device_id: string;
          device_label: string | null;
          is_active: boolean;
          registered_at: string;
          last_seen_at: string;
          authorized_multi_device: boolean;
        };
        Insert: {
          retailer_id: string;
          device_id: string;
          device_label?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["registered_devices"]["Row"]>;
      };
      retailer_app_activity: {
        Row: {
          retailer_id: string;
          total_opens: number;
          opens_today: number;
          opens_today_date: string;
          last_open_at: string | null;
        };
        Insert: { retailer_id: string };
        Update: Partial<Database["public"]["Tables"]["retailer_app_activity"]["Row"]>;
      };
    };
    Functions: {
      record_app_open: {
        Args: { p_retailer_id: string };
        Returns: void;
      };
    };
  };
}
