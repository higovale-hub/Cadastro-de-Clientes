import { describe, it, expect } from 'vitest'
import {
  mascararTelefone,
  mascararDocumento,
  detectarTipoDocumento,
  rotuloTipoDocumento,
} from '../src/domain/mascaras'

describe('mascararTelefone', () => {
  it('formata celular (11 dígitos)', () => {
    expect(mascararTelefone('11990000000')).toBe('(11) 99000-0000')
  })

  it('formata fixo (10 dígitos)', () => {
    expect(mascararTelefone('1130000000')).toBe('(11) 3000-0000')
  })

  it('formata progressivamente e ignora não-dígitos', () => {
    expect(mascararTelefone('11')).toBe('(11')
    expect(mascararTelefone('119')).toBe('(11) 9')
    expect(mascararTelefone('abc11def9900')).toBe('(11) 9900')
  })

  it('limita a 11 dígitos', () => {
    expect(mascararTelefone('11990000000999')).toBe('(11) 99000-0000')
  })
})

describe('detectarTipoDocumento', () => {
  it('CPF até 11 dígitos, CNPJ acima', () => {
    expect(detectarTipoDocumento('')).toBe('indefinido')
    expect(detectarTipoDocumento('123')).toBe('cpf')
    expect(detectarTipoDocumento('12345678900')).toBe('cpf') // 11
    expect(detectarTipoDocumento('123456789012')).toBe('cnpj') // 12
    expect(detectarTipoDocumento('12345678000199')).toBe('cnpj') // 14
  })
})

describe('mascararDocumento', () => {
  it('formata CPF', () => {
    expect(mascararDocumento('12345678900')).toBe('123.456.789-00')
    expect(mascararDocumento('123456')).toBe('123.456')
  })

  it('formata CNPJ', () => {
    expect(mascararDocumento('12345678000199')).toBe('12.345.678/0001-99')
  })

  it('ignora não-dígitos e limita a 14', () => {
    expect(mascararDocumento('12.345.678/0001-99extra')).toBe('12.345.678/0001-99')
  })
})

describe('rotuloTipoDocumento', () => {
  it('retorna rótulo amigável', () => {
    expect(rotuloTipoDocumento('')).toBe('')
    expect(rotuloTipoDocumento('12345678900')).toBe('CPF')
    expect(rotuloTipoDocumento('12345678000199')).toBe('CNPJ')
  })
})
