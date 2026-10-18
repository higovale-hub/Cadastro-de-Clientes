import { describe, it, expect } from 'vitest'
import {
  gerarParcelas,
  parcelaVencida,
  totalEmAberto,
  proximoVencimento,
  vencimentoMaisAtrasado,
} from '../src/domain/parcelas'
import type { Parcela } from '../src/db/types'

function parcela(p: Partial<Parcela>): Parcela {
  return {
    id: p.id ?? 'x',
    dividaId: 'd',
    clienteId: 'c',
    numero: p.numero ?? 1,
    valor: p.valor ?? 10,
    vencimento: p.vencimento ?? '2025-01-08',
    status: p.status ?? 'aberta',
    pagoEm: p.pagoEm,
    atualizadoEm: '2025-01-01T00:00:00.000Z',
    syncStatus: 'local',
  }
}

describe('gerarParcelas', () => {
  it('exemplo do usuário: R$100 em 10x todo dia 8', () => {
    const ps = gerarParcelas({
      valorTotal: 100,
      numeroParcelas: 10,
      diaVencimento: 8,
      primeiraData: '2025-01-08',
    })
    expect(ps).toHaveLength(10)
    // Soma das parcelas é exatamente o total.
    const soma = ps.reduce((a, p) => a + p.valor, 0)
    expect(soma).toBeCloseTo(100, 2)
    // Cada parcela é R$10 e vence dia 8 dos meses seguintes.
    expect(ps[0]).toMatchObject({ numero: 1, valor: 10, vencimento: '2025-01-08' })
    expect(ps[1].vencimento).toBe('2025-02-08')
    expect(ps[9].vencimento).toBe('2025-10-08')
  })

  it('rateio com resto joga a sobra na última parcela', () => {
    // R$100 em 3x = 33,33 + 33,33 + 33,34
    const ps = gerarParcelas({
      valorTotal: 100,
      numeroParcelas: 3,
      diaVencimento: 10,
      primeiraData: '2025-01-10',
    })
    expect(ps[0].valor).toBeCloseTo(33.33, 2)
    expect(ps[1].valor).toBeCloseTo(33.33, 2)
    expect(ps[2].valor).toBeCloseTo(33.34, 2)
    const soma = ps.reduce((a, p) => a + p.valor, 0)
    expect(soma).toBeCloseTo(100, 2)
  })

  it('recorrência ajusta dia inexistente para o fim do mês', () => {
    // Começa 31/01; fevereiro não tem dia 31 -> 28
    const ps = gerarParcelas({
      valorTotal: 60,
      numeroParcelas: 3,
      diaVencimento: 31,
      primeiraData: '2025-01-31',
    })
    expect(ps[0].vencimento).toBe('2025-01-31')
    expect(ps[1].vencimento).toBe('2025-02-28')
    expect(ps[2].vencimento).toBe('2025-03-31')
  })
})

describe('regras de vencimento', () => {
  const hoje = '2025-06-01'

  it('parcelaVencida: aberta e vencida antes de hoje', () => {
    expect(parcelaVencida(parcela({ vencimento: '2025-05-01', status: 'aberta' }), hoje)).toBe(true)
    expect(parcelaVencida(parcela({ vencimento: '2025-07-01', status: 'aberta' }), hoje)).toBe(false)
    expect(parcelaVencida(parcela({ vencimento: '2025-05-01', status: 'paga' }), hoje)).toBe(false)
  })

  it('totalEmAberto soma só as abertas', () => {
    const ps = [
      parcela({ valor: 10, status: 'aberta' }),
      parcela({ valor: 20, status: 'paga' }),
      parcela({ valor: 30, status: 'aberta' }),
    ]
    expect(totalEmAberto(ps)).toBeCloseTo(40, 2)
  })

  it('proximoVencimento e vencimentoMaisAtrasado', () => {
    const ps = [
      parcela({ vencimento: '2025-05-01', status: 'aberta' }),
      parcela({ vencimento: '2025-04-01', status: 'aberta' }),
      parcela({ vencimento: '2025-07-01', status: 'aberta' }),
    ]
    expect(proximoVencimento(ps)).toBe('2025-04-01')
    expect(vencimentoMaisAtrasado(ps, hoje)).toBe('2025-04-01')
  })
})

import { resumirParaEdicao, gerarParcelasAbertasEditadas } from '../src/domain/parcelas'

describe('edição de dívida (funções puras)', () => {
  it('resumirParaEdicao separa pagas e abertas', () => {
    const ps = [
      parcela({ numero: 1, valor: 100, status: 'paga' }),
      parcela({ numero: 2, valor: 100, status: 'aberta' }),
      parcela({ numero: 3, valor: 100, status: 'aberta' }),
    ]
    const r = resumirParaEdicao(ps)
    expect(r.totalPago).toBeCloseTo(100, 2)
    expect(r.totalAberto).toBeCloseTo(200, 2)
    expect(r.qtdPagas).toBe(1)
    expect(r.qtdAbertas).toBe(2)
    expect(r.maiorNumeroPago).toBe(1)
  })

  it('resumirParaEdicao sem parcelas pagas', () => {
    const ps = [
      parcela({ numero: 1, valor: 50, status: 'aberta' }),
      parcela({ numero: 2, valor: 50, status: 'aberta' }),
    ]
    const r = resumirParaEdicao(ps)
    expect(r.totalPago).toBe(0)
    expect(r.totalAberto).toBeCloseTo(100, 2)
    expect(r.maiorNumeroPago).toBe(0)
  })

  it('gerarParcelasAbertasEditadas: numeração continua após as pagas', () => {
    // 1 parcela paga (numero 1); regenera o aberto em 4x de R$50 a partir do #2.
    const novas = gerarParcelasAbertasEditadas({
      novoValorAberto: 200,
      numeroParcelasAbertas: 4,
      diaVencimento: 15,
      primeiraData: '2025-03-15',
      numeroInicial: 2,
    })
    expect(novas).toHaveLength(4)
    expect(novas.map((p) => p.numero)).toEqual([2, 3, 4, 5])
    expect(novas[0]).toMatchObject({ valor: 50, vencimento: '2025-03-15' })
    expect(novas[1].vencimento).toBe('2025-04-15')
    const soma = novas.reduce((a, p) => a + p.valor, 0)
    expect(soma).toBeCloseTo(200, 2)
  })

  it('gerarParcelasAbertasEditadas: diminui a quantidade de parcelas', () => {
    // Reduz o restante a uma única parcela.
    const novas = gerarParcelasAbertasEditadas({
      novoValorAberto: 150,
      numeroParcelasAbertas: 1,
      diaVencimento: 10,
      primeiraData: '2025-05-10',
      numeroInicial: 3,
    })
    expect(novas).toHaveLength(1)
    expect(novas[0]).toMatchObject({ numero: 3, valor: 150, vencimento: '2025-05-10' })
  })
})
