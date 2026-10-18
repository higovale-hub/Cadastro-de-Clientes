import { describe, it, expect } from 'vitest'
import {
  validarCPF,
  validarCNPJ,
  validarDocumento,
  validarEmail,
} from '../src/domain/validacoes'

describe('validarCPF', () => {
  it('aceita CPFs válidos (com e sem máscara)', () => {
    expect(validarCPF('529.982.247-25')).toBe(true)
    expect(validarCPF('52998224725')).toBe(true)
    expect(validarCPF('111.444.777-35')).toBe(true)
  })

  it('rejeita dígito verificador errado', () => {
    expect(validarCPF('529.982.247-24')).toBe(false)
    expect(validarCPF('12345678900')).toBe(false)
  })

  it('rejeita sequências repetidas e tamanho errado', () => {
    expect(validarCPF('00000000000')).toBe(false)
    expect(validarCPF('11111111111')).toBe(false)
    expect(validarCPF('123')).toBe(false)
  })
})

describe('validarCNPJ', () => {
  it('aceita CNPJs válidos (com e sem máscara)', () => {
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true)
    expect(validarCNPJ('11222333000181')).toBe(true)
  })

  it('rejeita dígito verificador errado e repetidos', () => {
    expect(validarCNPJ('11.222.333/0001-80')).toBe(false)
    expect(validarCNPJ('00000000000000')).toBe(false)
    expect(validarCNPJ('1122233300018')).toBe(false) // 13 dígitos
  })
})

describe('validarDocumento (detecta tipo)', () => {
  it('valida CPF quando tem até 11 dígitos', () => {
    expect(validarDocumento('529.982.247-25')).toBe(true)
    expect(validarDocumento('529.982.247-24')).toBe(false)
  })
  it('valida CNPJ quando tem 12-14 dígitos', () => {
    expect(validarDocumento('11.222.333/0001-81')).toBe(true)
    expect(validarDocumento('11.222.333/0001-80')).toBe(false)
  })
})

describe('validarEmail', () => {
  it('aceita e-mails com domínios comuns', () => {
    expect(validarEmail('maria@gmail.com')).toBe(true)
    expect(validarEmail('joao.silva@empresa.com.br')).toBe(true)
    expect(validarEmail('contato@ong.org')).toBe(true)
    expect(validarEmail('user_name-1@provedor.net')).toBe(true)
    expect(validarEmail('setor@orgao.gov.br')).toBe(true)
  })

  it('rejeita espaços em qualquer parte', () => {
    expect(validarEmail('maria @gmail.com')).toBe(false)
    expect(validarEmail('maria@ gmail.com')).toBe(false)
    expect(validarEmail('ma ria@gmail.com')).toBe(false)
  })

  it('rejeita parte local vazia ou maior que 55', () => {
    expect(validarEmail('@gmail.com')).toBe(false)
    const local56 = 'a'.repeat(56)
    expect(validarEmail(`${local56}@gmail.com`)).toBe(false)
    const local55 = 'a'.repeat(55)
    expect(validarEmail(`${local55}@gmail.com`)).toBe(true)
  })

  it('rejeita caracteres especiais fora do permitido na parte local', () => {
    expect(validarEmail('maria+promo@gmail.com')).toBe(false)
    expect(validarEmail('maria#@gmail.com')).toBe(false)
  })

  it('rejeita falta de provedor ou de TLD', () => {
    expect(validarEmail('maria@')).toBe(false)
    expect(validarEmail('maria@gmail')).toBe(false)
    expect(validarEmail('maria@.com')).toBe(false)
  })

  it('rejeita TLD não comum', () => {
    expect(validarEmail('maria@site.xyz')).toBe(false)
  })

  it('rejeita múltiplos @', () => {
    expect(validarEmail('maria@@gmail.com')).toBe(false)
    expect(validarEmail('maria@a@gmail.com')).toBe(false)
  })
})
