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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          catalog_item_id: string | null
          created_at: string
          id: string
          order_id: string
          price_snapshot_inr: number
          qty: number
          title_snapshot: string
          unit_snapshot: string
        }
        Insert: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          price_snapshot_inr: number
          qty: number
          title_snapshot: string
          unit_snapshot: string
        }
        Update: {
          catalog_item_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          price_snapshot_inr?: number
          qty?: number
          title_snapshot?: string
          unit_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_catalog_item_id_fkey"
            columns: ["catalog_item_id"]
            isOneToOne: false
            referencedRelation: "vendor_catalog_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_user_id: string
          id: string
          payment_mode: Database["public"]["Enums"]["payment_mode"]
          pickup_note: string | null
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_user_id: string
          id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          pickup_note?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_user_id?: string
          id?: string
          payment_mode?: Database["public"]["Enums"]["payment_mode"]
          pickup_note?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_catalog_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          in_stock: boolean
          photo_url: string | null
          price_inr: number
          tags: string[]
          title: string
          unit: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          photo_url?: string | null
          price_inr: number
          tags?: string[]
          title: string
          unit: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          in_stock?: boolean
          photo_url?: string | null
          price_inr?: number
          tags?: string[]
          title?: string
          unit?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_catalog_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_catalog_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_contacts: {
        Row: {
          created_at: string
          id: string
          phone_e164: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone_e164: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          phone_e164?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_contacts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_location_updates: {
        Row: {
          accuracy_meters: number | null
          created_at: string
          day: string
          id: string
          lat: number
          lng: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          accuracy_meters?: number | null
          created_at?: string
          day: string
          id?: string
          lat: number
          lng: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          accuracy_meters?: number | null
          created_at?: string
          day?: string
          id?: string
          lat?: number
          lng?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_location_updates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_location_updates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_plans: {
        Row: {
          catalog_limit: number
          created_at: string
          id: string
          tier: Database["public"]["Enums"]["vendor_plan_tier"]
          updated_at: string
          upgrade_requested: boolean
          vendor_id: string
        }
        Insert: {
          catalog_limit?: number
          created_at?: string
          id?: string
          tier?: Database["public"]["Enums"]["vendor_plan_tier"]
          updated_at?: string
          upgrade_requested?: boolean
          vendor_id: string
        }
        Update: {
          catalog_limit?: number
          created_at?: string
          id?: string
          tier?: Database["public"]["Enums"]["vendor_plan_tier"]
          updated_at?: string
          upgrade_requested?: boolean
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_plans_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_plans_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors_public"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address_text: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_online: boolean
          last_location_updated_at: string | null
          location_accuracy_meters: number | null
          location_lat: number | null
          location_lng: number | null
          opening_note: string | null
          owner_user_id: string
          primary_category: string
          rejection_reason: string | null
          selfie_with_shop_image_url: string | null
          shop_name: string
          state: string | null
          updated_at: string
          vendor_type: Database["public"]["Enums"]["vendor_type"]
          verification_status: Database["public"]["Enums"]["vendor_verification_status"]
        }
        Insert: {
          address_text?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_online?: boolean
          last_location_updated_at?: string | null
          location_accuracy_meters?: number | null
          location_lat?: number | null
          location_lng?: number | null
          opening_note?: string | null
          owner_user_id: string
          primary_category: string
          rejection_reason?: string | null
          selfie_with_shop_image_url?: string | null
          shop_name: string
          state?: string | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          verification_status?: Database["public"]["Enums"]["vendor_verification_status"]
        }
        Update: {
          address_text?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_online?: boolean
          last_location_updated_at?: string | null
          location_accuracy_meters?: number | null
          location_lat?: number | null
          location_lng?: number | null
          opening_note?: string | null
          owner_user_id?: string
          primary_category?: string
          rejection_reason?: string | null
          selfie_with_shop_image_url?: string | null
          shop_name?: string
          state?: string | null
          updated_at?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          verification_status?: Database["public"]["Enums"]["vendor_verification_status"]
        }
        Relationships: []
      }
    }
    Views: {
      vendors_public: {
        Row: {
          address_text: string | null
          city: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_online: boolean | null
          last_location_updated_at: string | null
          location_accuracy_meters: number | null
          location_lat: number | null
          location_lng: number | null
          opening_note: string | null
          primary_category: string | null
          selfie_with_shop_image_url: string | null
          shop_name: string | null
          state: string | null
          updated_at: string | null
          vendor_type: Database["public"]["Enums"]["vendor_type"] | null
          verification_status:
            | Database["public"]["Enums"]["vendor_verification_status"]
            | null
        }
        Insert: {
          address_text?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_online?: boolean | null
          last_location_updated_at?: string | null
          location_accuracy_meters?: number | null
          location_lat?: number | null
          location_lng?: number | null
          opening_note?: string | null
          primary_category?: string | null
          selfie_with_shop_image_url?: string | null
          shop_name?: string | null
          state?: string | null
          updated_at?: string | null
          vendor_type?: Database["public"]["Enums"]["vendor_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["vendor_verification_status"]
            | null
        }
        Update: {
          address_text?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_online?: boolean | null
          last_location_updated_at?: string | null
          location_accuracy_meters?: number | null
          location_lat?: number | null
          location_lng?: number | null
          opening_note?: string | null
          primary_category?: string | null
          selfie_with_shop_image_url?: string | null
          shop_name?: string | null
          state?: string | null
          updated_at?: string | null
          vendor_type?: Database["public"]["Enums"]["vendor_type"] | null
          verification_status?:
            | Database["public"]["Enums"]["vendor_verification_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_vendor_owner: { Args: { _vendor_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "placed"
        | "accepted"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
      payment_mode: "upi" | "cash"
      vendor_plan_tier: "free" | "pro"
      vendor_type: "fixed_shop" | "moving_stall"
      vendor_verification_status: "pending" | "approved" | "rejected"
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
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "placed",
        "accepted",
        "preparing",
        "ready",
        "completed",
        "cancelled",
      ],
      payment_mode: ["upi", "cash"],
      vendor_plan_tier: ["free", "pro"],
      vendor_type: ["fixed_shop", "moving_stall"],
      vendor_verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
