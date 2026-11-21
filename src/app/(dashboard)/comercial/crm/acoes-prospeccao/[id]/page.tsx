"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { getInfoContent } from "@/lib/info-content"
import { useRouter, useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { useStatuses } from "@/hooks/use-statuses"
import { normalizeAcaoProspeccaoFotos } from "@/lib/crm/acao-prospeccao-fotos"
import type { AcaoProspeccaoFoto } from "@/lib/crm/acao-prospeccao-fotos"
import { podeGerenciarRegistro, podeGerenciarTudo } from "@/lib/permissoes"
import type {
  Conflito,
  ContatoResult,
  FormAcaoProspeccaoDetalhe,
  OportunidadeResumo,
  AcaoProspeccaoDetalhe,
} from "../types"
import VincularAcaoProspeccaoModal from "@/components/crm/vincular-acao-prospeccao-modal"
import { AcaoProspeccaoHeader } from "./components/acao-header"
import { EdicaoCard } from "./components/edicao-card"
import { VisualizacaoCard } from "./components/visualizacao-card"
import { CheckCard } from "./components/check-card"
import { RelatoFotos } from "./components/relato-fotos"
import { propostaVinculadaAcaoProspeccaoVisivel } from "./actions"

export default function DetalheAcaoProspeccaoPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isGoogleUser = session?.user?.provider === "google"
  const pathname = usePathname()
  const info = getInfoContent(pathname)
  const params = useParams()
  const { getLabel, getColor } = useStatuses("ACAO_PROSPECCAO")
  const [propostaVisivel, setPropostaVisivel] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormAcaoProspeccaoDetalhe>({})
  const [fotos, setFotos] = useState<AcaoProspeccaoFoto[]>([])
  const [conflictos, setConflictos] = useState<Conflito[]>([])
  const conflictTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [estadoId, setEstadoId] = useState<number | null>(null)
  const [empresaEndereco, setEmpresaEndereco] = useState<Record<string, string>>({})
  const [clienteEndereco, setClienteEndereco] = useState<Record<string, string>>({})
  const [checkLoading, setCheckLoading] = useState<"in" | "out" | null>(null)
  const [showVincular, setShowVincular] = useState(false)

  const { data: estados = [] } = useQuery<{ id: number; uf: string }[]>({
    queryKey: ["crm-estados"],
    queryFn: () => fetch("/api/crm/estados").then((r) => r.json()),
  })

  const { data: oportunidades = [] } = useQuery<OportunidadeResumo[]>({
    queryKey: ["crm-oportunidades"],
    queryFn: () => fetch("/api/crm/oportunidades").then((r) => r.json()),
  })

  const acaoQuery = useQuery<AcaoProspeccaoDetalhe>({
    queryKey: ["acao-prospeccao", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/crm/acoes-prospeccao/${params.id}`)
      if (!res.ok) throw new Error("Erro ao carregar ação de prospecção")
      return res.json()
    },
  })

  const acao = acaoQuery.data ?? null
  const loading = acaoQuery.isLoading && !acao

  const contatosQuery = useQuery<ContatoResult[]>({
    queryKey: ["acao-prospeccao-contatos-edicao", acao?.empresaId, acao?.clienteId],
    queryFn: async () => {
      if (acao?.empresaId) {
        const res = await fetch(`/api/crm/leads/${acao.empresaId}`)
        const data = await res.json()
        return Array.isArray(data.contatos) ? data.contatos : []
      }
      if (acao?.clienteId) {
        const res = await fetch(`/api/crm/contatos?clienteId=${acao.clienteId}`)
        const data = await res.json()
        return Array.isArray(data) ? data : []
      }
      return []
    },
    enabled: !!(acao?.empresaId || acao?.clienteId),
  })

  useEffect(() => {
    let ativo = true
    propostaVinculadaAcaoProspeccaoVisivel(session?.user?.role)
      .then((visivel) => {
        if (ativo) setPropostaVisivel(visivel)
      })
      .catch(() => {
        if (ativo) setPropostaVisivel(false)
      })
    return () => {
      ativo = false
    }
  }, [session?.user?.role])

  useEffect(() => {
    if (acaoQuery.data) {
      setForm(acaoQuery.data)
      setFotos(normalizeAcaoProspeccaoFotos(acaoQuery.data.fotos))
    }
  }, [acaoQuery.data])

  useEffect(() => {
    if (form.uf) {
      const found = estados.find((e) => e.uf === form.uf)
      setEstadoId(found ? found.id : null)
    } else {
      setEstadoId(null)
    }
  }, [form.uf, estados])

  useEffect(() => {
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current)
    if (!editing || !form.dataAcao || !form.hora) {
      setConflictos([])
      return
    }
    conflictTimerRef.current = setTimeout(async () => {
      try {
        const sp = new URLSearchParams({
          dataAcao: form.dataAcao ?? "",
          hora: form.hora ?? "",
          excludeId: String(params.id),
        })
        const res = await fetch(`/api/crm/acoes-prospeccao/conflictos?${sp}`)
        if (res.ok) {
          const data = (await res.json()) as { conflictos?: Conflito[] }
          setConflictos(data.conflictos || [])
        }
      } catch {}
    }, 500)
  }, [form.dataAcao, form.hora, editing, params.id])

  async function loadAcao() {
    await acaoQuery.refetch()
  }

  function setField<K extends keyof AcaoProspeccaoDetalhe>(
    field: K,
    value: AcaoProspeccaoDetalhe[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleOportunidadeCreated(id: number) {
    queryClient.invalidateQueries({ queryKey: ["crm-oportunidades"] })
    setField("oportunidadeId", id)
    setField("propostaId", null)
    setField("propostaTitulo", null)
  }

  function handlePropostaCreated(id: number, titulo: string) {
    setField("propostaId", id)
    setField("propostaTitulo", titulo)
  }

  function handleContatoCreated(id: number) {
    queryClient.invalidateQueries({ queryKey: ["acao-prospeccao-contatos-edicao"] })
    setField("contatoId", id)
  }

  function startEditing() {
    if (!acao) return
    setForm({ ...acao })
    setFotos(normalizeAcaoProspeccaoFotos(acao.fotos))
    if (acao.empresaId) loadEmpresaEndereco(acao.empresaId).then(setEmpresaEndereco)
    else if (acao.clienteId) loadClienteEndereco(acao.clienteId).then(setClienteEndereco)
    setEditing(true)
  }

  function cancelEditing() {
    if (!acao) return
    setEditing(false)
    setForm(acao)
    setFotos(normalizeAcaoProspeccaoFotos(acao.fotos))
  }

  async function handleSave() {
    try {
      const corpo: Record<string, unknown> = { ...form, fotos }
      if (!propostaVisivel) delete corpo.propostaId
      const res = await fetch(`/api/crm/acoes-prospeccao/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao atualizar")
      }
      await loadAcao()
      setEditing(false)
      toast.success("Ação de Prospecção atualizada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/crm/acoes-prospeccao/${params.id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Erro ao excluir")
      }
      toast.success("Ação de Prospecção excluída")
      router.push("/comercial/crm/acoes-prospeccao")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setDeleteLoading(false)
      setShowDelete(false)
    }
  }

  async function handleSyncGoogle() {
    if (!acao) return
    try {
      const res = await fetch("/api/crm/acoes-prospeccao/sync-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acaoId: acao.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao sincronizar")
      }
      await loadAcao()
      toast.success("Sincronizado com Google Calendar")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleUnsyncGoogle() {
    if (!acao) return
    try {
      const res = await fetch(`/api/crm/acoes-prospeccao/sync-google?acaoId=${acao.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao dessincronizar")
      }
      await loadAcao()
      toast.success("Removido do Google Calendar")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function loadEmpresaEndereco(empresaId: number): Promise<Record<string, string>> {
    try {
      const res = await fetch(`/api/crm/leads/${empresaId}`)
      const data = await res.json()
      return {
        endereco: data.endereco || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.cidade || "",
        uf: data.uf || "",
        cep: data.cep || "",
      }
    } catch {
      return {}
    }
  }

  async function loadClienteEndereco(clienteId: number): Promise<Record<string, string>> {
    try {
      const res = await fetch(`/api/clientes/${clienteId}`)
      const data = await res.json()
      return {
        endereco: data.endereco || "",
        cidade: data.cidade || "",
        uf: data.uf || "",
      }
    } catch {
      return {}
    }
  }

  async function handleCopiarEndereco() {
    if (!acao) return
    if (acao.empresaId) {
      const end = empresaEndereco.endereco
        ? empresaEndereco
        : await loadEmpresaEndereco(acao.empresaId)
      setForm((prev) => ({
        ...prev,
        endereco: end.endereco || "",
        numero: end.numero || "",
        complemento: end.complemento || "",
        bairro: end.bairro || "",
        cidade: end.cidade || "",
        uf: end.uf || "",
        cep: end.cep || "",
      }))
    } else if (acao.clienteId) {
      const end = clienteEndereco.endereco
        ? clienteEndereco
        : await loadClienteEndereco(acao.clienteId)
      setForm((prev) => ({
        ...prev,
        endereco: end.endereco || "",
        cidade: end.cidade || "",
        uf: end.uf || "",
      }))
    } else {
      toast.error("Ação sem pessoa ou cliente vinculado")
    }
  }

  async function handleCheck(tipo: "check_in" | "check_out") {
    setCheckLoading(tipo === "check_in" ? "in" : "out")
    try {
      let lat: number | null = null
      let lng: number | null = null

      if ("geolocation" in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
            })
          })
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch {
          toast.warning("Sem acesso à localização. Check-in/out será registrado sem GPS.")
        }
      }

      const res = await fetch(`/api/crm/acoes-prospeccao/${params.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, latitude: lat, longitude: lng }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao registrar")
      }
      await loadAcao()
      toast.success(tipo === "check_in" ? "Check-in registrado!" : "Check-out registrado!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setCheckLoading(null)
    }
  }

  async function handleUndo(tipo: "undo_check_in" | "undo_check_out") {
    const label = tipo === "undo_check_in" ? "check-in" : "check-out"
    setCheckLoading(tipo === "undo_check_in" ? "in" : "out")
    try {
      const res = await fetch(`/api/crm/acoes-prospeccao/${params.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Erro ao desfazer")
      }
      await loadAcao()
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} desfeito!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setCheckLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!acao) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Ação de Prospecção não encontrada</p>
        <Link
          href="/comercial/crm/acoes-prospeccao"
          className="text-blue-600 hover:underline mt-2 inline-block"
        >
          Voltar
        </Link>
      </div>
    )
  }

  const userRole = session?.user?.role
  const userId = session?.user?.id ? parseInt(session.user.id) : null
  const canEdit = userId != null
    ? podeGerenciarRegistro(userRole, acao.criadoPor, userId)
    : podeGerenciarTudo(userRole)

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <AcaoProspeccaoHeader
        acao={acao}
        infoContent={info}
        statusLabel={getLabel(acao.status)}
        statusColor={getColor(acao.status)}
        onBack={() => router.back()}
        editing={editing}
        canEdit={canEdit}
        isGoogleUser={isGoogleUser}
        onSave={handleSave}
        onCancel={cancelEditing}
        onEdit={startEditing}
        onDelete={() => setShowDelete(true)}
        onSync={handleSyncGoogle}
        onUnsync={handleUnsyncGoogle}
        onVincular={() => setShowVincular(true)}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {editing ? (
          <EdicaoCard
            form={form}
            acao={acao}
            setField={setField}
            conflictos={conflictos}
            estadoId={estadoId}
            getStatusLabel={getLabel}
            onCopiarEndereco={handleCopiarEndereco}
            onOportunidadeCreated={handleOportunidadeCreated}
            onPropostaCreated={handlePropostaCreated}
            mostrarProposta={propostaVisivel}
            onContatoCreated={handleContatoCreated}
            oportunidades={oportunidades}
            contatos={contatosQuery.data ?? []}
          />
        ) : (
          <VisualizacaoCard
            acao={acao}
            statusLabel={getLabel(acao.status)}
            statusColor={getColor(acao.status)}
            mostrarProposta={propostaVisivel}
          />
        )}

        {!editing && canEdit && (
          <CheckCard
            acao={acao}
            checkLoading={checkLoading}
            onCheck={handleCheck}
            onUndo={handleUndo}
          />
        )}
      </div>

      <RelatoFotos
        editing={editing}
        acao={acao}
        form={form}
        setField={setField}
        fotos={fotos}
        onFotosChange={setFotos}
      />

      <VincularAcaoProspeccaoModal
        acaoId={acao.id}
        open={showVincular}
        onClose={() => setShowVincular(false)}
        onLinked={loadAcao}
      />

      <ConfirmModal
        open={showDelete}
        title="Excluir ação de prospecção?"
        message="Tem certeza que deseja excluir esta ação de prospecção?"
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
