import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No router: /report is the field report, /runs the run explorer, every other path the landing page.
const route = window.location.pathname.replace(/\/+$/, '')
const ReportPage = lazy(() => import('./report/ReportPage.tsx'))
const RunsPage = lazy(() => import('./runs/RunsPage.tsx'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {route === '/report' || route === '/runs' ? (
      <Suspense fallback={null}>{route === '/report' ? <ReportPage /> : <RunsPage />}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
