import type { InfoContent } from "./types"
export type { InfoContent } from "./types"

import { dashboardContent } from "./dashboard"
import { comercialContent } from "./comercial"
import { cadastrosContent } from "./cadastros"
import { ativosContent } from "./ativos"
import { adminContent } from "./admin"
import { ferramentasContent } from "./ferramentas"
import { documentosContent } from "./documentos"
import { outrosContent } from "./outros"
import { crmContent } from "./crm"
import { processosContent } from "./processos"
import { reunioesContent } from "./reunioes"
import { chamadosContent } from "./chamados"
import { biContent } from "./bi"
import { wmsContent } from "./wms"

const infoContent: Record<string, InfoContent> = {
  ...dashboardContent,
  ...comercialContent,
  ...cadastrosContent,
  ...ativosContent,
  ...adminContent,
  ...ferramentasContent,
  ...documentosContent,
  ...outrosContent,
  ...crmContent,
  ...processosContent,
  ...reunioesContent,
  ...chamadosContent,
  ...biContent,
  ...wmsContent,
}

function normalizarPathname(pathname: string) {
  const semBarraFinal = pathname.replace(/\/+$/, "") || "/"
  return semBarraFinal
    .split("/")
    .map((segmento) => (/^\d+$/.test(segmento) ? "[id]" : segmento))
    .join("/")
}

export function getInfoContent(pathname: string): InfoContent | null {
  const caminho = normalizarPathname(pathname)
  const exact = infoContent[caminho]
  if (exact) return exact

  let bestKey = ""
  for (const key of Object.keys(infoContent)) {
    if ((caminho.startsWith(key) || key.startsWith(caminho)) && key.length > bestKey.length) {
      bestKey = key
    }
  }
  if (bestKey) return infoContent[bestKey]

  return null
}
