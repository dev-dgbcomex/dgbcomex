# WMS — Investigação open-source e recomendação

> Fase 3 do `docs/wms-modulo.md`. Data: 2026-10-22.

## Critérios de avaliação

| Critério | Peso | Motivo |
|---|---|---|
| **Adequação ao têxtil (rolos/peças/metros/peso)** | 25% | Nosso negócio não é SKU unitário genérico. Trabalhamos com rolo, peça, metragem, peso, cor/desenho/lote. |
| **Integração com stack atual (Next.js 15 + Drizzle + Postgres)** | 20% | Preferimos manter no mesmo app/menu/permissões/testes. |
| **Dados locais (WMS escreve no local)** | 15% | Decisão D4: WMS vive em `dgbcomex_warehouse` (localhost). ERP somente leitura. |
| **Esforço de integração / acoplamento** | 15% | Tempo vs valor. Evitar reescrever auth/menus/integrações. |
| **Manutenibilidade / independência** | 15% | Controlar regras (endereçamento, movimentação, auditoria). |
| **Licença / custo** | 10% | Sem lock-in excessivo. |

## Comparação

| Solução | Stack | WMS/Armazém | Têxtil-fit | Integração | Local-first | Licença | Esforço | Nota (ponderada) |
|---|---|---|---|---|---|---|---|---|
| **[Odoo Inventory](https://www.odoo.com/pt_BR/app/inventory)** | Python/Postgres | Muito completo (endereçamento, lotes/serial, ondas, regras, rotas) | Médio | Baixo (iframe/REST separado) — precisa SSO/auth unificada, mapeamento de dados | Possível self-host, mas rodaria app separado | LGPLv3 (Community) / Enterprise | **Alto** (deploy + auth + sync + UX) | 7.0/10 |
| **[ERPNext Stock](https://erpnext.com/open-source-erp/modules/stock)** | Python/Frappe/Postgres | Completo | Médio | Separado (Frappe app) — integrações complexas | Self-host possível | GPLv3 | **Alto** (Frappe framework novo p/ time) | 7.0/10 |
| **[OpenBoxes](https://openboxes.com/)** | Grails/Java/Postgres | Foco em armazém/supply chain, bom em endereçamento | Médio-Bom | Separado + API | Self-host | EPL v1.0 | **Alto** (stack diferente) | 7.2/10 |
| **[PartKeepr](https://partkeepr.org/)** | PHP/Symfony/Postgres | Mais voltado a peças/estoque técnico | Médio | Separado | Self-host | GPLv3 | **Alto** | 6.5/10 |
| **[InvenTree](https://inventree.org/)** | Django/React/Postgres | Bom para peças, BOM, stock tracking | Médio | Tem API REST, mas UX/UI separado do dgbcomex | Self-host | MIT | **Médio-Alto** (integrar auth/menu) | 7.5/10 |
| **Construir no dgbcomex (nativo)** | **Next.js 15 + Drizzle + Postgres local** | Sob medida | **Ótimo** | **Nativo** (mesmo app, menus, roles, testes, info-content) | **Sim — `dgbcomex_warehouse`** | Interno | **Médio** (incremental, faseado) | **9.0/10** |

## Análise

### Por que construir nativo

1. **Domínio específico** — O negócio trabalha com **rolo/peça/metros/peso**. As regras vêm do `raw.cte_peca`/`cte_baixa` que já temos localmente. Adaptações em OpenBoxes/Odoo tendem a ser extensas.
2. **Arquitetura já pronta** — Autenticação, menus dinâmicos, permissões, integrações (padrão proxy), testes obrigatórios, `InfoButton`, Drizzle, tudo padronizado.
3. **Desacoplamento correto** — WMS grava **apenas** no `dgbcomex_warehouse`. ERP é `SELECT` via `api-microdata`. Zero risco de escrever no ERP.
4. **Base já espelhada** — Fase 2 concluída: Neon espelhado 100% no local (`137/137` tabelas iguais). Podemos começar sem bloqueio.
5. **Evolutivo** — Começar pequeno (endereçamento básico, recebimento/conferência, movimentação) e crescer conforme necessidade real.

### Quando considerar open-source

- Se surgirem requisitos muito genéricos de **wave picking / lotes complexos / integrações com transportadoras** e houver pressão por velocidade extrema.
- Mesmo assim, **InvenTree** seria o menos disruptivo (API + MIT), mas ainda exigiria SSO, unificação de menus e sincronização com nosso modelo têxtil.

## Recomendação

**Recomendado: CONSTRUIR NO DGBCOMEX (nativo).**

Razões práticas:
- **Menor fricção**: mantém experiência única, permissões e integrações existentes
- **Melhor aderência ao negócio têxtil**
- **Alinha com D1-D4** (local-first, ERP read-only)
- **Permite entregar valor incrementalmente**
- **Sem introduzir novo framework/runtime na stack principal**

**Plano de ataque:** seguir **Fase 4** — esqueleto mínimo (rota, menu, info-content, registro de integração read-only) com testes obrigatórios, validando antes de lógica complexa.

## Ações futuras (se mudar de direção)

- Avaliar **InvenTree** via PoC rápido (Docker local) caso requisitos mudem drasticamente
- Manter API do WMS isolada e usar `dbLocal` sempre — facilita eventual extração futura
