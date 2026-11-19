import { AlertTriangle } from "lucide-react"
import { SelectUf } from "@/components/crm/select-uf"
import { SelectCidade } from "@/components/crm/select-cidade"
import { ViagemSelect } from "@/components/crm/viagem-select"
import { CreatableSelect } from "@/components/ui/creatable-select"
import { QuickCreateOportunidade } from "@/components/crm/quick-create-oportunidade"
import { QuickCreateProposta } from "@/components/crm/quick-create-proposta"
import { QuickCreateContato } from "@/components/crm/quick-create-contato"
import type {
  Conflito,
  ContatoResult,
  FormAcaoProspeccaoDetalhe,
  OportunidadeResumo,
  SetField,
  AcaoProspeccaoDetalhe,
} from "../../types"
import { STATUS_OPTIONS, TIPO_OPTIONS } from "./constants"

interface EdicaoCardProps {
  form: FormAcaoProspeccaoDetalhe
  acao: AcaoProspeccaoDetalhe
  setField: SetField
  conflictos: Conflito[]
  estadoId: number | null
  getStatusLabel: (status: string) => string
  onCopiarEndereco: () => void
  onOportunidadeCreated: (id: number) => void
  onPropostaCreated: (id: number, titulo: string) => void
  mostrarProposta: boolean
  onContatoCreated: (id: number) => void
  oportunidades?: OportunidadeResumo[]
  contatos?: ContatoResult[]
}

