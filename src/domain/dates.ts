// Utilitários de data trabalhando com string YYYY-MM-DD (sem fuso horário),
// evitando armadilhas de timezone do objeto Date.

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function toISODate(year: number, month1: number, day: number): string {
  // month1 = mês 1..12
  return `${year}-${pad2(month1)}-${pad2(day)}`
}

export function parseISODate(iso: string): { year: number; month1: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { year: y, month1: m, day: d }
}

// Quantos dias tem o mês (month1 = 1..12).
export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

// Retorna a data (YYYY-MM-DD) para o "dia de vencimento" desejado em um
// determinado ano/mês. Se o dia não existir no mês (ex.: 31 em fevereiro),
// usa o último dia do mês. (Regra confirmada no plano.)
export function dateForDayOfMonth(year: number, month1: number, desiredDay: number): string {
  const last = daysInMonth(year, month1)
  const day = Math.min(desiredDay, last)
  return toISODate(year, month1, day)
}

// Avança N meses a partir de um ano/mês base (month1 = 1..12).
export function addMonths(year: number, month1: number, add: number): { year: number; month1: number } {
  const zeroBased = month1 - 1 + add
  const newYear = year + Math.floor(zeroBased / 12)
  const newMonth0 = ((zeroBased % 12) + 12) % 12
  return { year: newYear, month1: newMonth0 + 1 }
}

// Data de hoje como YYYY-MM-DD no horário local.
export function todayISO(): string {
  const now = new Date()
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

// Formata YYYY-MM-DD como dd/mm/aaaa para exibição.
export function formatBR(iso: string): string {
  const { year, month1, day } = parseISODate(iso)
  return `${pad2(day)}/${pad2(month1)}/${year}`
}
