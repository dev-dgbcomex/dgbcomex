import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function VoltarSeparacoes() {
  return (
    <Link
      href="/wms/separacoes"
      aria-label="Voltar para as separações"
      className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-blue-400"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Voltar para as separações
    </Link>
  )
}
