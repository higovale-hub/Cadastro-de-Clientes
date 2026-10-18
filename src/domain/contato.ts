import { apenasDigitos } from './text'

// Monta links de contato (ligação, WhatsApp, SMS) a partir do telefone
// cadastrado, assumindo Brasil (+55).

// Normaliza o telefone para o formato internacional brasileiro (E.164 sem
// o '+'), ex.: "55" + DDD + número. Aceita entradas com máscara.
// - Se já começar com 55 e tiver 12-13 dígitos, mantém.
// - Caso contrário, prefixa 55.
export function normalizarParaE164BR(telefone: string): string {
  let d = apenasDigitos(telefone)
  // Já tem código do país (55) + DDD + número (10 ou 11 dígitos)?
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    return d
  }
  // DDD + número (10 fixo ou 11 celular) sem país -> prefixa 55.
  if (d.length === 10 || d.length === 11) {
    return `55${d}`
  }
  // Fallback: remove zeros à esquerda e prefixa 55 se não tiver.
  if (!d.startsWith('55')) d = `55${d}`
  return d
}

// tel: usa o formato com '+' (E.164 completo).
export function linkTelefone(telefone: string): string {
  return `tel:+${normalizarParaE164BR(telefone)}`
}

// WhatsApp: wa.me espera só dígitos com código do país.
export function linkWhatsapp(telefone: string): string {
  return `https://wa.me/${normalizarParaE164BR(telefone)}`
}

// SMS: formato com '+'.
export function linkSms(telefone: string): string {
  return `sms:+${normalizarParaE164BR(telefone)}`
}
