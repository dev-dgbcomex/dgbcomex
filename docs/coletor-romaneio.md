# Módulo Coletor / Romaneio (SIMPALM)

## Visão Geral

O módulo Coletor permite que operadores de estoque (perfil `OPERADOR_ESTOQUE`) acessem via interface mobile-first as ordens de separação do WMS, visualizem as peças a coletar, adicionem peças à ordem e gerem o **romaneio no ERP legado** (SQL Server `DBMicrodata_DGB`, tabelas `Car_Romaneio` / `Car_Itens_Romaneio`) via procedure `SP_Car_InsertRomaneio_Separacao`.

## Escopo e Regras de Negócio

### Quem pode usar?
Apenas usuários com perfil **OPERADOR_ESTOQUE** (ou ADMIN/SUDO para testes). Verificado via `podeColetarWms(role)` em `src/lib/wms/permissoes.ts`.

### Fluxo de Coleta

1. **Abrir a tela `/wms/coletor`** - Lista ordens de separação com status `LIBERADO` ou `EM_SEPARACAO`, que ainda não foram arquivadas.
2. **Clicar em uma ordem** - Abre o detalhamento `/wms/coletor/separacoes/[id]` com:
   - Dados da ordem (pedido, cliente, data, saldo)
   - Itens do pedido com saldo e peças já reservadas
   - Botão "Reabastecer peças" para adicionar mais peças à ordem
3. **Selecionar peças para coletar** - Tela de seleção com peças disponíveis do estoque em aberto (CTE_Peca), filtradas por compatibilidade com o item do pedido.
4. **Clique em "Gerar romaneio"** - Chama o endpoint `POST /wms/coletor/separacoes/{id}/romanear` que:
   - Valida que a ordem tem peças reservadas
   - Chama a procedure SQL Server `SP_Car_InsertRomaneio_Separacao` para cada peça
   - Cria o cabeçalho em `public.wms_separacoes` (coluna `arquivada_em` permanece nula - NÃO arquiva a ordem)
   - Insere cada peça em `public.wms_separacao_pecas` com status `CANCELADO` (já coletada)
   - Retorna o número do romaneio gerado
5. **Retorna ao kanban** com a ordem atualizada

### Regras de Negócio

| Regra | Detalhe |
|-------|---------|
| Somente pedidos aprovados | `status = '2'` no ERP |
| Somente itens com saldo > 0 | `qtde - qtde_romaneio - qtde_acerto > 0` |
| Somente itens liberados | `status_ped <> 'E'` e `status_item <> 'E'` |
| Somente ordens não arquivadas | `arquivada_em is null` |
| Peças disponíveis = em estoque e não reservadas | `situacao = '001'`, não em `cte_baixa`, não em `wms_separacao_pecas` com status RESERVADA/SEPARADA |
| Tipo do romaneio | Sempre `'V'` (venda) |
| Status da ordem após romaneio | Permanece `EM_SEPARACAO` (não é concluída automaticamente) |

## Endpoints da API (api-microdata)

### GET `/wms/coletor/separacoes`
Lista ordens de separação disponíveis para coleta.

**Parâmetros:** `limite` (padrão 50), `offset` (padrão 0)

**Resposta:**
```json
{
  "itens": [
    {
      "id": 123,
      "empresa": "13",
      "pedido": "00006888",
      "cliente": "INDUSTRIA E COMERCIO PORTOBEL LTDA",
      "status": "EM_SEPARACAO",
      "total_pecas": 5,
      "total_metros": 120.5,
      "saldo_metros": 30.0,
      "criado_em": "2026-10-20T10:00:00Z"
    }
  ],
  "total": 1
}
```

### GET `/wms/coletor/separacoes/{id}`
Detalhe da ordem de separação para o coletor.

**Resposta:**
```json
{
  "id": 123,
  "empresa": "13",
  "pedido": "00006888",
  "cliente": "INDUSTRIA E COMERCIO PORTOBEL LTDA",
  "status": "EM_SEPARACAO",
  "total_pecas": 5,
  "total_metros": 120.5,
  "saldo_metros": 30.0,
  "criado_em": "2026-10-20T10:00:00Z",
  "itens": [
    {
      "item": 1,
      "produto": "000028",
      "produto_desc": "TECIDO X",
      "situacao": "001",
      "situacao_desc": "TINTO",
      "cor": "00006",
      "corDesc": "AZUL",
      "desenho": "00000",
      "categoria": "01",
      "largura": "1.42",
      "saldo": 1000.0,
      "unid": "MT",
      "pecasReservadas": 0
    }
  ]
}
```

### GET `/wms/coletor/separacoes/{id}/itens/{item}/pecas-disponiveis`
Lista peças em aberto compatíveis com o item da separação para coleta.

**Resposta:**
```json
{
  "itens": [
    {
      "nro_rolo": "R100",
      "nro_peca": "1",
      "produto": "000028",
      "produto_desc": "TECIDO X",
      "metros": 50.0,
      "gaveta": "A-01-01",
      "gaveta_descricao": "Gaveta A",
      "zona": "DEPÓSITO",
      "selecionada": false
    }
  ],
  "total": 1
}
```

