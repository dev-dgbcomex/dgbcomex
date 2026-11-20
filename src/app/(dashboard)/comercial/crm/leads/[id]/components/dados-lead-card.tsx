import { SelectUf } from "@/components/crm/select-uf"
import { SelectCidade } from "@/components/crm/select-cidade"
import { SelectSegmento } from "@/components/crm/select-segmento"
import { STATUS_OPTIONS } from "./constants"
import type { Lead, LeadForm, TipoLead } from "../../types"

interface DadosLeadCardProps {
  lead: Lead
  form: LeadForm
  setForm: (fn: (prev: LeadForm) => LeadForm) => void
  editing: boolean
  tipoPessoa: TipoLead
  setTipoLead: (t: TipoLead) => void
  estadoId: number | null
}

export function DadosLeadCard({
  lead,
  form,
  setForm,
  editing,
  tipoPessoa,
  setTipoLead,
  estadoId,
}: DadosLeadCardProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">
        Dados da Lead (Negócio)
      </h2>
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoLead("PF")
                  setForm((p: LeadForm) => ({ ...p, tipoPessoa: "PF" }))
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium border ${tipoPessoa === "PF" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                PF
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoLead("PJ")
                  setForm((p: LeadForm) => ({ ...p, tipoPessoa: "PJ" }))
                }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium border ${tipoPessoa === "PJ" ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300" : "border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                PJ
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {tipoPessoa === "PF" ? (
              <>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
                  <input
                    type="text"
                    value={form.nome || ""}
                    onChange={(e) => setForm((p: LeadForm) => ({ ...p, nome: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">CPF</label>
                  <input
                    type="text"
                    value={form.cpf || ""}
                    onChange={(e) => setForm((p: LeadForm) => ({ ...p, cpf: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={form.razaoSocial || ""}
                    onChange={(e) =>
                      setForm((p: LeadForm) => ({ ...p, razaoSocial: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={form.nomeFantasia || ""}
                    onChange={(e) =>
                      setForm((p: LeadForm) => ({ ...p, nomeFantasia: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={form.cnpj || ""}
                    onChange={(e) => setForm((p: LeadForm) => ({ ...p, cnpj: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Segmento</label>
              <SelectSegmento
                value={form.segmento || ""}
                onChange={(v) => setForm((p: LeadForm) => ({ ...p, segmento: v }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Porte</label>
              <select
                value={form.porte || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, porte: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">Selecione...</option>
                <option value="MEI">MEI</option>
                <option value="ME">ME</option>
                <option value="EPP">EPP</option>
                <option value="MEDIO">Médio</option>
                <option value="GRANDE">Grande</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Site</label>
              <input
                type="url"
                value={form.site || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, site: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Telefone</label>
              <input
                type="text"
                value={form.telefone || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, telefone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Celular</label>
              <input
                type="text"
                value={form.celular || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, celular: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                E-mail p/ Nota Fiscal
              </label>
              <input
                type="email"
                value={form.emailNf || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, emailNf: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
                Endereço
              </p>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Logradouro</label>
              <input
                type="text"
                value={form.endereco || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, endereco: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Número</label>
              <input
                type="text"
                value={form.numero || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, numero: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Complemento</label>
              <input
                type="text"
                value={form.complemento || ""}
                onChange={(e) =>
                  setForm((p: LeadForm) => ({ ...p, complemento: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bairro</label>
              <input
                type="text"
                value={form.bairro || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, bairro: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">CEP</label>
              <input
                type="text"
                value={form.cep || ""}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, cep: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">UF</label>
              <SelectUf
                value={form.uf || ""}
                onChange={(v) => setForm((p: LeadForm) => ({ ...p, uf: v }))}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Cidade</label>
              <SelectCidade
                value={form.cidade || ""}
                onChange={(v) => setForm((p: LeadForm) => ({ ...p, cidade: v }))}
                estadoId={estadoId}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={form.status || "NOVO"}
                onChange={(e) => setForm((p: LeadForm) => ({ ...p, status: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Observações</label>
              <textarea
                value={form.observacoes || ""}
                onChange={(e) =>
                  setForm((p: LeadForm) => ({ ...p, observacoes: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm min-w-0 break-words [&>div]:min-w-0">
          {lead.tipoPessoa === "PF" ? (
            <>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-0.5">Nome</p>
                <p className="text-slate-900 dark:text-slate-200">{lead.nome || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">CPF</p>
                <p className="text-slate-900 dark:text-slate-200">{lead.cpf || "—"}</p>
              </div>
            </>
          ) : (
            <>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-0.5">Razão Social</p>
                <p className="text-slate-900 dark:text-slate-200">{lead.razaoSocial || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Nome Fantasia</p>
                <p className="text-slate-900 dark:text-slate-200">{lead.nomeFantasia || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">CNPJ</p>
                <p className="text-slate-900 dark:text-slate-200">{lead.cnpj || "—"}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Segmento</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.segmento || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Porte</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.porte || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">Site</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.site || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Telefone</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.telefone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Celular</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.celular || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">E-mail</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.email || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">E-mail p/ Nota Fiscal</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.emailNf || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">
              Endereço
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">Logradouro</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.endereco || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Número</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.numero || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Complemento</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.complemento || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Bairro</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.bairro || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">CEP</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.cep || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">UF</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.uf || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">Cidade</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.cidade || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">Status</p>
            <p className="text-slate-900 dark:text-slate-200">{lead.status || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-500 mb-0.5">Observações</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {lead.observacoes || "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
