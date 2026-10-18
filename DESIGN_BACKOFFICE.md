# Design — Backoffice multi-empresa + créditos pré-pagos

Feature de fundo: o app passa a ser **multi-tenant** (várias empresas isoladas),
com **créditos pré-pagos** e um **backoffice** de super-admin. Desenvolvido e
testado na **simulação local (DynamoDB/Docker)**, pronto para a AWS depois.

---

## 1. Papéis e hierarquia

```
Super-admin (você: higovale@gmail.com)
  • acesso ao /backoffice
  • vê todas as empresas, usuários, nº de clientes e saldo
  • recarrega créditos; extrai relatório por período

Empresa (tenant) — tem saldo de créditos (sem validade)
  ├── Usuários (1+) — cada empresa gerencia os seus (login Google)
  │     • papéis dentro da empresa: admin_empresa | operador
  └── Clientes + Dívidas + Parcelas + Pagamentos (isolados por empresa)
```

- Um **usuário pertence a uma empresa** (campo `empresaId` no usuário).
- O super-admin é identificado pelo e-mail mestre e **não** pertence a nenhuma
  empresa (ele opera o backoffice).

---

## 2. Modelo de dados (novas entidades + mudança nas existentes)

### Novas

**Empresa**
| campo | tipo | observação |
|---|---|---|
| id | UUID | |
| nome | texto | razão social / nome |
| documento | texto | CPF ou CNPJ do responsável |
| saldoCreditos | inteiro | saldo atual (unidades) |
| criadoEm / atualizadoEm | ISO | |

**Recarga** (histórico de créditos adicionados)
| campo | tipo | observação |
|---|---|---|
| id | UUID | |
| empresaId | UUID | |
| creditos | inteiro | quantidade adicionada |
| valorReais | número | valor pago (referência) |
| criadoEm | ISO | data da recarga |
| origem | texto | "cadastro" / "backoffice" / etc. |

**ConsumoCredito** (histórico de débitos — base do relatório)
| campo | tipo | observação |
|---|---|---|
| id | UUID | |
| empresaId | UUID | |
| creditos | inteiro | normalmente 1 |
| motivo | texto | "cliente_cadastrado" |
| referenciaId | UUID | id do cliente que gerou o consumo |
| criadoEm | ISO | data do consumo (usado no filtro por período) |

**UsuarioAutorizado** (ajuste do existente)
- passa a ter `empresaId` e `papel` (`admin_empresa` | `operador`).

### Alteração nas entidades existentes
`Cliente`, `Divida`, `Parcela`, `Pagamento` ganham **`empresaId`** (obrigatório).
Todas as leituras passam a filtrar por `empresaId` do usuário logado.

> Isolamento: no modo nuvem real (AWS), isso será reforçado por regras de
> autorização. Na simulação local, o filtro é aplicado na camada de dados.

---

## 3. Regras de crédito

- **Consumo:** cadastrar 1 cliente debita **1 crédito** e registra um
  `ConsumoCredito`. Dívidas/parcelas são **gratuitas**.
- **Sem reembolso:** excluir cliente **não** devolve crédito.
- **Saldo zerado bloqueia** o cadastro de novos clientes, com aviso para
  recarregar. (Clientes já cadastrados continuam utilizáveis.)
- **Crédito sem validade.**
- **Preço de referência:** R$ 1,00 por crédito (usado só para exibir valor
  equivalente em relatórios; configurável).

---

## 4. Cadastro de empresa (auto-serviço)

Fluxo público de criação de conta:
1. Pessoa informa: nome da empresa, documento (CPF/CNPJ), e-mail do 1º usuário.
2. Escolhe um **pacote de créditos** (recarga inicial):

| Pacote | Créditos | Preço | R$/crédito |
|---|---|---|---|
| Inicial | 50 | R$ 49,90 | 1,00 |
| Padrão | 200 | R$ 169,00 | 0,85 |
| Pro | 500 | R$ 349,00 | 0,70 |
| Empresarial | 1.000 | R$ 599,00 | 0,60 |

3. Cria a empresa, o primeiro usuário (admin_empresa) e registra a recarga
   inicial. (Pagamento é externo; na simulação a recarga é registrada direto.)

Depois, o admin_empresa gerencia os demais usuários da empresa.

---

## 5. Backoffice (super-admin)

Rota `/backoffice`, acessível só pelo e-mail mestre.

- **Lista de empresas:** nome, documento, nº de usuários, nº de clientes
  cadastrados, saldo de créditos.
- **Detalhe da empresa:** usuários, histórico de recargas e consumos,
  botão para **recarregar créditos**.
- **Relatório por período (início → fim):**
  - por empresa: créditos **consumidos no período**, saldo **atual**, valor
    equivalente em R$ (consumo × preço de referência).
  - total geral.
  - **exportação em CSV**.

---

## 6. Impacto na arquitetura atual

- O `CloudAdapter` ganha operações para Empresa/Recarga/ConsumoCredito e passa
  a filtrar clientes/dívidas por `empresaId`.
- A autenticação passa a resolver **qual empresa** o usuário pertence e se ele
  é super-admin.
- O Dexie local ganha `empresaId` nas tabelas e as novas tabelas; a camada de
  sync e o repositório passam a considerar a empresa ativa.
- Scripts de simulação (criar-tabelas/seed) ganham as novas tabelas e dados de
  exemplo (1 super-admin, 2 empresas com usuários e saldos distintos).

---

## 7. Fora de escopo (por enquanto)

- Gateway de pagamento real (a compra é registrada como recarga).
- Cobrança recorrente / mensalidade (modelo é pré-pago por crédito).
- Reembolso de créditos.

---

## 8. Status da implementação (simulação local)

Implementado e verificado na simulação local (DynamoDB/Docker):
- Modelo multi-tenant (empresaId em clientes/dívidas/parcelas/pagamentos) + tabelas
  Empresa, Recarga, ConsumoCredito, UsuarioAutorizado.
- Crédito: 1 por cliente cadastrado, débito no cadastro, bloqueio quando saldo 0,
  consumo registrado (base do relatório).
- Cadastro auto-serviço de empresa (`/criar-conta`) com pacote de créditos.
- Cada empresa gerencia seus usuários (`/empresa/usuarios`, só admin_empresa).
- Backoffice (`/backoffice`, só super-admin `higovale@gmail.com`): lista de
  empresas com usuários/clientes/saldo + recarga de créditos.
- Relatório por período (`/backoffice/relatorio`): consumo no período + saldo
  atual + valor em R$, com exportação CSV.

### Como testar (modo simulação)
1. `npm run sim:up` (Docker), `npm run sim:tabelas`, `npm run sim:seed`.
2. `npm run dev` e abra o app.
3. Na tela de login (modo dev) use os atalhos:
   - **Super-admin (backoffice)** → `higovale@gmail.com`
   - **Admin da empresa** → `admin.empresa@gmail.com` (Loja do João, saldo 50)
   - **Operador** → `operador.exemplo@gmail.com`
4. Ou crie uma empresa nova em **Criar conta da empresa**.

> Observação: no modo offline puro (`VITE_AUTH_MODE=off`), não há empresa ativa,
> então o cadastro de cliente (que debita crédito) não se aplica. O fluxo
> multi-empresa roda nos modos simulação (dev+local) e produção (cognito+amplify).
