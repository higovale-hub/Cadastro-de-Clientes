import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'

// Ponto de entrada do backend Amplify Gen 2.
// Rode `npx ampx sandbox` (dev) ou faça deploy via CI para provisionar
// Cognito (auth) e AppSync + DynamoDB (data). Veja AWS_SETUP.md.
defineBackend({
  auth,
  data,
})
