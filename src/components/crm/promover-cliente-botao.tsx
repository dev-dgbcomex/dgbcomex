"use client"

import { useState } from "react"
import { Building2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ui/confirm-modal"

type PessoaPromocao = {
  id: number
  nome?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  cnpj?: string | null
}

interface PromoverClienteBotaoProps {
  pessoa: PessoaPromocao
  onPromovido?: (resultado: any) => void
  className?: string
  compact?: boolean
}

export function nomeExibicaoPessoa(pessoa: PessoaPromocao) {
  return pessoa.nome || pessoa.razaoSocial || pessoa.nomeFantasia || "Pessoa"
}

export function PromoverClienteBotao({
  pessoa,
  onPromovido,
  className = "",
  compact = false,
}: PromoverClienteBotaoProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const nome = nomeExibicaoPessoa(pessoa)

  async function confirmar() {
    setLoading(true)
    try {
      const res = await fetch(`/api/crm/pessoas/${pessoa.id}/promover-cliente`, {
        method: "POST",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Erro ao transformar em cliente")
      const resumo = data?.resumo
      toast.success(`"${nome}" agora é cliente`, {
        description: resumo
          ? `Histórico preservado: ${resumo.oportunidades} oportunidade(s), ${resumo.propostas} proposta(s) e ${resumo.visitas} visita(s).`
          : "O histórico do cadastro continua disponível nos relatórios.",
      })
      setOpen(false)
      onPromovido?.(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao transformar em cliente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors ${
          compact ? "p-1.5" : "px-3 py-1.5 text-xs font-medium"
        } ${className}`}
        title="Transformar em cliente"
      >
        <Building2 size={compact ? 14 : 13} />
        {!compact && "Tornar cliente"}
      </button>

      <ConfirmModal
        open={open}
        title="Transformar em cliente?"
        message={`Ao transformar "${nome}" em cliente, a pessoa será arquivada e não aparecerá mais na listagem de pessoas.`}
        subMessage="Tudo o que foi feito no cadastro (oportunidades, propostas e visitas) continua disponível nos relatórios e no histórico do cliente. Esta ação não pode ser desfeita."
        confirmLabel="Transformar em cliente"
        cancelLabel="Cancelar"
        variant="warning"
        loading={loading}
        onConfirm={confirmar}
        onCancel={() => setOpen(false)}
      />
    </>
  )
}
