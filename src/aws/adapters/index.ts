import type { CloudAdapter } from './types'
import { amplifyConfigurado } from '../config'

// Seleciona o adapter de nuvem conforme VITE_CLOUD_MODE:
// - 'off' (padrão): sem nuvem (app offline puro) -> retorna null.
// - 'local': DynamoDB Local (simulação via Docker).
// - 'amplify': Amplify Data (produção real; requer amplify_outputs.json).
//
// O adapter é criado sob demanda e memoizado.

export type CloudMode = 'off' | 'local' | 'amplify'

export function cloudMode(): CloudMode {
  const m = (import.meta.env.VITE_CLOUD_MODE as string | undefined)?.toLowerCase()
  if (m === 'local' || m === 'amplify') return m
  return 'off'
}

let instancia: CloudAdapter | null = null

export async function getCloudAdapter(): Promise<CloudAdapter | null> {
  if (instancia) return instancia
  const modo = cloudMode()

  if (modo === 'amplify') {
    if (!amplifyConfigurado()) return null
    const { AmplifyAdapter } = await import('./amplifyAdapter')
    instancia = new AmplifyAdapter()
    return instancia
  }

  if (modo === 'local') {
    const { DynamoLocalAdapter } = await import('./dynamoLocalAdapter')
    instancia = new DynamoLocalAdapter()
    return instancia
  }

  return null
}

// Indica se há alguma nuvem ativa (real ou simulada).
export function nuvemAtiva(): boolean {
  const modo = cloudMode()
  if (modo === 'amplify') return amplifyConfigurado()
  return modo === 'local'
}