export function EdicaoCard({
  form,
  acao,
  setField,
  conflictos,
  estadoId,
  getStatusLabel,
  onCopiarEndereco,
  onOportunidadeCreated,
  onPropostaCreated,
  mostrarProposta,
  onContatoCreated,
  oportunidades = [],
  contatos = [],
}: EdicaoCardProps) {
  const listaOportunidades = oportunidades ?? []
  const contatoAtual = form.contatoId ?? acao.contatoId
  const contatoAtualForaDaLista =
    contatoAtual != null &&
    !contatos.some((c) => c.id === contatoAtual) &&
    !acao.contatoNome?.trim()
  const semVinculo = !form.empresaId && !form.clienteId

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
          Informações
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="editar-acao-status" className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              id="editar-acao-status"
              value={form.status || acao.status}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="editar-acao-viagem" className="block text-xs font-medium text-slate-500 mb-1">
              Viagem
            </label>
            <ViagemSelect
              value={form.viagemId ? String(form.viagemId) : ""}
              onChange={(v) => setField("viagemId", v ? Number(v) : null)}
            />
          </div>
          <div>
            <label htmlFor="editar-acao-representante" className="block text-xs font-medium text-slate-500 mb-1">
              Representante
            </label>
            <CreatableSelect
              valueId={form.representanteId || null}
              valueNome={form.representanteNome || null}
              onChange={(id, nome) => {
                setField("representanteId", id)
                setField("representanteNome", nome)
              }}
              fetchUrl="/api/representantes"
              placeholder="Buscar representante ou digitar nome..."
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="editar-acao-oportunidade" className="block text-xs font-medium text-slate-500 mb-1">
              Oportunidade
              {form.empresaId ? (
                <QuickCreateOportunidade
                  empresaId={String(form.empresaId ?? "")}
                  onCreated={onOportunidadeCreated}
                />
              ) : form.clienteId ? (
                <QuickCreateOportunidade
                  clienteId={String(form.clienteId ?? "")}
                  onCreated={onOportunidadeCreated}
                />
              ) : null}
            </label>
            <select
              id="editar-acao-oportunidade"
              value={form.oportunidadeId ? String(form.oportunidadeId) : ""}
              onChange={(e) => {
                setField("oportunidadeId", e.target.value ? parseInt(e.target.value) : null)
                setField("propostaId", null)
                setField("propostaTitulo", null)
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">Sem oportunidade</option>
              {listaOportunidades
                .filter((o) =>
                  form.empresaId
                    ? String(o.empresaId) === String(form.empresaId)
                    : String(o.clienteId) === String(form.clienteId)
                )
                .map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.titulo}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label htmlFor="editar-acao-contato" className="block text-xs font-medium text-slate-500 mb-1">
              Contato
              {form.empresaId ? (
                <QuickCreateContato
                  empresaId={String(form.empresaId)}
                  onCreated={onContatoCreated}
                />
              ) : form.clienteId ? (
                <QuickCreateContato
                  clienteId={String(form.clienteId)}
                  clienteNome={acao.clienteNome || ""}
                  onCreated={onContatoCreated}
                />
              ) : null}
            </label>
            <select
              id="editar-acao-contato"
              value={contatoAtual ? String(contatoAtual) : ""}
              onChange={(e) =>
                setField("contatoId", e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">Sem contato</option>
              {contatoAtualForaDaLista && (
                <option value={String(contatoAtual)}>
                  {acao.contatoNome || `Contato #${contatoAtual}`}
                </option>
              )}
              {contatos.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.nome}
                  {c.cargo ? ` (${c.cargo})` : ""}
                </option>
              ))}
            </select>
            {semVinculo && (
              <p className="text-[11px] text-slate-400 mt-1">
                A ação precisa estar vinculada a uma pessoa ou cliente para cadastrar contatos.
              </p>
            )}
          </div>
          {mostrarProposta && (
            <div>
              <label htmlFor="editar-acao-proposta" className="block text-xs font-medium text-slate-500 mb-1">
                Proposta Vinculada
                {form.empresaId ? (
                  <QuickCreateProposta
                    empresaId={String(form.empresaId ?? "")}
                    oportunidadeId={String(form.oportunidadeId || "")}
                    onCreated={onPropostaCreated}
                  />
                ) : form.clienteId ? (
                  <QuickCreateProposta
                    clienteId={String(form.clienteId ?? "")}
                    oportunidadeId={String(form.oportunidadeId || "")}
                    onCreated={onPropostaCreated}
                  />
                ) : null}
              </label>
              <CreatableSelect
                valueId={form.propostaId ?? null}
                valueNome={form.propostaTitulo || null}
                onChange={(id, nome) => {
                  setField("propostaId", id || null)
                  setField("propostaTitulo", nome || null)
                }}
                onSelect={(opt) => {
                  if (opt.oportunidadeId) setField("oportunidadeId", Number(opt.oportunidadeId))
                }}
                fetchUrl={
                  form.oportunidadeId
                    ? `/api/crm/propostas?oportunidadeId=${form.oportunidadeId}`
                    : "/api/crm/propostas"
                }
                labelField="titulo"
                placeholder="Buscar proposta..."
                className="w-full"
              />
            </div>
          )}
          {form.status === "CANCELADA" && (
            <div>
              <label htmlFor="editar-acao-motivo" className="block text-xs font-medium text-slate-500 mb-1">
                Motivo do Cancelamento
              </label>
              <textarea
                id="editar-acao-motivo"
                value={form.motivoCancelamento || ""}
                onChange={(e) => setField("motivoCancelamento", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label htmlFor="editar-acao-tipo" className="block text-xs font-medium text-slate-500 mb-1">
              Tipo
            </label>
            <select
              id="editar-acao-tipo"
              value={form.tipo}
              onChange={(e) => setField("tipo", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="editar-acao-data" className="block text-xs font-medium text-slate-500 mb-1">
              Data da Ação
            </label>
            <input
              id="editar-acao-data"
              type="date"
              value={form.dataAcao ? form.dataAcao.split("T")[0] : ""}
              onChange={(e) => setField("dataAcao", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="editar-acao-hora" className="block text-xs font-medium text-slate-500 mb-1">
              Hora
            </label>
            <input
              id="editar-acao-hora"
              type="time"
              value={form.hora || ""}
              onChange={(e) => setField("hora", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            {conflictos.length > 0 && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-medium">
                    {conflictos.length} ação(ões) já agendada(s) neste horário:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {conflictos.map((c) => (
                      <li key={c.id}>
                        ⬢ {c.empresaNome || c.clienteNome || "Ação de Prospecção"} ({c.tipo})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="editar-acao-duracao" className="block text-xs font-medium text-slate-500 mb-1">
              Duração Estimada
            </label>
            <select
              id="editar-acao-duracao"
              value={form.duracaoEstimada || ""}
              onChange={(e) =>
                setField("duracaoEstimada", e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">Não definida</option>
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1h30</option>
              <option value="120">2 horas</option>
              <option value="180">3 horas</option>
              <option value="240">4 horas</option>
              <option value="480">Dia inteiro</option>
            </select>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Endereço</h2>
          <button
            type="button"
            onClick={onCopiarEndereco}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            Copiar endereço da{" "}
            {form.empresaId ? "pessoa" : form.clienteId ? "cliente" : "pessoa ou cliente"}
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="editar-acao-endereco" className="block text-xs font-medium text-slate-500 mb-1">
              Logradouro
            </label>
            <input
              id="editar-acao-endereco"
              type="text"
              value={form.endereco || ""}
              onChange={(e) => setField("endereco", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editar-acao-numero" className="block text-xs font-medium text-slate-500 mb-1">
                Número
              </label>
              <input
                id="editar-acao-numero"
                type="text"
                value={form.numero || ""}
                onChange={(e) => setField("numero", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="editar-acao-complemento" className="block text-xs font-medium text-slate-500 mb-1">
                Complemento
              </label>
              <input
                id="editar-acao-complemento"
                type="text"
                value={form.complemento || ""}
                onChange={(e) => setField("complemento", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="editar-acao-bairro" className="block text-xs font-medium text-slate-500 mb-1">
                Bairro
              </label>
              <input
                id="editar-acao-bairro"
                type="text"
                value={form.bairro || ""}
                onChange={(e) => setField("bairro", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="editar-acao-cep" className="block text-xs font-medium text-slate-500 mb-1">
                CEP
              </label>
              <input
                id="editar-acao-cep"
                type="text"
                value={form.cep || ""}
                onChange={(e) => setField("cep", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="editar-acao-uf" className="block text-xs font-medium text-slate-500 mb-1">
                UF
              </label>
              <SelectUf value={form.uf || ""} onChange={(v) => setField("uf", v)} />
            </div>
            <div className="col-span-2">
              <label htmlFor="editar-acao-cidade" className="block text-xs font-medium text-slate-500 mb-1">
                Cidade
              </label>
              <SelectCidade
                value={form.cidade || ""}
                onChange={(v) => setField("cidade", v)}
                estadoId={estadoId}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