### POST /wms/coletor/separacoes/{id}/pecas
Adiciona peças coletadas à ordem de separação.

**Requisição:**
```json
{
  "item": 1,
  "pecas": [
    {
      "nroRolo": "R100",
      "nroPeca": "1",
      "quantidade": 1
    }
  ]
}
```

### POST /wms/coletor/separacoes/{id}/romanear
Gera romaneio no ERP legado para a ordem de separação. Chama a procedure `SP_Car_InsertRomaneio_Separacao` para cada peça da ordem.

**Requisição:**
```json
{
  "usuarioId": 7
}
```

**Resposta:**
```json
{
  "ok": true,
  "separacaoId": 123,
  "romaneio": "017541",
  "pecasProcessadas": 5,
  "pecas": [
    {
      "itemSep": 1,
      "nroRolo": "R100",
      "nroPeca": "1",
      "romaneio": "017541",
      "incremento": 1
    }
  ]
}
```

### POST /wms/coletor/sincronizar
Tenta sincronizar itens pendentes da fila de coleta com o ERP legado.

**Resposta:**
```json
{
  "ok": true,
  "processados": 5,
  "erros": 0
}
```

### GET /wms/coletor/dashboard
Resumo para o coletor.

**Resposta:**
```json
{
  "pendentes": 10,
  "emAndamento": 3,
  "concluidasHoje": 5
}
```

## Tabelas do Banco Local (`dgbcomex_warehouse`)

### `wms_coletor_sincronizacao`

Tabela de fila de sincronização para modo offline.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | bigserial | PK |
| empresa | varchar(10) | Empresa |
| pedido | varchar(20) | Pedido |
| separacao_id | bigint | ID da separação |
| tipo_operacao | varchar(20) | Tipo de operação (`ROMANEAR`) |
| payload | jsonb | Dados para reenviar ao ERP |
| status | varchar(20) | Status (`PENDENTE`, `ENVIADO`, `ERRO`) |
| tentativas | int | Número de tentativas |
| erro | text | Mensagem de erro |
| criado_em | timestamptz | Data de criação |
| processado_em | timestamptz | Data de processamento |

### `wms_coletor_config`

Tabela de configuração do coletor.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | int | PK (sempre 1) |
| ultimo_sync | timestamptz | Última sincronização |
| ultima_carga_em | timestamptz | Última carga de pedidos |
| versao_app | varchar(20) | Versão do app |

## Tabelas do ERP Legado (SQL Server `DBMicrodata_DGB`)

### `CAR_SEPARACAO`

Cabeçalho da ordem de separação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| NUMERO | int | Número da ordem (PK) |
| EMPRESA | char(2) | Empresa |
| PEDIDO | char(10) | Pedido de venda |
| CLIENTE | char(18) | Cliente |
| DATA_GERACAO | smalldatetime | Data de geração |
| ROMANEIO | char(6) | Número do romaneio (se já gerado) |
| TIPO | char(1) | Tipo ('V' = venda) |
| STATUS | int | Status (0=Gerado, 1=Impresso, 2=Em Coleta, 3=Confirmado, 4=Bloqueado) |

### `CAR_SEPARACAO_ITENS`

Itens da separação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| NUMERO | int | Número da ordem (PK) |
| EMPRESA | char(2) | Empresa (PK) |
| ITEM_SEP | int | Item da separação (PK) |
| PEDIDO | char(10) | Pedido de venda |
| ITEM | int | Item do pedido |
| SALDO_PEDIDO | decimal | Saldo do pedido |
| QTDE_ORIGINAL | decimal | Qtde original |
| QTDE_SEPARADA | decimal | Qtde separada |
| TEM_PECAS | char(1) | Tem peças |
| STATUS | int | Status |

### `CAR_SEPARACAO_PECAS`

Peças reservadas para a separação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| NUMERO | int | Número da ordem (PK) |
| EMPRESA | char(2) | Empresa (PK) |
| ITEM_SEP | int | Item da separação (PK) |
| PEDIDO | char(8) | Pedido de venda |
| ITEM | int | Item do pedido |
| SITUACAO | char(3) | Situação |
| NRO_ROLO | char(10) | Número do rolo |
| NRO_PECA | char(3) | Número da peça |
| QTDE | decimal | Quantidade |
| STATUS | int | Status (0=Gerado, 1=Em Coleta, 2=Coletado, 3=Confirmado) |
| OPERADOR | char(3) | Operador que coletou |

### `CAR_ROMANEIO`

Cabeçalho do romaneio de expedição.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| EMPRESA | char(2) | Empresa (PK) |
| ROMANEIO | char(6) | Número do romaneio (PK) |
| TIPO | char(1) | Tipo ('V' = venda) |
| EMPRESA_PEDIDO | char(2) | Empresa do pedido de origem |
| PEDIDO | char(8) | Pedido de venda de origem |
| CLIENTE | char(18) | Cliente |
| DATA_ROM | smalldatetime | Data do romaneio |
| STATUS | char(1) | Status ('N', 'S') |
| OBSERV_1 | char(40) | Observação 1 |

