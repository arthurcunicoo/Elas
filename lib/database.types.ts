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
      avaliacao_fatores: {
        Row: {
          avaliacao_id: string
          fator_id: string
        }
        Insert: {
          avaliacao_id: string
          fator_id: string
        }
        Update: {
          avaliacao_id?: string
          fator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_fatores_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacao_fatores_fator_id_fkey"
            columns: ["fator_id"]
            isOneToOne: false
            referencedRelation: "fatores"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          atualizado_em: string
          comentario: string
          contribuida_em: string
          criado_em: string
          id: string
          lugar_id: string
          moderacao_revisao: number
          sentimento: string
          status: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          comentario?: string
          contribuida_em?: string
          criado_em?: string
          id?: string
          lugar_id: string
          moderacao_revisao?: number
          sentimento: string
          status?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          comentario?: string
          contribuida_em?: string
          criado_em?: string
          id?: string
          lugar_id?: string
          moderacao_revisao?: number
          sentimento?: string
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_osm_cache: {
        Row: {
          atualizado_em: string
          bloqueado_ate: string
          chave: string
          elementos_recebidos: number
          parcial: boolean
        }
        Insert: {
          atualizado_em?: string
          bloqueado_ate?: string
          chave: string
          elementos_recebidos?: number
          parcial?: boolean
        }
        Update: {
          atualizado_em?: string
          bloqueado_ate?: string
          chave?: string
          elementos_recebidos?: number
          parcial?: boolean
        }
        Relationships: []
      }
      conteudos_demonstracao: {
        Row: {
          ativo: boolean
          criado_em: string
          dados: Json
          descricao: string
          estado: string | null
          ficticio: boolean
          id: string
          inicia_em: string | null
          local_texto: string
          lugar_id: string | null
          nome_exibicao: string
          ordem: number
          sentimento: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          dados?: Json
          ativo?: boolean
          criado_em?: string
          descricao: string
          estado?: string | null
          ficticio?: boolean
          id: string
          inicia_em?: string | null
          local_texto?: string
          lugar_id?: string | null
          nome_exibicao?: string
          ordem?: number
          sentimento?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          dados?: Json
          ativo?: boolean
          criado_em?: string
          descricao?: string
          estado?: string | null
          ficticio?: boolean
          id?: string
          inicia_em?: string | null
          local_texto?: string
          lugar_id?: string | null
          nome_exibicao?: string
          ordem?: number
          sentimento?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteudos_demonstracao_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      enquete_opcoes: {
        Row: {
          enquete_id: string
          id: string
          ordem: number
          texto: string
        }
        Insert: {
          enquete_id: string
          id?: string
          ordem: number
          texto: string
        }
        Update: {
          enquete_id?: string
          id?: string
          ordem?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquete_opcoes_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
        ]
      }
      enquetes: {
        Row: {
          atualizado_em: string
          criado_em: string
          encerra_em: string
          id: string
          pergunta: string
          publicado: boolean
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          encerra_em: string
          id?: string
          pergunta: string
          publicado?: boolean
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          encerra_em?: string
          id?: string
          pergunta?: string
          publicado?: boolean
        }
        Relationships: []
      }
      eventos: {
        Row: {
          atualizado_em: string
          cancelado: boolean
          criado_em: string
          descricao: string
          id: string
          inicia_em: string
          local_texto: string
          publicado: boolean
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          cancelado?: boolean
          criado_em?: string
          descricao: string
          id?: string
          inicia_em: string
          local_texto: string
          publicado?: boolean
          titulo: string
        }
        Update: {
          atualizado_em?: string
          cancelado?: boolean
          criado_em?: string
          descricao?: string
          id?: string
          inicia_em?: string
          local_texto?: string
          publicado?: boolean
          titulo?: string
        }
        Relationships: []
      }
      fatores: {
        Row: {
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          id: string
          nome: string
          ordem: number
        }
        Update: {
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      favoritos: {
        Row: {
          criado_em: string
          lugar_id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          lugar_id: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          lugar_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status: {
        Row: {
          anterior: string
          criado_em: string
          id: string
          motivo: string
          novo: string
          registro_id: string
          responsavel_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          anterior: string
          criado_em?: string
          id?: string
          motivo: string
          novo: string
          registro_id: string
          responsavel_id?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          anterior?: string
          criado_em?: string
          id?: string
          motivo?: string
          novo?: string
          registro_id?: string
          responsavel_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      inscricoes: {
        Row: {
          criado_em: string
          evento_id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          evento_id: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          evento_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      lugares: {
        Row: {
          atualizado_em: string
          cadastro_revisao: number
          categoria: string | null
          categoria_app: string | null
          criado_em: string
          dados_verificados_em: string | null
          duplicado_de: string | null
          endereco: string
          fonte_dados: string | null
          foto_autor: string | null
          foto_data: string | null
          foto_fonte: string | null
          foto_licenca: string | null
          foto_url: string | null
          id: string
          latitude: number
          localizacao: unknown
          longitude: number
          nome: string
          oculto_catalogo: boolean
          origem: string
          referencia_externa: string | null
          relevancia: number | null
        }
        Insert: {
          atualizado_em?: string
          cadastro_revisao?: number
          categoria?: string | null
          categoria_app?: string | null
          criado_em?: string
          dados_verificados_em?: string | null
          duplicado_de?: string | null
          endereco: string
          fonte_dados?: string | null
          foto_autor?: string | null
          foto_data?: string | null
          foto_fonte?: string | null
          foto_licenca?: string | null
          foto_url?: string | null
          id: string
          latitude: number
          localizacao?: unknown
          longitude: number
          nome: string
          oculto_catalogo?: boolean
          origem?: string
          referencia_externa?: string | null
          relevancia?: number | null
        }
        Update: {
          atualizado_em?: string
          cadastro_revisao?: number
          categoria?: string | null
          categoria_app?: string | null
          criado_em?: string
          dados_verificados_em?: string | null
          duplicado_de?: string | null
          endereco?: string
          fonte_dados?: string | null
          foto_autor?: string | null
          foto_data?: string | null
          foto_fonte?: string | null
          foto_licenca?: string | null
          foto_url?: string | null
          id?: string
          latitude?: number
          localizacao?: unknown
          longitude?: number
          nome?: string
          oculto_catalogo?: boolean
          origem?: string
          referencia_externa?: string | null
          relevancia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lugares_duplicado_de_fkey"
            columns: ["duplicado_de"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      lugares_fontes: {
        Row: {
          confianca: number | null
          importado_em: string
          lugar_id: string
          propriedades: Json
          provedor: string
          referencia: string
          versao: string | null
        }
        Insert: {
          confianca?: number | null
          importado_em?: string
          lugar_id: string
          propriedades?: Json
          provedor: string
          referencia: string
          versao?: string | null
        }
        Update: {
          confianca?: number | null
          importado_em?: string
          lugar_id?: string
          propriedades?: Json
          provedor?: string
          referencia?: string
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lugares_fontes_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          criado_em: string
          id: string
          lida: boolean
          mensagem: string
          registro_id: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem: string
          registro_id: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          lida?: boolean
          mensagem?: string
          registro_id?: string
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          avatar_url: string | null
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          avatar_url?: string | null
          criado_em?: string
          id: string
          nome: string
        }
        Update: {
          avatar_url?: string | null
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      relatos: {
        Row: {
          atualizado_em: string
          categoria: string
          criado_em: string
          descricao: string
          envio_hash: string | null
          id: string
          latitude: number | null
          local_texto: string
          localizacao: unknown
          longitude: number | null
          lugar_id: string | null
          moderacao_revisao: number
          status: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          categoria: string
          criado_em?: string
          descricao: string
          envio_hash?: string | null
          id?: string
          latitude?: number | null
          local_texto: string
          localizacao?: unknown
          longitude?: number | null
          lugar_id?: string | null
          moderacao_revisao?: number
          status?: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          descricao?: string
          envio_hash?: string | null
          id?: string
          latitude?: number | null
          local_texto?: string
          localizacao?: unknown
          longitude?: number | null
          lugar_id?: string | null
          moderacao_revisao?: number
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatos_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          ativa: boolean
          east: number
          estado: string
          id: string
          latitude: number
          latitude_delta: number
          longitude: number
          longitude_delta: number
          nome: string
          north: number
          prioridade: number
          south: number
          timezone: string
          west: number
        }
        Insert: {
          ativa?: boolean
          east: number
          estado: string
          id: string
          latitude: number
          latitude_delta?: number
          longitude: number
          longitude_delta?: number
          nome: string
          north: number
          prioridade?: number
          south: number
          timezone?: string
          west: number
        }
        Update: {
          ativa?: boolean
          east?: number
          estado?: string
          id?: string
          latitude?: number
          latitude_delta?: number
          longitude?: number
          longitude_delta?: number
          nome?: string
          north?: number
          prioridade?: number
          south?: number
          timezone?: string
          west?: number
        }
        Relationships: []
      }
      solicitacoes_melhoria: {
        Row: {
          atualizado_em: string
          criado_em: string
          descricao: string
          envio_hash: string | null
          id: string
          lugar_id: string | null
          moderacao_revisao: number
          status: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          descricao: string
          envio_hash?: string | null
          id?: string
          lugar_id?: string | null
          moderacao_revisao?: number
          status?: string
          titulo: string
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          descricao?: string
          envio_hash?: string | null
          id?: string
          lugar_id?: string | null
          moderacao_revisao?: number
          status?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_melhoria_lugar_id_fkey"
            columns: ["lugar_id"]
            isOneToOne: false
            referencedRelation: "lugares"
            referencedColumns: ["id"]
          },
        ]
      }
      votos: {
        Row: {
          criado_em: string
          enquete_id: string
          opcao_id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          enquete_id: string
          opcao_id: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          enquete_id?: string
          opcao_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_enquete_id_fkey"
            columns: ["enquete_id"]
            isOneToOne: false
            referencedRelation: "enquetes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_enquete_id_opcao_id_fkey"
            columns: ["enquete_id", "opcao_id"]
            isOneToOne: false
            referencedRelation: "enquete_opcoes"
            referencedColumns: ["enquete_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirmar_catalogo_ingestao: { Args: { p_lease: string; p_batch: Json }; Returns: Json }
      alterar_papel: { Args: { p_usuario: string; p_papel: string; p_anterior: string; p_motivo: string }; Returns: string }
      pagina_papeis: { Args: { p_busca?: string; p_cursor?: Json; p_historico?: boolean }; Returns: Json }
      capacidades_backend: { Args: never; Returns: Json }
      admin_listar: {
        Args: {
          p_busca?: string
          p_pagina?: number
          p_status?: string
          p_tipo: string
        }
        Returns: Json
      }
      admin_resumo: { Args: never; Returns: Json }
      alterar_registro_proprio: {
        Args: {
          p_anterior: string
          p_dados: Json
          p_id: string
          p_retirar?: boolean
          p_tipo: string
        }
        Returns: undefined
      }
      buscar_lugares: {
        Args: {
          p_busca: string
          p_categoria: string
          p_conhecidas: string[]
          p_pagina?: number
          p_tags: string[]
        }
        Returns: {
          atualizado_em: string
          cadastro_revisao: number
          categoria: string | null
          categoria_app: string | null
          criado_em: string
          dados_verificados_em: string | null
          duplicado_de: string | null
          endereco: string
          fonte_dados: string | null
          foto_autor: string | null
          foto_data: string | null
          foto_fonte: string | null
          foto_licenca: string | null
          foto_url: string | null
          id: string
          latitude: number
          localizacao: unknown
          longitude: number
          nome: string
          oculto_catalogo: boolean
          origem: string
          referencia_externa: string | null
          relevancia: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "lugares"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      candidatos_catalogo: { Args: { p_lugares: Json }; Returns: Json }
      classificar_lugar: {
        Args: {
          p_anterior: string
          p_categoria: string
          p_id: string
          p_motivo: string
        }
        Returns: undefined
      }
      classificar_lugar_revisao: {
        Args: {
          p_anterior: string
          p_categoria: string
          p_id: string
          p_motivo: string
          p_revisao: string
        }
        Returns: undefined
      }
      corrigir_lugar: {
        Args: {
          p_anterior: string
          p_endereco: string
          p_foto: string
          p_id: string
          p_motivo: string
          p_nome: string
        }
        Returns: undefined
      }
      desativar_push: { Args: { p_instalacao: string }; Returns: undefined }
      detalhes_registro: {
        Args: { p_id: string; p_tipo: string }
        Returns: Json
      }
      enviar_registro: {
        Args: { p_chave: string; p_dados: Json; p_tipo: string }
        Returns: string
      }
      estado_push: { Args: { p_instalacao?: string }; Returns: Json }
      fila_moderacao: {
        Args: { p_cursor?: Json; p_filtros?: Json; p_tipo: string }
        Returns: Json
      }
      finalizar_catalogo_job: {
        Args: { p_erro?: string; p_lease: string; p_recebidos?: number }
        Returns: undefined
      }
      finalizar_push: {
        Args: { p_lease: string; p_resultado: string; p_ticket?: string }
        Returns: undefined
      }
      gerenciar_publicacao: {
        Args: {
          p_acao: string
          p_anterior: string
          p_dados?: Json
          p_id: string
          p_tipo: string
        }
        Returns: undefined
      }
      historico_registro: {
        Args: { p_id: string; p_pagina?: number; p_tipo: string }
        Returns: Json
      }
      importar_overture: {
        Args: { p_registros: Json; p_versao: string }
        Returns: Json
      }
      inscrever: {
        Args: { p_evento: string; p_participar: boolean }
        Returns: undefined
      }
      listar_enquetes: {
        Args: { p_encerradas?: boolean; p_pagina?: number }
        Returns: Json
      }
      mapa_lugares: {
        Args: {
          p_categoria?: string
          p_leste: number
          p_norte: number
          p_oeste: number
          p_sul: number
        }
        Returns: Json
      }
      mapa_relatos: {
        Args: {
          p_leste: number
          p_norte: number
          p_oeste: number
          p_sul: number
          p_zoom?: number
        }
        Returns: Json
      }
      meu_papel: { Args: never; Returns: string }
      meus_registros: {
        Args: { p_pagina?: number; p_tipo: string }
        Returns: Json
      }
      minha_participacao: { Args: never; Returns: Json }
      moderar: {
        Args: {
          p_anterior: string
          p_id: string
          p_motivo: string
          p_status: string
          p_tipo: string
        }
        Returns: undefined
      }
      moderar_revisao: {
        Args: {
          p_anterior: string
          p_id: string
          p_motivo: string
          p_revisao: number
          p_status: string
          p_tipo: string
        }
        Returns: undefined
      }
      pagina_app: {
        Args: { p_cursor?: Json; p_filtros?: Json; p_lista: string }
        Returns: Json
      }
      painel_impactos: { Args: never; Returns: Json }
      publicar_enquete: {
        Args: { p_fim: string; p_opcoes: string[]; p_pergunta: string }
        Returns: string
      }
      publicar_evento: {
        Args: {
          p_descricao: string
          p_inicio: string
          p_local: string
          p_titulo: string
        }
        Returns: string
      }
      registrar_push: {
        Args: {
          p_instalacao: string
          p_plataforma: string
          p_projeto: string
          p_token: string
          p_usuario: string
        }
        Returns: undefined
      }
      reservar_catalogo_job: { Args: { p_token_hash: string }; Returns: Json }
      reservar_consulta_osm: { Args: { p_chave: string }; Returns: boolean }
      reservar_push: { Args: { p_token_hash: string }; Returns: Json }
      resolver_lugar: {
        Args: { p_id: string }
        Returns: {
          atualizado_em: string
          cadastro_revisao: number
          categoria: string | null
          categoria_app: string | null
          criado_em: string
          dados_verificados_em: string | null
          duplicado_de: string | null
          endereco: string
          fonte_dados: string | null
          foto_autor: string | null
          foto_data: string | null
          foto_fonte: string | null
          foto_licenca: string | null
          foto_url: string | null
          id: string
          latitude: number
          localizacao: unknown
          longitude: number
          nome: string
          oculto_catalogo: boolean
          origem: string
          referencia_externa: string | null
          relevancia: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "lugares"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      resumo_impactos: { Args: never; Returns: Json }
      resumos_avaliacoes:
        | { Args: { p_lugares: string[] }; Returns: Json }
        | { Args: { p_compacto: boolean; p_lugares: string[] }; Returns: Json }
      salvar_avaliacao: {
        Args: {
          p_comentario: string
          p_fatores: string[]
          p_lugar: string
          p_sentimento: string
        }
        Returns: string
      }
      versao_app: { Args: never; Returns: number }
      votar: {
        Args: { p_enquete: string; p_opcao: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
