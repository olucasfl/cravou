import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@/styles/variables.css'
import '@/styles/global.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')

      reg.onupdatefound = () => {
        const worker = reg.installing
        if (!worker) return
        worker.onstatechange = () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            const ok = confirm('Nova versão do Cravou! disponível. Atualizar?')
            if (ok) worker.postMessage({ type: 'SKIP_WAITING' })
          }
        }
      }

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    } catch {
      // SW não disponível em dev sem HTTPS — ignorar
    }
  })
}
