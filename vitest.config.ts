import { defineConfig } from 'vitest/config'

// Testes unitários (regras de negócio puras) rodam em Node, sem DOM.
// Os testes de integração com o DynamoDB Local (Docker) se auto-pulam
// quando o serviço não está acessível (ver tests/integração).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
  },
})
