import { Calendar, ExternalLink, MapPin } from "lucide-react"
import Link from "next/link"
import type { AcaoProspeccaoDetalhe } from "../../types"
import { TIPO_LABELS } from "./constants"

interface VisualizacaoCardProps {
  acao: AcaoProspeccaoDetalhe
  statusLabel: string
  statusColor: string
  mostrarProposta: boolean
}

export function VisualizacaoCard({
  acao,
  statusLabel,
  statusColor,
  mostrarProposta,
}: VisualizacaoCardProps) {
  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Informações
        </h2>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Status</span>
            <span
              className="inline-flex text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: statusColor + "20", color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          {acao.status === "CANCELADA" && acao.motivoCancelamento && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Motivo do Cancelamento</span>
              <p className="text-slate-900 dark:text-slate-200">{acao.motivoCancelamento}</p>
            </div>
          )}
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Tipo</span>
            <p className="text-slate-900 dark:text-slate-200">
              {TIPO_LABELS[acao.tipo] || acao.tipo}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Data da Ação</span>
            <p className="text-slate-900 dark:text-slate-200">
              {acao.dataAcao
                ? new Date(acao.dataAcao + "T12:00:00").toLocaleDateString("pt-BR")
                : "—"}
              {acao.hora ? ` às ${acao.hora}` : ""}
            </p>
          </div>
          {acao.duracaoEstimada && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Duração Estimada</span>
              <p className="text-slate-900 dark:text-slate-200">
                {acao.duracaoEstimada >= 60
                  ? `${Math.floor(acao.duracaoEstimada / 60)}h${acao.duracaoEstimada % 60 ? ` ${acao.duracaoEstimada % 60}min` : ""}`
                  : `${acao.duracaoEstimada} min`}
              </p>
            </div>
          )}
          {!acao.empresaId && !acao.clienteId ? (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Ação Avulsa</span>
              <p className="text-slate-900 dark:text-slate-200">{acao.nomeAvulso || "—"}</p>
            </div>
          ) : (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">
                {acao.empresaId ? "Pessoa (Negócio)" : "Cliente"}
              </span>
              {acao.empresaId ? (
                <Link
                  href={`/comercial/crm/leads/${acao.empresaId}`}
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  {acao.empresaNome} <ExternalLink size={12} />
                </Link>
              ) : (
                <p className="text-slate-900 dark:text-slate-200">{acao.clienteNome || "—"}</p>
              )}
            </div>
          )}
          {acao.oportunidadeTitulo && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Oportunidade</span>
              <p className="text-slate-900 dark:text-slate-200">{acao.oportunidadeTitulo}</p>
            </div>
          )}
          {acao.contatoNome && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Contato</span>
              <p className="text-slate-900 dark:text-slate-200">{acao.contatoNome}</p>
            </div>
          )}
          {acao.viagemTitulo && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Viagem</span>
              <Link
                href={`/comercial/crm/viagens/${acao.viagemId}`}
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                {acao.viagemTitulo} <ExternalLink size={12} />
              </Link>
            </div>
          )}
          {acao.representanteNome && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Representante</span>
              <p className="text-slate-900 dark:text-slate-200">{acao.representanteNome}</p>
            </div>
          )}
          {mostrarProposta && acao.propostaId && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Proposta Vinculada</span>
              <Link
                href={`/comercial/crm/propostas/${acao.propostaId}`}
                className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
              >
                {acao.propostaTitulo || `Proposta #${acao.propostaId}`}
              </Link>
            </div>
          )}
          {acao.criadoPorNome && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Criado por</span>
              <p className="text-slate-900 dark:text-slate-200">{acao.criadoPorNome}</p>
            </div>
          )}
          {acao.googleEventId && (
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Google Calendar</span>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium inline-flex items-center gap-1">
                <Calendar size={12} /> Sincronizado
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Endereço</h2>
        </div>
        {acao.endereco || acao.numero || acao.bairro || acao.cidade ? (
          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">Logradouro</span>
              <p className="text-sm text-slate-900 dark:text-slate-200">{acao.endereco || "—"}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">Número</span>
                <p className="text-sm text-slate-900 dark:text-slate-200">{acao.numero || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">Complemento</span>
                <p className="text-sm text-slate-900 dark:text-slate-200">
                  {acao.complemento || "—"}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">Bairro</span>
                <p className="text-sm text-slate-900 dark:text-slate-200">{acao.bairro || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">CEP</span>
                <p className="text-sm text-slate-900 dark:text-slate-200">{acao.cep || "—"}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">UF</span>
                <p className="text-sm text-slate-900 dark:text-slate-200">{acao.uf || "—"}</p>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-slate-500 block mb-0.5">Cidade</span>
                <p className="text-sm text-slate-900 dark:text-slate-200">{acao.cidade || "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Nenhum endereço informado</p>
        )}
      </div>
    </>
  )
}
