import { defineAuth, secret } from '@aws-amplify/backend'

// Autenticação via Amazon Cognito com login pelo Google.
//
// Os valores GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são segredos do
// Amplify (não ficam no código). Configure-os antes do deploy com:
//   npx ampx sandbox secret set GOOGLE_CLIENT_ID
//   npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
// (e o equivalente no pipeline de produção). Veja AWS_SETUP.md.
//
// O grupo "admin" é usado para autorização: o usuário mestre
// (higovale@gmail.com) deve ser adicionado a este grupo no Cognito.
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
        },
      },
      // URLs para onde o Cognito redireciona após o login/logout.
      // Ajuste conforme o domínio de produção (veja AWS_SETUP.md).
      callbackUrls: ['http://localhost:5173/', 'http://localhost:4173/'],
      logoutUrls: ['http://localhost:5173/', 'http://localhost:4173/'],
    },
  },
  groups: ['admin'],
})
