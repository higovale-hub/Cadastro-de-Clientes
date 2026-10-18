import { Amplify } from 'aws-amplify'

// Bootstrap condicional do Amplify.
//
// O arquivo `amplify_outputs.json` é gerado na raiz do projeto após rodar
// `npx ampx sandbox` (ou o deploy de produção). Enquanto ele não existe, o
// app continua funcionando 100% offline (Fase 1) — apenas sem nuvem/login.
//
// Usamos import dinâmico com `@vite-ignore` + try/catch para que a ausência
// do arquivo não quebre o build nem a execução.

let configurado = false

export function amplifyConfigurado(): boolean {
  return configurado
}

// import.meta.glob resolve o conjunto de arquivos em tempo de build sem
// exigir que eles existam: se `amplify_outputs.json` não estiver presente,
// o mapa simplesmente vem vazio e o app roda offline.
const outputsGlob = import.meta.glob('../../amplify_outputs.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>

export async function configurarAmplify(): Promise<boolean> {
  if (configurado) return true
  const chave = Object.keys(outputsGlob)[0]
  if (!chave) {
    configurado = false
    return false
  }
  try {
    Amplify.configure(outputsGlob[chave] as Record<string, unknown>)
    configurado = true
    return true
  } catch {
    configurado = false
    return false
  }
}
