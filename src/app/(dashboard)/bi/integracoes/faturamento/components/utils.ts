export function formatarMetragem(m?: number): string {
  return (m || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function formatarPeso(p?: number): string {
  return (p || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function formatarValor(v?: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
export function formatarData(d?: string): string {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('pt-BR')
  } catch {
    return d
  }
}
export const ORIENTACAO_LABEL = { portrait: 'Retrato', landscape: 'Paisagem' } as const
