export type TipoLead = "PF" | "PJ"

export type LeadForm = {
  tipoPessoa?: TipoLead
  nome?: string
  cpf?: string
  razaoSocial?: string
  nomeFantasia?: string
  cnpj?: string
  segmento?: string
  porte?: string
  site?: string
  telefone?: string
  celular?: string
  email?: string
  emailNf?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  cidade?: string
  uf?: string
  observacoes?: string
  status?: string
}

export type Contato = {
  id: number
  nome: string
  cargo?: string | null
  email?: string | null
  telefone?: string | null
  principal?: boolean | null
}

export type Lead = LeadForm & {
  id: number
  contatos?: Contato[]
  responsavelNome?: string | null
  idIntegracao?: string | null
  resumoIa?: string | null
  sugestaoIa?: string | null
  dataResumoIa?: string | null
  clienteId?: number | null
  promovidaCliente?: boolean
  promovidoEm?: string | null
  promovidoPor?: number | null
  promovidoPorNome?: string | null
  cliente?: { id: number; nome: string; cnpj?: string | null } | null
  totalOportunidades?: number
  totalPedidos?: number
  totalVisitas?: number
  totalAcoes?: number
  resumo?: {
    oportunidades: number
    valorOportunidades: number
    propostas: number
    valorPropostas: number
    visitas: number
    acoes: number
  }
  createdAt?: string
  error?: string
}

export type VinculoRepresentante = {
  id?: number
  nome?: string | null
  cnpj?: string | null
  email?: string | null
  telefone?: string | null
  cidade?: string | null
  uf?: string | null
  representanteId?: number
  representanteNome?: string
  representante?: { nome?: string } | null
}

export type RepresentanteResult = {
  id: number
  nome?: string | null
  cnpj?: string | null
  cidade?: string | null
  uf?: string | null
}

export type ConsultaCnpjData = {
  razao_social?: string
  nome_fantasia?: string
  cnaes?: Array<{ is_principal?: boolean; descricao?: string }>
  cnae_principal_descricao?: string
  porte_empresa?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  municipio?: string
  uf?: string
  cep?: string
  telefones?: Array<{ ddd?: string; numero?: string }>
  situacao_cadastral?: string
}
