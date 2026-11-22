export const STATUS_OPTIONS = [
  "NOVO",
  "QUALIFICADO",
  "POSSIVEL_CLIENTE",
  "CONVERTIDO_CLIENTE",
  "PERDIDO",
  "INATIVO",
]

export const STATUS_CORES: Record<string, string> = {
  NOVO: "text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400",
  QUALIFICADO: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
  POSSIVEL_CLIENTE: "text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400",
  CONVERTIDO_CLIENTE: "text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400",
  PERDIDO: "text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400",
  INATIVO: "text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500",
}
