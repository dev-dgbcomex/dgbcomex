import {
  Activity,
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  BadgeCheck,
  Banknote,
  BarChart3,
  Building,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  CheckCircle,
  CircleDollarSign,
  Clock,
  Contact,
  Factory,
  FileText,
  HandCoins,
  Handshake,
  Landmark,
  ListChecks,
  MapPin,
  Megaphone,
  Package,
  Percent,
  Phone,
  PieChart,
  Receipt,
  Ruler,
  Target,
  Ticket,
  TrendingDown,
  TrendingUp,
  Undo2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Wallet,
  Weight,
  XCircle,
  type LucideIcon,
} from "lucide-react"

/**
 * Identidade visual dos cards coloridos (tema Dracula).
 *
 * Cada card recebe uma cor e um ícone derivados do TÍTULO dele — assim o mesmo
 * título tem sempre a mesma cor (e o mesmo ícone), mesmo que a ordem dos cards
 * mude. Usado no painel de BI (`/bi/integracoes`), nos relatórios de BI
 * (`/bi/integracoes/*`) e nos relatórios do CRM (`/comercial/crm/relatorios/*`).
 */

/** Paleta oficial do tema Dracula. */
export const PALETA_DRACULA = {
  background: "#282a36",
  currentLine: "#44475a",
  foreground: "#f8f8f2",
  comment: "#6272a4",
  cyan: "#8be9fd",
  green: "#50fa7b",
  orange: "#ffb86c",
  pink: "#ff79c6",
  purple: "#bd93f9",
  red: "#ff5555",
  yellow: "#f1fa8c",
} as const

/** Cores de destaque usadas no fundo dos cards (fundo/texto ficam de fora). */
export const CORES_DRACULA: string[] = [
  PALETA_DRACULA.purple,
  PALETA_DRACULA.cyan,
  PALETA_DRACULA.green,
  PALETA_DRACULA.orange,
  PALETA_DRACULA.pink,
  PALETA_DRACULA.yellow,
  PALETA_DRACULA.red,
  PALETA_DRACULA.comment,
]

export interface EstiloCardDracula {
  /** Cor de destaque (hex) do card. */
  cor: string
  /** Fundo do card no tema claro. */
  fundoClaro: string
  /** Fundo do card no tema escuro. */
  fundoEscuro: string
  /** Cor da borda do card. */
  borda: string
  /** Cor do fundo do badge do ícone. */
  fundoIcone: string
}

function hexParaRgba(hex: string, alfa: number): string {
  const limpo = hex.replace("#", "")
  const r = parseInt(limpo.slice(0, 2), 16)
  const g = parseInt(limpo.slice(2, 4), 16)
  const b = parseInt(limpo.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alfa})`
}

/** Hash estável (djb2) do título: o mesmo texto sempre cai na mesma cor. */
export function hashTitulo(titulo: string): number {
  let hash = 5381
  const texto = (titulo ?? "").trim().toLowerCase()
  for (let i = 0; i < texto.length; i++) {
    hash = ((hash << 5) + hash + texto.charCodeAt(i)) >>> 0
  }
  return hash
}

/** Cor do card derivada do título. */
export function corPorTitulo(titulo: string): EstiloCardDracula {
  const cor = CORES_DRACULA[hashTitulo(titulo) % CORES_DRACULA.length]
  return {
    cor,
    fundoClaro: `linear-gradient(135deg, ${hexParaRgba(cor, 0.18)}, ${hexParaRgba(cor, 0.04)} 70%)`,
    fundoEscuro: `linear-gradient(135deg, ${hexParaRgba(PALETA_DRACULA.background, 0.96)}, ${hexParaRgba(cor, 0.24)})`,
    borda: hexParaRgba(cor, 0.45),
    fundoIcone: hexParaRgba(cor, 0.16),
  }
}

/**
 * Regras de ícone por palavra-chave do título. A ordem importa: as regras mais
 * específicas vêm primeiro (ex.: "Pagamentos por banco" é banco, não pagamento).
 */
const REGRAS_ICONE: { padrao: RegExp; icone: LucideIcon }[] = [
  { padrao: /taxa de|% (do|pago|sobre)/i, icone: Percent },
  { padrao: /metragem/i, icone: Ruler },
  { padrao: /peso/i, icone: Weight },
  { padrao: /itens|produto/i, icone: Package },
  { padrao: /ticket/i, icone: Ticket },
  { padrao: /participa/i, icone: PieChart },
  { padrao: /banco/i, icone: Landmark },
  { padrao: /fornecedor/i, icone: Factory },
  { padrao: /departamento/i, icone: Building2 },
  { padrao: /empresa/i, icone: Building2 },
  { padrao: /custo|administrativ/i, icone: Building2 },
  { padrao: /faturamento|pipeline/i, icone: Banknote },
  { padrao: /valor aceito/i, icone: BadgeCheck },
  { padrao: /valor enviado|proposta/i, icone: Receipt },
  { padrao: /valor|receita/i, icone: CircleDollarSign },
  { padrao: /ganha|alta|crescimento/i, icone: TrendingUp },
  { padrao: /perdid|queda/i, icone: TrendingDown },
  { padrao: /variacao|variação/i, icone: TrendingUp },
  { padrao: /receber/i, icone: ArrowDownToLine },
  { padrao: /a pagar|pagar program/i, icone: ArrowUpFromLine },
  { padrao: /pagas|pagamento/i, icone: HandCoins },
  { padrao: /clientes? com neg[oó]cio/i, icone: Handshake },
  { padrao: /clientes?/i, icone: Building2 },
  { padrao: /neg[oó]cio/i, icone: Handshake },
  { padrao: /oportunidade/i, icone: Target },
  { padrao: /visita/i, icone: CalendarCheck },
  { padrao: /tarefa/i, icone: ListChecks },
  { padrao: /lead/i, icone: UserPlus },
  { padrao: /campanha/i, icone: Megaphone },
  { padrao: /pessoa[s]? f[ií]sica/i, icone: User },
  { padrao: /pessoa[s]? jur[ií]dica/i, icone: Building },
  { padrao: /pessoa/i, icone: Users },
  { padrao: /contato/i, icone: Contact },
  { padrao: /atividade/i, icone: Activity },
  { padrao: /convers/i, icone: ArrowRightLeft },
  { padrao: /convertid/i, icone: UserCheck },
  { padrao: /em aberto|pendente/i, icone: Clock },
  { padrao: /aceit|conclu/i, icone: CheckCircle },
  { padrao: /recus|rejeit/i, icone: XCircle },
  { padrao: /criad/i, icone: CalendarPlus },
  { padrao: /telefone/i, icone: Phone },
  { padrao: /v[ií]deo/i, icone: Video },
  { padrao: /presencial/i, icone: MapPin },
  { padrao: /representante|equipe|vendedor/i, icone: Users },
  { padrao: /m[eê]s/i, icone: CalendarDays },
  { padrao: /ano|per[ií]odo|12 meses/i, icone: CalendarRange },
  { padrao: /nota|documento|relat[oó]rio/i, icone: FileText },
  { padrao: /desconto/i, icone: Percent },
  { padrao: /devolu/i, icone: Undo2 },
  { padrao: /estorno/i, icone: TrendingDown },
  { padrao: /custo m[eé]dio|gasto|despesa/i, icone: Wallet },
]

/** Ícone representativo do card, derivado do título. */
export function iconePorTitulo(titulo: string): LucideIcon {
  const texto = (titulo ?? "").trim()
  for (const regra of REGRAS_ICONE) {
    if (regra.padrao.test(texto)) return regra.icone
  }
  return BarChart3
}
