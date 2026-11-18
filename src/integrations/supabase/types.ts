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
      avaliacoes: {
        Row: {
          avaliado_id: string
          avaliador_id: string
          comentario: string
          created_at: string
          estrelas: number
          id: string
          imovel_id: string
          janela_fim: string | null
          moradia_id: string | null
          revelada: boolean
          updated_at: string
        }
        Insert: {
          avaliado_id: string
          avaliador_id: string
          comentario?: string
          created_at?: string
          estrelas: number
          id?: string
          imovel_id: string
          janela_fim?: string | null
          moradia_id?: string | null
          revelada?: boolean
          updated_at?: string
        }
        Update: {
          avaliado_id?: string
          avaliador_id?: string
          comentario?: string
          created_at?: string
          estrelas?: number
          id?: string
          imovel_id?: string
          janela_fim?: string | null
          moradia_id?: string | null
          revelada?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_avaliado_id_fkey"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_avaliador_id_fkey"
            columns: ["avaliador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_moradia_id_fkey"
            columns: ["moradia_id"]
            isOneToOne: false
            referencedRelation: "moradias"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_moradores: {
        Row: {
          aprovado: boolean
          ativo: boolean
          autor_id: string
          created_at: string
          id: string
          imovel_id: string
          mensagem: string
          moradia_id: string
          updated_at: string
          vagas_procuradas: number
        }
        Insert: {
          aprovado?: boolean
          ativo?: boolean
          autor_id: string
          created_at?: string
          id?: string
          imovel_id: string
          mensagem?: string
          moradia_id: string
          updated_at?: string
          vagas_procuradas?: number
        }
        Update: {
          aprovado?: boolean
          ativo?: boolean
          autor_id?: string
          created_at?: string
          id?: string
          imovel_id?: string
          mensagem?: string
          moradia_id?: string
          updated_at?: string
          vagas_procuradas?: number
        }
        Relationships: [
          {
            foreignKeyName: "chamados_moradores_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_moradores_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_moradores_moradia_id_fkey"
            columns: ["moradia_id"]
            isOneToOne: false
            referencedRelation: "moradias"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_membros: {
        Row: {
          grupo_id: string
          joined_at: string
          usuario_id: string
        }
        Insert: {
          grupo_id: string
          joined_at?: string
          usuario_id: string
        }
        Update: {
          grupo_id?: string
          joined_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_membros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupo_membros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          created_at: string
          id: string
          lider_id: string
          nome_grupo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lider_id: string
          nome_grupo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lider_id?: string
          nome_grupo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupos_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imoveis: {
        Row: {
          aceita_solicitacoes: boolean
          bairro: string
          comodidades: string[]
          contato_whatsapp: string | null
          created_at: string
          descricao: string
          endereco: string
          fotos: string[]
          id: string
          latitude: number | null
          longitude: number | null
          media_estrelas: number
          moradores_podem_recrutar: boolean
          ocupado: boolean
          parada_ida_minutos: number | null
          parada_ida_nome: string | null
          parada_volta_minutos: number | null
          parada_volta_nome: string | null
          preco_mensal: number
          proprietario_id: string
          proximidade: string | null
          quartos: number
          status: Database["public"]["Enums"]["status_imovel"]
          tipo: Database["public"]["Enums"]["tipo_imovel"]
          titulo: string
          transporte_fonte: string | null
          updated_at: string
          vagas_disponiveis: number
          vagas_total: number
          whatsapp_grupo_url: string | null
        }
        Insert: {
          aceita_solicitacoes?: boolean
          bairro: string
          comodidades?: string[]
          contato_whatsapp?: string | null
          created_at?: string
          descricao?: string
          endereco?: string
          fotos?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_estrelas?: number
          moradores_podem_recrutar?: boolean
          ocupado?: boolean
          parada_ida_minutos?: number | null
          parada_ida_nome?: string | null
          parada_volta_minutos?: number | null
          parada_volta_nome?: string | null
          preco_mensal: number
          proprietario_id: string
          proximidade?: string | null
          quartos?: number
          status?: Database["public"]["Enums"]["status_imovel"]
          tipo?: Database["public"]["Enums"]["tipo_imovel"]
          titulo: string
          transporte_fonte?: string | null
          updated_at?: string
          vagas_disponiveis?: number
          vagas_total?: number
          whatsapp_grupo_url?: string | null
        }
        Update: {
          aceita_solicitacoes?: boolean
          bairro?: string
          comodidades?: string[]
          contato_whatsapp?: string | null
          created_at?: string
          descricao?: string
          endereco?: string
          fotos?: string[]
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_estrelas?: number
          moradores_podem_recrutar?: boolean
          ocupado?: boolean
          parada_ida_minutos?: number | null
          parada_ida_nome?: string | null
          parada_volta_minutos?: number | null
          parada_volta_nome?: string | null
          preco_mensal?: number
          proprietario_id?: string
          proximidade?: string | null
          quartos?: number
          status?: Database["public"]["Enums"]["status_imovel"]
          tipo?: Database["public"]["Enums"]["tipo_imovel"]
          titulo?: string
          transporte_fonte?: string | null
          updated_at?: string
          vagas_disponiveis?: number
          vagas_total?: number
          whatsapp_grupo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moradia_moradores: {
        Row: {
          created_at: string
          moradia_id: string
          morador_id: string
        }
        Insert: {
          created_at?: string
          moradia_id: string
          morador_id: string
        }
        Update: {
          created_at?: string
          moradia_id?: string
          morador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moradia_moradores_moradia_id_fkey"
            columns: ["moradia_id"]
            isOneToOne: false
            referencedRelation: "moradias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moradia_moradores_morador_id_fkey"
            columns: ["morador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moradias: {
        Row: {
          avaliacao_janela_fim: string | null
          created_at: string
          encerramento_pedido_em: string | null
          encerramento_pedido_por: string | null
          fim: string | null
          grupo_id: string | null
          id: string
          imovel_id: string
          inicio: string
          proprietario_id: string
          responsavel_id: string
          status: Database["public"]["Enums"]["status_moradia_reg"]
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          avaliacao_janela_fim?: string | null
          created_at?: string
          encerramento_pedido_em?: string | null
          encerramento_pedido_por?: string | null
          fim?: string | null
          grupo_id?: string | null
          id?: string
          imovel_id: string
          inicio?: string
          proprietario_id: string
          responsavel_id: string
          status?: Database["public"]["Enums"]["status_moradia_reg"]
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          avaliacao_janela_fim?: string | null
          created_at?: string
          encerramento_pedido_em?: string | null
          encerramento_pedido_por?: string | null
          fim?: string | null
          grupo_id?: string | null
          id?: string
          imovel_id?: string
          inicio?: string
          proprietario_id?: string
          responsavel_id?: string
          status?: Database["public"]["Enums"]["status_moradia_reg"]
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moradias_encerramento_pedido_por_fkey"
            columns: ["encerramento_pedido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moradias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moradias_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moradias_proprietario_id_fkey"
            columns: ["proprietario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moradias_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas_onibus: {
        Row: {
          created_at: string
          endereco: string
          id: string
          latitude: number
          longitude: number
          nome: string
          ordem: number
          sentido: Database["public"]["Enums"]["sentido_parada"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco: string
          id?: string
          latitude: number
          longitude: number
          nome: string
          ordem?: number
          sentido: Database["public"]["Enums"]["sentido_parada"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco?: string
          id?: string
          latitude?: number
          longitude?: number
          nome?: string
          ordem?: number
          sentido?: Database["public"]["Enums"]["sentido_parada"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          documento_url: string | null
          id: string
          media_estrelas: number
          nome: string
          proprietario_declarado_em: string | null
          status_moradia: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_usuario"]
          tipo_conta: Database["public"]["Enums"]["tipo_conta"]
          total_avaliacoes: number
          updated_at: string
          verificado: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          documento_url?: string | null
          id: string
          media_estrelas?: number
          nome: string
          proprietario_declarado_em?: string | null
          status_moradia?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
          tipo_conta?: Database["public"]["Enums"]["tipo_conta"]
          total_avaliacoes?: number
          updated_at?: string
          verificado?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          documento_url?: string | null
          id?: string
          media_estrelas?: number
          nome?: string
          proprietario_declarado_em?: string | null
          status_moradia?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_usuario"]
          tipo_conta?: Database["public"]["Enums"]["tipo_conta"]
          total_avaliacoes?: number
          updated_at?: string
          verificado?: boolean
        }
        Relationships: []
      }
      solicitacoes: {
        Row: {
          created_at: string
          grupo_id: string | null
          id: string
          imovel_id: string
          mensagem: string
          solicitante_id: string
          status: Database["public"]["Enums"]["status_solicitacao"]
          tipo_solicitante: Database["public"]["Enums"]["tipo_solicitante"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          grupo_id?: string | null
          id?: string
          imovel_id: string
          mensagem?: string
          solicitante_id: string
          status?: Database["public"]["Enums"]["status_solicitacao"]
          tipo_solicitante?: Database["public"]["Enums"]["tipo_solicitante"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          grupo_id?: string | null
          id?: string
          imovel_id?: string
          mensagem?: string
          solicitante_id?: string
          status?: Database["public"]["Enums"]["status_solicitacao"]
          tipo_solicitante?: Database["public"]["Enums"]["tipo_solicitante"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      pode_recrutar: {
        Args: { _moradia_id: string; _user_id: string }
        Returns: boolean
      }
      pode_ver_moradia: {
        Args: { _moradia_id: string; _user_id: string }
        Returns: boolean
      }
      processar_moradias: { Args: never; Returns: undefined }
      revelar_avaliacoes: { Args: { _moradia_id: string }; Returns: undefined }
    }
    Enums: {
      sentido_parada: "ida" | "volta"
      status_contrato: "ativo" | "encerrado" | "cancelado"
      status_imovel: "disponivel" | "esgotado" | "inativo"
      status_moradia_reg: "ativa" | "encerramento_solicitado" | "encerrada"
      status_pagamento: "pago" | "pendente" | "atrasado"
      status_solicitacao: "pendente" | "aceita" | "recusada" | "cancelada"
      tipo_conta: "comum" | "proprietario"
      tipo_imovel: "quarto" | "republica" | "kitnet" | "apartamento"
      tipo_solicitante: "individual" | "grupo"
      tipo_usuario: "estudante" | "trabalhador" | "proprietario"
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
      sentido_parada: ["ida", "volta"],
      status_contrato: ["ativo", "encerrado", "cancelado"],
      status_imovel: ["disponivel", "esgotado", "inativo"],
      status_moradia_reg: ["ativa", "encerramento_solicitado", "encerrada"],
      status_pagamento: ["pago", "pendente", "atrasado"],
      status_solicitacao: ["pendente", "aceita", "recusada", "cancelada"],
      tipo_conta: ["comum", "proprietario"],
      tipo_imovel: ["quarto", "republica", "kitnet", "apartamento"],
      tipo_solicitante: ["individual", "grupo"],
      tipo_usuario: ["estudante", "trabalhador", "proprietario"],
    },
  },
} as const
