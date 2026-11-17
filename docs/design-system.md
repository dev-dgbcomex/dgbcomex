# Design System — PDM DGBCOMEX

Complementa as skills de layout/design (`pdm-layout-design`, `pdm-dev`, `pdm-frontend`). Toda tela e componente deve seguir estas regras. Este documento é a referência única de cores, componentes, layout, telas, gráficos e modais do sistema.

## 1. Visão geral

- **Framework**: Next.js 15 App Router + React 19
- **Estilização**: Tailwind CSS + `tailwindcss-animate`
- **UI primitives**: `@base-ui/react` (Dialog, Button, Input, Select, etc.)
- **Utilitário de classes**: `clsx` + `tailwind-merge` → `cn()` em `src/lib/utils.ts`
- **Componentes de UI**: `src/components/ui/*` (shadcn-like, custom)
- **Ícones**: `lucide-react`
- **Gráficos**: `recharts` v3.8.1
- **Formulários**: inputs nativos + validação jsdom/vitest (não usa React Hook Form global)
- **Estado**: TanStack Query (`@tanstack/react-query`)
- **Font**: `Inter` (Google Fonts), pesos 300–700, tamanhos 14–32 px
- **Idioma/locale**: pt-BR
- **Tema**: claro / escuro / system (via classe `.dark` no `<html>`)
- **Versão**: 1.0.0

### Arquitetura de pastas

```
src/
  app/
    layout.tsx              # Root layout (metadados, providers, toaster)
    globals.css             # Variáveis CSS, animações, print
    login/page.tsx          # Tela de login
    (dashboard)/layout.tsx  # Shell do dashboard (protege rotas, redireciona /login)
    (dashboard)/            # Telas internas agrupadas por domínio
  components/
    ui/                     # Componentes atômicos (button, input, card, dialog…)
    layout/                 # Sidebar, header, mobile bottom nav, theme-toggle
    crm/relatorios/         # Cards, tabelas, filtros, exportação, modais de relatório
    bi-integracao/          # Cards KPI do BI
  lib/
    dracula.ts              # Tema Dracula (cores e ícones por título de card)
    utils.ts                # cn()
    branding.ts             # urlBase() para metadados/Open Graph
    info-content/           # Modais "i" por tela
    notificar.ts            # Motor de notificações in-app + email
    export-utils.ts         # Exportação CSV, Markdown, PDF
```

---

## 2. Cores

### 2.1 Variáveis CSS (`src/app/globals.css`, `:root` e `.dark`)

| Token | Claro (HSL) | Escuro (HSL) | Uso |
|-------|-------------|--------------|-----|
| `--background` | 210 40% 98% | 222.2 84% 4.9% | Fundo da página |
| `--foreground` | 222.2 84% 4.9% | 210 40% 98% | Texto principal |
| `--card` | 0 0% 100% | 217.2 32.6% 11% | Fundo de cards |
| `--card-foreground` | 222.2 84% 4.9% | 210 40% 98% | Texto nos cards |
| `--popover` | 0 0% 100% | 222.2 84% 4.9% | Fundo de popovers/dropdowns |
| `--popover-foreground` | 222.2 84% 4.9% | 210 40% 98% | Texto nos popovers |
| `--primary` | 221.2 83.2% 53.3% (azul) | 217.2 91.2% 59.8% | Ações primárias |
| `--primary-foreground` | 210 40% 98% | 222.2 47.4% 11.2% | Texto sobre primário |
| `--secondary` | 210 40% 96.1% | 217.2 32.6% 17.5% | Fundo secundário |
| `--muted` | 210 40% 96.1% | 217.2 32.6% 17.5% | Fundo suave |
| `--muted-foreground` | 215.4 16.3% 46.9% | 215 20.2% 65.1% | Texto secundário |
| `--accent` | 210 40% 96.1% | 217.2 32.6% 17.5% | Destaque |
| `--destructive` | 0 84.2% 60.2% | 0 62.8% 30.6% | Ações destrutivas |
| `--destructive-foreground` | 210 40% 98% | 210 40% 98% | Texto sobre destrutivo |
| `--border` | 214.3 31.8% 91.4% | 217.2 32.6% 17.5% | Bordas |
| `--input` | 214.3 31.8% 91.4% | 217.2 32.6% 17.5% | Campos de input |
| `--ring` | 221.2 83.2% 53.3% | 224.3 76.3% 48% | Anel de foco |
| `--radius` | 0.75rem | 0.75rem | Borda arredondada |

