export const CADASTRO_VISITA_DETALHE = "CRM_VISITA_DETALHE"
export const CAMPO_PROPOSTA_VINCOLADA = "proposta_vinculada"

export const ROLES_ADMINISTRATIVAS = ["ADMIN", "SUDO"] as const

export const ROLES_CAMPO_VISIBILIDADE = [
  "COMERCIAL",
  "CRM",
  "DESENVOLVIMENTO",
  "ADMIN",
  "SUDO",
  "QUALIDADE",
  "TECELAGEM",
  "BENEFICIAMENTO",
  "PCP",
] as const

export interface CampoVisibilidadeCatalogo {
  campo: string
  rotulo: string
  descricao: string
}

export interface CadastroVisibilidadeCatalogo {
  cadastro: string
  rotulo: string
  descricao: string
  campos: CampoVisibilidadeCatalogo[]
}

export const CATALOGO_CAMPOS_VISIVEIS: CadastroVisibilidadeCatalogo[] = [
  {
    cadastro: CADASTRO_VISITA_DETALHE,
    rotulo: "Detalhe da Visita",
    descricao: "Tela de detalhe de uma visita do CRM",
    campos: [
      {
        campo: CAMPO_PROPOSTA_VINCOLADA,
        rotulo: "Proposta Vinculada",
        descricao: "Link para a proposta associada e opção de vincular ou cadastrar proposta",
      },
    ],
  },
]

export function roleEhAdministrativa(role?: string | null): boolean {
  return !!role && (ROLES_ADMINISTRATIVAS as readonly string[]).includes(role)
}

export function encontrarCadastro(cadastro: string): CadastroVisibilidadeCatalogo | undefined {
  return CATALOGO_CAMPOS_VISIVEIS.find((item) => item.cadastro === cadastro)
}

export function encontrarCampo(cadastro: string, campo: string): CampoVisibilidadeCatalogo | undefined {
  return encontrarCadastro(cadastro)?.campos.find((item) => item.campo === campo)
}

export function chaveRegra(cadastro: string, campo: string): string {
  return `${cadastro}:${campo}`
}
