/**
 * Card de indicador, o mesmo das telas de faturamento e contas pagas.
 *
 * Fica em `ui/` porque é o mesmo componente nas duas telas: duplicar o markup
 * fazia os cards divergirem no primeiro ajuste de estilo. O `periodo` e o
 * `statusLabel` são opcionais — o faturamento não usa nenhum dos dois, e a tela de
 * contas pagas usa os dois (a janela que o card mede e o rótulo do leitor de tela).
 *
 * A cor e o ícone saem do rótulo do card (tema Dracula), então o mesmo indicador
 * tem sempre a mesma cara.
 */
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"

export function KpiCard({
  rotulo,
  valor,
  detalhe,
  periodo,
  statusLabel,
  detalheAlerta = false,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  /** Janela que o card cobre, logo abaixo do rótulo. */
  periodo?: string
  /** Quando informado, o valor vira `role="status"` com esse rótulo acessível. */
  statusLabel?: string
  /** Pinta o `detalhe` em vermelho — usado quando o indicador passa do limite. */
  detalheAlerta?: boolean
}) {
  const estilo = corPorTitulo(rotulo)
  const Icone = iconePorTitulo(rotulo)

  return (
    <div
      style={
        {
          "--card-fundo": estilo.fundoClaro,
          "--card-fundo-escuro": estilo.fundoEscuro,
          "--card-borda": estilo.borda,
          "--card-realce": estilo.cor,
        } as React.CSSProperties
      }
      className="rounded-xl border border-[color:var(--card-borda)] bg-white dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] p-4 shadow-sm transition-shadow"
    >
      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400 flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center w-4 h-4 rounded shrink-0"
          style={{ backgroundColor: estilo.fundoIcone, color: estilo.cor }}
          aria-hidden="true"
        >
          <Icone size={11} />
        </span>
        {rotulo}
      </p>
      {periodo && (
        <p className="mt-0.5 text-[10px] text-slate-400" title={periodo}>
          {periodo}
        </p>
      )}
      <p
        role={statusLabel ? "status" : undefined}
        aria-label={statusLabel}
        className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100"
      >
        {valor}
      </p>
      {detalhe && (
        <p
          className={
            detalheAlerta
              ? "mt-0.5 text-xs font-semibold text-red-600 dark:text-red-400"
              : "mt-0.5 text-xs text-slate-500 dark:text-slate-400"
          }
        >
          {detalhe}
        </p>
      )}
    </div>
  )
}
