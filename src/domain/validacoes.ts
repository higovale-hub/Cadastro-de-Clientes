import { apenasDigitos } from './text'
import { detectarTipoDocumento } from './mascaras'

// Validações de domínio (CPF/CNPJ com dígito verificador e e-mail).

// ---------- CPF ----------

// Valida o CPF pelo algoritmo oficial dos dígitos verificadores.
export function validarCPF(valor: string): boolean {
  const d = apenasDigitos(valor)
  if (d.length !== 11) return false
  // Rejeita sequências repetidas (ex.: 00000000000, 11111111111).
  if (/^(\d)\1{10}$/.test(d)) return false

  const calcDigito = (base: string, pesoInicial: number): number => {
    let soma = 0
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i)
    }
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  const dig1 = calcDigito(d.slice(0, 9), 10)
  if (dig1 !== Number(d[9])) return false
  const dig2 = calcDigito(d.slice(0, 10), 11)
  if (dig2 !== Number(d[10])) return false
  return true
}

// ---------- CNPJ ----------

// Valida o CNPJ pelo algoritmo oficial dos dígitos verificadores.
export function validarCNPJ(valor: string): boolean {
  const d = apenasDigitos(valor)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const calcDigito = (base: string): number => {
    // Pesos cíclicos de 2..9 aplicados da direita para a esquerda.
    let soma = 0
    let peso = 2
    for (let i = base.length - 1; i >= 0; i--) {
      soma += Number(base[i]) * peso
      peso = peso === 9 ? 2 : peso + 1
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  const dig1 = calcDigito(d.slice(0, 12))
  if (dig1 !== Number(d[12])) return false
  const dig2 = calcDigito(d.slice(0, 13))
  if (dig2 !== Number(d[13])) return false
  return true
}

// Valida o documento conforme o tipo detectado (CPF ou CNPJ).
export function validarDocumento(valor: string): boolean {
  const tipo = detectarTipoDocumento(valor)
  if (tipo === 'cnpj') return validarCNPJ(valor)
  return validarCPF(valor)
}

// ---------- E-mail ----------

// Regra do e-mail (conforme definido):
// - parte local (antes do @): 1 a 55 caracteres, sem espaços nem caracteres
//   especiais além de ponto, hífen e underscore ([A-Za-z0-9._-]);
// - provedor: qualquer nome válido (letras/números/hífen), sem lista fixa;
// - domínio de topo (TLD): domínios comuns (.com, .com.br, .org, .net,
//   .gov.br, .edu.br, .org.br, .net.br, .io, .app etc.).
// E-mail não pode conter espaços em nenhuma parte.

// Parte local (antes do @): 1-55 caracteres do conjunto [A-Za-z0-9._-],
// sem começar/terminar com separador e sem separadores consecutivos.
const LOCAL = /^(?!.*[._-]{2})[A-Za-z0-9](?:[A-Za-z0-9._-]{0,53}[A-Za-z0-9])?$/

// Rótulo de domínio: letras/números/hífen, sem começar/terminar com hífen.
const ROTULO = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?'

// TLDs comuns aceitos (incluindo os brasileiros compostos).
const TLDS_COMUNS = [
  'com.br',
  'org.br',
  'net.br',
  'gov.br',
  'edu.br',
  'com',
  'org',
  'net',
  'gov',
  'edu',
  'io',
  'app',
  'dev',
  'co',
  'info',
  'biz',
]

const TLD_ALT = TLDS_COMUNS.join('|').replace(/\./g, '\\.')

// Domínio: um ou mais rótulos (provedor + subdomínios) terminando num TLD comum.
const DOMINIO = new RegExp(`^(?:${ROTULO}\\.)+(?:${TLD_ALT})$`)

export function validarEmail(valor: string): boolean {
  const email = valor.trim()
  if (email.length === 0) return false
  if (/\s/.test(email)) return false // sem espaços em nenhuma parte

  const partes = email.split('@')
  if (partes.length !== 2) return false
  const [local, dominio] = partes

  if (local.length < 1 || local.length > 55) return false
  if (!LOCAL.test(local)) return false
  if (!DOMINIO.test(dominio)) return false

  return true
}
