// Utilitários monetários. Trabalhamos internamente em centavos (inteiros)
// para o rateio das parcelas, evitando erros de ponto flutuante, e
// convertemos de volta para reais no armazenamento.

export function reaisToCentavos(reais: number): number {
  return Math.round(reais * 100)
}

export function centavosToReais(centavos: number): number {
  return centavos / 100
}

// Divide um total (em centavos) em N parcelas. Cada parcela recebe o valor
// base arredondado para baixo; o resto (sobra de centavos) é adicionado à
// ÚLTIMA parcela, garantindo que a soma seja exatamente o total.
export function ratearParcelas(totalCentavos: number, numeroParcelas: number): number[] {
  if (numeroParcelas <= 0) return []
  const base = Math.floor(totalCentavos / numeroParcelas)
  const parcelas = new Array<number>(numeroParcelas).fill(base)
  const resto = totalCentavos - base * numeroParcelas
  parcelas[numeroParcelas - 1] += resto
  return parcelas
}

// Formata um valor em reais como moeda brasileira (R$ 1.234,56).
const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(reais: number): string {
  return formatter.format(reais)
}