### 2.2 Regras de cor (obrigatório)

- **Quem flutua define fundo E texto juntos.** Popovers, selects, dropdowns e menus devem usar `bg-popover text-popover-foreground` (ou par claro/escuro explícito `bg-white dark:bg-slate-900` + `text-slate-900 dark:text-slate-100`).
- Nunca use `bg-transparent` em `<select>` nativo (Windows herda fundo e pode ficar branco-sobre-branco). Use `bg-background text-foreground`.
- Nunca aplique `text-white`/`text-black` sem `bg-*` explícito no mesmo elemento.
- Dark mode não é opcional: toda classe de cor deve ter par `dark:` quando o token não for semântico.
- Texto informativo em fundo branco: use `text-slate-500`/`text-slate-600`, não `text-slate-400` (contraste baixo).
- WCAG AA: texto normal mínimo 4.5:1, texto grande mínimo 3:1.

### 2.3 Tema Dracula (cards coloridos)

Fonte única: `src/lib/dracula.ts`. Cada card de indicador/gráfico recebe cor e ícone derivados do **título**, via hash estável (djb2). O mesmo título sempre tem a mesma cor e ícone, independentemente da ordem.

**Paleta Dracula:**
- background: `#282a36`
- currentLine: `#44475a`
- foreground: `#f8f8f2`
- comment: `#6272a4`
- cyan: `#8be9fd`
- green: `#50fa7b`
- orange: `#ffb86c`
- pink: `#ff79c6`
- purple: `#bd93f9`
- red: `#ff5555`
- yellow: `#f1fa8c`

**8 cores de destaque** (em ordem fixa): purple, cyan, green, orange, pink, yellow, red, comment.

**Funções:**
- `corPorTitulo(titulo)` → `{ cor, fundoClaro, fundoEscuro, borda, fundoIcone }`
  - `fundoClaro`: gradiente linear 135deg com cor a 18% → 4%
  - `fundoEscuro`: gradiente com background Dracula a 96% + cor a 24%
  - `borda`: cor a 45% (rgba)
  - `fundoIcone`: cor a 16% (rgba)
- `iconePorTitulo(titulo)` → `LucideIcon` baseado em regras de regex por palavra-chave (ex.: "visita" → CalendarCheck, "oportunidade" → Target, "cliente" → Building2, default → BarChart3)

**Uso em componentes:**
```tsx
const estilo = corPorTitulo(titulo)
const Icone = iconePorTitulo(titulo)
// aplicar CSS vars: --card-fundo, --card-fundo-escuro, --card-borda, --card-realce
// classe: bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)]
//         border-[color:var(--card-borda)]
```

Usado em: `src/components/ui/kpi-card.tsx`, `src/components/ui/chart-card.tsx` (prop `dracula`), `src/components/crm/relatorios/cards-relatorio.tsx`, `src/app/(dashboard)/comercial/crm/relatorios/charts.tsx` (GraficoCard), painel BI (`/bi/integracoes`).

---

## 3. Tipografia

- **Fonte**: `Inter` (Google Fonts, importada em `globals.css`)
  - Pesos: 300, 400, 500, 600, 700
  - Tamanhos ópticos: 14–32 px
- **Fallback**: `system-ui, -apple-system, sans-serif`
- `<html lang="pt-BR" className="font-sans">`
- `body`: `bg-background text-foreground antialiased`, `font-family: Inter, system-ui, -apple-system, sans-serif`

### Classes de texto padrão

