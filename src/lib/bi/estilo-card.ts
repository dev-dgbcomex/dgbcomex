import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  BarChart3,
  Building2,
  CalendarRange,
  HandCoins,
  Percent,
  Receipt,
  RotateCcw,
  Undo2,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

/**
 * Estilo dos cards do painel de BI (`/bi/integracoes`).
 *
 * Cada card recebe uma cor do tema Dracula e um ícone representativo, sempre
 * derivados do TÍTULO do card — assim o mesmo título tem sempre a mesma cor
 * (e o mesmo ícone), mesmo que a ordem dos cards mude.
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

export interface EstiloCardBi {
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
export function corPorTitulo(titulo: string): EstiloCardBi {
  const cor = CORES_DRACULA[hashTitulo(titulo) % CORES_DRACULA.length]
  return {
    cor,
    fundoClaro: `linear-gradient(135deg, ${hexParaRgba(cor, 0.18)}, ${hexParaRgba(cor, 0.04)} 70%)`,
    fundoEscuro: `linear-gradient(135deg, ${hexParaRgba(PALETA_DRACULA.background, 0.96)}, ${hexParaRgba(cor, 0.24)})`,
    borda: hexParaRgba(cor, 0.45),
    fundoIcone: hexParaRgba(cor, 0.16),
  }
}

const REGRAS_ICONE: { padrao: RegExp; icone: LucideIcon }[] = [
  { padrao: /receber|a receber/i, icone: ArrowDownToLine },
  { padrao: /a pagar|pagar program/i, icone: ArrowUpFromLine },
  { padrao: /contas? pagas|pagas/i, icone: HandCoins },
  { padrao: /faturamento/i, icone: Banknote },
  { padrao: /desconto/i, icone: Percent },
  { padrao: /devolu/i, icone: Undo2 },
  { padrao: /estorno/i, icone: RotateCcw },
  { padrao: /custo|administrativ/i, icone: Building2 },
  { padrao: /m[eé]dia|anual|12 meses|calendar/i, icone: CalendarRange },
  { padrao: /estoque|armaz[eé]m/i, icone: Warehouse },
  { padrao: /nota|documento|relat[oó]rio/i, icone: Receipt },
]

/** Ícone representativo do card, derivado do título. */
export function iconePorTitulo(titulo: string): LucideIcon {
  const texto = (titulo ?? "").trim()
  for (const regra of REGRAS_ICONE) {
    if (regra.padrao.test(texto)) return regra.icone
  }
  return BarChart3
}
