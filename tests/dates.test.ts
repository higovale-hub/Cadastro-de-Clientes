import { describe, it, expect } from 'vitest'
import {
  dateForDayOfMonth,
  addMonths,
  daysInMonth,
  formatBR,
} from '../src/domain/dates'

describe('dates', () => {
  it('daysInMonth cobre meses e ano bissexto', () => {
    expect(daysInMonth(2025, 1)).toBe(31)
    expect(daysInMonth(2025, 2)).toBe(28) // não bissexto
    expect(daysInMonth(2024, 2)).toBe(29) // bissexto
    expect(daysInMonth(2025, 4)).toBe(30)
  })

  it('dateForDayOfMonth usa o último dia quando o dia não existe', () => {
    // Dia 31 em fevereiro (não bissexto) -> 28
    expect(dateForDayOfMonth(2025, 2, 31)).toBe('2025-02-28')
    // Dia 31 em fevereiro (bissexto) -> 29
    expect(dateForDayOfMonth(2024, 2, 31)).toBe('2024-02-29')
    // Dia 31 em abril (30 dias) -> 30
    expect(dateForDayOfMonth(2025, 4, 31)).toBe('2025-04-30')
    // Dia válido é mantido
    expect(dateForDayOfMonth(2025, 3, 8)).toBe('2025-03-08')
  })

  it('addMonths vira o ano corretamente', () => {
    expect(addMonths(2025, 1, 1)).toEqual({ year: 2025, month1: 2 })
    expect(addMonths(2025, 12, 1)).toEqual({ year: 2026, month1: 1 })
    expect(addMonths(2025, 11, 3)).toEqual({ year: 2026, month1: 2 })
  })

  it('formatBR formata dd/mm/aaaa', () => {
    expect(formatBR('2025-01-08')).toBe('08/01/2025')
  })
})
