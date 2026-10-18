import { addMonths, dateForDayOfMonth, parseISODate, todayISO } from './dates'
import { centavosToReais, ratearParcelas, reaisToCentavos } from './money'
import type { Parcela } from '../db/types'

export interface EntradaParcela {
  numero: number
  valor: number // reais
  vencimento: string // YYYY-MM-DD
}

// Gera a agenda de parcelas de uma dívida.
// - valorTotal em reais, dividido em numeroParcelas (resto na última).
// - vencimentos mensais recorrentes no diaVencimento; a 1ª parcela vence
//   em primeiraData e as demais no mesmo dia dos meses seguintes.
// - dia inexistente no mês => último dia do mês (via dateForDayOfMonth).
export function gerarParcelas(params: {
  valorTotal: number
  numeroParcelas: number
  diaVencimento: number
  primeiraData: string // YYYY-MM-DD
}): EntradaParcela[] {
  const { valorTotal, numeroParcelas, diaVencimento, primeiraData } = params
  if (numeroParcelas <= 0) return []

  const valoresCentavos = ratearParcelas(reaisToCentavos(valorTotal), numeroParcelas)
  const base = parseISODate(primeiraData)

  const entradas: EntradaParcela[] = []
  for (let i = 0; i < numeroParcelas; i++) {
    const { year, month1 } =
      i === 0 ? { year: base.year, month1: base.month1 } : addMonths(base.year, base.month1, i)
    // A 1ª parcela respeita a data informada; as demais usam o diaVencimento.
    const vencimento =
      i === 0 ? primeiraData : dateForDayOfMonth(year, month1, diaVencimento)
    entradas.push({
      numero: i + 1,
      valor: centavosToReais(valoresCentavos[i]),
      vencimento,
    })
  }
  return entradas
}

// Uma parcela está vencida se está aberta e o vencimento é anterior a hoje.
export function parcelaVencida(parcela: Parcela, hojeISO: string = todayISO()): boolean {
  return parcela.status === 'aberta' && parcela.vencimento < hojeISO
}

// Soma dos valores das parcelas ainda abertas (valor em aberto).
export function totalEmAberto(parcelas: Parcela[]): number {
  const centavos = parcelas
    .filter((p) => p.status === 'aberta')
    .reduce((acc, p) => acc + reaisToCentavos(p.valor), 0)
  return centavosToReais(centavos)
}

// Menor vencimento entre as parcelas abertas (próximo a vencer). null se não houver.
export function proximoVencimento(parcelas: Parcela[]): string | null {
  const abertas = parcelas.filter((p) => p.status === 'aberta').map((p) => p.vencimento)
  if (abertas.length === 0) return null
  return abertas.reduce((min, v) => (v < min ? v : min))
}

// Menor vencimento entre as parcelas VENCIDAS (mais atrasada). null se não houver.
export function vencimentoMaisAtrasado(
  parcelas: Parcela[],
  hojeISO: string = todayISO(),
): string | null {
  const vencidas = parcelas.filter((p) => parcelaVencida(p, hojeISO)).map((p) => p.vencimento)
  if (vencidas.length === 0) return null
  return vencidas.reduce((min, v) => (v < min ? v : min))
}

// ---------- Edição de dívida (preservando parcelas pagas) ----------

export interface ResumoEdicaoDivida {
  totalPago: number // soma das parcelas pagas (reais)
  totalAberto: number // soma das parcelas abertas (reais)
  qtdPagas: number
  qtdAbertas: number
  maiorNumeroPago: number // maior "numero" entre as parcelas pagas (0 se nenhuma)
}

// Resume o estado atual das parcelas de uma dívida para alimentar o
// formulário de edição (valores pré-preenchidos).
export function resumirParaEdicao(parcelas: Parcela[]): ResumoEdicaoDivida {
  const pagas = parcelas.filter((p) => p.status === 'paga')
  const abertas = parcelas.filter((p) => p.status === 'aberta')
  const totalPago = centavosToReais(
    pagas.reduce((acc, p) => acc + reaisToCentavos(p.valor), 0),
  )
  const totalAberto = centavosToReais(
    abertas.reduce((acc, p) => acc + reaisToCentavos(p.valor), 0),
  )
  const maiorNumeroPago = pagas.reduce((max, p) => Math.max(max, p.numero), 0)
  return {
    totalPago,
    totalAberto,
    qtdPagas: pagas.length,
    qtdAbertas: abertas.length,
    maiorNumeroPago,
  }
}

// Gera as NOVAS parcelas abertas de uma dívida editada. A numeração começa
// depois da última parcela paga (continuidade), e o rateio do novo valor
// em aberto joga o resto na última parcela. Os vencimentos são mensais a
// partir de primeiraData, no diaVencimento (último dia do mês se não existir).
export function gerarParcelasAbertasEditadas(params: {
  novoValorAberto: number
  numeroParcelasAbertas: number
  diaVencimento: number
  primeiraData: string // YYYY-MM-DD
  numeroInicial: number // normalmente maiorNumeroPago + 1
}): EntradaParcela[] {
  const base = gerarParcelas({
    valorTotal: params.novoValorAberto,
    numeroParcelas: params.numeroParcelasAbertas,
    diaVencimento: params.diaVencimento,
    primeiraData: params.primeiraData,
  })
  // Renumera continuando após as parcelas pagas.
  return base.map((e, i) => ({
    ...e,
    numero: params.numeroInicial + i,
  }))
}
