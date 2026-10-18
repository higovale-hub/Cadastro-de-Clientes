import { describe, it, expect } from 'vitest'
import {
  normalizarParaE164BR,
  linkTelefone,
  linkWhatsapp,
  linkSms,
} from '../src/domain/contato'

describe('normalizarParaE164BR', () => {
  it('prefixa 55 em celular (11 dígitos)', () => {
    expect(normalizarParaE164BR('11990000000')).toBe('5511990000000')
  })

  it('prefixa 55 em fixo (10 dígitos)', () => {
    expect(normalizarParaE164BR('1130000000')).toBe('551130000000')
  })

  it('mantém quando já tem 55 + DDD + número', () => {
    expect(normalizarParaE164BR('5511990000000')).toBe('5511990000000')
  })

  it('ignora máscara (parênteses, espaços, traço)', () => {
    expect(normalizarParaE164BR('(11) 99000-0000')).toBe('5511990000000')
  })
})

describe('links de contato', () => {
  it('linkTelefone', () => {
    expect(linkTelefone('(11) 99000-0000')).toBe('tel:+5511990000000')
  })
  it('linkWhatsapp', () => {
    expect(linkWhatsapp('(11) 99000-0000')).toBe('https://wa.me/5511990000000')
  })
  it('linkSms', () => {
    expect(linkSms('(11) 99000-0000')).toBe('sms:+5511990000000')
  })
})
