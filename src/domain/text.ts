// Normalização de texto e busca por similaridade (fuzzy).

// Normaliza texto para busca: minúsculo, sem acentos e espaços colapsados.
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// Mantém apenas dígitos (para documento/telefone).
export function apenasDigitos(s: string): string {
  return s.replace(/\D+/g, '')
}

// Distância de Levenshtein entre duas strings (edições necessárias).
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const prev = new Array<number>(n + 1)
  const curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

// Pontuação de similaridade entre 0 e 1 (1 = idêntico) baseada em
// Levenshtein normalizado pelo comprimento.
export function similaridade(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1
  const dist = levenshtein(a, b)
  const maxLen = Math.max(a.length, b.length)
  return maxLen === 0 ? 1 : 1 - dist / maxLen
}

// Pontua o quão bem um termo de busca casa com um nome (já normalizados).
// Combina: correspondência de substring (peso alto), similaridade por
// palavra e similaridade global. Retorna 0..1.
export function pontuarNome(termo: string, nome: string): number {
  if (termo.length === 0) return 0
  if (nome.includes(termo)) {
    // Substring exata: pontuação alta, maior quanto mais cedo aparece.
    const pos = nome.indexOf(termo)
    return 0.9 + 0.1 * (1 - pos / Math.max(nome.length, 1))
  }
  // Melhor similaridade contra cada palavra do nome.
  const palavras = nome.split(' ')
  let melhorPorPalavra = 0
  for (const p of palavras) {
    melhorPorPalavra = Math.max(melhorPorPalavra, similaridade(termo, p))
  }
  const global = similaridade(termo, nome)
  return Math.max(melhorPorPalavra, global)
}