### `CAR_ITENS_ROMANEIO`

Itens do romaneio.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| EMPRESA | char(2) | Empresa (PK) |
| ROMANEIO | char(6) | Número do romaneio (PK) |
| TIPO | char(1) | Tipo (PK) |
| INCREMENTO | int | Incremento (PK) |
| NRO_PECA | char(10) | Número da peça |
| PRODUTO | char(6) | Código do produto |
| SITUACAO | char(3) | Situação |
| COR | char(5) | Cor |
| DESENHO | char(5) | Desenho |
| CATEGORIA | char(2) | Categoria |
| VARIANTE | char(5) | Variante |
| QTDE | decimal(16,4) | Quantidade |
| PESO | decimal(16,4) | Peso |
| VR_UNITARIO | decimal(16,4) | Valor unitário |
| VR_TOTAL | decimal(16,4) | Valor total |
| EMPRESA_PEDIDO | char(2) | Empresa do pedido |
| PEDIDO | char(8) | Pedido de venda |
| NRO_ITEM_PEDIDO | int | Item do pedido |
| DATA_PREVISTA | smalldatetime | Data prevista |
| METROS | decimal(16,4) | Metros |
| SITUACAO_RET | char(3) | Situação de retorno |
| UNID | char(4) | Unidade |
| UNID_FAT | char(4) | Unidade faturamento |
| QTDE_FAT | decimal(16,4) | Qtde faturada |
| VR_UNITARIO_FAT | decimal(16,4) | Valor unitário faturado |
| FARDO | int | Fardo |
| VARIANTE | char(5) | Variante |
| ROLO_COLETADO | char(10) | Rolo coletado |
| PECA_COLETADA | char(3) | Peça coletada |

## Procedures do ERP Utilizadas

### `SP_Car_InsertRomaneio_Separacao`

Insere um item no romaneio a partir de uma ordem de separação.

**Parâmetros:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `@Empresa` | CHAR(2) | Empresa |
| `@OrdemSeparacao` | INT | Número da separação |
| `@ItemSeparacao` | INT | Item da separação |
| `@CodigoBarra` | VARCHAR(60) | Código de barras da peça |
| `@Qtde` | DECIMAL(16,4) | Quantidade |
| `@ID_Estoque` | INT | ID do estoque |

**Retorno:** Incremento, Item_Sep, Romaneio, Tipo, Empresa_Pedido, Pedido, ItemPedido, Cliente, Data_Rom, Observ_1, Peso, Vr_Unitario, Vr_Total, Nro_Item_Pedido, Data_Prevista, Produto, Situacao, Cor, Desenho, Categoria, Variante, Desc_Produto, Desc_Cor, Item

**Comportamento:**
1. Busca o item do pedido na `CAR_SEPARACAO_ITENS` e `CAR_ITENS_PEDIDO`
2. Se o romaneio não existe para aquela empresa/pedido, insere cabeçalho em `CAR_ROMANEIO`
3. Insere o item em `CAR_ITENS_ROMANEIO` com `NRO_PECA='0000000000'` e `ITEM_PECA='000'` (campos não preenchidos por esta procedure)

**Limitação:** Esta procedure não preenche `NRO_ROLO` e `NRO_PECA` com os valores reais da peça coletada. Para rastreamento por rolo/peça específico, é necessário ajustar o `CAR_ITENS_ROMANEIO` após a inserção ou usar outra procedure.

## Fluxo de Operação do Coletor

```
1. Operador acessa /wms/coletor
   ↓
2. Sistema lista ordens de separação com status LIBERADO/EM_SEPARACAO
3. Operador seleciona uma ordem
4. Sistema mostra itens do pedido com saldo e peças já coletadas
5. Operador clica em "Coletar peças" em um item
6. Sistema mostra peças disponíveis no estoque (CTE_Peca)
7. Operador seleciona peças e clica em "Confirmar"
8. Sistema adiciona peças à ordem (POST /wms/coletor/separacoes/{id}/pecas)
9. Quando todas as peças estão coletadas, operador clica em "Gerar romaneio"
10. Sistema chama POST /wms/coletor/separacoes/{id}/romanear
11. API chama SP_Car_InsertRomaneio_Separacao para cada peça
12. Sistema exibe número do romaneio gerado
```

## Segurança

- Todas as rotas exigem autenticação via NextAuth
- Apenas perfil `OPERADOR_ESTOQUE` (ou `ADMIN`/`SUDO`) pode acessar
- Verificação via `podeColetarWms(role)` em `src/lib/wms/permissoes.ts`

## Sincronização Offline

Quando o coletor está offline:
1. As operações de coleta são armazenadas em `wms_coletor_sincronizacao` com status `PENDENTE`
2. Quando volta online, o botão "Sincronizar" envia os itens pendentes para o ERP
3. Após sucesso, o status é alterado para `ENVIADO`
