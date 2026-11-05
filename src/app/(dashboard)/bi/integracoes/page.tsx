import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BiIntegracaoDashboard } from "@/components/bi-integracao/bi-integracao-dashboard"
import { InfoButton } from "@/components/ui/info-button"
import { getInfoContent } from "@/lib/info-content"

export const dynamic = "force-dynamic"

export default async function BiIntegracoesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const info = getInfoContent("/bi/integracoes")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            BI Integrações{info && <InfoButton content={info} />}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            KPIs consumidos das integrações cadastradas (api-microdata)
          </p>
        </div>
      </div>

      <BiIntegracaoDashboard />
    </div>
  )
}
