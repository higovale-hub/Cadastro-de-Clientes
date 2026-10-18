import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './aws/auth'
import { configurarAmplify } from './aws/config'
import { cloudMode } from './aws/adapters'
import './styles.css'

// Bootstrap: no modo 'amplify' configura o Amplify (se houver
// amplify_outputs.json). Nos modos 'local' e 'off' isso não é necessário.
async function iniciar() {
  if (cloudMode() === 'amplify') {
    await configurarAmplify()
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

void iniciar()
