import type { AcaoProspeccaoFoto } from "@/lib/crm/acao-prospeccao-fotos"

export type AcaoProspeccaoDetalhe = {
  id: number
  criadoPor: number | null
  criadoPorNome: string | null
  nomeAvulso: string | null
  empresaId: number | null
  empresaNome: string | null
  clienteId: number | null
  clienteNome: string | null
  oportunidadeId: number | null
  oportunidadeTitulo: string | null
  contatoId: number | null
  contatoNome: string | null
  contatoEmail: string | null
  viagemId: number | null
  viagemTitulo: string | null
  representanteId: number | null
  representanteNome: string | null
  propostaId: number | null
  propostaTitulo: string | null
  dataAcao: string | null
  hora: string | null
  tipo: string
  status: string
  motivoCancelamento: string | null
  duracaoEstimada: number | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
  relato: string | null
  fotos: AcaoProspeccaoFoto[] | string[] | null
  googleEventId: string | null
  checkInTime: string | null
  checkOutTime: string | null
  checkInLat: number | null
  checkInLng: number | null
  checkOutLat: number | null
  checkOutLng: number | null
}

export type SetField = (
  field: keyof AcaoProspeccaoDetalhe,
  value: AcaoProspeccaoDetalhe[keyof AcaoProspeccaoDetalhe]
) => void

export type FormAcaoProspeccaoDetalhe = Partial<AcaoProspeccaoDetalhe>

export type AcaoProspeccaoResumo = {
  id: number
  dataAcao: string
  hora: string | null
  tipo: string
  status: string
  empresaNome: string | null
  clienteNome: string | null
  nomeAvulso: string | null
  empresaId: number | null
  clienteId: number | null
  oportunidadeTitulo: string | null
  criadoPorNome: string | null
  endereco: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
}

export type Conflito = {
  id: number
  empresaNome?: string | null
  clienteNome?: string | null
  tipo: string
}

export type OportunidadeResumo = {
  id: number
  titulo: string
  empresaId?: number | null
  clienteId?: number | null
}

export type EmpresaResult = {
  id: number
  razaoSocial?: string | null
  nomeFantasia?: string | null
}

export type ClienteResult = {
  id: number
  nome: string
}

export type ContatoResult = {
  id: number
  nome: string
  cargo?: string | null
}

export type EnderecoText = {
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
}

export type AcaoProspeccaoForm = {
  empresaId: string
  clienteId: string
  nomeAvulso: string
  oportunidadeId: string
  contatoId: string
  viagemId: string
  representanteId: string
  representanteNome: string
  propostaId: string
  propostaTitulo: string
  dataAcao: string
  hora: string
  tipo: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  relato: string
  duracaoEstimada: string
}

export type AcaoProspeccaoModalRow = {
  id: number
  empresaNome?: string | null
  clienteNome?: string | null
  nomeAvulso?: string | null
  dataAcao?: string | null
  hora?: string | null
  tipo?: string
  status?: string
}
