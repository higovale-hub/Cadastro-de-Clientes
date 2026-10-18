import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

// Cliente tipado do Amplify Data. Só deve ser usado depois de
// configurarAmplify() ter retornado true (ou seja, com amplify_outputs.json
// presente). A camada de sync verifica isso antes de chamar.
let cliente: ReturnType<typeof generateClient<Schema>> | null = null

export function getDataClient() {
  if (!cliente) {
    cliente = generateClient<Schema>()
  }
  return cliente
}
