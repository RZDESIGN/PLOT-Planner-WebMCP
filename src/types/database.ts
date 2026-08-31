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
      activity_events: {
        Row: {
          actor_id: string
          board_id: string
          created_at: string
          event_type: string
          id: number
          payload: Json
        }
        Insert: {
          actor_id: string
          board_id: string
          created_at?: string
          event_type: string
          id?: number
          payload?: Json
        }
        Update: {
          actor_id?: string
          board_id?: string
          created_at?: string
          event_type?: string
          id?: number
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_columns: {
        Row: {
          accent: string
          board_id: string
          client_key: string
          created_at: string
          description: string
          id: string
          position: number
          title: string
          updated_at: string
          wip_limit: number | null
        }
        Insert: {
          accent?: string
          board_id: string
          client_key: string
          created_at?: string
          description?: string
          id?: string
          position: number
          title: string
          updated_at?: string
          wip_limit?: number | null
        }
        Update: {
          accent?: string
          board_id?: string
          client_key?: string
          created_at?: string
          description?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "board_columns_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          board_id: string
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          id: string
          revoked_at: string | null
          role: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          board_id: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          board_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_invitations_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          board_id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          board_id: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          board_id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          capacity: number
          created_at: string
          created_from_board_id: string | null
          description: string
          ends_on: string | null
          id: string
          is_template: boolean
          owner_id: string | null
          sprint_goal: string
          starts_on: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          created_from_board_id?: string | null
          description?: string
          ends_on?: string | null
          id?: string
          is_template?: boolean
          owner_id?: string | null
          sprint_goal?: string
          starts_on?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          created_from_board_id?: string | null
          description?: string
          ends_on?: string | null
          id?: string
          is_template?: boolean
          owner_id?: string | null
          sprint_goal?: string
          starts_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_created_from_board_id_fkey"
            columns: ["created_from_board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      card_dependencies: {
        Row: {
          board_id: string
          created_at: string
          created_by: string | null
          id: string
          source_card_id: string
          target_card_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          source_card_id: string
          target_card_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          source_card_id?: string
          target_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_dependencies_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_dependencies_source_card_id_board_id_fkey"
            columns: ["source_card_id", "board_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "board_id"]
          },
          {
            foreignKeyName: "card_dependencies_target_card_id_board_id_fkey"
            columns: ["target_card_id", "board_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      cards: {
        Row: {
          board_id: string
          client_key: string
          column_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          estimate: number
          goal: string | null
          id: string
          labels: string[]
          owner_name: string | null
          position: number
          priority: Database["public"]["Enums"]["card_priority"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          board_id: string
          client_key: string
          column_id: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          estimate?: number
          goal?: string | null
          id?: string
          labels?: string[]
          owner_name?: string | null
          position: number
          priority?: Database["public"]["Enums"]["card_priority"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          board_id?: string
          client_key?: string
          column_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          estimate?: number
          goal?: string | null
          id?: string
          labels?: string[]
          owner_name?: string | null
          position?: number
          priority?: Database["public"]["Enums"]["card_priority"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_column_id_board_id_fkey"
            columns: ["column_id", "board_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id", "board_id"]
          },
        ]
      }
      sticky_notes: {
        Row: {
          board_id: string
          card_payload: Json
          client_key: string
          color: "yellow" | "pink" | "blue" | "green" | "violet"
          content: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
          updated_by: string | null
          x: number
          y: number
        }
        Insert: {
          board_id: string
          card_payload?: Json
          client_key: string
          color?: "yellow" | "pink" | "blue" | "green" | "violet"
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          x?: number
          y?: number
        }
        Update: {
          board_id?: string
          card_payload?: Json
          client_key?: string
          color?: "yellow" | "pink" | "blue" | "green" | "violet"
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "sticky_notes_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_proposals: {
        Row: {
          board_id: string
          created_at: string
          created_by: string
          id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          summary: string
          title: string
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by: string
          id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          summary?: string
          title: string
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string
          id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_proposals_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["proposal_action_type"]
          after_state: Json
          before_state: Json
          created_at: string
          entity_id: string | null
          id: string
          position: number
          proposal_id: string
          rationale: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["proposal_action_type"]
          after_state?: Json
          before_state?: Json
          created_at?: string
          entity_id?: string | null
          id?: string
          position: number
          proposal_id: string
          rationale?: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["proposal_action_type"]
          after_state?: Json
          before_state?: Json
          created_at?: string
          entity_id?: string | null
          id?: string
          position?: number
          proposal_id?: string
          rationale?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_actions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "planning_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_board_invitation: { Args: { p_token: string }; Returns: string }
      apply_planning_proposal: {
        Args: { p_board_id: string; p_layout: Json; p_proposal_id: string }
        Returns: undefined
      }
      commit_card_layout: {
        Args: { p_board_id: string; p_layout: Json }
        Returns: undefined
      }
      convert_card_to_sticky: {
        Args: { p_card_id: string; p_layout: Json; p_note: Json }
        Returns: undefined
      }
      convert_sticky_to_card: {
        Args: {
          p_card: Json
          p_dependencies: Json
          p_layout: Json
          p_note_id: string
        }
        Returns: undefined
      }
      create_board_invitation: {
        Args: { p_board_id: string; p_email?: string; p_role?: string }
        Returns: {
          expires_at: string
          invitation_id: string
          invitation_token: string
        }[]
      }
      create_sprint: {
        Args: {
          p_capacity?: number
          p_copy_mode?: string
          p_ends_on?: string
          p_source_board_id?: string
          p_sprint_goal?: string
          p_starts_on?: string
          p_title: string
        }
        Returns: string
      }
      persist_planning_proposal: {
        Args: { p_actions: Json; p_board_id: string; p_proposal: Json }
        Returns: undefined
      }
    }
    Enums: {
      card_priority: "critical" | "high" | "medium" | "low"
      proposal_action_type:
        | "create_card"
        | "move_card"
        | "update_card"
        | "split_card"
        | "link_dependency"
      proposal_status: "draft" | "accepted" | "dismissed"
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
      card_priority: ["critical", "high", "medium", "low"],
      proposal_action_type: [
        "create_card",
        "move_card",
        "update_card",
        "split_card",
        "link_dependency",
      ],
      proposal_status: ["draft", "accepted", "dismissed"],
    },
  },
} as const
