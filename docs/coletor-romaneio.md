# Módulo Coletor / Romaneio (SIMPALM)

## Visão Geral

O módulo Coletor permite que operadores de estoque (perfil `EXPEDICAO`) acessem via interface mobile-first as ordens de separação do WMS, visualizem as peças a coletar, adicionem peças à ordem e gerem o **romaneio no ERP legado**.

O arquivamento é realizado na tela de detalhe da ordem de separação, através do botão "Romanear", que chama a procedure `SP_Car_InsertRomaneio_Separacao` do ERP legado (SQL Server `DBMicrodata_DGB`), inserindo registros nas tabelas `Car_Romaneio` e `Car_Itens_Romaneio`.

## Fluxo de Coleta

1. O operador acessa a tela `/wms/coletor`
2. Visualiza as ordens de separação com status `LIBERADO` ou `EM_SEPARACAO`
3. Clica em uma ordem para ver o detalhe
4. Visualiza os itens do pedido com peças já reservadas
5. Clica em "Coletar peças" em um item para adicionar peças à ordem
6. Quando todas as peças estão coletadas, clica em "Gerar romaneio"
7. O sistema chama a procedure `SP_Car_InsertRomaneio_Separacao` no ERP legado
8. O sistema exibe o número do romaneio gerado

## Endpoints da API

### GET /api/wms/coletor/separacoes

Lista ordens de separação disponíveis para coleta (status `LIBERADO` ou `EM_SEPARACAO`).

**Resposta:**
```json
{
  "itens": [
    {
      "id": 123,
      "empresa": "13",
      "pedido": "00006888",
      "cliente": "61.133.504/0001-14",
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

### GET /api/wms/coletor/separacoes/{id}

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

### GET /api/wms/coletor/separacoes/{id}/itens/{item}/pecas-disponiveis

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

## Tabelas do Banco Local (dgbcomex_warehouse)

### wms_coletor_sincronizacao

Tabela de fila de sincronização para modo offline.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | bigserial | PK |
| empresa | varchar(10) | Empresa |
| pedido | varchar(20) | Pedido |
| separacao_id | bigint | ID da separação |
| tipo_operacao | varchar(20) | Tipo de operação (ROMANEAR) |
| payload | jsonb | Dados para reenviar |
| status | varchar(20) | Status (PENDENTE, ENVIADO, ERRO) |
| tentativas | int | Número de tentativas |
| erro | text | Mensagem de erro |
| criado_em | timestamptz | Data de criação |
| processado_em | timestamptz | Data de processamento |

### wms_coletor_config

Tabela de configuração do coletor.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | int | PK (sempre 1) |
| ultimo_sync | timestamptz | Última sincronização |
| ultima_carga_em | timestamptz | Última carga |
| versao_app | varchar(20) | Versão do app |

## Tabelas do ERP Local (SQL Server DBMicroData_DGB)

### Car_Romaneio

Cabeçalho do romaneio de expedição.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| Empresa | char(2) | Empresa (PK) |
| Romaneio | char(6) | Número do romaneio (PK) |
| Tipo | char(1) | Tipo ('V' = venda) |
| Empresa_Pedido | char(2) | Empresa do pedido |
| Pedido | char(8) | Pedido de venda |
| Cliente | char(18) | Cliente |
| Data_Rom | datetime | Data do romaneio |
| Status | char(1) | Status ('N', 'S') |
| Observ_1 | varchar(40) | Observação |

### Car_Itens_Romaneio

Itens/peças do romaneio.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| Empresa | char(2) | Empresa (PK) |
| Romaneio | char(6) | Número do romaneio (PK) |
| Tipo | char(1) | Tipo (PK) |
| Incremento | int | Incremento (PK) |
| Nro_Peca | char(10) | Número da peça |
| Produto | char(6) | Código do produto |
| Situacao | char(3) | Situação |
| Cor | char(5) | Cor |
| Desenho | char(5) | Desenho |
| Categoria | char(2) | Categoria |
| Variante | char(5) | Variante |
| Qtde | decimal(16,4) | Quantidade |
| Peso | decimal(16,4) | Peso |
| Vr_Unitario | decimal(16,4) | Valor unitário |
| Vr_Total | decimal(16,4) | Valor total |
| Empresa_Pedido | char(2) | Empresa do pedido |
| Pedido | char(8) | Pedido de venda |
| Nro_Item_Pedido | int | Item do pedido |
| Data_Prevista | smalldatetime | Data prevista |
| Codigo_Barra | varchar(60) | Código de barras |

## Regras de Negócio

1. **Somente pedidos com status `LIBERADO` ou `EM_SEPARACAO`** aparecem na lista de coleta.
2. **Somente ordens que não estão arquivadas** aparecem na lista.
3. **Somente peças com situação `001`** e que não tenham baixa no ERP estão disponíveis para coleta.
4. **Somente peças que não estejam já reservadas** em outra separação estão disponíveis.
5. **Somente o perfil `OPERADOR_ESTOQUE`** (e `ADMIN`/`SUDO` para testes) pode usar o coletor.
6. **O romaneio é gerado apenas quando há peças reservadas** na ordem.
7. **Cada peça é coletada uma vez** - não pode ser coletada duas vezes para a mesma ordem.

## Fluxo Offline/Online

1. Quando o coletor está offline, as operações de coleta são armazenadas na tabela `wms_coletor_sincronizacao` com status `PENDENTE`.
2. Quando o coletor volta online, o botão "Sincronizar" envia os itens pendentes para o ERP.
3. Após a sincronização bem-sucedida, o status é alterado para `ENVIADO`.

## Regras de Segurança

- Apenas usuários com perfil `OPERADOR_ESTOQUE` (ou `ADMIN`/`SUDO` para desenvolvimento) podem acessar o coletor.
- Todas as rotas requerem autenticação via NextAuth.
- Todas as rotas são protegidas pelo escopo `ESCOPO_ESTOQUE`.
