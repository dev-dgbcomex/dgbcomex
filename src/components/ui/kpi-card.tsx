/**
 * Card de indicador, o mesmo das telas de faturamento e contas pagas.
 *
 * Fica em `ui/` porque é o mesmo componente nas duas telas: duplicar o markup
 * fazia os cards divergirem no primeiro ajuste de estilo. O `periodo` e o
 * `statusLabel` são opcionais — o faturamento não usa nenhum dos dois, e a tela de
 * contas pagas usa os dois (a janela que o card mede e o rótulo do leitor de tela).
 */
export function KpiCard({
  rotulo,
  valor,
  detalhe,
  periodo,
  statusLabel,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  /** Janela que o card cobre, logo abaixo do rótulo. */
  periodo?: string
  /** Quando informado, o valor vira `role="status"` com esse rótulo acessível. */
  statusLabel?: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
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
      {detalhe && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detalhe}</p>}
    </div>
  )
}
