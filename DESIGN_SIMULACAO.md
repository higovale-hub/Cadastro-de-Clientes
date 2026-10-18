# Design — Ambiente de simulação local

Objetivo: rodar e testar o app **sem depender de contas AWS/Google**, simulando
a nuvem localmente com Docker. Tudo que exige credenciais suas fica para a fase
de testes reais.

---

## 1. O que dá e o que não dá para simular

| Recurso na nuvem | Equivalente local | Como |
|------------------|-------------------|------|
| Banco (DynamoDB) | **DynamoDB Local** (imagem oficial AWS) | Docker, porta 8001 |
| Ver dados | **DynamoDB Admin** (UI web) | Docker, porta 8002 |
| Sincronização | **Adapter local** (SDK DynamoDB v3) | fala com o DynamoDB Local |
| Login (Cognito) | **Auth simulada (modo dev)** | provider fake, sem servidor |
| GraphQL (AppSync) | — (sem equivalente fiel) | contornado pelo adapter direto no DynamoDB |

**Limitação honesta:** Cognito e AppSync não têm um substituto local fiel e
simples. Por isso, no modo simulação:
- a **persistência e a sincronização** são reais contra o DynamoDB Local;
- o **login** é simulado (usuário fake, incluindo o admin mestre) só para
  exercitar os fluxos de tela, papéis e a lista restrita.

O código de produção (Amplify/Cognito/AppSync) permanece intacto e é selecionado
por variáveis de ambiente.

---

## 2. Arquitetura: adapter de nuvem

Introduzimos uma interface única de "nuvem" com implementações intercambiáveis.

```
                 ┌──────────────────────┐
   sync.ts  ───▶ │   CloudAdapter (if)  │
                 └──────────┬───────────┘
                            │
        ┌───────────────────┼─────────────────────┐
        ▼                   ▼                     ▼
  AmplifyAdapter      DynamoLocalAdapter      (nenhum: modo off)
  (produção, real)    (simulação, Docker)     app 100% offline
```

`CloudAdapter` expõe operações simples por entidade:
- `listar(entidade)` → todos os registros
- `salvar(entidade, item)` → upsert (create/update)
- `criar(entidade, item)` → insert (para itens imutáveis, ex.: Pagamento)

A camada `sync.ts` passa a depender só dessa interface. O push/pull e a resolução
por `atualizadoEm` (last-write-wins) ficam iguais nos dois modos.

---

## 3. Auth simulada (modo dev)

Uma implementação de `AuthProvider` que não usa Cognito:
- Começa "deslogado".
- "Entrar" faz login como um usuário configurável (por padrão, o admin mestre
  `higovale@gmail.com`, para exercitar a tela de administração).
- Permite alternar entre um operador e o admin para testar papéis.
- A verificação da **lista restrita** continua real (consulta o adapter/tabela
  `UsuarioAutorizado`), então o fluxo de autorização é testado de verdade.

---

## 4. Seleção de ambiente (variáveis)

Arquivo `.env.local` (não versionado). Duas chaves controlam tudo:

| Variável | Valores | Efeito |
|----------|---------|--------|
| `VITE_CLOUD_MODE` | `off` (padrão) \| `local` \| `amplify` | qual adapter de nuvem usar |
| `VITE_AUTH_MODE` | `off` (padrão) \| `dev` \| `cognito` | qual provedor de auth usar |

- **Offline puro (Fase 1):** ambos `off` — nada muda, sem nuvem/login.
- **Simulação (esta fase):** `VITE_CLOUD_MODE=local`, `VITE_AUTH_MODE=dev`.
- **Produção real:** `VITE_CLOUD_MODE=amplify`, `VITE_AUTH_MODE=cognito`
  (requer `amplify_outputs.json` + credenciais — ver AWS_SETUP.md).

Combinações inválidas degradam com segurança para o modo offline.

---

## 5. Docker

`docker-compose.yml` sobe dois serviços (portas escolhidas para não conflitar
com containers já existentes na máquina):

- **dynamodb-local** → porta host **8001**
- **dynamodb-admin** → porta host **8002** (UI em http://localhost:8002)

Persistência em volume para os dados não sumirem entre reinícios.

Scripts (Node, SDK v3):
- `scripts/criar-tabelas.mjs` — cria as tabelas no DynamoDB Local.
- `scripts/seed.mjs` — popula dados de exemplo (opcional).

---

## 6. Testes

**Vitest** para:
- Regras de negócio puras: geração de parcelas/recorrência, último dia do mês,
  rateio de centavos, "vencida", ordenação da lista, busca fuzzy.
- Adapter local + sync: subir dados, `listar/salvar/criar`, e um ciclo
  push→pull validando last-write-wins. (Este grupo exige o Docker no ar; é
  marcado para rodar só quando o DynamoDB Local está acessível.)

---

## 7. O que continua pendente para os testes reais

- Deploy do Amplify (Cognito/AppSync/DynamoDB na sua conta) — `AWS_SETUP.md`.
- Credenciais do Google OAuth.
- Teste ponta a ponta do login real e do sync contra a nuvem AWS.
