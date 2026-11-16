export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type ClothingCategory = "shorts" | "pants" | "joggers" | "longsleeves" | "t-shirts" | "outerwear" | "footwear";
export type ColorFamily = "neutral" | "warm" | "cool" | "earth";
export type OutfitVibe = "casual" | "streetwear" | "smart/formal" | "lounge/home";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          real_name: string;
          username: string;
          email: string | null;
          phone_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          real_name: string;
          username: string;
          email?: string | null;
          phone_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          real_name?: string;
          username?: string;
          email?: string | null;
          phone_number?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      closet_items: {
        Row: {
          id: string;
          user_id: string;
          category: ClothingCategory;
          dominant_color: string | null;
          color_family: ColorFamily | null;
          vibe_tag: OutfitVibe | null;
          ai_description: string | null;
          image_url: string | null;
          status: Database["public"]["Enums"]["closet_item_status"];
          wear_count: number;
          last_worn_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: ClothingCategory;
          dominant_color?: string | null;
          color_family?: ColorFamily | null;
          vibe_tag?: OutfitVibe | null;
          ai_description?: string | null;
          image_url?: string | null;
          status?: Database["public"]["Enums"]["closet_item_status"];
          wear_count?: number;
          last_worn_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: ClothingCategory;
          dominant_color?: string | null;
          color_family?: ColorFamily | null;
          vibe_tag?: OutfitVibe | null;
          ai_description?: string | null;
          image_url?: string | null;
          status?: Database["public"]["Enums"]["closet_item_status"];
          wear_count?: number;
          last_worn_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "closet_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_listings: {
        Row: {
          id: string;
          item_id: string;
          seller_id: string;
          seller_username: string;
          category: ClothingCategory;
          image_url: string | null;
          contact_visible: boolean;
          contact_email: string | null;
          contact_phone: string | null;
          length: number | null;
          width: number | null;
          price: number;
          description: string;
          issues: string | null;
          is_sold: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          seller_id: string;
          seller_username?: string;
          category?: ClothingCategory;
          image_url?: string | null;
          contact_visible?: boolean;
          contact_email?: string | null;
          contact_phone?: string | null;
          length?: number | null;
          width?: number | null;
          price: number;
          description: string;
          issues?: string | null;
          is_sold?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          seller_username?: string;
          category?: ClothingCategory;
          image_url?: string | null;
          contact_visible?: boolean;
          contact_email?: string | null;
          contact_phone?: string | null;
          length?: number | null;
          width?: number | null;
          price?: number;
          description?: string;
          issues?: string | null;
          is_sold?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_listings_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: true;
            referencedRelation: "closet_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_listings_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      mark_items_worn: {
        Args: { p_item_ids: string[]; p_worn_on: string };
        Returns: Database["public"]["Tables"]["closet_items"]["Row"][];
      };
    };
    Enums: {
      closet_item_status: "clean" | "laundry";
    };
    CompositeTypes: Record<string, never>;
  };
};
