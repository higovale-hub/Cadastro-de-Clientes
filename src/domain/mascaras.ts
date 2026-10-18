import { apenasDigitos } from './text'

// Máscaras de entrada para telefone e documento (padrões brasileiros).
// As funções são "progressivas": formatam conforme o usuário digita,
// aceitando entradas parciais sem travar a digitação.

// ---------- Telefone ----------

// Formata telefone brasileiro:
// - até 10 dígitos  -> (11) 3000-0000  (fixo)
// - 11 dígitos      -> (11) 90000-0000 (celular)
// Limita a 11 dígitos.
export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    // fixo: (XX) XXXX-XXXX
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  // celular: (XX) XXXXX-XXXX
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ---------- Documento (CPF / CNPJ) ----------

export type TipoDocumento = 'cpf' | 'cnpj' | 'indefinido'

// Detecta o tipo pelo número de dígitos:
// - até 11 dígitos  -> tende a CPF
// - 12 a 14 dígitos -> tende a CNPJ
// - vazio           -> indefinido
export function detectarTipoDocumento(valor: string): TipoDocumento {
  const d = apenasDigitos(valor)
  if (d.length === 0) return 'indefinido'
  if (d.length <= 11) return 'cpf'
  return 'cnpj'
}

function mascararCPF(d: string): string {
  // 000.000.000-00
  const p = d.slice(0, 11)
  if (p.length <= 3) return p
  if (p.length <= 6) return `${p.slice(0, 3)}.${p.slice(3)}`
  if (p.length <= 9) return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6)}`
  return `${p.slice(0, 3)}.${p.slice(3, 6)}.${p.slice(6, 9)}-${p.slice(9)}`
}

function mascararCNPJ(d: string): string {
  // 00.000.000/0000-00
  const p = d.slice(0, 14)
  if (p.length <= 2) return p
  if (p.length <= 5) return `${p.slice(0, 2)}.${p.slice(2)}`
  if (p.length <= 8) return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5)}`
  if (p.length <= 12) return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5, 8)}/${p.slice(8)}`
  return `${p.slice(0, 2)}.${p.slice(2, 5)}.${p.slice(5, 8)}/${p.slice(8, 12)}-${p.slice(12)}`
}

// Formata o documento no padrão do tipo detectado (CPF ou CNPJ).
// Limita a 14 dígitos (tamanho do CNPJ).
export function mascararDocumento(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14)
  if (d.length === 0) return ''
  return detectarTipoDocumento(d) === 'cnpj' ? mascararCNPJ(d) : mascararCPF(d)
}

// Rótulo amigável do tipo detectado (para exibir ao lado do campo).
export function rotuloTipoDocumento(valor: string): string {
  const tipo = detectarTipoDocumento(valor)
  if (tipo === 'cpf') return 'CPF'
  if (tipo === 'cnpj') return 'CNPJ'
  return ''
}
