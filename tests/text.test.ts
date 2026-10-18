import { describe, it, expect } from 'vitest'
import { normalizarTexto, apenasDigitos, pontuarNome } from '../src/domain/text'

describe('text', () => {
  it('normalizarTexto remove acentos e caixa', () => {
    expect(normalizarTexto('José da Silva')).toBe('jose da silva')
    expect(normalizarTexto('  MARÍA   ')).toBe('maria')
  })

  it('apenasDigitos', () => {
    expect(apenasDigitos('123.456.789-00')).toBe('12345678900')
    expect(apenasDigitos('(11) 90000-0000')).toBe('11900000000')
  })

  it('pontuarNome: substring exata pontua alto', () => {
    const s = pontuarNome('maria', 'maria silva')
    expect(s).toBeGreaterThan(0.85)
  })

  it('pontuarNome: tolera erro de digitação', () => {
    // "maira" vs "maria" (troca de letras) ainda pontua razoável
    const s = pontuarNome('maira', 'maria silva')
    expect(s).toBeGreaterThan(0.5)
  })

  it('pontuarNome: nome sem relação pontua baixo', () => {
    const s = pontuarNome('joao', 'maria silva')
    expect(s).toBeLessThan(0.34)
  })
})
