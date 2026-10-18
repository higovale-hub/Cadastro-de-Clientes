// Gera os ícones PNG do PWA (192 e 512) a partir de um SVG, para que o
// celular ofereça a instalação com ícone. Rode: node scripts/gerar-icones.mjs
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(dir, '..', 'public')

// Ícone: fundo azul arredondado + silhueta de pessoa (igual ao favicon).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="#1e6feb"/>
  <circle cx="256" cy="196" r="86" fill="#fff"/>
  <path d="M96 430c0-86 72-142 160-142s160 56 160 142z" fill="#fff"/>
</svg>`

async function gerar(tamanho, nome) {
  const buffer = await sharp(Buffer.from(svg)).resize(tamanho, tamanho).png().toBuffer()
  await writeFile(join(publicDir, nome), buffer)
  console.log(`✓ ${nome} (${tamanho}x${tamanho})`)
}

await gerar(192, 'icon-192.png')
await gerar(512, 'icon-512.png')
console.log('Ícones gerados em public/.')
