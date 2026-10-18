import { Routes, Route, Navigate } from 'react-router-dom'
import { GuardaAcesso } from './components/GuardaAcesso'
import { useAuth } from './aws/auth'
import { Inicio } from './pages/Inicio'
import { NovoCliente } from './pages/NovoCliente'
import { NovaDivida } from './pages/NovaDivida'
import { BuscarCliente } from './pages/BuscarCliente'
import { ListaClientes } from './pages/ListaClientes'
import { PaginaCliente } from './pages/PaginaCliente'
import { EditarCliente } from './pages/EditarCliente'
import { EditarDivida } from './pages/EditarDivida'
import { CriarConta } from './pages/CriarConta'
import { UsuariosEmpresa } from './pages/UsuariosEmpresa'
import { Backoffice } from './pages/Backoffice'
import { RelatorioBackoffice } from './pages/RelatorioBackoffice'
import { NovaEmpresaBackoffice } from './pages/NovaEmpresaBackoffice'

// Rotas do super-admin (backoffice).
function RotasBackoffice() {
  return (
    <Routes>
      <Route path="/backoffice" element={<Backoffice />} />
      <Route path="/backoffice/empresas/nova" element={<NovaEmpresaBackoffice />} />
      <Route path="/backoffice/relatorio" element={<RelatorioBackoffice />} />
      {/* Qualquer outra rota do super-admin cai no backoffice. */}
      <Route path="*" element={<Navigate to="/backoffice" replace />} />
    </Routes>
  )
}

// Rotas do app da empresa (operador / admin_empresa).
function RotasEmpresa() {
  return (
    <Routes>
      <Route path="/empresa/usuarios" element={<UsuariosEmpresa />} />
      <Route path="/" element={<Inicio />} />
      <Route path="/clientes/novo" element={<NovoCliente />} />
      <Route path="/clientes/:clienteId/dividas/nova" element={<NovaDivida />} />
      <Route path="/clientes/:clienteId/dividas/:dividaId/editar" element={<EditarDivida />} />
      <Route path="/buscar" element={<BuscarCliente />} />
      <Route path="/clientes" element={<ListaClientes />} />
      <Route path="/clientes/:clienteId" element={<PaginaCliente />} />
      <Route path="/clientes/:clienteId/editar" element={<EditarCliente />} />
    </Routes>
  )
}

// Usuário logado sem empresa: só pode criar a empresa (Opção C).
function RotasSemEmpresa() {
  return (
    <Routes>
      <Route path="*" element={<CriarConta />} />
    </Routes>
  )
}

function Conteudo() {
  const { situacao } = useAuth()
  if (situacao === 'super_admin') return <RotasBackoffice />
  if (situacao === 'sem_empresa') return <RotasSemEmpresa />
  return <RotasEmpresa />
}

export default function App() {
  return (
    <GuardaAcesso>
      <Conteudo />
    </GuardaAcesso>
  )
}
