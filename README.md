# Controle de Clientes (PWA)

Aplicativo offline-first para cadastro e controle de clientes e dívidas.
**Fase 1** concluída: funciona 100% offline no dispositivo (dados no navegador via IndexedDB). A sincronização com a AWS entra na Fase 2.

## Como rodar

Pré-requisitos: Node.js 18+.

```bash
npm install       # instala dependências (só na primeira vez)
npm run dev       # ambiente de desenvolvimento em http://localhost:5173
```

Para gerar a versão de produção (com Service Worker / PWA):

```bash
npm run build     # gera a pasta dist/
npm run preview   # serve o build localmente para teste
```

> Dica: rode `npm run dev` no seu terminal. No navegador, o app pode ser
> "instalado" como aplicativo (ícone na tela inicial do celular ou desktop).

## O que já funciona (Fase 1)

- **Tela inicial** com as três opções: cadastrar, buscar e ver lista.
- **Cadastro de cliente** (nome e telefone obrigatórios; documento, e-mail e endereço opcionais).
- **Vincular dívida** com valor total, número de parcelas, dia de vencimento e data do primeiro pagamento, com **prévia das parcelas** em tempo real.
- **Recorrência**: parcelas mensais no dia escolhido; se o dia não existe no mês, usa o último dia do mês.
- **Busca** por nome (fuzzy, até 10 resultados) ou documento.
- **Lista de clientes** ordenada: vencidas primeiro, depois a vencer, mostrando o valor em aberto e um selo de vencida.
- **Página do cliente**: dados cadastrais, dívidas e parcelas, cadastrar nova dívida e **dar baixa por parcela ou na dívida inteira**.
- **Offline**: tudo funciona sem internet; os dados ficam no dispositivo.

## Estrutura

```
src/
  db/          Banco local (Dexie/IndexedDB), tipos e repositório
  domain/      Regras de negócio (datas, dinheiro, parcelas, busca)
  components/  Header, StatusConexao, Toast
  pages/       Telas (Inicio, NovoCliente, NovaDivida, BuscarCliente,
               ListaClientes, PaginaCliente)
```

## Fase 2 — Nuvem AWS (código pronto)

O código da integração com a AWS já está implementado:
- **Login com Google** (Amazon Cognito) com lista **restrita** de e-mails autorizados.
- **Administração de usuários** (só admin `higovale@gmail.com`): autorizar/remover acessos e definir papel (operador/admin).
- **Sincronização** offline↔nuvem (AppSync + DynamoDB) com indicador de status e resolução por última escrita.

Para ativar, você precisa provisionar os recursos na sua conta AWS e criar as
credenciais do Google. O passo a passo está em **`AWS_SETUP.md`**.

> Sem essa configuração, o app segue funcionando offline (Fase 1) normalmente.

## Simulação da nuvem (Docker) — testar sem conta AWS

Dá para rodar e testar a nuvem **localmente**, sem AWS nem Google, usando
DynamoDB Local via Docker. Detalhes em `DESIGN_SIMULACAO.md`.

Pré-requisito: Docker Desktop em execução.

```bash
npm run sim:up        # sobe DynamoDB Local (8001) + Admin UI (8002)
npm run sim:tabelas   # cria as tabelas
npm run sim:seed      # (opcional) popula dados de exemplo
npm run dev           # abre o app já em modo simulação
```

- Inspecione os dados na UI: http://localhost:8002
- Para o app usar a simulação, o `.env.local` traz `VITE_CLOUD_MODE=local` e
  `VITE_AUTH_MODE=dev` (login simulado, com atalhos "Entrar como admin/operador").
- Encerrar: `npm run sim:down`. Reiniciar limpo: `npm run sim:reset`
  (o DynamoDB Local roda em memória; rode `sim:tabelas`/`sim:seed` de novo).

### Testes

```bash
npm test        # regras de negócio + integração com o DynamoDB Local
```

Os testes de integração se auto-pulam se o Docker não estiver no ar.

## Modos de operação (resumo)

| Cenário | VITE_CLOUD_MODE | VITE_AUTH_MODE |
|---------|-----------------|----------------|
| Offline puro (Fase 1) | `off` | `off` |
| Simulação local (Docker) | `local` | `dev` |
| Produção real (AWS) | `amplify` | `cognito` |

## Próxima fase

Ver `PLANO.md`:
- **Testes reais**: deploy AWS (Cognito/AppSync/DynamoDB) + Google OAuth e
  validação ponta a ponta. Depois, correções.
- **Fase 3**: refino (edição de cadastro, relatórios).
