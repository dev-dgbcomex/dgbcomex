import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BiIntegracaoDashboard } from "@/components/bi-integracao/bi-integracao-dashboard"

export const dynamic = "force-dynamic"

export default async function BiIntegracoesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            BI Integrações
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