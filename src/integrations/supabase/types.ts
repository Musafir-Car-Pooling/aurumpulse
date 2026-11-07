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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          premium_enabled: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          premium_enabled?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          premium_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      market_scans: {
        Row: {
          error: string | null
          last_alert_direction: string | null
          last_alert_until: string | null
          market: string
          result: Json | null
          scanned_at: string
          status: string
        }
        Insert: {
          error?: string | null
          last_alert_direction?: string | null
          last_alert_until?: string | null
          market: string
          result?: Json | null
          scanned_at: string
          status: string
        }
        Update: {
          error?: string | null
          last_alert_direction?: string | null
          last_alert_until?: string | null
          market?: string
          result?: Json | null
          scanned_at?: string
          status?: string
        }
        Relationships: []
      }
      mt5_links: {
        Row: {
          created_at: string
          key_hash: string
          last_seen: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          key_hash: string
          last_seen?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          key_hash?: string
          last_seen?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          details: string
          id: string
          label: string
          sort: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          details: string
          id?: string
          label: string
          sort?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          details?: string
          id?: string
          label?: string
          sort?: number
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount_usd: number
          created_at: string
          decided_at: string | null
          email: string | null
          id: string
          manual_channel: string | null
          method: string
          plan: string
          proof_path: string | null
          provider_payment_id: string | null
          reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          decided_at?: string | null
          email?: string | null
          id?: string
          manual_channel?: string | null
          method: string
          plan: string
          proof_path?: string | null
          provider_payment_id?: string | null
          reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          decided_at?: string | null
          email?: string | null
          id?: string
          manual_channel?: string | null
          method?: string
          plan?: string
          proof_path?: string | null
          provider_payment_id?: string | null
          reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      signal_alerts: {
        Row: {
          created_at: string
          direction: string
          id: string
          market: string
          result: Json
          valid_until: string
        }
        Insert: {
          created_at: string
          direction: string
          id?: string
          market: string
          result: Json
          valid_until: string
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          market?: string
          result?: Json
          valid_until?: string
        }
        Relationships: []
      }
      trade_orders: {
        Row: {
          created_at: string
          direction: string
          done_at: string | null
          error: string | null
          id: string
          lot: number
          market: string
          price: number | null
          sent_at: string | null
          signal: Json
          status: string
          ticket: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          done_at?: string | null
          error?: string | null
          id?: string
          lot?: number
          market: string
          price?: number | null
          sent_at?: string | null
          signal: Json
          status?: string
          ticket?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          done_at?: string | null
          error?: string | null
          id?: string
          lot?: number
          market?: string
          price?: number | null
          sent_at?: string | null
          signal?: Json
          status?: string
          ticket?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          created_at: string
          email: string | null
          plan: string | null
          premium_until: string | null
          trial_ends_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          plan?: string | null
          premium_until?: string | null
          trial_ends_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          plan?: string | null
          premium_until?: string | null
          trial_ends_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_payment: { Args: { p_id: string }; Returns: undefined }
      admin_decide_payment: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          is_admin: boolean
          plan: string
          premium_until: string
          trial_ends_at: string
          user_id: string
        }[]
      }
      claim_mt5_order: {
        Args: { p_key_hash: string }
        Returns: {
          created_at: string
          direction: string
          id: string
          lot: number
          market: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_signal_access: { Args: { _user_id: string }; Returns: boolean }
      premium_enabled: { Args: never; Returns: boolean }
      record_market_scan: {
        Args: {
          p_error?: string
          p_market: string
          p_result: Json
          p_scanned_at: string
          p_status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
