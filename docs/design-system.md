# Design System — regras de UI

Complementa as skills de layout/design. Toda tela e componente deve seguir estas regras.

## Superfícies flutuantes (Popover, Select, Dropdown, Combobox, Menu)

**Regra de ouro: quem flutua define fundo E cor do texto juntos.** Nunca confie na cor herdada do gatilho.

- Componentes Base UI/shadcn (`Popover`, `Select`, `DropdownMenu`, `ContextMenu`): use sempre `bg-popover text-popover-foreground`. O padrão já está em `src/components/ui/select.tsx` e `src/components/ui/popover.tsx` — não remova essas classes ao customizar.
- Combobox/listbox feitos à mão (ex.: `src/components/ui/creatable-select.tsx`): use `bg-white dark:bg-slate-900` (ou `bg-popover`) + `text-slate-900 dark:text-slate-100` nos itens. O item ativo usa `bg-blue-50 dark:bg-blue-900/30`.
- **Nunca** use `bg-transparent` em `<select>` nativo: no Windows o dropdown herda a cor de fundo e o texto pode ficar branco sobre branco. Use `bg-background text-foreground`.
- **Nunca** aplique `text-white`/`text-black` sem um `bg-*` explícito no mesmo elemento.

### Bug recorrente: texto branco sobre fundo branco em combobox/select

Já aconteceu no WMS (filtros de pedidos/separacões/estoque e selects de situação): o painel flutuante herdava `text-foreground` do tema escuro do gatilho, mas renderizava com fundo branco porque as classes `bg-popover`/`text-popover-foreground` haviam sido omitidas ou sobrescritas.

Checklist ao criar/alterar um painel flutuante:

1. O painel tem `bg-popover text-popover-foreground` (ou par claro/escuro explícito)?
2. Os itens têm cor de texto própria, sem depender do pai?
3. O estado `data-[highlighted]`/`hover` mantém contraste nos dois temas?
4. O componente foi conferido em **light e dark mode**, com teclado e mouse?
5. Existe teste cobrindo a renderização do painel (ou a lista de opções)?

## Contraste e acessibilidade

- Texto normal: mínimo 4.5:1; texto grande: 3:1 (WCAG AA).
- Não use `text-slate-400` para texto informativo em fundo branco (contraste baixo); prefira `text-slate-500`/`text-slate-600`.
- Dark mode não é opcional: toda classe de cor deve ter par `dark:` quando o token não for semântico (`bg-background`, `text-foreground` já resolvem).

## Componentes interativos

- Toque/clique: alvo mínimo de 24×24 px (ideal 44×44 px).
- Foco visível: use `focus-visible` com `ring`; nunca remova o outline sem substituto.
- Estados `disabled` e `aria-invalid` devem ser visíveis nos dois temas.
