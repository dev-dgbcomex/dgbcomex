export interface AcaoProspeccaoFoto {
  url: string
  descricao: string
}

export function normalizeAcaoProspeccaoFotos(raw?: unknown): AcaoProspeccaoFoto[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item): AcaoProspeccaoFoto | null => {
      if (typeof item === "string") return { url: item, descricao: "" }
      if (item && typeof item === "object" && typeof (item as any).url === "string") {
        return { url: (item as any).url, descricao: String((item as any).descricao ?? "") }
      }
      return null
    })
    .filter((item): item is AcaoProspeccaoFoto => item !== null)
}
