export type InfoContent = {
  title: string
  description: string
  rules?: string[]
  /** Colunas de tabela, quando a tela tem uma. Aparece antes de `fields`. */
  columns?: { name: string; desc: string }[]
  fields?: { name: string; desc: string }[]
  examples?: { title: string; desc: string }[]
}