| Elemento | Classe | Exemplo |
|----------|--------|---------|
| Título de página (h1) | `text-2xl font-bold text-slate-900 dark:text-slate-50` | "Relatórios CRM" |
| Subtítulo | `text-sm text-slate-500 dark:text-slate-400` | descrição abaixo do h1 |
| Título de seção (h2/h3) | `text-base font-semibold text-slate-900 dark:text-slate-50` | "Relatórios detalhados" |
| Texto pequeno / legenda | `text-xs text-slate-500 dark:text-slate-400` | filtros, dicas |
| Valor de KPI | `text-xl font-semibold text-slate-900 dark:text-slate-100` | número grande |
| Rótulo de KPI | `text-xs font-medium tracking-wider text-slate-500 uppercase` | "Negócios" |
| Tabela cabeçalho | `text-sm font-medium text-slate-500 dark:text-slate-400` | `<th>` |
| Tabela corpo | `text-sm text-slate-700 dark:text-slate-200` | `<td>` |
| Tooltip | `text-xs` | `ChartTooltip` |

---

## 4. Componentes UI (`src/components/ui/`)

### 4.1 Button (`button.tsx`)
Base: `@base-ui/react/button` + `cva` (class-variance-authority).

**Variantes:** `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
**Tamanhos:** `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
**Padrão:** `variant="default"`, `size="default"`

Classes base: `inline-flex items-center justify-center rounded-lg border bg-clip-padding text-sm font-medium transition-all outline-none`, com `focus-visible:ring-3 focus-visible:ring-ring/50`, `active:translate-y-px`, `disabled:opacity-50`.

Exemplo:
```tsx
<Button variant="destructive" size="icon-sm" onClick={onClose}>
  <XIcon />
  <span className="sr-only">Fechar</span>
</Button>
```

### 4.2 Input (`input.tsx`)
Base: `@base-ui/react/input`.
Classes: `h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base`, foco com ring, `placeholder:text-muted-foreground`, estados disabled e invalid.

### 4.3 Label (`label.tsx`)
`flex items-center gap-2 text-sm leading-none font-medium select-none`, com estados disabled.

### 4.4 Select (`select.tsx`)
Base: `@base-ui/react/select`. Trigger `h-8` (default) / `h-7` (sm), `bg-transparent`, foco com ring. Content: `bg-popover text-popover-foreground`, scroll com animações de entrada/saída. Itens com `focus:bg-accent focus:text-accent-foreground`.

