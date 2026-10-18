# Plano — Aplicativo de Cadastro e Controle de Clientes

> Documento de plano. **Decisões fechadas** (ver seção 0). O restante segue essas escolhas.

---

## 0. Decisões confirmadas

| Tema | Decisão |
|------|---------|
| Plataforma | **PWA** (offline-first, instalável no celular e usável no navegador) |
| Backend | **AWS Amplify** (Cognito + AppSync + DynamoDB) |
| Login | **Múltiplos usuários** via **Login com Google (Gmail)** |
| Usuário mestre (admin) | `higovale@gmail.com` |
| Baixa de dívida | **Por parcela** e **dívida inteira** (ambos) |
| Regra "vencida" | parcela com `vencimento < hoje` e `status = aberta` |
| Dia inexistente no mês | usa o **último dia do mês** |
| Idioma / Moeda | **pt-BR** / **Real (R$)**, datas dd/mm/aaaa |

---

## 1. Visão geral

Aplicativo para cadastrar clientes e controlar dívidas (com parcelas e recorrência), que:

- Funciona **offline** (é possível usar sem internet a qualquer momento).
- **Sincroniza** os dados com um banco na **AWS** assim que a internet voltar.
- Tem uma **versão web** para gestão/controle dos clientes.

Público: operador(es) que cadastram clientes e acompanham dívidas e vencimentos.

---

## 2. Decisões de arquitetura (proposta)

### 2.1 Plataforma do app
**Definido: PWA (Progressive Web App)**

Um PWA é uma aplicação web que:
- Roda no navegador **e** instala no celular como um app (ícone na tela inicial).
- Funciona **offline** usando armazenamento local do navegador (IndexedDB) + Service Worker.
- Cobre "app + versão web" com **uma única base de código** — menos custo e manutenção.

Stack de implementação (proposta técnica): **React + Vite + TypeScript**, com `vite-plugin-pwa` (Service Worker/manifest) e **Dexie.js** sobre IndexedDB para o banco local.

### 2.2 Estratégia offline-first
- Todos os dados ficam primeiro no **dispositivo** (banco local).
- Cada alteração é registrada localmente e marcada como "pendente de sincronização".
- Quando há internet, um processo de sync envia as alterações para a nuvem e baixa as da nuvem.
- Resolução de conflito: **última escrita vence** por padrão (proposta), com carimbo de data/hora (`updatedAt`).

### 2.3 Backend na AWS
**Definido: AWS Amplify (Gen 2)**

O Amplify já entrega, integrado:
- **Autenticação** (Amazon Cognito) — login de usuários, com **provedor Google** (login com Gmail).
- **API + Banco** (AppSync + DynamoDB) — dados na nuvem.
- **Sincronização offline** pronta, que é exatamente o "trabalha offline e sincroniza depois".

### 2.4 Autenticação / usuários
**Definido: múltiplos usuários com Login com Google (Gmail).**

- Provedor de identidade: **Google**, federado no **Cognito** (Hosted UI / OAuth).
- **Papéis (roles):**
  - **admin** — `higovale@gmail.com` (usuário mestre): acesso total, pode gerenciar usuários.
  - **operador** — demais usuários autorizados: cadastram clientes, dívidas e dão baixa.
- Controle de acesso: um **grupo Cognito `admin`** define quem é administrador; o e-mail mestre é adicionado a esse grupo.
- Enquanto a Fase 2 (nuvem) não está pronta, a Fase 1 roda **local sem login** para desenvolvimento; o login Google entra junto com a integração AWS.

> ❓A definir na Fase 2: a lista de operadores é **aberta** (qualquer Gmail que logar) ou **restrita** (só e-mails pré-autorizados pelo admin)? Recomendo restrita.

### 2.5 Idioma e moeda
**Definido:** Português (BR), moeda Real (R$), datas no formato dd/mm/aaaa.

---

## 3. Modelo de dados

Entidades principais e seus relacionamentos:

```
Cliente 1 ── N Dívida 1 ── N Parcela
                              │
                              └── Pagamento (baixa de parcela)
```

### 3.1 Cliente
| Campo         | Tipo    | Obrigatório | Observação                          |
|---------------|---------|-------------|-------------------------------------|
| id            | UUID    | sim         | gerado localmente                   |
| nomeCompleto  | texto   | **sim**     |                                     |
| telefone      | texto   | **sim**     |                                     |
| documento     | texto   | não         | CPF/CNPJ (usado na busca)           |
| email         | texto   | não         |                                     |
| endereco      | texto   | não         |                                     |
| criadoEm      | data    | sim         |                                     |
| atualizadoEm  | data    | sim         | usado para resolução de conflito    |
| syncStatus    | enum    | sim         | `local` / `sincronizado`            |

### 3.2 Dívida
| Campo          | Tipo    | Obrigatório | Observação                                   |
|----------------|---------|-------------|----------------------------------------------|
| id             | UUID    | sim         |                                              |
| clienteId      | UUID    | sim         | referência ao cliente                        |
| descricao      | texto   | não         | ex.: "Compra loja"                           |
| valorTotal     | decimal | sim         | ex.: 100,00                                  |
| numeroParcelas | inteiro | sim         | ex.: 10                                      |
| diaVencimento  | inteiro | sim         | dia do mês da recorrência, ex.: 8            |
| primeiraData   | data    | sim         | data do 1º vencimento                        |
| status         | enum    | sim         | `ativa` / `quitada`                          |
| criadoEm       | data    | sim         |                                              |

