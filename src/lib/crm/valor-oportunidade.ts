import { eq } from "drizzle-orm"
import { somarValoresTotais } from "@/lib/crm/documento-venda"
import { db } from "@/lib/db"
import { crmOportunidades, crmPedidosVenda, crmPedidoVendaItens } from "@/lib/db/schema"

export async function somaOportunidade(oportunidadeId: number): Promise<number> {
  const itens = await db
    .select()
    .from(crmPedidoVendaItens)
    .innerJoin(
      crmPedidosVenda,
      eq(crmPedidoVendaItens.pedidoVendaId, crmPedidosVenda.id)
    )
    .where(eq(crmPedidosVenda.oportunidadeId, oportunidadeId))
  return somarValoresTotais(itens)
}

export async function recalcularValorOportunidade(oportunidadeId: number): Promise<number> {
  const valorEstimado = await somaOportunidade(oportunidadeId)
  await db
    .update(crmOportunidades)
    .set({ valorEstimado, updatedAt: new Date() })
    .where(eq(crmOportunidades.id, oportunidadeId))
  return valorEstimado
}