### 4.5 Card (`card.tsx`)
Base shadcn. Partes: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`.
Classes padrão: `rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10`, tamanho `default` ou `sm`.
Tamanho `sm`: gap menor, padding menor.

### 4.6 Dialog (`dialog.tsx`)
Base: `@base-ui/react/dialog`. Partes: `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`.
- Overlay: `bg-black/10`, backdrop-blur, animações fade-in/out.
- Content: `fixed top-1/2 left-1/2`, `max-w-[calc(100%-2rem)]`, `sm:max-w-sm`, `rounded-xl bg-popover p-4 text-sm`, zoom-in/out ao abrir/fechar.
- Close button: `absolute top-2 right-2`, variant ghost, size `icon-sm`.
- Footer: `-mx-4 -mb-4 rounded-b-xl border-t bg-muted/50 p-4`, sm:flex-row justify-end.

### 4.7 InfoButton / Modal "i" (`info-button.tsx`, `page-info-button.tsx`)
Abre modal documentação da tela. Botão: `w-5 h-5 rounded-full border border-blue-400 text-blue-500`, ícone `Info size={12}`.
Modal: `max-w-lg`, `max-h-[80vh] overflow-y-auto`, contém título, description, rules, columns, fields, examples.
Uso em tela: `<InfoButton content={getInfoContent(pathname)} />` ao lado do `<h1>`. Componente `PageInfoButton` encapsula `usePathname` + `getInfoContent`.

### 4.8 ConfirmModal (`confirm-modal.tsx`)
Modal de confirmação com variante `danger` (vermelho) ou `warning` (âmbar). Ícone `AlertTriangle`. Botões: Cancelar (outline) e Confirmar (preenchido). Suporte a `loading` com `Loader2 animate-spin`.

### 4.9 EmptyState (`empty-state.tsx`)
`flex flex-col items-center justify-center py-20 text-center`. Ícone padrão `Inbox` (w-12 h-12 text-slate-300 dark:text-slate-700), message `text-sm font-medium text-slate-500`, subMessage opcional.

### 4.10 KpiCard (`kpi-card.tsx`)
Card de indicador com cor e ícone do tema Dracula derivados do `rotulo`. Partes:
- Rótulo: `text-xs font-medium tracking-wider uppercase`, ícone pequeno à esquerda (`w-4 h-4`)
- Período opcional: `text-[10px] text-slate-400`
- Valor: `text-xl font-semibold text-slate-900 dark:text-slate-100`, `role="status"` se `statusLabel`
- Detalhe opcional: `text-xs`, vermelho se `detalheAlerta`

### 4.11 ChartCard (`chart-card.tsx`)
Card para gráficos com opção `dracula` (pinta com tema Dracula pelo título). Features:
- IntersectionObserver: anima `animate-chart-in` quando entra na viewport (delay opcional)
- Cabeçalho opcional com título + ícone + actions à direita
- `ChartCardBody`: slot `min-h-0 flex-1` para preencher altura restante

### 4.12 ChartTooltip (`chart-tooltip.tsx`)
Tooltip customizado para recharts. Bubble com `backdrop-filter: blur(8px)`, sombra, entrada animada (scale + translate). Suporte a `formatter` para valores (ex.: moeda, "X registros").

### 4.13 StaggeredBarChart (`staggered-bar-chart.tsx`)
Gráfico de barras reutilizável com animação escalonada (`animationBegin`, `animationDuration`), cores customizáveis por célula, `role="img"` com `aria-label`.

### 4.14 Outros componentes UI
`textarea`, `tabs`, `checkbox`, `radio-group`, `popover`, `dropdown-menu`, `nav-link`, `separator`, `filtro-combo`, `creatable-select`, `suggestion-input`, `ocr-input`, `page-skeleton`, `animated-number`, `animated-line`, `sanitized-html`, `list-filters`, `label`.

---

## 5. Layout e navegação

### 5.1 Root Layout (`src/app/layout.tsx`)
- `<html lang="pt-BR" className="font-sans">`
- `<body className="min-h-screen bg-slate-50 dark:bg-slate-950">`
- `Providers` + `QueryProvider` envolvendo children
- `<Toaster />` (sonner) no final do body
- Metadados: título "PDM", descrição "Sistema de operações Comex", ícones (favicon.svg adaptável claro/escuro, PNG), Open Graph, Twitter card
- `viewport.themeColor: "#0f172a"`

### 5.2 Dashboard Shell (`src/components/layout/dashboard-shell.tsx`)
- Sidebar fixa (desktop) + overlay (mobile)
- Header fixo (sticky top-0, z-30)
- `<main>` com `p-4 md:p-6 pb-20 lg:pb-6`, conteúdo centralizado `max-w-7xl` (ou `max-w-none` se sidebar collapsed)
- `MobileBottomNav` (lg:hidden)
- Sidebar collapsed persistido em `localStorage` ("sidebar-collapsed")

### 5.3 Sidebar (`src/components/layout/sidebar.tsx`)
- Desktop: `w-64` (colapsado `w-16`), fixed left-0 top-0 h-screen
- Mobile: overlay `w-72` com backdrop
- Logo topo: "DG" badge + "PDM"
- Menus dinâmicos da API `/api/user/menus`, com itens agrupados, expansíveis
- Item ativo: fundo azul (`bg-blue-50 dark:bg-blue-950/50`), ponto azul
- Admin/SUDO: links extras (Configurações, Logs, WhatsApp monitor/catalogos/dashboard/chat)
- Rodapé: "Versão 1.0.0", "© 2026 DGBCOMEX | AtriosTech"

### 5.4 Header (`src/components/layout/header.tsx`)
- `sticky top-0 z-30 h-16`, bg com backdrop-blur
- Esquerda: menu hamburger (mobile), toggle sidebar (desktop), busca (CommandSearch)
- Direita: `ThemeToggle`, `ChatButton`, notificações (sino com badge vermelho pulse, dropdown com lista e "Ler tudo"), menu do usuário (avatar com inicial, nome, email, role badge, links Perfil/Configurações, sair)
- Notificações: polling `/api/notificacoes?naoLidas=true&limit=10`, refetch a cada 120s

### 5.5 Mobile Bottom Nav (`mobile-bottom-nav.tsx`)
`fixed bottom-0`, 4 itens: Início, Nova Visita, Agenda, Perfil. Ativo em azul.

### 5.6 Theme Toggle
Não lido completamente, mas existe em `src/components/layout/theme-toggle.tsx`. Alternna classe `.dark` no `<html>`.

---

## 6. Telas principais

### 6.1 Login (`src/app/login/page.tsx`)
- Layout centralizado: `flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4`
- Logo: `h-12 w-12 rounded-lg bg-primary` com ícone `LayoutDashboard`, título "DGBCOMEX" (`text-2xl font-bold tracking-tight`)
- Card `max-w-md`:
  - CardTitle: "Acesse sua conta" (`text-2xl text-center`)
  - CardDescription: "Insira suas credenciais ou use o Google"
  - Campos: E-mail (type email, required), Senha (type password, required)
  - Erro: `rounded-md bg-destructive/15 p-3 text-sm text-destructive`
  - Botão entrar: `w-full`, "ENTRAR" / "Entrando…"
  - Separador "ou"
  - Botão Google: `variant="outline" w-full`, ícone SVG do Google, "Continuar com Google"
- Autenticação: `signIn("credentials")` e `signIn("google")` via next-auth
- Pós-login: busca `/api/user/pagina-inicial` para redirecionar

### 6.2 Dashboard inicial
Redirecionamento baseado em `paginaInicial` do usuário. Geralmente `/dashboard` ou primeira página do menu.

### 6.3 Padrão de página de lista (cadastros)
- Título + InfoButton
- Barra de busca, filtros
- Tabela com cabeçalho fixo (`TabelaRelatorio` ou tabela padrão)
- Cards de resumo no topo
- Botão "Novo" e links de edição/exclusão por linha
- Modal de confirmação para exclusão
- Exportação PDF/CSV/Markdown
- Teste: factories `list-page-spec` / `form-page-spec`

### 6.4 Padrão de página de formulário
- Título (Criar / Editar)
- Campos com Label + Input/Select
- Validação: obrigatórios, toast de erro
- Botões: "Criar"/"Atualizar", cancelar/voltar
- Teste: `form-page-spec`

---

## 7. Gráficos (recharts)

Biblioteca: `recharts` v3.8.1.

### 7.1 Componentes gráficos
- `ResponsiveContainer` (width 100%, height fixa por card)
- `BarChart`, `Bar`, `PieChart`, `Pie`, `Cell`
- `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`
- Tooltip custom: `ChartTooltip` de `@/components/ui/chart-tooltip`

### 7.2 Estilos de gráfico (globals.css)
- `.recharts-bar-rectangle:hover`: `filter: brightness(1.1)`
- `.recharts-sector:hover`: `filter: brightness(1.05)`
- `.recharts-line-curve:hover`: `stroke-width: 3`
- `.animate-chart-in`: animação de entrada (1.8s, cubic-bezier)
- `.chart-hover-effect`: `translateY(-2px)` + shadow no hover

### 7.3 Cores de gráfico (hardcoded em `charts.tsx` do CRM)
```ts
const CHART_COLORS = [
  "#6366f1", "#06b6d4", "#f97316", "#22c55e",
  "#ef4444", "#8b5cf6", "#14b8a6", "#eab308",
]
```

### 7.4 Labels em barras (implementado no CRM relatorios)
- `label={{ position: "top", fill: "#374151", fontSize: 11 }}` (barras verticais)
- `label={{ position: "end", fill: "#374151", fontSize: 11 }}` (barras horizontais)

### 7.5 Labels em pizza/rosquinha
- `label={({ name, value }) => \`${name}: ${value}\`}` com `labelLine={false}`

---

## 8. Modais e dialogs

### 8.1 Dialog base (`dialog.tsx`)
Usar para modais genéricos. Sempre incluir `DialogClose` com `XIcon` e label "Fechar".

### 8.2 Modal "i" de informação (`info-button.tsx`)
Modal documentação da tela. Obrigatório em toda tela. Conteúdo em `src/lib/info-content/<dominio>.ts`, agregado em `index.ts`.

### 8.3 ConfirmModal (`confirm-modal.tsx`)
Para exclusões e ações destrutivas. Variantes `danger`/`warning`.

### 8.4 Modal de detalhes de gráfico (`modal-detalhes-grafico.tsx`)
Criado para os relatórios CRM. Abre ao clicar no card do gráfico. Exibe tabela com colunas + linhas + linha de total. Suporta `formatarValor`.

---

## 9. Relatórios e exportação PDF

### 9.1 `src/lib/export-utils.ts`
Funções:
- `exportCSV(filename, headers, rows)` — CSV com BOM UTF-8, aspas quando necessário
- `exportMarkdown({ filename, title, headers, rows, stats?, period? })` — Markdown com tabela, resumo, data de exportação
- `exportPDF(title, contentHtml)` — janela de impressão HTML com CSS embutido
- `exportPDFRelatorio({ title, stats?, tables?, period?, filename?, orientation?, statsLayout? })` — PDF via jsPDF + jspdf-autotable:
  - Header azul (`[7, 63, 184]`) com nome da empresa (busca `/api/admin/config/empresa`)
  - Título + período
  - Stats em boxes (lado a lado) ou lista
  - Tabelas com `autoTable`, cabeçalho azul, linhas alternadas
  - Rodapé em cada página: empresa + "Página X"
  - Orientação portrait/landscape

### 9.2 Relatórios CRM (`/comercial/crm/relatorios/`)
Hub com 6 gráficos (recharts) + 7 link cards para relatórios detalhados (atividades, pessoas, oportunidades, propostas, visitas, conversões, clientes).
Cada gráfico:
- Card clicável (teclado Enter/Space suportado)
- Modal com tabela de dados subjacentes
- Labels com valores nas barras e fatias
- Tooltip customizado

Páginas detalhadas: usam `useRelatorioCrm` + `FiltrosRelatorio` (período, usuário, status, tipo, segmento, tarja), cards de resumo, tabela, exportação PDF/CSV/Markdown.

### 9.3 PDFs de requisitos/corte/amostra
- `gerarRequisicaoCortePdf` — PDF de requisição de corte com itens, status, empresa
- `gerarSolicitacaoAmostraPdf`, `gerarRequisicaoAmostraComercialPdf` — similares
- Usam `jsPDF`, imagem do logo com fallback via `/api/proxy-image`

---

## 10. Notificações

Motor: `src/lib/notificar.ts` (`notificar`, `notificarAdmins`, `rolesNotificacaoGlobal`).
- Grava in-app em tabela `notificacoes`
- Envia email síncrono via SMTP (`email_config`), falha em silêncio se SMTP inválido
- Regras por tipo em `notificacao_regras` (tipo UNIQUE + roles JSONB)
- Regra global `TODOS`: perfis que recebem todas as notificações (padrão: `["ADMIN","SUDO"]`)
- `notificar()` soma perfis globais aos da regra do tipo
- Botão "Enviar teste para os administradores" no admin
- Header exibe notificações não lidas com sino e badge vermelho

---

## 11. Animações (`globals.css`)

| Classe | Efeito |
|--------|--------|
| `animate-fade-in` | fadeIn 0.3s (opacity + translateY) |
| `animate-slide-in` | slideIn 0.2s (translateX) |
| `animate-chart-in` | chartIn 1.8s (opacity + translateY + scale + blur) |
| `animate-piscar` | piscar 0.4s infinito (opacity + scale) |
| `chart-hover-effect` | hover: translateY(-2px) + shadow |
| `.glass-effect` | bg-white/80 dark:bg-slate-900/80 backdrop-blur-md |

### Print (`@media print`)
- `.no-print` → `display: none`
- body: background branco, texto preto
- `.rounded-xl`: border 1px #ccc, sem sombra

---

## 12. Ícones (lucide-react)

Usados em todo o sistema. Principais: `LayoutDashboard`, `Calendar`, `List`, `User`, `Users`, `Building2`, `Target`, `FileText`, `MapPin`, `Activity`, `Handshake`, `TrendingUp`, `TrendingDown`, `CheckCircle`, `XCircle`, `Clock`, `CalendarCheck`, `ListChecks`, `UserPlus`, `Megaphone`, `Phone`, `Video`, `PieChart`, `Banknote`, `Receipt`, `CircleDollarSign`, `BadgeCheck`, `Landmark`, `Factory`, `Package`, `Ticket`, `Ruler`, `Weight`, `Wallet`, `Contact`, `CalendarPlus`, `CalendarDays`, `CalendarRange`, `ArrowDownToLine`, `ArrowUpFromLine`, `HandCoins`, `ArrowRightLeft`, `UserCheck`, `Percent`, `Undo2`, `Search`, `Menu`, `X`, `Bell`, `LogOut`, `Settings`, `CheckCheck`, `Loader2`, `PanelLeftOpen`, `PanelLeftClose`, `Plus`, `Minus`, `ScrollText`, `MessageSquare`, `BarChart3`, `Info`, `AlertTriangle`, `Loader2`.

Ícones de tema Dracula são mapeados por palavra-chave do título em `dracula.ts` (veja seção 2.3).

---

## 13. Regras obrigatórias de uso

1. **Toda tela precisa do modal "i"**: renderize `<InfoButton content={getInfoContent(pathname)} />` ao lado do `<h1>`. Conteúdo em `src/lib/info-content/`, atualize em toda alteração de tela.
2. **Dark mode obrigatório**: toda cor deve funcionar nos dois temas.
3. **Quem flutua define fundo + texto**: popovers/selects/dropdowns usam `bg-popover text-popover-foreground`.
4. **Acessibilidade**: alvo mínimo 24×24 px, foco visível com ring, estados disabled visíveis.
5. **Testes**: toda funcionalidade/tela exige teste (vitest + Testing Library). Suíte completa deve ficar verde antes de commitar.
6. **Nunca commite `.env.local` ou segredos.**
7. **Commits**: sempre push ao concluir entrega, mensagem no estilo `feat(escopo): ...`, em português.

---

## 14. Exemplo de uso rápido (card Dracula)

```tsx
import { corPorTitulo, iconePorTitulo } from "@/lib/dracula"
import type { CSSProperties } from "react"

const estilo = corPorTitulo("Pipeline")
const Icone = iconePorTitulo("Pipeline")

return (
  <div
    style={
      {
        "--card-fundo": estilo.fundoClaro,
        "--card-fundo-escuro": estilo.fundoEscuro,
        "--card-borda": estilo.borda,
        "--card-realce": estilo.cor,
        cursor: "pointer",
      } as CSSProperties
    }
    className="rounded-xl border border-[color:var(--card-borda)] bg-white dark:bg-slate-900 bg-[image:var(--card-fundo)] dark:bg-[image:var(--card-fundo-escuro)] p-5 hover:border-[color:var(--card-realce)] transition-colors"
  >
    <div className="flex items-center gap-2 mb-4">
      <span style={{ color: estilo.cor }}><Icone size={16} /></span>
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Pipeline</h2>
    </div>
    {/* conteúdo */}
  </div>
)
```

---

## 15. Histórico de alterações

- Criação completa do design system com base em `src/lib/dracula.ts`, `tailwind.config.js`, `src/app/globals.css`, componentes `src/components/ui/*`, layouts `src/components/layout/*`, telas `src/app/login/page.tsx` e `src/app/layout.tsx`, utilitários de exportação e notificações.
