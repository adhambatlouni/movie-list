// Matches the checked-in migration. Replace with generated Supabase types when
// the connected database schema grows.
export type Database = {
  public: {
    Tables: {
      movies: {
        Row: {
          id: string;
          title: string;
          notes: string | null;
          watched: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          notes?: string | null;
          watched?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          notes?: string | null;
          watched?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
