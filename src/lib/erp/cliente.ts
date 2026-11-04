/**
 * Cliente da api-microdata para os documentos do ERP que o CRM vincula.
 *
 * O dgbcomex não alcança o PostgreSQL local (`dgbcomex_warehouse`) em produção, então a
 * leitura da carga do ERP (pedidos de venda e faturamentos) passa pela api-microdata
 * (FastAPI, on-premise) — o mesmo caminho do WMS, com o mesmo usuário de serviço.
 *
 * Reaproveita o cliente HTTP da api-microdata que já existe para o WMS: a autenticação
 * (login + cache de token) é a mesma, o que muda é só o vocabulário do erro.
 */

import { ErroWms, requisitarWms } from "@/lib/wms/cliente"

export class ErroErp extends Error {
  readonly status: number

  constructor(mensagem: string, status: number) {
    super(mensagem)
    this.name = "ErroErp"
    this.status = status
  }
}

/** Chama a api-microdata e devolve o JSON; erro da API vira `ErroErp` com o status real. */
export async function requisitarErp<T>(caminho: string): Promise<T> {
  try {
    return await requisitarWms<T>(caminho)
  } catch (erro) {
    if (erro instanceof ErroWms) {
      throw new ErroErp(erro.message, erro.status)
    }
    throw erro
  }
}
