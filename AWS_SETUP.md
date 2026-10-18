# Guia de configuração da AWS (Fase 2)

Este guia liga o app à nuvem: **login com Google** (Amazon Cognito) e
**banco na nuvem com sincronização** (AppSync + DynamoDB), via **AWS Amplify Gen 2**.

O código já está pronto. Aqui estão só os passos que dependem das **suas contas**
(AWS e Google) e que não podem ser automatizados por serem ações no console.

> Enquanto você não fizer esta configuração, o app **continua funcionando 100%
> offline** (Fase 1): sem login e sem nuvem. A integração é opcional até você
> gerar o arquivo `amplify_outputs.json`.

---

## Pré-requisitos

1. **Conta AWS** ativa.
2. **AWS CLI** configurada na máquina com credenciais (`aws configure`) ou perfil SSO.
   - O Amplify usa essas credenciais para provisionar recursos na sua conta.
3. **Node.js 18+** (já usado no projeto).

---

## Passo 1 — Criar as credenciais do Google (OAuth)

1. Acesse o **Google Cloud Console** → crie um projeto (ou use um existente).
2. Em **APIs e Serviços → Tela de consentimento OAuth**: configure (tipo "Externo"),
   preencha nome do app e e-mail de suporte.
3. Em **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo de aplicativo: **Aplicativo da Web**.
   - Guarde o **Client ID** e o **Client Secret** (usados no Passo 3).
   - Os **URIs de redirecionamento autorizados** serão o domínio do Cognito.
     Você só terá esse valor **depois** do Passo 4 (o domínio do Cognito é criado
     pelo Amplify). Então: rode o Passo 4, copie o domínio do Cognito e volte aqui
     para adicioná-lo como URI de redirecionamento no formato:
     `https://SEU-DOMINIO.auth.REGIAO.amazoncognito.com/oauth2/idpresponse`

---

## Passo 2 — Instalar dependências (se ainda não fez)

```bash
npm install
```

---

## Passo 3 — Registrar os segredos do Google no Amplify

Os valores não ficam no código; são segredos do Amplify:

```bash
npx ampx sandbox secret set GOOGLE_CLIENT_ID
npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
```

Cole o Client ID e o Client Secret do Passo 1 quando solicitado.

---

## Passo 4 — Subir o backend (ambiente de desenvolvimento)

```bash
npm run amplify:sandbox
```

Isso provisiona Cognito + AppSync + DynamoDB na sua conta e gera o arquivo
**`amplify_outputs.json`** na raiz do projeto. É esse arquivo que "liga" o
frontend à nuvem. Deixe o comando rodando enquanto desenvolve.

Depois de subir:
- Copie o **domínio do Cognito** gerado e adicione o URI de redirecionamento no
  Google (volte ao Passo 1).
- Confirme que as `callbackUrls`/`logoutUrls` em `amplify/auth/resource.ts`
  incluem a URL onde você roda o app (por padrão já inclui `http://localhost:5173/`).

---

## Passo 5 — Tornar o admin mestre um administrador de verdade

O e-mail mestre é **higovale@gmail.com** (definido em `src/aws/constants.ts`).
Para ele poder gerenciar a lista de usuários, precisa estar no grupo **admin**
do Cognito:

1. Faça login uma vez no app com esse Gmail (para o usuário existir no Cognito).
2. No **Console AWS → Amazon Cognito → seu User Pool → Users**, selecione o
   usuário e **adicione ao grupo `admin`**.
3. Saia e entre novamente no app. Agora aparece a opção **"Administrar usuários"**.

> O admin mestre já é autorizado a entrar mesmo sem estar na lista (o código
> garante isso). O grupo `admin` do Cognito é o que dá permissão de **escrever**
> na lista de usuários autorizados.

---

## Passo 6 — Rodar o app conectado

Em um terminal, deixe o sandbox rodando (Passo 4). Em outro:

```bash
npm run dev
```

Acesse `http://localhost:5173/`. Agora o app pede **login com Google** e só entra
quem estiver autorizado (o mestre + os e-mails que o admin cadastrar na tela
"Administrar usuários").

---

## Como funciona a lista restrita

- Só entram e-mails **autorizados**. O admin mestre é sempre autorizado.
- O admin adiciona/remove usuários pela tela **Administrar usuários**, definindo
  o papel (**operador** ou **administrador**).
- Quem tentar entrar com um Gmail não autorizado vê a mensagem de acesso negado.

## Como funciona a sincronização

- O app grava tudo **localmente primeiro** (funciona offline).
- Quando há internet e login válido, ele **envia** as alterações pendentes e
  **baixa** as dos outros usuários. Conflitos são resolvidos por "última escrita
  vence" (campo `atualizadoEm`).
- O indicador no topo mostra o estado: *Sincronizado*, *N pendente(s)* ou
  *Sincronizando...*. Clique nele para sincronizar na hora.

---

## Produção (opcional, depois)

Para publicar, use o Amplify Hosting (conecte o repositório) ou rode:

```bash
npm run amplify:deploy   # ampx pipeline-deploy --branch main
```

Ajuste `callbackUrls`/`logoutUrls` em `amplify/auth/resource.ts` para incluir o
domínio de produção e registre esse domínio também no Google (Passo 1).