### 3.3 Parcela
Geradas automaticamente ao criar a dívida.

| Campo         | Tipo    | Observação                                            |
|---------------|---------|-------------------------------------------------------|
| id            | UUID    |                                                       |
| dividaId      | UUID    |                                                       |
| numero        | inteiro | 1..N                                                  |
| valor         | decimal | valorTotal / numeroParcelas (ajuste no último centavo)|
| vencimento    | data    | calculado pela recorrência mensal                     |
| status        | enum    | `aberta` / `paga`                                     |
| pagoEm        | data    | preenchido ao dar baixa                               |

### 3.4 Pagamento (baixa)
Registro de quando uma parcela (ou dívida) foi baixada.

| Campo       | Tipo    | Observação                     |
|-------------|---------|--------------------------------|
| id          | UUID    |                                |
| parcelaId   | UUID    |                                |
| valorPago   | decimal |                                |
| dataPagamento | data  |                                |

**Definido:** a baixa pode ser feita **por parcela** (individual) **e** na **dívida inteira** de uma vez (dá baixa em todas as parcelas abertas e marca a dívida como `quitada`).

---

## 4. Regras de negócio

### 4.1 Geração de parcelas e recorrência
Exemplo: dívida de **R$ 100** em **10x**, vencendo **todo dia 8**.
- Parcela = 100 / 10 = R$ 10,00 (o último centavo de arredondamento vai na última parcela).
- Vencimentos: 08/mês1, 08/mês2, ... até completar 10 parcelas.
- **Dia inexistente no mês** (ex.: dia 31 em fevereiro): usa-se o **último dia do mês** (proposta).

### 4.2 Dívida/parcela vencida
- Uma parcela está **vencida** se `vencimento < hoje` e `status = aberta`.
- Um cliente tem **dívida vencida** se possui ao menos uma parcela vencida.

### 4.3 Ordenação da lista de clientes
Ordem do topo para baixo:
1. Clientes com **parcelas vencidas** (mais atrasadas primeiro).
2. Clientes com parcelas **a vencer** (vencimento mais próximo primeiro).
3. Demais clientes.

Cada linha mostra: nome, total em aberto (soma das parcelas não pagas) e indicador de vencida.

### 4.4 Busca de clientes
- Busca por **nome** ou **documento**.
- Por nome: retorna até **10 clientes** com maior similaridade (busca fuzzy — tolera erros de digitação e nomes parecidos).
- Por documento: busca exata/por prefixo.

---

## 5. Telas e fluxos

### 5.1 Tela inicial
Três opções:
- **Cadastrar novo cliente**
- **Buscar cliente**
- **Ver lista de clientes**

(Indicador de status de sincronização — online/offline/pendências — no topo.)

### 5.2 Cadastrar novo cliente
Formulário com: Nome completo (obrigatório), Telefone (obrigatório), Documento, E-mail, Endereço.
- Validação dos obrigatórios antes de salvar.
- Ao salvar, segue para a tela de **vincular dívida**.

### 5.3 Vincular dívida (após cadastro)
Campos: valor total, número de parcelas, dia de vencimento (recorrência) e data do primeiro pagamento.
- Mostra uma **prévia das parcelas** (datas e valores) antes de confirmar.
- Permite pular esta etapa (cadastrar cliente sem dívida).

### 5.4 Buscar cliente
- Campo de busca por nome ou documento.
- Lista de resultados (até 10 por similaridade de nome).
- Ao abrir um cliente: ver dados, **cadastrar nova dívida** e **dar baixa** nas dívidas/parcelas ativas.

### 5.5 Ver lista de clientes
- Lista ordenada conforme regra 4.3.
- Cada item: nome, valor em aberto, selo de "vencida" quando aplicável.
- Toque/clique abre a página do cliente.

### 5.6 Página do cliente
- Dados cadastrais (editáveis).
- Lista de dívidas e parcelas (com status e vencimentos).
- Ações: cadastrar nova dívida, dar baixa em parcela/dívida.

---

## 6. Roadmap de implementação (proposta)

**Fase 0 — Fundação**
- Setup do projeto (PWA), armazenamento local (IndexedDB), navegação e telas vazias.

**Fase 1 — Núcleo offline (sem nuvem)**
- Cadastro de cliente, dívida + geração de parcelas, busca, lista ordenada, página do cliente, baixa de parcela. Tudo funcionando 100% offline no dispositivo.

**Fase 2 — Nuvem AWS + sincronização + login** ✅ (código concluído)
- AWS Amplify Gen 2, **login com Google (Cognito)**, papéis admin/operador, lista restrita de usuários, sync bidirecional (last-write-wins) e resolução de conflito.
- Provisionamento na conta AWS + credenciais Google ficam a cargo do usuário: ver `AWS_SETUP.md`.

**Fase 3 — Refino**
- Indicadores de sync, tratamento de erros, prévia de parcelas, edição de cadastro, relatórios simples.

> Sugestão: começar pela Fase 1 (app útil e funcional offline) e só depois plugar a AWS. Isso entrega valor cedo e reduz risco.

---

## 7. Pendências restantes

Todas as decisões principais foram tomadas (seção 0). Resta apenas uma definição, que só é necessária na Fase 2:

1. **Acesso de operadores:** lista **aberta** (qualquer Gmail que logar vira operador) ou **restrita** (somente e-mails pré-autorizados pelo admin `higovale@gmail.com`)? — Recomendo **restrita**.

Isso não bloqueia a Fase 1, que começa agora.
