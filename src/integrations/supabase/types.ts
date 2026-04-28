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
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_warehouses: {
        Row: {
          client_id: string
          id: string
          warehouse_id: string
        }
        Insert: {
          client_id: string
          id?: string
          warehouse_id: string
        }
        Update: {
          client_id?: string
          id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_warehouses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_warehouses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          active: boolean
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_type: Database["public"]["Enums"]["ingredient_type"]
          is_super: boolean
          kcal_per_unit: number
          name: string
          reference: string | null
          stock_min: number
          stock_quantity: number
          supplier: string | null
          supplier_id: string | null
          unit: string
          updated_at: string
          uvc: string | null
          uvc_quantity: number
          yield_quantity: number
          yield_unit: string | null
        }
        Insert: {
          active?: boolean
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_type?: Database["public"]["Enums"]["ingredient_type"]
          is_super?: boolean
          kcal_per_unit?: number
          name: string
          reference?: string | null
          stock_min?: number
          stock_quantity?: number
          supplier?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          uvc?: string | null
          uvc_quantity?: number
          yield_quantity?: number
          yield_unit?: string | null
        }
        Update: {
          active?: boolean
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_type?: Database["public"]["Enums"]["ingredient_type"]
          is_super?: boolean
          kcal_per_unit?: number
          name?: string
          reference?: string | null
          stock_min?: number
          stock_quantity?: number
          supplier?: string | null
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          uvc?: string | null
          uvc_quantity?: number
          yield_quantity?: number
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          created_at: string
          delivery_date: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_hidden_categories: {
        Row: {
          category_name: string
          created_at: string
          id: string
          warehouse_id: string | null
        }
        Insert: {
          category_name: string
          created_at?: string
          id?: string
          warehouse_id?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string
          id?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      pos_hidden_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      pos_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          updated_at: string
          visible: boolean
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          visible?: boolean
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          visible?: boolean
          warehouse_id?: string
        }
        Relationships: []
      }
      product_daily_stock: {
        Row: {
          client_id: string
          created_at: string
          id: string
          perte: number
          product_id: string
          recu: number
          stock: number
          stock_date: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          perte?: number
          product_id: string
          recu?: number
          stock?: number
          stock_date?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          perte?: number
          product_id?: string
          recu?: number
          stock?: number
          stock_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_daily_stock_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_daily_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category_id: string
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          price_b2c: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          price_b2c?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          price_b2c?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_id: string
          ingredient_name: string
          purchase_order_id: string
          quantity_uvc: number
          unit: string
          uvc_label: string | null
          uvc_quantity: number
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_id: string
          ingredient_name: string
          purchase_order_id: string
          quantity_uvc?: number
          unit?: string
          uvc_label?: string | null
          uvc_quantity?: number
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          ingredient_name?: string
          purchase_order_id?: string
          quantity_uvc?: number
          unit?: string
          uvc_label?: string | null
          uvc_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id: string | null
          supplier_label: string
          total: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string | null
          supplier_label: string
          total?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          supplier_id?: string | null
          supplier_label?: string
          total?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          quantity?: number
          recipe_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          image_url: string | null
          instruction: string
          recipe_id: string
          step_number: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instruction: string
          recipe_id: string
          step_number: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          instruction?: string
          recipe_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time_minutes: number | null
          created_at: string
          id: string
          image_url: string | null
          instructions: string | null
          notes: string | null
          prep_time_minutes: number | null
          product_id: string
          updated_at: string
          yield_quantity: number
          yield_unit: string
        }
        Insert: {
          cook_time_minutes?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          notes?: string | null
          prep_time_minutes?: number | null
          product_id: string
          updated_at?: string
          yield_quantity?: number
          yield_unit?: string
        }
        Update: {
          cook_time_minutes?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          instructions?: string | null
          notes?: string | null
          prep_time_minutes?: number | null
          product_id?: string
          updated_at?: string
          yield_quantity?: number
          yield_unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      super_ingredient_components: {
        Row: {
          component_ingredient_id: string
          created_at: string
          id: string
          quantity: number
          super_ingredient_id: string
          unit: string
        }
        Insert: {
          component_ingredient_id: string
          created_at?: string
          id?: string
          quantity?: number
          super_ingredient_id: string
          unit?: string
        }
        Update: {
          component_ingredient_id?: string
          created_at?: string
          id?: string
          quantity?: number
          super_ingredient_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "super_ingredient_components_component_ingredient_id_fkey"
            columns: ["component_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_ingredient_components_super_ingredient_id_fkey"
            columns: ["super_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          mobile: string | null
          name: string | null
          phone: string | null
          title: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          phone?: string | null
          title: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string | null
          phone?: string | null
          title?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      tickets_caisse: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          lines: Json
          payment_method: string
          subtotal: number
          ticket_number: string
          total: number
          tva_amount: number
          tva_rate: number
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          id?: string
          lines?: Json
          payment_method?: string
          subtotal?: number
          ticket_number: string
          total?: number
          tva_amount?: number
          tva_rate?: number
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          lines?: Json
          payment_method?: string
          subtotal?: number
          ticket_number?: string
          total?: number
          tva_amount?: number
          tva_rate?: number
          updated_at?: string
          warehouse_id?: string | null
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
      warehouses: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_ingredient_recursive: {
        Args: { _ingredient_id: string }
        Returns: undefined
      }
      convert_to_base_unit: {
        Args: { _base_unit: string; _from_unit: string; _qty: number }
        Returns: number
      }
      decrement_stock_from_orders: {
        Args: { _order_ids: string[] }
        Returns: undefined
      }
      get_client_id_for_user: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalc_product_cost_from_recipe: {
        Args: { _product_id: string }
        Returns: undefined
      }
      recalc_super_ingredient_cost: {
        Args: { _super_id: string }
        Returns: undefined
      }
      validate_purchase_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "pdv"
      ingredient_type:
        | "surgele"
        | "frais"
        | "epicerie"
        | "fruits_legumes"
        | "emballage"
      order_status: "pending" | "confirmed" | "in_production" | "delivered"
      purchase_order_status: "pending" | "completed"
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
      app_role: ["admin", "pdv"],
      ingredient_type: [
        "surgele",
        "frais",
        "epicerie",
        "fruits_legumes",
        "emballage",
      ],
      order_status: ["pending", "confirmed", "in_production", "delivered"],
      purchase_order_status: ["pending", "completed"],
    },
  },
} as const
